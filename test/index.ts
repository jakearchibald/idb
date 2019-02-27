// Since this library proxies IDB, I haven't retested all of IDB. I've tried to cover parts of the
// library that behave differently to IDB, or may cause accidental differences.

import 'mocha/mocha';
import { assert } from 'chai';
import {
  DBSchema, openDB, IDBPDatabase, IDBPTransaction, deleteDB, wrap, unwrap, DeleteDBCallbacks,
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
    });

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
    });

    assert.isFalse(blockedCalled);
    assert.isFalse(blockingCalled);

    db = await openDB<TestDBSchema>(dbName, getNextVersion(), {
      blocked() { newDbBlockedCalled = true; },
      blocking() { newDbBlockingCalled = true; },
    });

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
    db = await openPromise;
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
    db = await openDBWithSchema();
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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

    typeAssert<IsExactType<
      Parameters<typeof schemaDB.transaction>[0],
      ('key-val-store' | 'object-store')[]
    >>(true);

    typeAssert<IsExactType<
      Parameters<typeof db.transaction>[0],
      string[]
    >>(true);
  });

  test('get', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
    db = schemaDB;

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
  // test upgrade transaction
  test('objectStoreNames', async () => {
    assert.fail('TODO');
  });
  test('db', async () => {
    assert.fail('TODO');
  });
  test('done', async () => {
    assert.fail('TODO');
  });
  test('store', async () => {
    assert.fail('TODO');
  });
  test('objectStore', async () => {
    assert.fail('TODO');
  });
  test('wrap', async () => {
    assert.fail('TODO');
  });
  test('unwrap', async () => {
    assert.fail('TODO');
  });
});

suite('IDBPObjectStore', () => {
  test('indexNames', async () => {
    assert.fail('TODO');
  });
  test('name', async () => {
    assert.fail('TODO');
  });
  test('transaction', async () => {
    assert.fail('TODO');
  });
  test('add', async () => {
    assert.fail('TODO');
  });
  test('clear', async () => {
    assert.fail('TODO');
  });
  test('count', async () => {
    assert.fail('TODO');
  });
  test('createIndex', async () => {
    assert.fail('TODO');
  });
  test('delete', async () => {
    assert.fail('TODO');
  });
  test('get', async () => {
    assert.fail('TODO');
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
  test('index', async () => {
    assert.fail('TODO');
  });
  test('openCursor', async () => {
    assert.fail('TODO');
  });
  test('openKeyCursor', async () => {
    assert.fail('TODO');
  });
  test('put', async () => {
    assert.fail('TODO');
  });
  test('wrap', async () => {
    assert.fail('TODO');
  });
  test('unwrap', async () => {
    assert.fail('TODO');
  });
});

suite('IDBPIndex', () => {
  test('objectStore', async () => {
    assert.fail('TODO');
  });
  test('count', async () => {
    assert.fail('TODO');
  });
  test('get', async () => {
    assert.fail('TODO');
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