import 'mocha/mocha';
import { assert } from 'chai';
import {
  IDBPDatabase,
  IDBPTransaction,
  wrap,
  unwrap,
  IDBPObjectStore,
  IDBPCursorWithValue,
  IDBPCursor,
  IDBPIndex,
} from '../lib/';
import { assert as typeAssert, IsExact } from 'conditional-type-checks';
import {
  deleteDatabase, openDBWithSchema, openDBWithData, ObjectStoreValue, TestDBSchema,
} from './utils';

suite('IDBPDatabase', () => {
  let db: IDBPDatabase;

  teardown('Close DB', async () => {
    if (db) db.close();
    await deleteDatabase();
  });

  test('objectStoreNames', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    typeAssert<IsExact<
      typeof schemaDB.objectStoreNames,
      ('key-val-store' | 'object-store')[]
    >>(true);

    typeAssert<IsExact<
      typeof db.objectStoreNames,
      string[]
    >>(true);
  });

  test('createObjectStore', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    typeAssert<IsExact<
      Parameters<typeof schemaDB.createObjectStore>[0],
      ('key-val-store' | 'object-store')
    >>(true);

    typeAssert<IsExact<
      Parameters<typeof db.createObjectStore>[0],
      string
    >>(true);
  });

  test('deleteObjectStore', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    typeAssert<IsExact<
      Parameters<typeof schemaDB.deleteObjectStore>[0],
      ('key-val-store' | 'object-store')
    >>(true);

    typeAssert<IsExact<
      Parameters<typeof db.deleteObjectStore>[0],
      string
    >>(true);
  });

  test('transaction', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    typeAssert<IsExact<
      Parameters<typeof schemaDB.transaction>[0],
      ('key-val-store' | 'object-store')[]
    >>(true);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      Parameters<typeof schemaDB.get>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.get('key-val-store', 'foo');

    typeAssert<IsExact<
      typeof val,
      number | undefined
    >>(true);

    assert.strictEqual(val, 123, 'Correct value from store');

    const val2 = await db.get('key-val-store', 'bar');

    typeAssert<IsExact<
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

    typeAssert<IsExact<
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

    typeAssert<IsExact<
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

  test('getKey', async function () {
    if (!('getKey' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getKey', 'Method exists');

    typeAssert<IsExact<
      Parameters<typeof schemaDB.getKey>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.getKey('key-val-store', IDBKeyRange.lowerBound('a'));

    typeAssert<IsExact<
      typeof val,
      string | undefined
    >>(true);

    assert.strictEqual(val, 'bar', 'Correct value');

    const val2 = await db.getKey('key-val-store', IDBKeyRange.lowerBound('c'));

    typeAssert<IsExact<
      typeof val2,
      IDBValidKey | undefined
    >>(true);

    assert.strictEqual(val2, 'foo', 'Correct value');
  });

  test('getKeyFromIndex', async function () {
    if (!('getKey' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getKeyFromIndex', 'Method exists');

    const val = await schemaDB.getKeyFromIndex(
      'object-store', 'title', IDBKeyRange.lowerBound('A'),
    );

    typeAssert<IsExact<
      typeof val,
      number | undefined
    >>(true);

    assert.strictEqual(val, 1, 'Correct value');

    const val2 = await db.getKeyFromIndex(
      'object-store', 'date', IDBKeyRange.lowerBound(new Date('1990-01-01')),
    );

    typeAssert<IsExact<
      typeof val2,
      IDBValidKey | undefined
    >>(true);

    assert.strictEqual(val2, 4, 'Correct value');
  });

  test('getAll', async function () {
    if (!('getAll' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getAll', 'Method exists');

    typeAssert<IsExact<
      Parameters<typeof schemaDB.getAll>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.getAll('key-val-store');

    typeAssert<IsExact<
      typeof val,
      number[]
    >>(true);

    assert.deepStrictEqual(val, [456, 123, 789], 'Correct values from store');

    const val2 = await db.getAll('key-val-store');

    typeAssert<IsExact<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, [456, 123, 789], 'Correct values from store');
  });

  test('getAllFromIndex', async function () {
    if (!('getAll' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getAllFromIndex', 'Method exists');
    const val = await schemaDB.getAllFromIndex('object-store', 'date');

    typeAssert<IsExact<
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

    typeAssert<IsExact<
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

  test('getAllKeys', async function () {
    if (!('getAllKeys' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getAllKeys', 'Method exists');

    typeAssert<IsExact<
      Parameters<typeof schemaDB.getAllKeys>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.getAllKeys('key-val-store');

    typeAssert<IsExact<
      typeof val,
      string[]
    >>(true);

    assert.deepStrictEqual(val, ['bar', 'foo', 'hello'], 'Correct values from store');

    const val2 = await db.getAllKeys('key-val-store');

    typeAssert<IsExact<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, ['bar', 'foo', 'hello'], 'Correct values from store');
  });

  test('getAllKeysFromIndex', async function () {
    if (!('getAllKeys' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'getAllKeysFromIndex', 'Method exists');
    const val = await schemaDB.getAllKeysFromIndex('object-store', 'date');

    typeAssert<IsExact<
      typeof val,
      number[]
    >>(true);

    assert.deepStrictEqual(val, [4, 3, 2, 1], 'Correct values from store');

    const val2 = await db.getAllKeysFromIndex('object-store', 'title');

    typeAssert<IsExact<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, [1, 2, 3, 4], 'Correct values from store');
  });

  test('count', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'count', 'Method exists');

    typeAssert<IsExact<
      Parameters<typeof schemaDB.count>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const val = await schemaDB.count('key-val-store');

    typeAssert<IsExact<
      typeof val,
      number
    >>(true);

    assert.strictEqual(val, 3, 'Correct count');

    const val2 = await db.count('object-store');

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof val,
      number
    >>(true);

    assert.strictEqual(val, 4, 'Correct count');

    const val2 = await db.countFromIndex(
      'object-store', 'title', IDBKeyRange.lowerBound('Article 10'),
    );

    typeAssert<IsExact<
      typeof val2,
      number
    >>(true);

    assert.strictEqual(val2, 3, 'Correct count');
  });

  test('put', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    assert.property(schemaDB, 'put', 'Method exists');

    typeAssert<IsExact<
      Parameters<typeof schemaDB.put>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const key = await schemaDB.put('key-val-store', 234, 'new');

    typeAssert<IsExact<
      typeof key,
      string
    >>(true);

    assert.strictEqual(key, 'new');

    const val = await schemaDB.get('key-val-store', 'new');

    assert.strictEqual(val, 234, 'Correct value from store');

    const key2 = await db.put('object-store', {
      id: 5,
      title: 'Article 5',
      date: new Date('2018-05-09'),
    });

    typeAssert<IsExact<
      typeof key2,
      IDBValidKey
    >>(true);

    assert.strictEqual(key2, 5);

    const val2 = await db.get('object-store', 5);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      Parameters<typeof schemaDB.add>[0],
      'key-val-store' | 'object-store'
    >>(true);

    const key = await schemaDB.add('key-val-store', 234, 'new');

    typeAssert<IsExact<
      typeof key,
      string
    >>(true);

    assert.strictEqual(key, 'new');

    const val = await schemaDB.get('key-val-store', 'new');

    assert.strictEqual(val, 234, 'Correct value from store');

    const key2 = await db.add('object-store', {
      id: 5,
      title: 'Article 5',
      date: new Date('2018-05-09'),
    });

    typeAssert<IsExact<
      typeof key2,
      IDBValidKey
    >>(true);

    assert.strictEqual(key2, 5);

    const val2 = await db.get('object-store', 5);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
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

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof tx1.objectStoreNames,
      ['key-val-store']
    >>(true);

    typeAssert<IsExact<
      typeof tx2.objectStoreNames,
      ['object-store']
    >>(true);

    typeAssert<IsExact<
      typeof tx3.objectStoreNames,
      ('object-store' | 'key-val-store')[]
    >>(true);

    // Without schema it should still work:
    const tx4 = db.transaction('key-val-store');

    typeAssert<IsExact<
      typeof tx4.objectStoreNames,
      ['key-val-store']
    >>(true);
  });

  test('db', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('key-val-store');

    typeAssert<IsExact<
      typeof tx.db,
      IDBPDatabase<TestDBSchema>
    >>(true);

    const tx2 = db.transaction('key-val-store');

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof tx.store,
      IDBPObjectStore<TestDBSchema, ['key-val-store'], 'key-val-store'>
    >>(true);

    assert.instanceOf(tx.store, IDBObjectStore);
    assert.strictEqual(tx.store.name, 'key-val-store');

    assert.instanceOf(tx.store.get('blah'), Promise, 'Is the store wrapped?');

    const tx2 = schemaDB.transaction(['key-val-store', 'object-store']);
    assert.property(tx2, 'store');

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      Parameters<typeof tx1.objectStore>[0],
      'key-val-store'
    >>(true);

    typeAssert<IsExact<
      Parameters<typeof tx3.objectStore>[0],
      'key-val-store' | 'object-store'
    >>(true);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof store,
      IDBPObjectStore<TestDBSchema, ['key-val-store'], 'key-val-store'>
    >>(true);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof unwrappedTx,
      IDBTransaction
    >>(true);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof tx.store.indexNames,
      ('date' | 'title')[]
    >>(true);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof tx.store.name,
      'object-store'
    >>(true);

    typeAssert<IsExact<
      typeof tx2.store.name,
      'object-store'
    >>(true);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof tx.store.transaction,
      IDBPTransaction<TestDBSchema, ['object-store']>
    >>(true);

    typeAssert<IsExact<
      typeof tx2.store.transaction,
      IDBPTransaction<unknown, ['object-store']>
    >>(true);

    typeAssert<IsExact<
      typeof store.transaction,
      IDBPTransaction<TestDBSchema, ('object-store' | 'key-val-store')[]>
    >>(true);
  });

  test('add', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store', 'readwrite').store;

    typeAssert<IsExact<
      Parameters<typeof store1.add>[0],
      number
    >>(true);

    typeAssert<IsExact<
      Parameters<typeof store1.add>[1],
      string | IDBKeyRange | undefined
    >>(true);

    const key = await store1.add(234, 'new');

    typeAssert<IsExact<
      typeof key,
      string
    >>(true);

    const val = await store1.get('new');

    assert.strictEqual(val, 234, 'Correct value from store');

    const store2 = db.transaction('object-store', 'readwrite').store;

    typeAssert<IsExact<
      Parameters<typeof store2.add>[0],
      any
    >>(true);

    typeAssert<IsExact<
      Parameters<typeof store2.add>[1],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const key2 = await store2.add({
      id: 5,
      title: 'Article 5',
      date: new Date('2018-05-09'),
    });

    typeAssert<IsExact<
      typeof key2,
      IDBValidKey
    >>(true);

    const val2 = await store2.get(5);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      Parameters<typeof store1.count>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const val = await store1.count();

    typeAssert<IsExact<
      typeof val,
      number
    >>(true);

    assert.strictEqual(val, 3, 'Correct count');

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExact<
      Parameters<typeof store2.count>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const val2 = await store2.count();

    typeAssert<IsExact<
      typeof val2,
      number
    >>(true);

    assert.strictEqual(val2, 4, 'Correct count');
  });

  test('createIndex', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('object-store').store;

    typeAssert<IsExact<
      Parameters<typeof store1.createIndex>[0],
      'date' | 'title'
    >>(true);

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExact<
      Parameters<typeof store2.createIndex>[0],
      string
    >>(true);
  });

  test('delete', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store', 'readwrite').store;

    typeAssert<IsExact<
      Parameters<typeof store1.delete>[0],
      string | IDBKeyRange
    >>(true);

    await store1.delete('foo');
    const val = await store1.get('foo');

    assert.strictEqual(val, undefined, 'Correct value from store');

    const store2 = db.transaction('object-store', 'readwrite').store;

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      Parameters<typeof store1.get>[0],
      string | IDBKeyRange
    >>(true);

    const val = await store1.get('foo');

    typeAssert<IsExact<
      typeof val,
      number | undefined
    >>(true);

    assert.strictEqual(val, 123, 'Correct value from store');

    const store2 = db.transaction('key-val-store').store;

    typeAssert<IsExact<
      Parameters<typeof store2.get>[0],
      IDBValidKey | IDBKeyRange
    >>(true);

    const val2 = await store2.get('bar');

    typeAssert<IsExact<
      typeof val2,
      any
    >>(true);

    assert.strictEqual(val2, 456, 'Correct value from store');
  });

  test('getAll', async function () {
    if (!('getAll' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExact<
      Parameters<typeof store1.getAll>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const val = await store1.getAll();

    typeAssert<IsExact<
      typeof val,
      number[]
    >>(true);

    assert.deepStrictEqual(val, [456, 123, 789], 'Correct values from store');

    const store2 = db.transaction('key-val-store').store;

    typeAssert<IsExact<
      Parameters<typeof store2.getAll>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const val2 = await store2.getAll();

    typeAssert<IsExact<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, [456, 123, 789], 'Correct values from store');
  });

  test('getAllKeys', async function () {
    if (!('getAllKeys' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExact<
      Parameters<typeof store1.getAllKeys>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const val = await store1.getAllKeys();

    typeAssert<IsExact<
      typeof val,
      string[]
    >>(true);

    assert.deepStrictEqual(val, ['bar', 'foo', 'hello'], 'Correct values from store');

    const store2 = db.transaction('key-val-store').store;

    typeAssert<IsExact<
      Parameters<typeof store2.getAllKeys>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const val2 = await store2.getAllKeys();

    typeAssert<IsExact<
      typeof val2,
      any[]
    >>(true);

    assert.deepStrictEqual(val2, ['bar', 'foo', 'hello'], 'Correct values from store');
  });

  test('getKey', async function () {
    if (!('getKey' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExact<
      Parameters<typeof store1.getKey>[0],
      string | IDBKeyRange
    >>(true);

    const val = await store1.getKey(IDBKeyRange.lowerBound('a'));

    typeAssert<IsExact<
      typeof val,
      string | undefined
    >>(true);

    assert.strictEqual(val, 'bar', 'Correct value');

    const store2 = db.transaction('key-val-store').store;

    typeAssert<IsExact<
      Parameters<typeof store2.getKey>[0],
      IDBValidKey | IDBKeyRange
    >>(true);

    const val2 = await store2.getKey(IDBKeyRange.lowerBound('c'));

    typeAssert<IsExact<
      typeof val2,
      IDBValidKey | undefined
    >>(true);

    assert.strictEqual(val2, 'foo', 'Correct value');
  });

  test('index', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('object-store').store;

    typeAssert<IsExact<
      Parameters<typeof store1.index>[0],
      'date' | 'title'
    >>(true);

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExact<
      Parameters<typeof store2.index>[0],
      string
    >>(true);
  });

  test('openCursor', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExact<
      Parameters<typeof store1.openCursor>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const cursor1 = await store1.openCursor();

    typeAssert<IsExact<
      typeof cursor1,
      IDBPCursorWithValue<TestDBSchema, ['key-val-store'], 'key-val-store', unknown> | null
    >>(true);

    assert.instanceOf(cursor1, IDBCursorWithValue);

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExact<
      Parameters<typeof store2.openCursor>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const cursor2 = await store2.openCursor();

    typeAssert<IsExact<
      typeof cursor2,
      IDBPCursorWithValue<unknown, ['object-store'], 'object-store', unknown> | null
    >>(true);

    assert.instanceOf(cursor2, IDBCursorWithValue);
  });

  test('openKeyCursor', async function () {
    if (!('openKeyCursor' in IDBObjectStore.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store').store;

    typeAssert<IsExact<
      Parameters<typeof store1.openKeyCursor>[0],
      string | IDBKeyRange | undefined
    >>(true);

    const cursor1 = await store1.openKeyCursor();

    typeAssert<IsExact<
      typeof cursor1,
      IDBPCursor<TestDBSchema, ['key-val-store'], 'key-val-store', unknown> | null
    >>(true);

    const store2 = db.transaction('object-store').store;

    typeAssert<IsExact<
      Parameters<typeof store2.openKeyCursor>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const cursor2 = await store2.openKeyCursor();

    typeAssert<IsExact<
      typeof cursor2,
      IDBPCursor<unknown, ['object-store'], 'object-store', unknown> | null
    >>(true);
  });

  test('put', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store1 = schemaDB.transaction('key-val-store', 'readwrite').store;

    typeAssert<IsExact<
      Parameters<typeof store1.put>[0],
      number
    >>(true);

    typeAssert<IsExact<
      Parameters<typeof store1.put>[1],
      string | IDBKeyRange | undefined
    >>(true);

    const key = await store1.put(234, 'new');

    typeAssert<IsExact<
      typeof key,
      string
    >>(true);

    const val = await store1.get('new');

    assert.strictEqual(val, 234, 'Correct value from store');

    const store2 = db.transaction('object-store', 'readwrite').store;

    typeAssert<IsExact<
      Parameters<typeof store2.put>[0],
      any
    >>(true);

    typeAssert<IsExact<
      Parameters<typeof store2.put>[1],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const key2 = await store2.put({
      id: 5,
      title: 'Article 5',
      date: new Date('2018-05-09'),
    });

    typeAssert<IsExact<
      typeof key2,
      IDBValidKey
    >>(true);

    const val2 = await store2.get(5);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof unwrappedStore1,
      IDBObjectStore
    >>(true);

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      typeof index1.objectStore,
      IDBPObjectStore<TestDBSchema, ['object-store'], 'object-store'>
    >>(true);

    typeAssert<IsExact<
      typeof index2.objectStore,
      IDBPObjectStore<TestDBSchema, ('object-store' | 'key-val-store')[], 'object-store'>
    >>(true);

    typeAssert<IsExact<
      typeof index3.objectStore,
      IDBPObjectStore<unknown, ['object-store'], 'object-store'>
    >>(true);
  });

  test('count', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const index1 = schemaDB.transaction('object-store').store.index('date');

    typeAssert<IsExact<
      Parameters<typeof index1.count>[0],
      Date | IDBKeyRange | undefined
    >>(true);

    const val = await index1.count();

    typeAssert<IsExact<
      typeof val,
      number
    >>(true);

    assert.strictEqual(val, 4, 'Correct count');

    const index2 = db.transaction('object-store').store.index('title');

    typeAssert<IsExact<
      Parameters<typeof index2.count>[0],
      IDBValidKey | IDBKeyRange | undefined
    >>(true);

    const val2 = await index2.count();

    typeAssert<IsExact<
      typeof val2,
      number
    >>(true);

    assert.strictEqual(val2, 4, 'Correct count');
  });

  test('get', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const index1 = schemaDB.transaction('object-store').store.index('date');

    typeAssert<IsExact<
      Parameters<typeof index1.get>[0],
      Date | IDBKeyRange
    >>(true);

    const val = await index1.get(new Date('2019-01-03'));

    typeAssert<IsExact<
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

    typeAssert<IsExact<
      Parameters<typeof index2.get>[0],
      IDBValidKey | IDBKeyRange
    >>(true);

    const val2 = await index2.get('Article 2');

    typeAssert<IsExact<
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

  test('getAll', async function () {
    if (!('getAll' in IDBIndex.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');

      typeAssert<IsExact<
      Parameters<typeof index.getAll>[0],
        Date | IDBKeyRange | undefined
      >>(true);

      const val = await index.getAll();

      typeAssert<IsExact<
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
    }

    {
      const index = db.transaction('object-store').store.index('title');

      typeAssert<IsExact<
      Parameters<typeof index.getAll>[0],
        IDBValidKey | IDBKeyRange | undefined
      >>(true);

      const val = await index.getAll();

      typeAssert<IsExact<
        typeof val,
        any[]
      >>(true);

      assert.deepStrictEqual(
        val,
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
    }
  });

  test('getAllKeys', async function () {
    if (!('getAllKeys' in IDBIndex.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');

      typeAssert<IsExact<
      Parameters<typeof index.getAllKeys>[0],
        Date | IDBKeyRange | undefined
      >>(true);

      const val = await index.getAllKeys();

      typeAssert<IsExact<
        typeof val,
        number[]
      >>(true);

      assert.deepStrictEqual(val, [4, 3, 2, 1], 'Correct values from store');
    }

    {
      const index = db.transaction('object-store').store.index('title');

      typeAssert<IsExact<
      Parameters<typeof index.getAllKeys>[0],
        IDBValidKey | IDBKeyRange | undefined
      >>(true);

      const val = await index.getAllKeys();

      typeAssert<IsExact<
        typeof val,
        any[]
      >>(true);

      assert.deepStrictEqual(val, [1, 2, 3, 4], 'Correct values from store');
    }
  });

  test('getKey', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');

      typeAssert<IsExact<
      Parameters<typeof index.getKey>[0],
        Date | IDBKeyRange
      >>(true);

      const val = await index.getKey(IDBKeyRange.lowerBound(new Date('1990-01-01')));

      typeAssert<IsExact<
        typeof val,
        number | undefined
      >>(true);

      assert.strictEqual(val, 4, 'Correct value');
    }

    {
      const index = db.transaction('object-store').store.index('title');

      typeAssert<IsExact<
      Parameters<typeof index.getKey>[0],
        IDBValidKey | IDBKeyRange
      >>(true);

      const val = await index.getKey(IDBKeyRange.lowerBound('A'));

      typeAssert<IsExact<
        typeof val,
        IDBValidKey | undefined
      >>(true);

      assert.strictEqual(val, 1, 'Correct value');
    }
  });

  test('openCursor', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');

      typeAssert<IsExact<
        Parameters<typeof index.openCursor>[0],
        Date | IDBKeyRange | undefined
      >>(true);

      const cursor = await index.openCursor();

      typeAssert<IsExact<
        typeof cursor,
        IDBPCursorWithValue<TestDBSchema, ['object-store'], 'object-store', 'date'> | null
      >>(true);

      assert.instanceOf(cursor, IDBCursorWithValue);
    }

    {
      const index = db.transaction('object-store').store.index('title');

      typeAssert<IsExact<
        Parameters<typeof index.openCursor>[0],
        IDBValidKey | IDBKeyRange | undefined
      >>(true);

      const cursor = await index.openCursor();

      typeAssert<IsExact<
        typeof cursor,
        IDBPCursorWithValue<unknown, ['object-store'], 'object-store', 'title'> | null
      >>(true);

      assert.instanceOf(cursor, IDBCursorWithValue);
    }
  });

  test('openKeyCursor', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');

      typeAssert<IsExact<
        Parameters<typeof index.openKeyCursor>[0],
        Date | IDBKeyRange | undefined
      >>(true);

      const cursor = await index.openKeyCursor();

      typeAssert<IsExact<
        typeof cursor,
        IDBPCursor<TestDBSchema, ['object-store'], 'object-store', 'date'> | null
      >>(true);

      assert.instanceOf(cursor, IDBCursor);
    }

    {
      const index = db.transaction('object-store').store.index('title');

      typeAssert<IsExact<
        Parameters<typeof index.openKeyCursor>[0],
        IDBValidKey | IDBKeyRange | undefined
      >>(true);

      const cursor = await index.openKeyCursor();

      typeAssert<IsExact<
        typeof cursor,
        IDBPCursor<unknown, ['object-store'], 'object-store', 'title'> | null
      >>(true);

      assert.instanceOf(cursor, IDBCursor);
    }
  });

  test('wrap', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('object-store');
    const idbTx = unwrap(tx);
    const index = idbTx.objectStore('object-store').index('date');

    assert.instanceOf(index.get('blah'), IDBRequest);

    const wrappedIndex = wrap(index);

    typeAssert<IsExact<
      typeof wrappedIndex,
      IDBPIndex
    >>(true);

    assert.instanceOf(wrappedIndex.get('blah'), Promise);
  });

  test('unwrap', async () => {
    const schemaDB = await openDBWithSchema();
    db = schemaDB as IDBPDatabase;

    const index1 = schemaDB.transaction('object-store').store.index('date');
    const index2 = db.transaction('object-store').store.index('title');
    const unwrappedIndex1 = unwrap(index1);
    const unwrappedIndex2 = unwrap(index2);

    typeAssert<IsExact<
      typeof unwrappedIndex1,
      IDBIndex
    >>(true);

    typeAssert<IsExact<
      typeof unwrappedIndex2,
      IDBIndex
    >>(true);

    assert.instanceOf(unwrappedIndex1.get('foo'), IDBRequest);
    assert.instanceOf(unwrappedIndex2.get('foo'), IDBRequest);
  });
});

suite('IDBPCursor', () => {
  let db: IDBPDatabase;

  teardown('Close DB', async () => {
    if (db) db.close();
    await deleteDatabase();
  });

  test('key', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');
      const cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        typeof cursor.key,
        Date
      >>(true);

      assert.instanceOf(cursor.key, Date);
      assert.strictEqual(cursor.key.valueOf(), new Date('2019-01-01').valueOf());
    }

    {
      const index = db.transaction('object-store').store.index('title');
      const cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        typeof cursor.key,
        IDBValidKey
      >>(true);

      assert.strictEqual(cursor.key, 'Article 1');
    }
  });

  test('primaryKey', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');
      const cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        typeof cursor.primaryKey,
        number
      >>(true);

      assert.strictEqual(cursor.primaryKey, 4);
    }

    {
      const index = db.transaction('object-store').store.index('title');
      const cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        typeof cursor.primaryKey,
        IDBValidKey
      >>(true);

      assert.strictEqual(cursor.primaryKey, 1);
    }
  });

  test('source', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');
      const cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        typeof cursor.source,
        IDBPIndex<TestDBSchema, ['object-store'], 'object-store', 'date'>
      >>(true);
    }

    {
      const index = db.transaction('object-store').store.index('title');
      const cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        typeof cursor.source,
        IDBPIndex<unknown, ['object-store'], 'object-store', 'title'>
      >>(true);
    }
  });

  test('advance', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');
      let cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      cursor = await cursor.advance(2);

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      assert.strictEqual(cursor.primaryKey, 2);
    }

    {
      const index = db.transaction('object-store').store.index('title');
      let cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      cursor = await cursor.advance(2);

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      assert.strictEqual(cursor.primaryKey, 3);
    }
  });

  test('continue', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');
      let cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        Parameters<typeof cursor.continue>[0],
        Date | undefined
      >>(true);

      cursor = await cursor.continue(new Date('2019-01-02T05:00:00.000Z'));

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      assert.strictEqual(cursor.primaryKey, 2);
    }

    {
      const index = db.transaction('object-store').store.index('title');
      let cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        Parameters<typeof cursor.continue>[0],
        IDBValidKey | undefined
      >>(true);

      cursor = await cursor.continue('Article 20');

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      assert.strictEqual(cursor.primaryKey, 3);
    }
  });

  test('continuePrimaryKey', async function () {
    if (!('continuePrimaryKey' in IDBCursor.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');
      let cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        Parameters<typeof cursor.continuePrimaryKey>[0],
        Date
      >>(true);

      typeAssert<IsExact<
        Parameters<typeof cursor.continuePrimaryKey>[1],
        number
      >>(true);

      cursor = await cursor.continuePrimaryKey(
        new Date('2019-01-02T05:00:00.000Z'),
        1.5,
      );

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      assert.strictEqual(cursor.primaryKey, 2);
    }

    {
      const index = db.transaction('object-store').store.index('title');
      let cursor = await index.openCursor();

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      typeAssert<IsExact<
        Parameters<typeof cursor.continuePrimaryKey>[0],
        IDBValidKey
      >>(true);

      typeAssert<IsExact<
        Parameters<typeof cursor.continuePrimaryKey>[1],
        IDBValidKey
      >>(true);

      cursor = await cursor.continuePrimaryKey('Article 3', 3.5);

      if (!cursor) {
        assert.fail('Expected cursor');
        return;
      }

      assert.strictEqual(cursor.primaryKey, 4);
    }
  });

  test('delete', async function () {
    if (!('delete' in IDBCursor.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const store = schemaDB.transaction('key-val-store', 'readwrite').store;
      let cursor = await store.openCursor();

      while (cursor) {
        if (cursor.value === 456) cursor.delete();
        cursor = await cursor.continue();
      }

      assert.deepEqual(await store.getAll(), [123, 789]);
    }

    {
      const store = db.transaction('key-val-store', 'readwrite').store;
      let cursor = await store.openCursor();

      while (cursor) {
        if (cursor.value === 789) cursor.delete();
        cursor = await cursor.continue();
      }

      assert.deepEqual(await store.getAll(), [123]);
    }
  });

  test('update', async function () {
    if (!('update' in IDBCursor.prototype)) this.skip();
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const store = schemaDB.transaction('key-val-store', 'readwrite').store;
      let cursor = await store.openCursor();

      while (cursor) {
        typeAssert<IsExact<
          Parameters<typeof cursor.update>[0],
          number
        >>(true);

        cursor.update(cursor.value + 1);
        cursor = await cursor.continue();
      }

      assert.deepEqual(await store.getAll(), [457, 124, 790]);
    }

    {
      const store = db.transaction('key-val-store', 'readwrite').store;
      let cursor = await store.openCursor();

      while (cursor) {
        typeAssert<IsExact<
          Parameters<typeof cursor.update>[0],
          any
        >>(true);

        cursor.update(cursor.value + 1);
        cursor = await cursor.continue();
      }

      assert.deepEqual(await store.getAll(), [458, 125, 791]);
    }
  });

  test('unwrap', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const cursor = await schemaDB.transaction('object-store').store.openCursor();
      if (!cursor) throw Error('expected cursor');
      const unwrappedCursor = unwrap(cursor);

      typeAssert<IsExact<
        typeof unwrappedCursor,
        IDBCursorWithValue
      >>(true);

      assert.strictEqual(unwrappedCursor.continue(), undefined);
    }

    {
      const cursor = await db.transaction('object-store').store.openCursor();
      if (!cursor) throw Error('expected cursor');
      const unwrappedCursor = unwrap(cursor);

      typeAssert<IsExact<
        typeof unwrappedCursor,
        IDBCursorWithValue
      >>(true);

      assert.strictEqual(unwrappedCursor.continue(), undefined);
    }
  });
});

suite('IDBPCursorWithValue', () => {
  let db: IDBPDatabase;

  teardown('Close DB', async () => {
    if (db) db.close();
    await deleteDatabase();
  });

  test('unwrap', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const cursor = await schemaDB.transaction('object-store', 'readwrite').store.openCursor();
      if (!cursor) throw Error('expected cursor');
      const unwrappedCursor = unwrap(cursor);

      typeAssert<IsExact<
        typeof unwrappedCursor,
        IDBCursorWithValue
      >>(true);

      assert.instanceOf(unwrappedCursor.update(unwrappedCursor.value), IDBRequest);
    }

    {
      const cursor = await db.transaction('object-store', 'readwrite').store.openCursor();
      if (!cursor) throw Error('expected cursor');
      const unwrappedCursor = unwrap(cursor);

      typeAssert<IsExact<
        typeof unwrappedCursor,
        IDBCursorWithValue
      >>(true);

      assert.instanceOf(unwrappedCursor.update(unwrappedCursor.value), IDBRequest);
    }
  });
});
