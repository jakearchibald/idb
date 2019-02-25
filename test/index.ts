// Since this library proxies IDB, I haven't retested all of IDB. I've tried to cover parts of the
// library that behave differently to IDB, or may cause accidental differences.

import 'mocha/mocha';
import { assert } from 'chai';
import { DBSchema, openDB, IDBPDatabase, IDBPTransaction, deleteDB } from '../lib';
import { assert as typeAssert, IsExactType } from 'conditional-type-checks';

interface TestDBSchema extends DBSchema {
  'key-val-store': {
    key: string,
    value: number,
  };
  'object-store': {
    value: {
      id: number,
      title: string,
      date: Date,
    },
    key: number,
    indexes: { date: Date },
  };
}

const dbName = 'test-db';
let version = 0;

function getNextVersion(): number {
  version += 1;
  return version;
}

mocha.setup('tdd');

suite('openDb', () => {
  let db: IDBPDatabase;

  teardown('Close DB', () => {
    if (db) db.close();
  });

  test('openDb', async () => {
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

  test('openDb - typeless', async () => {
    let upgradeRun = false;
    const version = getNextVersion();
    db = await openDB(dbName, version, {
      upgrade(db, oldVersion, newVersion, tx) {
        upgradeRun = true;
        typeAssert<IsExactType<typeof db, IDBPDatabase>>(true);
        typeAssert<IsExactType<typeof tx, IDBPTransaction>>(true);
      },
    });

    assert.isTrue(upgradeRun, 'upgrade run');
  });

  test('upgrade', () => assert.fail('TODO'));
  test('blocked', () => assert.fail('TODO'));
  test('blocking', () => assert.fail('TODO'));
  test('wrap', () => assert.fail('TODO'));
  test('unwrap', () => assert.fail('TODO'));
});

suite('deleteDb', () => {
  test('TODO', () => assert.fail('TODO'));
});

suite('wrap', () => {
  test('TODO', () => assert.fail('TODO'));
});

suite('unwrap', () => {
  test('TODO', () => assert.fail('TODO'));
});

suite('IDBPDatabase', () => {
  test('createObjectStore', () => assert.fail('TODO'));
  test('deleteObjectStore', () => assert.fail('TODO'));
  test('transaction', () => assert.fail('TODO'));
  // TODO helper methods
  test('wrap', () => assert.fail('TODO'));
  test('unwrap', () => assert.fail('TODO'));
});

suite('IDBPTransaction', () => {
  // test upgrade transaction
  test('objectStoreNames', () => assert.fail('TODO'));
  test('db', () => assert.fail('TODO'));
  test('done', () => assert.fail('TODO'));
  test('store', () => assert.fail('TODO'));
  test('objectStore', () => assert.fail('TODO'));
  test('wrap', () => assert.fail('TODO'));
  test('unwrap', () => assert.fail('TODO'));
});

suite('IDBPObjectStore', () => {
  test('indexNames', () => assert.fail('TODO'));
  test('name', () => assert.fail('TODO'));
  test('transaction', () => assert.fail('TODO'));
  test('add', () => assert.fail('TODO'));
  test('clear', () => assert.fail('TODO'));
  test('count', () => assert.fail('TODO'));
  test('createIndex', () => assert.fail('TODO'));
  test('delete', () => assert.fail('TODO'));
  test('get', () => assert.fail('TODO'));
  test('getAll', () => assert.fail('TODO'));
  test('getAllKeys', () => assert.fail('TODO'));
  test('getKey', () => assert.fail('TODO'));
  test('index', () => assert.fail('TODO'));
  test('openCursor', () => assert.fail('TODO'));
  test('openKeyCursor', () => assert.fail('TODO'));
  test('put', () => assert.fail('TODO'));
  test('wrap', () => assert.fail('TODO'));
  test('unwrap', () => assert.fail('TODO'));
});

suite('IDBPIndex', () => {
  test('objectStore', () => assert.fail('TODO'));
  test('count', () => assert.fail('TODO'));
  test('get', () => assert.fail('TODO'));
  test('getAll', () => assert.fail('TODO'));
  test('getAllKeys', () => assert.fail('TODO'));
  test('getKey', () => assert.fail('TODO'));
  test('openCursor', () => assert.fail('TODO'));
  test('openKeyCursor', () => assert.fail('TODO'));
  test('wrap', () => assert.fail('TODO'));
  test('unwrap', () => assert.fail('TODO'));
});

suite('IDBPCursor', () => {
  test('key', () => assert.fail('TODO'));
  test('primaryKey', () => assert.fail('TODO'));
  test('source', () => assert.fail('TODO'));
  test('advance', () => assert.fail('TODO'));
  test('continue', () => assert.fail('TODO'));
  test('continuePrimaryKey', () => assert.fail('TODO'));
  test('delete', () => assert.fail('TODO'));
  test('update', () => assert.fail('TODO'));
  test('wrap', () => assert.fail('TODO'));
  test('unwrap', () => assert.fail('TODO'));
});

suite('IDBPCursorWithValue', () => {
  test('value', () => assert.fail('TODO'));
  test('wrap', () => assert.fail('TODO'));
  test('unwrap', () => assert.fail('TODO'));
});

deleteDB(dbName).then(() => mocha.run());
