// Since this library proxies IDB, I haven't retested all of IDB. I've tried to cover parts of the
// library that behave differently to IDB, or may cause accidental differences.

import 'mocha/mocha';
import { assert } from 'chai';
import {
  IDBPDatabase,
  IDBPCursorWithValueIteratorValue,
} from '../lib/';
import '../lib/async-iterators';
import { assert as typeAssert, IsExact } from 'conditional-type-checks';
import { deleteDatabase, openDBWithData, TestDBSchema, ObjectStoreValue } from './utils';

suite('Async iterators', () => {
  let db: IDBPDatabase;

  teardown('Close DB', async () => {
    if (db) db.close();
    await deleteDatabase();
  });

  test('object stores', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const store = schemaDB.transaction('key-val-store').store;
      const keys = [];
      const values = [];

      assert.isTrue(Symbol.asyncIterator in store);

      for await (const cursor of store) {
        typeAssert<IsExact<
          typeof cursor,
          IDBPCursorWithValueIteratorValue<
            TestDBSchema, ['key-val-store'], 'key-val-store', unknown
          >
        >>(true);

        typeAssert<IsExact<
          typeof cursor.key,
          string
        >>(true);

        typeAssert<IsExact<
          typeof cursor.value,
          number
        >>(true);

        keys.push(cursor.key);
        values.push(cursor.value);
      }

      assert.deepEqual(values, [456, 123, 789], 'Correct values');
      assert.deepEqual(keys, ['bar', 'foo', 'hello'], 'Correct keys');
    }
    {
      const store = db.transaction('key-val-store').store;
      const keys = [];
      const values = [];

      for await (const cursor of store) {
        typeAssert<IsExact<
          typeof cursor,
          IDBPCursorWithValueIteratorValue<
            unknown, ['key-val-store'], 'key-val-store', unknown
          >
        >>(true);

        typeAssert<IsExact<
          typeof cursor.key,
          IDBValidKey
        >>(true);

        typeAssert<IsExact<
          typeof cursor.value,
          any
        >>(true);

        keys.push(cursor.key);
        values.push(cursor.value);
      }

      assert.deepEqual(values, [456, 123, 789], 'Correct values');
      assert.deepEqual(keys, ['bar', 'foo', 'hello'], 'Correct keys');
    }
  });

  test('object stores iterate', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const store = schemaDB.transaction('key-val-store').store;
      assert.property(store, 'iterate');

      typeAssert<IsExact<
        Parameters<typeof store.iterate>[0],
        string | IDBKeyRange | undefined
      >>(true);

      for await (const _ of store.iterate('blah')) {
        assert.fail('This should not be called');
      }
    }
    {
      const store = db.transaction('key-val-store').store;

      typeAssert<IsExact<
        Parameters<typeof store.iterate>[0],
        IDBValidKey | IDBKeyRange | undefined
      >>(true);

      for await (const _ of store.iterate('blah')) {
        assert.fail('This should not be called');
      }
    }
  });

  test('Can delete during iteration', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const tx = schemaDB.transaction('key-val-store', 'readwrite');

    for await (const cursor of tx.store) {
      cursor.delete();
    }

    assert.strictEqual(await schemaDB.count('key-val-store'), 0);
  });

  test('index', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');
      const keys = [];
      const values = [];

      assert.isTrue(Symbol.asyncIterator in index);

      for await (const cursor of index) {
        typeAssert<IsExact<
          typeof cursor,
          IDBPCursorWithValueIteratorValue<
            TestDBSchema, ['object-store'], 'object-store', 'date'
          >
        >>(true);

        typeAssert<IsExact<
          typeof cursor.key,
          Date
        >>(true);

        typeAssert<IsExact<
          typeof cursor.value,
          ObjectStoreValue
        >>(true);

        keys.push(cursor.key);
        values.push(cursor.value);
      }

      assert.deepEqual(
        values,
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
        'Correct values',
      );
      assert.deepEqual(
        keys,
        [
          new Date('2019-01-01'),
          new Date('2019-01-02'),
          new Date('2019-01-03'),
          new Date('2019-01-04'),
        ],
        'Correct keys',
      );
    }
    {
      const index = db.transaction('object-store').store.index('title');
      const keys = [];
      const values = [];

      assert.isTrue(Symbol.asyncIterator in index);

      for await (const cursor of index) {
        typeAssert<IsExact<
          typeof cursor,
          IDBPCursorWithValueIteratorValue<
            unknown, ['object-store'], 'object-store', 'title'
          >
        >>(true);

        typeAssert<IsExact<
          typeof cursor.key,
          IDBValidKey
        >>(true);

        typeAssert<IsExact<
          typeof cursor.value,
          any
        >>(true);

        keys.push(cursor.key);
        values.push(cursor.value);
      }

      assert.deepEqual(
        values,
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
        'Correct values',
      );
      assert.deepEqual(
        keys,
        ['Article 1', 'Article 2', 'Article 3', 'Article 4'],
        'Correct keys',
      );
    }
  });

  test('index iterate', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    {
      const index = schemaDB.transaction('object-store').store.index('date');
      assert.property(index, 'iterate');

      typeAssert<IsExact<
        Parameters<typeof index.iterate>[0],
        Date | IDBKeyRange | undefined
      >>(true);

      for await (const _ of index.iterate(new Date('2020-01-01'))) {
        assert.fail('This should not be called');
      }
    }
    {
      const index = db.transaction('object-store').store.index('title');
      assert.property(index, 'iterate');

      typeAssert<IsExact<
        Parameters<typeof index.iterate>[0],
        IDBValidKey | IDBKeyRange | undefined
      >>(true);

      for await (const _ of index.iterate('foo')) {
        assert.fail('This should not be called');
      }
    }
  });

  test('cursor', async () => {
    const schemaDB = await openDBWithData();
    db = schemaDB as IDBPDatabase;

    const store = schemaDB.transaction('key-val-store').store;
    const cursor = await store.openCursor();

    if (!cursor) throw Error('expected cursor');

    const keys = [];
    const values = [];

    assert.isTrue(Symbol.asyncIterator in cursor);

    for await (const cursorIter of cursor) {
      typeAssert<IsExact<
        typeof cursorIter,
        IDBPCursorWithValueIteratorValue<
          TestDBSchema, ['key-val-store'], 'key-val-store', unknown
        >
      >>(true);

      typeAssert<IsExact<
        typeof cursorIter.key,
        string
      >>(true);

      typeAssert<IsExact<
        typeof cursorIter.value,
        number
      >>(true);

      keys.push(cursorIter.key);
      values.push(cursorIter.value);
    }

    assert.deepEqual(values, [456, 123, 789], 'Correct values');
    assert.deepEqual(keys, ['bar', 'foo', 'hello'], 'Correct keys');
  });
});
