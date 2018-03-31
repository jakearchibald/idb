# IndexedDB Promised

This is a tiny library that mirrors IndexedDB, but replaces the weird `IDBRequest` objects with promises, plus a couple of other small changes.

# Examples

## Keyval Store

This is very similar to `localStorage`, but async. If this is *all* you need, you may be interested in [idb-keyval](https://www.npmjs.com/package/idb-keyval), you can always upgrade to this library later.

```js
const dbPromise = idb.open('keyval-store', 1, upgradeDB => {
  upgradeDB.createObjectStore('keyval');
});

const idbKeyval = {
  get(key) {
    return dbPromise.then(db => {
      return db.transaction('keyval')
        .objectStore('keyval').get(key);
    });
  },
  set(key, val) {
    return dbPromise.then(db => {
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(val, key);
      return tx.complete;
    });
  },
  delete(key) {
    return dbPromise.then(db => {
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').delete(key);
      return tx.complete;
    });
  },
  clear() {
    return dbPromise.then(db => {
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').clear();
      return tx.complete;
    });
  },
  keys() {
    return dbPromise.then(db => {
      const tx = db.transaction('keyval');
      const keys = [];
      const store = tx.objectStore('keyval');

      // This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
      // openKeyCursor isn't supported by Safari, so we fall back
      (store.iterateKeyCursor || store.iterateCursor).call(store, 
	    (value, key) => keys.push(key));

      return tx.complete.then(() => keys);
    });
  }
};
```

### Usage

```js
keyValStore.set('foo', {hello: 'world'});

// logs: {hello: 'world'}
keyValStore.get('foo').then(val => console.log(val));
```

## Set of objects

Imagine we had a set of objects like…

```json
{
  "id": 123456,
  "data": {"foo": "bar"}
}
```

### Upgrading existing DB

```js
const dbPromise = idb.open('keyval-store', 2, upgradeDB => {
  // Note: we don't use 'break' in this switch statement,
  // the fall-through behaviour is what we want.
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('keyval');
    case 1:
      upgradeDB.createObjectStore('objs', {keyPath: 'id'});
  }
});
```

### Adding

```js
dbPromise.then(db => {
  const tx = db.transaction('objs', 'readwrite');
  tx.objectStore('objs').put({
    id: 123456,
    data: {foo: "bar"}
  });
  return tx.complete;
});
```

### Getting all

```js
dbPromise.then(db => {
  return db.transaction('objs')
    .objectStore('objs').getAll();
}).then(allObjs => console.log(allObjs));
```

### Getting by ID

```js
dbPromise.then(db => {
  return db.transaction('objs')
    .objectStore('objs').get(123456);
}).then(obj => console.log(obj));
```

# Limitations

## Transaction lifetime

An IDB transaction will auto-close if it doesn't have anything to do once microtasks have been processed. As a result, this works fine:

```js
dbPromise.then(async db => {
  const tx = db.transaction('keyval', 'readwrite');
  const store = tx.objectStore('keyval');
  const val = await store.get('counter') || 0;
  store.put(val + 1, 'counter');
  return tx.complete;
});
```

But this doesn't:

```js
dbPromise.then(async db => {
  const tx = db.transaction('keyval', 'readwrite');
  const store = tx.objectStore('keyval');
  const val = await store.get('counter') || 0;
  // The transaction will auto-close while the fetch is in-progress
  const newVal = await fetch('/increment?val=' + val)
  store.put(newVal, 'counter');
  return tx.complete;
});
```

## Promise issues in older browsers

Some older browsers don't handle promises properly, which causes issues if you do more than one thing in a transaction:

```js
dbPromise.then(async db => {
  const tx = db.transaction('keyval', 'readwrite');
  const store = tx.objectStore('keyval');
  const val = await store.get('counter') || 0;
  // In some older browsers, the transaction closes here.
  // Meaning this next line fails:
  store.put(val + 1, 'counter');
  return tx.complete;
});
```

All modern browsers have fixed this. [Test your browser](https://simple-idb-demo.glitch.me/microtask-issue.html).

You can work around this in some versions of Firefox by using a promise polyfill that correctly uses microtasks, such as [es6-promise](https://github.com/jakearchibald/es6-promise).

# API

## `idb`

This is your entry point to the API. It's exposed to the global scope unless you're using a module system such as browserify, in which case it's the exported object.

### `idb.open(name, version, upgradeCallback)`

This method returns a promise that resolves to a `DB`.

`name` and `version` behave as they do in `indexedDB.open`.

`upgradeCallback` is called if `version` is greater than the version last opened. It's similar to IDB's `onupgradeneeded`. The callback receives an instance of `UpgradeDB`.

```js
idb.open('keyval-store', 2, upgradeDB => {
  // Note: we don't use 'break' in this switch statement,
  // the fall-through behaviour is what we want.
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('keyval');
    case 1:
      upgradeDB.createObjectStore('stuff', {keyPath: ''});
  }
}).then(db => console.log("DB opened!", db));
```

### `idb.delete(name)`

Behaves like `indexedDB.deleteDatabase`, but returns a promise.

```js
idb.delete('keyval-store').then(() => console.log('done!'));
```

## `DB`

Properties:

* Same as equivalent properties on an instance of `IDBDatabase`:
  * `name`
  * `version`
  * `objectStoreNames`

Methods:

* `close` - as `idbDatabase.close`
* `transaction` - as `idbDatabase.transaction`, but returns a `Transaction`

## `UpgradeDB`

As `DB`, except:

Properties:

* `transaction` - this is a property rather than a method. It's a `Transaction` representing the upgrade transaction
* `oldVersion` - the previous version of the DB seen by the browser, or 0 if it's new

Methods:

* `createObjectStore` - as `idbDatabase.createObjectStore`, but returns an `ObjectStore`
* `deleteObjectStore` - as `idbDatabase.deleteObjectStore`

## `Transaction`

Properties:

* `complete` - a promise. Resolves when transaction completes, rejects if transaction aborts or errors
* Same as equivalent properties on an instance of `IDBTransaction`:
  * `objectStoreNames`
  * `mode`

Methods:

* `abort` - as `idbTransaction.abort`
* `objectStore` - as `idbTransaction.objectStore`, but returns an `ObjectStore`

```js
idb.open('keyval-store', 1, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('keyval');
  }
}).then(db => {
  const tx = db.transaction('keyval', 'readwrite');
  tx.objectStore('keyval').put('hello', 'world');
  return tx.complete;
}).then(() => console.log("Done!"));
```

## `ObjectStore`

Properties:

* Same as equivalent properties on an instance of `IDBObjectStore`:
  * `name`
  * `keyPath`
  * `indexNames`
  * `autoIncrement`

Methods:

* Same as equivalent methods on an instance of `IDBObjectStore`, but returns a promise that resolves/rejects based on operation success/failure:
  * `put`
  * `add`
  * `delete`
  * `clear`
  * `get`
  * `getAll`
  * `getAllKeys`
  * `count`
* Same as equivalent methods on an instance of `IDBObjectStore`, but returns a promise that resolves with a `Cursor`:
  * `openCursor`
  * `openKeyCursor`
* `deleteIndex` - as `idbObjectStore.deleteIndex`
* Same as equivalent methods on an instance of `IDBObjectStore`, but returns an `Index`:
  * `createIndex`
  * `index`
* `iterateCursor` - see below
* `iterateKeyCursor` - see below


### `iterateCursor` & `iterateKeyCursor`

`iterateCursor` and `iterateKeyCursor` map to `openCursor` & `openKeyCursor`, take identical arguments, plus an additional iterator as the last argument, that receives an `IDBCursor` with each value. Typical usage might be:

```js
const tx = db.transaction('stuff');
tx.objectStore('stuff').iterateCursor({
  next: cursor => {
    if(!cursor)
	  return {value: 42, done: true}
    console.log(cursor.value);
	return {value: 23, done: false}
  }
}).then(() => console.log('done'));
```

or perhaps more clearly:
```js
const tx = db.transaction('stuff');
tx.objectStore('stuff').iterateCursor((function*() {
  while((let cursor = yield)) {
    console.log(cursor.value);
  }
  return 42;
})()).then(() => console.log('done'));
```

You can also pass a callback in the form of `(value, key) => ...` which will be auto-iterified.

```js
const tx = db.transaction('stuff');
tx.objectStore('stuff').iterateCursor(
     (value, key) => 
       console.log(cursor.value)))
  .then(() => console.log('done'));
```

The result of iterateCursor and iterateKeyCursor is a promise, that completes when either the iterator finishes, the callback returns something that isn’t undefined, or the cursor runs out of results. This is almost the same time as the tx.complete promise, since IndexedDB completes transactions immediately as soon as the cursor stops continuing, but unlike tx.complete, the promise returned from iterateCursor can have a result, which the iterator (or callback) returned once it found what it was looking for.

Basically:

```js
Promise.race([tx.complete, tx.objectStore(...).iterateCursor(...)])
```

will _probably_ return the second result, which could be meaningful depending on the callback/iterator, but the timing is close enough it could potentially return the first result, especially if the second result is itself a promise.

Warning: if the iterator yields or returns a pending promise, the transaction _will_ complete, and the cursor _will_ be invalid once the promise is resolved. This is an internal limitation of IndexedDB itself. The intent is to remove `iterateCursor` and `iterateKeyCursor` from the library once browsers support promises and microtasks correctly in their IndexedDB implementations.

## `Index`

Properties:

* Same as equivalent properties on an instance of `IDBIndex`:
  * `name`
  * `keyPath`
  * `multiEntry`
  * `unique`

Methods:

* Same as equivalent methods on an instance of `IDBIndex`, but returns a promise that resolves/rejects based on operation success/failure:
  * `get`
  * `getKey`
  * `getAll`
  * `getAllKeys`
  * `count`
* Same as equivalent methods on an instance of `IDBIndex`, but returns a promise that resolves with a `Cursor`:
  * `openCursor`
  * `openKeyCursor`
* `iterateCursor` - as `objectStore.iterateCursor` but over the index
* `iterateKeyCursor` - as `objectStore.iterateKeyCursor` but over the index

## Cursor

Properties:

* Same as equivalent properties on an instance of `IDBCursor`:
  * `direction`
  * `key`
  * `primaryKey`
  * `value`

Methods:

* Same as equivalent methods on an instance of `IDBCursor`, but returns a promise that resolves/rejects based on operation success/failure:
  * `update`
  * `delete`
* Same as equivalent methods on an instance of `IDBCursor`, but returns a promise that resolves with a `Cursor`:
  * `advance`
  * `continue`
  * `continuePrimaryKey`
