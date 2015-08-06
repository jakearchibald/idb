import "babelify/node_modules/babel-core/node_modules/regenerator/runtime";
import assert from "assert";

describe('IDB interface', () => {
  before(() => {
    return IDB.delete('tmp-db');
  });

  it('exists on window', () => {
    assert('IDB' in self);
  });

  it('has open and delete methods', () => {
    assert('open' in IDB);
    assert('delete' in IDB);
  });

  it('stuff', async () => {
    let db = await IDB.open('tmp-db', 1, upgradeDb => {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore("my-store", {
            keyPath: ''
          });
      }
    });

    let tx = db.transaction('my-store', 'readwrite');
    let store = tx.objectStore('my-store');
    store.put('foo');
    store.put('bar');
    store.put('baz');

    let cursor = await db.transaction('my-store').objectStore('my-store').openCursor();

    while (cursor) {
      console.log(cursor.value);
      cursor = await cursor.continue();
    }
  });
});