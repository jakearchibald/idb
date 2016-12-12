import regeneratorRuntime from "regenerator/runtime";
import assert from "assert";
import {Promise} from "es6-promise";

self.Promise = Promise;

describe('idb interface', () => {
  beforeEach(done => idb.delete('tmp-db').then(done));

  it('exists on window', () => {
    assert('idb' in self);
  });

  it('has open and delete methods', () => {
    assert('open' in idb);
    assert('delete' in idb);
  });

  // yeah yeah, I know, I need to write better tests
  it('stuff', async () => {
    // Open the database
    let db = await idb.open('tmp-db', 1, upgradeDb => {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore('key-val').put('world', 'hello');
      }
    });

    // Add some things to the list
    let tx = db.transaction('key-val', 'readwrite');
    let store = tx.objectStore('key-val');
    
    store.put(await store.get('hello'), 'foo');
    await tx.complete;

    tx = db.transaction('key-val');

    assert.equal(await tx.objectStore('key-val').get('foo'), 'world');
    db.close();
  });

  it('lets me itterate over a cursor', async () => {
    // Open the database
    let db = await idb.open('tmp-db', 1, upgradeDb => {
      switch (upgradeDb.oldVersion) {
        case 0:
          const store = upgradeDb.createObjectStore('list', {keyPath: ''});
          store.put("a");
          store.put("b");
          store.put("c");
          store.put("d");
          store.put("e");
      }
    });

    const tx = db.transaction('list');
    const values = [];

    tx.objectStore('list').iterateCursor(cursor => {
      if (!cursor) return;
      values.push(cursor.value);
      cursor.continue();
    });

    await tx.complete;
    assert.equal(values.join(), 'a,b,c,d,e');
    db.close();
  });

  it('rejects rather than throws', async () => {
    const db = await idb.open('tmp-db', 1, upgradeDb => {
      upgradeDb.createObjectStore('key-val');
    });

    let threw = false;
    let rejected = false;
    const tx = db.transaction('key-val');
    const store = tx.objectStore('key-val');
    let getPromise;
    await tx.complete;

    try {
      getPromise = store.get('hello').catch(_ => rejected = true);
    } catch(e) {
      threw = true;
    }

    await getPromise;

    assert(!threw, "Did not throw");
    assert(rejected, "Rejected");
  });
});