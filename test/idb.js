import "babelify/node_modules/babel-core/node_modules/regenerator/runtime";
import assert from "assert";

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
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore("list-of-things", {
            keyPath: ''
          });
          upgradeDb.createObjectStore('key-val');
      }
    });

    // Add some things to the list
    let tx = db.transaction('list-of-things', 'readwrite');
    let store = tx.objectStore('list-of-things');
    store.put('foo');
    store.put('bar');
    store.put('baz');

    // Add a "hello":"world" to the key-val store
    db.transaction('key-val', 'readwrite')
      .objectStore('key-val')
      .put('world', 'hello');

    // Add the value of "hello" to the list
    tx = db.transaction(['key-val', 'list-of-things'], 'readwrite');
    tx.objectStore('list-of-things').put(
      await tx.objectStore('key-val').get('hello')
    );

    // Itterate over the list
    let cursor = await db.transaction('list-of-things')
      .objectStore('list-of-things').openCursor();

    while (cursor) {
      console.log(cursor.value);
      cursor = await cursor.continue();
    }
  });
});