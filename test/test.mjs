// Since this library proxies IDB, I haven't retested all of IDB. I've tried to cover parts of the
// library that behave differently to IDB, or may cause accidental differences.

import '../node_modules/mocha/mocha.js';
import '../node_modules/chai/chai.js';
import { openDb, deleteDb, unwrap } from '../build/idb.mjs';

mocha.setup('bdd');
const { expect } = chai;

describe('deleteDb setup', () => {
  it('is a function', () => expect(deleteDb).to.be.a('function'));
  it('returns a promise for void', async () => {
    const val = deleteDb('test');
    expect(val).to.be.a('promise');
    const resolvedVal = await val;
    expect(resolvedVal).to.be.undefined;
  });
});

describe('database read/write', () => {
  /**
   * @type IDBDatabase
   */
  let db;

  it('can be opened', async () => {
    expect(openDb).to.be.a('function');

    let upgradeCalled = false;

    db = await openDb('test', 1, {
      upgrade(db, oldVersion, newVersion) {
        upgradeCalled = true;
        expect(db).to.be.an.instanceOf(IDBDatabase);
        expect(oldVersion).to.eq(0);
        expect(newVersion).to.eq(1);

        db.createObjectStore('test-store');
      },
    });

    expect(upgradeCalled).to.be.true;

    expect(db).to.be.an.instanceOf(IDBDatabase);
    expect(db.name).to.eq('test');
    expect([...db.objectStoreNames]).to.eql(['test-store']);
  });

  it('can add items & confirm with done promise', async () => {
    const tx = db.transaction('test-store', 'readwrite');
    const store = tx.objectStore('test-store');
    const promise = store.add('foo', 'bar');

    expect(promise).to.be.a('promise');
    expect(tx.done).to.be.a('promise');
    await tx.done;
  });

  it('can get items via promises', async () => {
    const tx = db.transaction('test-store');
    const store = tx.objectStore('test-store');
    const result = await store.get('bar');
    expect(result).to.be.eq('foo');
  });

  it('can upgrade with indexes, and handles blocking', async () => {
    let upgradeCalled = false;
    let blockedCalled = false;
    const oldDb = db;

    db = await openDb('test', 2, {
      upgrade(db, oldVersion, newVersion) {
        upgradeCalled = true;
        expect(oldVersion).to.eq(1);
        expect(newVersion).to.eq(2);

        const store = db.createObjectStore('index-store', { keyPath: 'id' });
        store.createIndex('order', 'order');
        store.put({ id: 1, order: 3, val: 'hello' });
        store.put({ id: 2, order: 2, val: 'world' });
        store.put({ id: 3, order: 1, val: 'foobar' });
      },
      blocked() {
        blockedCalled = true;
        oldDb.close();
      },
    });

    expect(upgradeCalled).to.be.true;
    expect(blockedCalled).to.be.true;
  });

  it('can upgrade without options', async () => {
    db.close();
    db = await openDb('test', 3);
    expect(db.version).to.be.eq(3);
  });

  it('can get items via index', async () => {
    const tx = db.transaction('index-store');
    const store = tx.objectStore('index-store');
    const index = store.index('order');

    const all = await index.getAll();

    expect(all).to.eql([
      { id: 3, order: 1, val: 'foobar' },
      { id: 2, order: 2, val: 'world' },
      { id: 1, order: 3, val: 'hello' },
    ]);
  });

  it('can cursor over stores', async () => {
    const tx = db.transaction('index-store');
    const store = tx.objectStore('index-store');

    let storeCursor = await store.openCursor();
    const storeVals = [];

    while (storeCursor) {
      storeVals.push(storeCursor.value.val);
      storeCursor = await storeCursor.continue();
    }

    expect(storeVals).to.eql(['hello', 'world', 'foobar']);
  });

  it('can cursor over indexes', async () => {
    const tx = db.transaction('index-store');
    const index = tx.objectStore('index-store').index('order');
    let indexCursor = await index.openCursor();
    const indexVals = [];

    while (indexCursor) {
      indexVals.push(indexCursor.value.val);
      indexCursor = await indexCursor.continue();
    }

    expect(indexVals).to.be.eql(['foobar', 'world', 'hello']);
  });

  it('can close', async () => {
    db.close();
  });
});

describe('object equality', () => {
  /**
   * @type IDBDatabase
   */
  let db;

  it('can be opened', async () => {
    db = await openDb('test', 4);
    expect(db).to.be.an.instanceOf(IDBDatabase);
    expect(db.name).to.eq('test');
  });

  it('has equal functions', async () => {
    // Function getters should return the same instance.
    expect(db.addEventListener).to.be.eq(db.addEventListener, 'addEventListener');
    expect(db.transaction).to.be.eq(db.transaction, 'transaction');

    const tx1 = db.transaction('test-store');
    const tx2 = db.transaction('test-store');

    // Functions should be equal across instances.
    expect(tx1.objectStore).to.be.eq(tx2.objectStore, 'objectStore func');

    // The spec says object stores from the same transaction should be equal.
    expect(tx1.objectStore('test-store'))
      .to.eq(tx1.objectStore('test-store'), 'objectStore on same tx');

    // The spec says object stores from different transaction should not be equal.
    expect(tx1.objectStore('test-store'))
      .to.not.eq(tx2.objectStore('test-store'), 'objectStore on different tx');
  });
});

// TODO: test unwrapping

mocha.run();
