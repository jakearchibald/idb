# IndexedDB with promises.

This is a tiny library that mostly mirrors the IndexedDB API, but with small improvements that make a big difference to usability.

# Installation

```sh
npm install idb
```

Then, assuming you're using a module-compatible system (like Webpack, Rollup etc):

```js
import { openDb, deleteDb, unwrap } from 'idb';

async function doDatabaseStuff() {
  const db = await openDb(…);
}
```

# API

## `openDb`

```js
const db = await openDb(name, version, {
  upgrade(db, oldVersion, newVersion, transaction) {
    // …
  },
  blocked() {
    // …
  },
  blocking() {
    // …
  }
});
```

This method opens a database, and returns an object very similar to [`IDBDatabase`](https://w3c.github.io/IndexedDB/#database-interface) (see 'enhancements' below).

* `name`: Name of the database.
* `version`: Schema version.
* `upgrade`: Called if this version of the database has never been opened before. Use it to specify the schema for the database. This is similar to the `upgradeneeded` event in plain IndexedDB.
    * `db`: Object similar to `IDBDatabase`.
    * `oldVersion`: Last version of the database opened by the user.
    * `newVersion`: Whatever new version you provided.
    * `transaction`: The transaction for this upgrade. This is useful if you need to get data from other stores as part of a migration.
* `blocked`: Called if there are older versions of the database open on the origin, so this version cannot open.
* `blocking`: Called if this connection is blocking a future version of the database from opening.

## `deleteDb`

```js
await deleteDb(name);
```

* `name`: Name of the database.

## `unwrap`

```js
const unwrapped = unwrap(wrapped);
```

If for some reason you want to drop back into plain IndexedDB, give one of the enhanced objects to `unwrap` and you'll get the unmodified version back.

Promises will also be converted back into `IDBRequest` objects.

## Enhancements

Once you've opened the database, the API is the same as IndexedDB, except for the following differences:

Any method that usually returns an `IDBRequest` object will now return a promise for the eventual value.

```js
const store = db.transaction(storeName).objectStore(storeName);
const value = await store.get(key);
```

Transactions have a `.done` promise which resolves when the transaction completes successfully, and otherwise rejects.

```js
const tx = db.transaction(storeName, 'readwrite');
const store = tx.objectStore(storeName);
store.put('foo', 'bar');
await tx.done;
```

Cursor advance methods (`advance`, `continue`, `continuePrimaryKey`) return a promise for the cursor, or null if there are no further values to provide.

```js
const store = db.transaction(storeName).objectStore(storeName);
let cursor = await store.openCursor();

while (cursor) {
  console.log(cursor.key, cursor.value);
  cursor = await cursor.continue();
}
```

# Examples

## Keyval Store

This is very similar to `localStorage`, but async. If this is *all* you need, you may be interested in [idb-keyval](https://www.npmjs.com/package/idb-keyval), you can always upgrade to this library later.

```js
const dbPromise = openDb('keyval-store', 1, {
  upgrade(db) {
    db.createObjectStore('keyval');
  }
});

const idbKeyval = {
  async get(key) {
    const db = await dbPromise;
    return db.transaction('keyval').objectStore('keyval').get(key);
  },
  async set(key, val) {
    const db = await dbPromise;
    const tx = db.transaction('keyval', 'readwrite');
    tx.objectStore('keyval').put(val, key);
    return tx.done;
  },
  async delete(key) {
    const db = await dbPromise;
    const tx = db.transaction('keyval', 'readwrite');
    tx.objectStore('keyval').delete(key);
    return tx.done;
  },
  async clear() {
    const db = await dbPromise;
    const tx = db.transaction('keyval', 'readwrite');
    tx.objectStore('keyval').clear();
    return tx.done;
  },
  async keys() {
    const db = await dbPromise;
    return db.transaction('keyval').objectStore('keyval').getAllKeys();
  },
};
```

TODO: more examples

# TypeScript

You can (and probably should) provide typings for your database:

```ts
import { openDb, DBSchema } from 'idb';

interface MyDB extends DBSchema {
  'favourite-numbers': {
    key: string,
    value: number[],
  },
  'products': {
    value: {
      name: string,
      price: number,
      productCode: string,
    },
    key: string,
    indexes: { 'by-price': number },
  }
}

const db = await openDb<MyDB>('my-db', 1, {
  upgrade(db) {
    db.createObjectStore('favourite-numbers');

    const productStore = db.createObjectStore('products', { keyPath: 'productCode' });
    productStore.createIndex('by-price', 'price');
  }
});
```

Objects you get from stores and indexes will now have the correct types, and items you put into stores will be checked.

## Opting out of types

If you call `openDb` without providing types, your database will return unknown types. However, sometimes you'll need to interact with stores that aren't in your schema, perhaps during upgrades. In that case you can cast.

Let's say we were renaming the 'favourite-numbers' store to 'fave-nums':

```ts
import { openDb, DBSchema, IDBPDatabase, IDBPTransaction } from 'idb';

interface V1MyDB extends DBSchema {
  'favourite-numbers': { key: string, value: number[] },
}

interface V2MyDB extends DBSchema {
  'fave-nums': { key: string, value: number[] },
}

const db = await openDb<V2MyDB>('my-db', 2, {
  async upgrade(db, oldVersion, newVersion, tx) {
    // Cast a reference of the database to the old schema.
    const v1Db = db as unknown as IDBPDatabase<V1MyDB>;

    if (oldVersion < 1) {
      v1Db.createObjectStore('favourite-numbers');
    }
    if (oldVersion < 2) {
      const store = db.createObjectStore('fav-nums');

      // We'll need to copy the data, that means casting the transaction too:
      const v1Tx = tx as unknown as IDBPTransaction<V1MyDB>;
      let cursor = await tx.objectStore('favourite-numbers').openCursor();

      while (cursor) {
        store.add(cursor.value, cursor.key);
        cursor = await cursor.continue();
      }
    }
  }
});
```

You can also cast to a typeless database/transaction by omiting the type, eg `db as IDBPDatabase`.
