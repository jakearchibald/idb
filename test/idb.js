import "babelify/node_modules/babel-core/node_modules/regenerator/runtime";
import assert from "assert";
import {Promise} from "es6-promise";

self.Promise = Promise;

describe('IDB interface', () => {
  before(done => IDB.delete('tmp-db').then(done));

  it('exists on window', () => {
    assert('IDB' in self);
  });

  it('has open and delete methods', () => {
    assert('open' in IDB);
    assert('delete' in IDB);
  });

  it('stuff', async () => {
    // Open the database
    let db = await IDB.open('tmp-db', 1, upgradeDb => {
      upgradeDb.transaction.complete.then(_ => console.log('complete'), _ => console.log('fail'));
      switch (upgradeDb.oldVersion) {
        case 0:
        case 9223372036854776000: // safari
          upgradeDb.createObjectStore('key-val');
          upgradeDb.transaction.objectStore('key-val').put('world', 'hello');
          console.log('done');
      }
    });

    // Add some things to the list
    let tx = db.transaction('key-val', 'readwrite');
    let store = tx.objectStore('key-val');
    
    store.put(await store.get('hello'), 'foo');
    await tx.complete;

    tx = db.transaction('key-val');

    assert.equal(await tx.objectStore('key-val').get('foo'), 'world');
    console.log(await tx.objectStore('key-val').get('foo'));
  });
});