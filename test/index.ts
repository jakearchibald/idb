// Since this library proxies IDB, I haven't retested all of IDB. I've tried to cover parts of the
// library that behave differently to IDB, or may cause accidental differences.

import 'mocha/mocha';
import { assert } from 'chai';
import {
  DBSchema,
  openDB,
  IDBPDatabase,
  IDBPTransaction,
  deleteDB,
  wrap,
  unwrap,
  DeleteDBCallbacks,
  IDBPObjectStore,
  IDBPCursorWithValue,
  IDBPCursor,
} from '../lib';
import { assert as typeAssert, IsExactType } from 'conditional-type-checks';

interface ObjectStoreValue {
  id: number;
  title: string;
  date: Date;
}

interface TestDBSchema extends DBSchema {
  'key-val-store': {
    key: string,
    value: number,
  };
  'object-store': {
    value: ObjectStoreValue,
    key: number,
    indexes: { date: Date, title: string },
  };
}

const dbName = 'test-db';
let version = 0;

function getNextVersion(): number {
  version += 1;
  return version;
}

let dbWithSchemaCreated = false;

function openDBWithSchema(): Promise<IDBPDatabase<TestDBSchema>> {
  if (dbWithSchemaCreated) return openDB<TestDBSchema>(dbName, version);
  dbWithSchemaCreated = true;
  return openDB<TestDBSchema>(dbName, getNextVersion(), {
    upgrade(db) {
      db.createObjectStore('key-val-store');
      const store = db.createObjectStore('object-store', { keyPath: 'id' });
      store.createIndex('date', 'date');
      store.createIndex('title', 'title');
    },
  });
}

let dbWithDataCreated = false;

async function openDBWithData() {
  if (dbWithDataCreated) return openDB<TestDBSchema>(dbName, version);
  dbWithDataCreated = true;
  const db = await openDBWithSchema();
  const tx = db.transaction(['key-val-store', 'object-store'], 'readwrite');
  const keyStore = tx.objectStore('key-val-store');
  const objStore = tx.objectStore('object-store');
  keyStore.put(123, 'foo');
  keyStore.put(456, 'bar');
  keyStore.put(789, 'hello');
  objStore.put({
    id: 1,
    title: 'Article 1',
    date: new Date('2019-01-04'),
  });
  objStore.put({
    id: 2,
    title: 'Article 2',
    date: new Date('2019-01-03'),
  });
  objStore.put({
    id: 3,
    title: 'Article 3',
    date: new Date('2019-01-02'),
  });
  objStore.put({
    id: 4,
    title: 'Article 4',
    date: new Date('2019-01-01'),
  });
  return db;
}

function deleteDatabase(callbacks: DeleteDBCallbacks = {}) {
  version = 0;
  dbWithSchemaCreated = false;
  dbWithDataCreated = false;
  return deleteDB(dbName, callbacks);
}

mocha.setup('tdd');

suite('openDb', () => {
  let db: IDBPDatabase;

  teardown('Close DB', () => {
    if (db) db.close();
  });

  test('upgrade', async () => {
    let upgradeRun = false;
    const version = getNextVersion();
    db = await openDB<TestDBSchema>(dbName, version, {
      upgrade(db, oldVersion, newVersion, tx) {
        upgradeRun = true;

        typeAssert<IsExactType<
          typeof db, IDBPDatabase<TestDBSchema>
        >>(true);
        assert.instanceOf(db, IDBDatabase, 'db instance');

        assert.strictEqual(oldVersion, 0);
        assert.strictEqual(newVersion, version);

        typeAssert<IsExactType<
          typeof tx,
          IDBPTransaction<TestDBSchema>
        >>(true);
        assert.instanceOf(tx, IDBTransaction, 'db instance');
        assert.strictEqual(tx.mode, 'versionchange', 'tx mode');
      },
    }) as IDBPDatabase;

    assert.isTrue(upgradeRun, 'upgrade run');
  });

  test('upgrade - schemaless', async () => {
    let upgradeRun = false;
    const version = getNextVersion();
    db = await openDB(dbName, version, {
      upgrade(db, oldVersion, newVersion, tx) {
        upgradeRun = true;
        typeAssert<IsExactType<
          typeof db,
          IDBPDatabase
        >>(true);
        typeAssert<IsExactType<
          typeof tx,
          IDBPTransaction
        >>(true);
      },
    });

    assert.isTrue(upgradeRun, 'upgrade run');
  });

  test('blocked and blocking', async () => {
    let blockedCalled = false;
    let blockingCalled = false;
    let newDbBlockedCalled = false;
    let newDbBlockingCalled = false;

    db = await openDB<TestDBSchema>(dbName, getNextVersion(), {
      blocked() { blockedCalled = true; },
      blocking() {
        blockingCalled = true;
        // 'blocked' isn't called if older databases close once blocking fires.
        // Using set timeout so closing isn't immediate.
        setTimeout(() => db.close(), 0);
      },
    }) as IDBPDatabase;

    assert.isFalse(blockedCalled);
    assert.isFalse(blockingCalled);

    db = await openDB<TestDBSchema>(dbName, getNextVersion(), {
      blocked() { newDbBlockedCalled = true; },
      blocking() { newDbBlockingCalled = true; },
    }) as IDBPDatabase;

    assert.isFalse(blockedCalled);
    assert.isTrue(blockingCalled);
    assert.isTrue(newDbBlockedCalled);
    assert.isFalse(newDbBlockingCalled);
  });

  test('wrap', async () => {
    let wrappedRequest: Promise<IDBPDatabase | undefined> = Promise.resolve(undefined);

    // Let's do it the old fashioned way
    const idb = await new Promise<IDBDatabase>(async (resolve) => {
      const request = indexedDB.open(dbName, getNextVersion());
      wrappedRequest = wrap(request);
      request.addEventListener('success', () => resolve(request.result));
    });

    assert.instanceOf(wrappedRequest, Promise, 'Wrapped request type');
    db = wrap(idb);

    typeAssert<IsExactType<
      typeof db,
      IDBPDatabase
    >>(true);

    assert.instanceOf(db, IDBDatabase, 'DB type');
    assert.property(db, 'getAllFromIndex', 'DB looks wrapped');
    assert.strictEqual(db, await wrappedRequest, 'Wrapped request and wrapped db are same');
  });

  test('unwrap', async () => {
    const openPromise = openDB<TestDBSchema>(dbName, getNextVersion());
    const request = unwrap(openPromise);

    typeAssert<IsExactType<
      typeof request,
      IDBOpenDBRequest
    >>(true);

    assert.instanceOf(request, IDBOpenDBRequest, 'Request type');
    db = await openPromise as IDBPDatabase;
    const idb = unwrap(db);

    typeAssert<IsExactType<
      typeof idb,
      IDBDatabase
    >>(true);

    assert.instanceOf(idb, IDBDatabase, 'DB type');
    assert.isFalse('getAllFromIndex' in idb, 'DB looks unwrapped');
  });
});

suite('deleteDb', () => {
  let db: IDBPDatabase;

  teardown('Close DB', () => {
    if (db) db.close();
  });

  test('deleteDb', async () => {
    db = await openDBWithSchema() as IDBPDatabase;
    assert.lengthOf(db.objectStoreNames, 2, 'DB has two stores');
    db.close();
    await deleteDatabase();
    db = await openDB(dbName, getNextVersion());
    assert.lengthOf(db.objectStoreNames, 0, 'DB has no stores');
  });

  test('blocked', async () => {
    let blockedCalled = false;
    let blockingCalled = false;
    let closeDbBlockedCalled = false;

    db = await openDB(dbName, getNextVersion(), {
      blocked() { blockedCalled = true; },
      blocking() {
        blockingCalled = true;
        // 'blocked' isn't called if older databases close once blocking fires.
        // Using set timeout so closing isn't immediate.
        setTimeout(() => db.close(), 0);
      },
    });

    assert.isFalse(blockedCalled);
    assert.isFalse(blockingCalled);

    await deleteDatabase({
      blocked() { closeDbBlockedCalled = true; },
    });

    assert.isFalse(blockedCalled);
    assert.isTrue(blockingCalled);
    assert.isTrue(closeDbBlockedCalled);
  });
});

suite('IDBPDatabase', () => {
  let db: IDBPDatabase;

  teardown('Close DB', async () => {
    if (db) db.close();
    await deleteDatabase();
  });

  test('objectStoreNames', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    typeAssert<IsExactType<
      typeof schemaDB.objectStoreNames,
      ('key-val-store' | 'object-store')[]
    >>(true);

    typeAssert<IsExactType<
      typeof db.objectStoreNames,
      string[]
    >>(true);
  });

  test('createObjectStore', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.createObjectStore>[0],
      ('key-val-store' | 'object-store')
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof db.createObjectStore>[0],
      string
    >>(true);
  });

  test('deleteObjectStore', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.deleteObjectStore>[0],
      ('key-val-store' | 'object-store')
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof db.deleteObjectStore>[0],
      string
    >>(true);
  });

  test('transaction', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.transaction>[0],
      ('key-val-store' | 'object-store')[]
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof db.transaction>[0],
      string[]
    >>(true);

    // Function getters should return the same instance.
    assert.strictEqual(db.transaction, db.transaction, 'transaction');
  });

  test('get', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'get', 'Method exists');

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.get>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.get('key-val-store', 'foo');

    typeAssert<IsExactType<
      typeof val,
      number | undefined
    >>(true);

    assert.strictEqual(val, 123, 'Correct value from store');

    const val2 = await db.get('key-val-store', 'bar');

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.strictEqual(val2, 456, 'Correct value from store');
  });

  test('getFromIndex', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getFromIndex', 'Method exists');
    const val = await schemaDB.getFromIndex('object-store', 'title', 'Article 1');

    typeAssert<IsExactType<
      typeof val,
      ObjectStoreValue | undefined
    >>(true);

    assert.deepStrictEqual(
      val,
      {
        id: 1,
        title: 'Article 1',
        date: new Date('2019-01-04'),
      },
      'Correct value from store',
    );

    const val2 = await db.getFromIndex('object-store', 'title', 'Article 2');

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.deepStrictEqual(
      val2,
      {
        id: 2,
        title: 'Article 2',
        date: new Date('2019-01-03'),
      },
      'Correct value from store',
    );
  });

  test('getKey', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getKey', 'Method exists');

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.getKey>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.getKey('key-val-store', IDBKeyRange.lowerBound('a'));

    typeAssert<IsExactType<
      typeof val,
      string | undefined
    >>(true);

    assert.strictEqual(val, 'bar', 'Correct value');

    const val2 = await db.getKey('key-val-store', IDBKeyRange.lowerBound('c'));

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.strictEqual(val2, 'foo', 'Correct value');
  });

  test('getKeyFromIndex', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getKeyFromIndex', 'Method exists');

    const val = await schemaDB.getKeyFromIndex(
      'object-store', 'title', IDBKeyRange.lowerBound('A'),
    );

    typeAssert<IsExactType<
      typeof val,
      number | undefined
    >>(true);

    assert.strictEqual(val, 1, 'Correct value');

    const val2 = await db.getKeyFromIndex(
      'object-store', 'date', IDBKeyRange.lowerBound(new Date('1990-01-01')),
    );

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.strictEqual(val2, 4, 'Correct value');
  });

  test('getAll', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getAll', 'Method exists');

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.getAll>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.getAll('key-val-store');

    typeAssert<IsExactType<
      typeof val,
      number[]
    >>(true);

    assert.deepStrictEqual(val, [456, 123, 789], 'Correct values from store');

    const val2 = await db.getAll('key-val-store');

    typeAssert<IsExactType<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, [456, 123, 789], 'Correct values from store');
  });

  test('getAllFromIndex', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getAllFromIndex', 'Method exists');
    const val = await schemaDB.getAllFromIndex('object-store', 'date');

    typeAssert<IsExactType<
      typeof val,
      ObjectStoreValue[]
    >>(true);

    assert.deepStrictEqual(
      val,
      [
        {
          id: 4,
          title: 'Article 4',
          date: new Date('2019-01-01'),
        },
        {
          id: 3,
          title: 'Article 3',
          date: new Date('2019-01-02'),
        },
        {
          id: 2,
          title: 'Article 2',
          date: new Date('2019-01-03'),
        },
        {
          id: 1,
          title: 'Article 1',
          date: new Date('2019-01-04'),
        },
      ],
      'Correct values from store',
    );

    const val2 = await db.getAllFromIndex('object-store', 'title');

    typeAssert<IsExactType<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(
      val2,
      [
        {
          id: 1,
          title: 'Article 1',
          date: new Date('2019-01-04'),
        },
        {
          id: 2,
          title: 'Article 2',
          date: new Date('2019-01-03'),
        },
        {
          id: 3,
          title: 'Article 3',
          date: new Date('2019-01-02'),
        },
        {
          id: 4,
          title: 'Article 4',
          date: new Date('2019-01-01'),
        },
      ],
      'Correct values from store',
    );
  });

  test('getAllKeys', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getAllKeys', 'Method exists');

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.getAllKeys>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.getAllKeys('key-val-store');

    typeAssert<IsExactType<
      typeof val,
      string[]
    >>(true);

    assert.deepStrictEqual(val, ['bar', 'foo', 'hello'], 'Correct values from store');

    const val2 = await db.getAllKeys('key-val-store');

    typeAssert<IsExactType<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, ['bar', 'foo', 'hello'], 'Correct values from store');
  });

  test('getAllKeysFromIndex', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getAllKeysFromIndex', 'Method exists');
    const val = await schemaDB.getAllKeysFromIndex('object-store', 'date');

    typeAssert<IsExactType<
      typeof val,
      number[]
    >>(true);

    assert.deepStrictEqual(val, [4, 3, 2, 1], 'Correct values from store');

    const val2 = await db.getAllKeysFromIndex('object-store', 'title');

    typeAssert<IsExactType<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, [1, 2, 3, 4], 'Correct values from store');
  });

  test('count', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'count', 'Method exists');

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.count>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.count('key-val-store');

    typeAssert<IsExactType<
      typeof val,
      number
    >>(true);

    assert.strictEqual(val, 3, 'Correct count');

    const val2 = await db.count('object-store');

    typeAssert<IsExactType<
      typeof val2,
      number
    >>(true);

    assert.strictEqual(val2, 4, 'Correct count');
  });

  test('countFromIndex', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'countFromIndex', 'Method exists');
    const val = await schemaDB.countFromIndex('object-store', 'date');

    typeAssert<IsExactType<
      typeof val,
      number
    >>(true);

    assert.strictEqual(val, 4, 'Correct count');

    const val2 = await db.countFromIndex(
      'object-store', 'title', IDBKeyRange.lowerBound('Article 10'),
    );

    typeAssert<IsExactType<
      typeof val2,
      number
    >>(true);

    assert.strictEqual(val2, 3, 'Correct count');
  });

  test('put', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'put', 'Method exists');

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.put>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const key = await schemaDB.put('key-val-store', 234, 'new');

    typeAssert<IsExactType<
      typeof key,
      string
    >>(true);

    const val = await schemaDB.get('key-val-store', 'new');

    assert.strictEqual(val, 234, 'Correct value from store');

    const key2 = await db.put('object-store', {
      id: 5,
      title: 'Article 5',
      date: new Date('2018-05-09'),
    });

    typeAssert<IsExactType<
      typeof key2,
      IDBValidKey
    >>(true);

    const val2 = await db.get('object-store', 5);

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.deepStrictEqual(
      val2,
      {
        id: 5,
        title: 'Article 5',
        date: new Date('2018-05-09'),
      },
      'Correct value from store',
    );
  });

  test('add', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'add', 'Method exists');

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.add>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const key = await schemaDB.add('key-val-store', 234, 'new');

    typeAssert<IsExactType<
      typeof key,
      string
    >>(true);

    const val = await schemaDB.get('key-val-store', 'new');

    assert.strictEqual(val, 234, 'Correct value from store');

    const key2 = await db.add('object-store', {
      id: 5,
      title: 'Article 5',
      date: new Date('2018-05-09'),
    });

    typeAssert<IsExactType<
      typeof key2,
      IDBValidKey
    >>(true);

    const val2 = await db.get('object-store', 5);

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.deepStrictEqual(
      val2,
      {
        id: 5,
        title: 'Article 5',
        date: new Date('2018-05-09'),
      },
      'Correct value from store',
    );
  });

  test('delete', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'delete', 'Method exists');

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.delete>[0],
      'key-val-store' | 'object-store'
    >>(true);

    await schemaDB.delete('key-val-store', 'foo');
    const val = await schemaDB.get('key-val-store', 'foo');

    assert.strictEqual(val, undefined, 'Correct value from store');

    await db.delete('object-store', 1);
    const val2 = await db.get('object-store', 1);

    assert.strictEqual(val2, undefined, 'Correct value from store');
  });

  test('clear', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'clear', 'Method exists');

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.clear>[0],
      'key-val-store' | 'object-store'
    >>(true);

    await schemaDB.clear('key-val-store');
    const val = await schemaDB.count('key-val-store');

    assert.strictEqual(val, 0, 'Correct value from store');

    await db.clear('object-store');
    const val2 = await db.count('object-store');

    assert.strictEqual(val2, 0, 'Correct value from store');
  });
});

suite('IDBPTransaction', () => {
  let db: IDBPDatabase;

  teardown('Close DB', async () => {
    if (db) db.close();
  });

  test('objectStoreNames', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx1 = schemaDB.transaction('key-val-store');
    const tx2 = schemaDB.transaction('object-store');
    const tx3 = schemaDB.transaction(['object-store', 'key-val-store']);

    typeAssert<IsExactType<
      typeof tx1.objectStoreNames,
      ['key-val-store']
    >>(true);

    typeAssert<IsExactType<
      typeof tx2.objectStoreNames,
      ['object-store']
    >>(true);

    typeAssert<IsExactType<
      typeof tx3.objectStoreNames,
      ('object-store' | 'key-val-store')[]
    >>(true);

    // Without schema it should still work:
    const tx4 = db.transaction('key-val-store');

    typeAssert<IsExactType<
      typeof tx4.objectStoreNames,
      ['key-val-store']
    >>(true);
  });

  test('db', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('key-val-store');

    typeAssert<IsExactType<
      typeof tx.db,
      IDBPDatabase<TestDBSchema>
    >>(true);

    const tx2 = db.transaction('key-val-store');

    typeAssert<IsExactType<
      typeof tx2.db,
      IDBPDatabase
    >>(true);
  });

  test('done', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('key-val-store');
    assert.property(tx, 'done');
    assert.instanceOf(tx.done, Promise);
  });

  test('store', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('key-val-store');
    assert.property(tx, 'store');

    typeAssert<IsExactType<
      typeof tx.store,
      IDBPObjectStore<TestDBSchema, ['key-val-store'], 'key-val-store'>
    >>(true);

    assert.instanceOf(tx.store, IDBObjectStore);
    assert.strictEqual(tx.store.name, 'key-val-store');

    assert.instanceOf(tx.store.get('blah'), Promise, 'Is the store wrapped?');

    const tx2 = schemaDB.transaction(['key-val-store', 'object-store']);
    assert.property(tx2, 'store');

    typeAssert<IsExactType<
      typeof tx2.store,
      undefined
    >>(true);

    assert.isUndefined(tx2.store);
  });

  test('objectStore', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx1 = schemaDB.transaction('key-val-store');
    const tx2 = schemaDB.transaction('key-val-store');
    const tx3 = schemaDB.transaction(['key-val-store', 'object-store']);
    const tx4 = db.transaction('object-store');

    // Functions should be equal across instances.
    assert.strictEqual(tx1.objectStore, tx2.objectStore);

    typeAssert<IsExactType<
      Parameters<typeof tx1.objectStore>[0],
      'key-val-store'
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof tx3.objectStore>[0],
      'key-val-store' | 'object-store'
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof tx4.objectStore>[0],
      'object-store'
    >>(true);

    // The spec says object stores from the same transaction should be equal.
    assert.strictEqual(
      tx1.objectStore('key-val-store'),
      tx1.objectStore('key-val-store'),
      'objectStore on same tx',
    );

    // The spec says object stores from different transaction should not be equal.
    assert.notEqual(
      tx1.objectStore('key-val-store'),
      tx2.objectStore('key-val-store'),
      'objectStore on different tx',
    );

    const store = tx1.objectStore('key-val-store');
    const schemalessStore = tx4.objectStore('object-store');

    typeAssert<IsExactType<
      typeof store,
      IDBPObjectStore<TestDBSchema, ['key-val-store'], 'key-val-store'>
    >>(true);

    typeAssert<IsExactType<
      typeof schemalessStore,
      IDBPObjectStore<any, ['object-store'], 'object-store'>
    >>(true);

    assert.strictEqual(store.name, 'key-val-store');
    assert.strictEqual(schemalessStore.name, 'object-store');
  });

  test('wrap', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const idb = unwrap(db);
    const tx = idb.transaction('key-val-store');

    assert.notProperty(tx, 'store');

    const wrappedTx = wrap(tx);

    typeAssert<IsExactType<
      typeof wrappedTx,
      IDBPTransaction<unknown, string[]>
    >>(true);

    assert.property(wrappedTx, 'store');
  });

  test('unwrap', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('key-val-store');
    const tx2 = db.transaction('key-val-store');
    const unwrappedTx = unwrap(tx);
    const unwrappedTx2 = unwrap(tx2);

    typeAssert<IsExactType<
      typeof unwrappedTx,
      IDBTransaction
    >>(true);

    typeAssert<IsExactType<
      typeof unwrappedTx2,
      IDBTransaction
    >>(true);

    assert.notProperty(unwrappedTx, 'store');
    assert.notProperty(unwrappedTx2, 'store');
  });
});

suite('IDBPObjectStore', () => {
  let db: IDBPDatabase;

  teardown('Close DB', async () => {
    if (db) db.close();
    await deleteDatabase();
  });

  test('indexNames', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('object-store');
    const tx2 = db.transaction('object-store');

    typeAssert<IsExactType<
      typeof tx.store.indexNames,
      ('date' | 'title')[]
    >>(true);

    typeAssert<IsExactType<
      typeof tx2.store.indexNames,
      string[]
    >>(true);
  });

  test('name', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('object-store');
    const tx2 = db.transaction('object-store');
    const store = db.transaction('object-store').objectStore('object-store');

    typeAssert<IsExactType<
      typeof tx.store.name,
      'object-store'
    >>(true);

    typeAssert<IsExactType<
      typeof tx2.store.name,
      'object-store'
    >>(true);

    typeAssert<IsExactType<
      typeof store.name,
      'object-store'
    >>(true);
  });

  test('transaction', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('object-store');
    const tx2 = db.transaction('object-store');
    const store =
      schemaDB.transaction(['object-store', 'key-val-store']).objectStore('object-store');

    typeAssert<IsExactType<
      typeof tx.store.transaction,
      IDBPTransaction<TestDBSchema, ['object-store']>
    >>(true);

    typeAssert<IsExactType<
      typeof tx2.store.transaction,
      IDBPTransaction<unknown, ['object-store']>
    >>(true);

    typeAssert<IsExactType<
      typeof store.transaction,
      IDBPTransaction<TestDBSchema, ('object-store' | 'key-val-store')[]>
    >>(true);
  });

  test('add', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store', 'readwrite').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.add>[0],
      number
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof store1.add>[1],
      string | IDBKeyRange | undefined
    >>(true);

    const key = await store1.add(234, 'new');

    typeAssert<IsExactType<
      typeof key,
      string
    >>(true);

    const val = await store1.get('new');

    assert.strictEqual(val, 234, 'Correct value from store');

    const store2 = db.transaction('object-store', 'readwrite').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.add>[0],
      any
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof store2.add>[1],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const key2 = await store2.add({
      id: 5,
      title: 'Article 5',
      date: new Date('2018-05-09'),
    });

    typeAssert<IsExactType<
      typeof key2,
      IDBValidKey
    >>(true);

    const val2 = await store2.get(5);

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.deepStrictEqual(
      val2,
      {
        id: 5,
        title: 'Article 5',
        date: new Date('2018-05-09'),
      },
      'Correct value from store',
    );
  });

  test('clear', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store', 'readwrite').store;

    store1.clear();
    const val = await store1.count();

    assert.strictEqual(val, 0, 'Correct value from store');

    const store2 = db.transaction('object-store', 'readwrite').store;

    store2.clear();
    const val2 = await store2.count();

    assert.strictEqual(val2, 0, 'Correct value from store');
  });

  test('count', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.count>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const val = await store1.count();

    typeAssert<IsExactType<
      typeof val,
      number
    >>(true);

    assert.strictEqual(val, 3, 'Correct count');

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.count>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const val2 = await store2.count();

    typeAssert<IsExactType<
      typeof val2,
      number
    >>(true);

    assert.strictEqual(val2, 4, 'Correct count');
  });

  test('createIndex', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('object-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.createIndex>[0],
      'date' | 'title'
    >>(true);

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.createIndex>[0],
      string
    >>(true);
  });

  test('delete', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store', 'readwrite').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.delete>[0],
      string | IDBKeyRange
    >>(true);

    await store1.delete('foo');
    const val = await store1.get('foo');

    assert.strictEqual(val, undefined, 'Correct value from store');

    const store2 = db.transaction('object-store', 'readwrite').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.delete>[0],
      IDBValidKey | IDBKeyRange
    >>(true);

    await store2.delete(1);
    const val2 = await store2.get(1);

    assert.strictEqual(val2, undefined, 'Correct value from store');
  });

  test('get', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.get>[0],
      string | IDBKeyRange
    >>(true);

    const val = await store1.get('foo');

    typeAssert<IsExactType<
      typeof val,
      number | undefined
    >>(true);

    assert.strictEqual(val, 123, 'Correct value from store');

    const store2 = db.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.get>[0],
      IDBValidKey | IDBKeyRange
    >>(true);

    const val2 = await store2.get('bar');

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.strictEqual(val2, 456, 'Correct value from store');
  });

  test('getAll', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.getAll>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const val = await store1.getAll();

    typeAssert<IsExactType<
      typeof val,
      number[]
    >>(true);

    assert.deepStrictEqual(val, [456, 123, 789], 'Correct values from store');

    const store2 = db.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.getAll>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const val2 = await store2.getAll();

    typeAssert<IsExactType<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, [456, 123, 789], 'Correct values from store');
  });

  test('getAllKeys', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.getAllKeys>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const val = await store1.getAllKeys();

    typeAssert<IsExactType<
      typeof val,
      string[]
    >>(true);

    assert.deepStrictEqual(val, ['bar', 'foo', 'hello'], 'Correct values from store');

    const store2 = db.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.getAllKeys>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const val2 = await store2.getAllKeys();

    typeAssert<IsExactType<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, ['bar', 'foo', 'hello'], 'Correct values from store');
  });

  test('getKey', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.getKey>[0],
      string | IDBKeyRange
    >>(true);

    const val = await store1.getKey(IDBKeyRange.lowerBound('a'));

    typeAssert<IsExactType<
      typeof val,
      string | undefined
    >>(true);

    assert.strictEqual(val, 'bar', 'Correct value');

    const store2 = db.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.getKey>[0],
      IDBValidKey | IDBKeyRange
    >>(true);

    const val2 = await store2.getKey(IDBKeyRange.lowerBound('c'));

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.strictEqual(val2, 'foo', 'Correct value');
  });

  test('index', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('object-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.index>[0],
      'date' | 'title'
    >>(true);

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.index>[0],
      string
    >>(true);
  });

  test('openCursor', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.openCursor>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const cursor1 = await store1.openCursor();

    typeAssert<IsExactType<
      typeof cursor1,
      IDBPCursorWithValue<TestDBSchema, ['key-val-store'], 'key-val-store', unknown> | null
    >>(true);

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.openCursor>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const cursor2 = await store2.openCursor();

    typeAssert<IsExactType<
      typeof cursor2,
      IDBPCursorWithValue<unknown, ['object-store'], 'object-store', unknown> | null
    >>(true);
  });

  test('openKeyCursor', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.openKeyCursor>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const cursor1 = await store1.openKeyCursor();

    typeAssert<IsExactType<
      typeof cursor1,
      IDBPCursor<TestDBSchema, ['key-val-store'], 'key-val-store', unknown> | null
    >>(true);

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.openKeyCursor>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const cursor2 = await store2.openKeyCursor();

    typeAssert<IsExactType<
      typeof cursor2,
      IDBPCursor<unknown, ['object-store'], 'object-store', unknown> | null
    >>(true);
  });

  test('put', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store', 'readwrite').store;

    typeAssert<IsExactType<
      Parameters<typeof store1.put>[0],
      number
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof store1.put>[1],
      string | IDBKeyRange | undefined
    >>(true);

    const key = await store1.put(234, 'new');

    typeAssert<IsExactType<
      typeof key,
      string
    >>(true);

    const val = await store1.get('new');

    assert.strictEqual(val, 234, 'Correct value from store');

    const store2 = db.transaction('object-store', 'readwrite').store;

    typeAssert<IsExactType<
      Parameters<typeof store2.put>[0],
      any
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof store2.put>[1],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const key2 = await store2.put({
      id: 5,
      title: 'Article 5',
      date: new Date('2018-05-09'),
    });

    typeAssert<IsExactType<
      typeof key2,
      IDBValidKey
    >>(true);

    const val2 = await store2.get(5);

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.deepStrictEqual(
      val2,
      {
        id: 5,
        title: 'Article 5',
        date: new Date('2018-05-09'),
      },
      'Correct value from store',
    );
  });

  test('wrap', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('key-val-store');
    const idbTx = unwrap(tx);
    const store = idbTx.objectStore('key-val-store');

    assert.instanceOf(store.get('blah'), IDBRequest);

    const wrappedStore = wrap(store);

    typeAssert<IsExactType<
      typeof wrappedStore,
      IDBPObjectStore
    >>(true);

    assert.instanceOf(wrappedStore.get('blah'), Promise);
  });

  test('unwrap', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;
    const store2 = db.transaction('key-val-store').store;
    const unwrappedStore1 = unwrap(store1);
    const unwrappedStore2 = unwrap(store2);

    typeAssert<IsExactType<
      typeof unwrappedStore1,
      IDBObjectStore
    >>(true);

    typeAssert<IsExactType<
      typeof unwrappedStore2,
      IDBObjectStore
    >>(true);

    assert.instanceOf(unwrappedStore1.get('foo'), IDBRequest);
    assert.instanceOf(unwrappedStore2.get('foo'), IDBRequest);
  });
});

suite('IDBPIndex', () => {
  let db: IDBPDatabase;

  teardown('Close DB', async () => {
    if (db) db.close();
  });

  test('objectStore', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const index1 = schemaDB.transaction('object-store').store.index('date');
    const index2 = schemaDB.transaction(['object-store', 'key-val-store'])
      .objectStore('object-store').index('date');
    const index3 = db.transaction('object-store').store.index('date');

    typeAssert<IsExactType<
      typeof index1.objectStore,
      IDBPObjectStore<TestDBSchema, ['object-store'], 'object-store'>
    >>(true);

    typeAssert<IsExactType<
      typeof index2.objectStore,
      IDBPObjectStore<TestDBSchema, ('object-store' | 'key-val-store')[], 'object-store'>
    >>(true);

    typeAssert<IsExactType<
      typeof index3.objectStore,
      IDBPObjectStore<unknown, ['object-store'], 'object-store'>
    >>(true);
  });

  test('count', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const index1 = schemaDB.transaction('object-store').store.index('date');

    typeAssert<IsExactType<
      Parameters<typeof index1.count>[0],
      Date | IDBKeyRange | undefined
    >>(true);

    const val = await index1.count();

    typeAssert<IsExactType<
      typeof val,
      number
    >>(true);

    assert.strictEqual(val, 4, 'Correct count');

    const index2 = db.transaction('object-store').store.index('title');

    typeAssert<IsExactType<
      Parameters<typeof index2.count>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const val2 = await index2.count();

    typeAssert<IsExactType<
      typeof val2,
      number
    >>(true);

    assert.strictEqual(val2, 4, 'Correct count');
  });

  test('get', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const index1 = schemaDB.transaction('object-store').store.index('date');

    typeAssert<IsExactType<
      Parameters<typeof index1.get>[0],
      Date | IDBKeyRange
    >>(true);

    const val = await index1.get(new Date('2019-01-03'));

    typeAssert<IsExactType<
      typeof val,
      ObjectStoreValue | undefined
    >>(true);

    assert.deepStrictEqual(
      val,
      {
        id: 2,
        title: 'Article 2',
        date: new Date('2019-01-03'),
      },
      'Correct value from store',
    );

    const index2 = db.transaction('object-store').store.index('title');

    typeAssert<IsExactType<
      Parameters<typeof index2.get>[0],
      IDBValidKey | IDBKeyRange
    >>(true);

    const val2 = await index2.get('Article 2');

    typeAssert<IsExactType<
      typeof val2,
      any
    >>(true);

    assert.deepStrictEqual(
      val2,
      {
        id: 2,
        title: 'Article 2',
        date: new Date('2019-01-03'),
      },
      'Correct value from store',
    );
  });

  test('getAll', async () => {
    assert.fail('TODO');
  });

  test('getAllKeys', async () => {
    assert.fail('TODO');
  });

  test('getKey', async () => {
    assert.fail('TODO');
  });

  test('openCursor', async () => {
    assert.fail('TODO');
  });

  test('openKeyCursor', async () => {
    assert.fail('TODO');
  });

  test('wrap', async () => {
    assert.fail('TODO');
  });

  test('unwrap', async () => {
    assert.fail('TODO');
  });
});

suite('IDBPCursor', () => {
  test('key', async () => {
    assert.fail('TODO');
  });
  test('primaryKey', async () => {
    assert.fail('TODO');
  });
  test('source', async () => {
    assert.fail('TODO');
  });
  test('advance', async () => {
    assert.fail('TODO');
  });
  test('continue', async () => {
    assert.fail('TODO');
  });
  test('continuePrimaryKey', async () => {
    assert.fail('TODO');
  });
  test('delete', async () => {
    assert.fail('TODO');
  });
  test('update', async () => {
    assert.fail('TODO');
  });
  test('wrap', async () => {
    assert.fail('TODO');
  });
  test('unwrap', async () => {
    assert.fail('TODO');
  });
});

suite('IDBPCursorWithValue', () => {
  test('value', async () => {
    assert.fail('TODO');
  });
  test('wrap', async () => {
    assert.fail('TODO');
  });
  test('unwrap', async () => {
    assert.fail('TODO');
  });
});

deleteDatabase().then(() => mocha.run());
