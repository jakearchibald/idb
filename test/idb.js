import "babelify/node_modules/babel-core/node_modules/regenerator/runtime";
import assert from "assert";
import {Promise} from "es6-promise";

self.Promise = Promise;

describe('IDB interface', () => {
  beforeEach(done => IDB.delete('tmp-db').then(done));

  it('exists on window', () => {
    assert('IDB' in self);
  });

  it('has open and delete methods', () => {
    assert('open' in IDB);
    assert('delete' in IDB);
  });

  // yeah yeah, I know, I need to write better tests
  it('stuff', async () => {
    // Open the database
    let db = await IDB.open('tmp-db', 1, upgradeDb => {
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
    let db = await IDB.open('tmp-db', 1, upgradeDb => {
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
  });
});