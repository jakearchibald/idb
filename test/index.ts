// Since this library proxies IDB, I haven't retested all of IDB. I've tried to cover parts of the
// library that behave differently to IDB, or may cause accidental differences.

import 'mocha/mocha';
import { assert } from 'chai';
import { DBSchema, openDB, IDBPDatabase, IDBPTransaction, deleteDB, wrap, unwrap } from '../lib';
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
    // Let's do it the old fashioned way
    const idb = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open(dbName, getNextVersion());
      req.onsuccess = () => resolve(req.result);
    });

    db = wrap(idb);

    typeAssert<IsExactType<
      typeof db,
      IDBPDatabase
    >>(true);

    assert.instanceOf(db, IDBDatabase, 'DB type');
    assert.property(db, 'getAllIndex', 'DB looks wrapped');
  });

  test('unwrap', async () => {
    db = await openDB<TestDBSchema>(dbName, getNextVersion());
    const idb = unwrap(db);

    typeAssert<IsExactType<
      typeof idb,
      IDBDatabase
    >>(true);

    assert.instanceOf(idb, IDBDatabase, 'DB type');
    assert.isFalse('getAllIndex' in idb, 'DB looks unwrapped');
  });
});

suite('deleteDb', () => {
  test('TODO', async () => {
    assert.fail('TODO');
  });
});

suite('wrap', () => {
  test('TODO', async () => {
    assert.fail('TODO');
  });
});

suite('unwrap', () => {
  test('TODO', async () => {
    assert.fail('TODO');
  });
});

suite('IDBPDatabase', () => {
  test('createObjectStore', async () => {
    assert.fail('TODO');
  });
  test('deleteObjectStore', async () => {
    assert.fail('TODO');
  });
  test('transaction', async () => {
    assert.fail('TODO');
  });
  // TODO helper methods
  test('wrap', async () => {
    assert.fail('TODO');
  });
  test('unwrap', async () => {
    assert.fail('TODO');
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

deleteDB(dbName).then(() => mocha.run());
