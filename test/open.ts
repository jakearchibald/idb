import 'mocha/mocha';
import { assert } from 'chai';
import { openDB, IDBPDatabase, IDBPTransaction, wrap, unwrap } from '../lib/';
import { assert as typeAssert, IsExact } from 'conditional-type-checks';
import {
  getNextVersion,
  TestDBSchema,
  dbName,
  openDBWithSchema,
  deleteDatabase,
} from './utils';

suite('openDb', () => {
  let db: IDBPDatabase;

  teardown('Close DB', () => {
    if (db) db.close();
  });

  test('upgrade', async () => {
    let upgradeRun = false;
    const version = getNextVersion();
    db = (await openDB<TestDBSchema>(dbName, version, {
      upgrade(db, oldVersion, newVersion, tx) {
        upgradeRun = true;

        typeAssert<IsExact<typeof db, IDBPDatabase<TestDBSchema>>>(true);
        assert.instanceOf(db, IDBDatabase, 'db instance');

        assert.strictEqual(oldVersion, 0);
        assert.strictEqual(newVersion, version);

        typeAssert<IsExact<typeof tx, IDBPTransaction<TestDBSchema>>>(true);
        assert.instanceOf(tx, IDBTransaction, 'db instance');
        assert.strictEqual(tx.mode, 'versionchange', 'tx mode');
      },
    })) as IDBPDatabase;

    assert.isTrue(upgradeRun, 'upgrade run');
  });

  test('upgrade - schemaless', async () => {
    let upgradeRun = false;
    const version = getNextVersion();
    db = await openDB(dbName, version, {
      upgrade(db, oldVersion, newVersion, tx) {
        upgradeRun = true;
        typeAssert<IsExact<typeof db, IDBPDatabase>>(true);
        typeAssert<IsExact<typeof tx, IDBPTransaction>>(true);
      },
    });

    assert.isTrue(upgradeRun, 'upgrade run');
  });

  test('blocked and blocking', async () => {
    let blockedCalled = false;
    let blockingCalled = false;
    let newDbBlockedCalled = false;
    let newDbBlockingCalled = false;

    db = (await openDB<TestDBSchema>(dbName, getNextVersion(), {
      blocked() {
        blockedCalled = true;
      },
      blocking() {
        blockingCalled = true;
        // 'blocked' isn't called if older databases close once blocking fires.
        // Using set timeout so closing isn't immediate.
        setTimeout(() => db.close(), 0);
      },
    })) as IDBPDatabase;

    assert.isFalse(blockedCalled);
    assert.isFalse(blockingCalled);

    db = (await openDB<TestDBSchema>(dbName, getNextVersion(), {
      blocked() {
        newDbBlockedCalled = true;
      },
      blocking() {
        newDbBlockingCalled = true;
      },
    })) as IDBPDatabase;

    assert.isFalse(blockedCalled);
    assert.isTrue(blockingCalled);
    assert.isTrue(newDbBlockedCalled);
    assert.isFalse(newDbBlockingCalled);
  });

  test('wrap', async () => {
    let wrappedRequest: Promise<IDBPDatabase | undefined> = Promise.resolve(
      undefined,
    );

    // Let's do it the old fashioned way
    const idb = await new Promise<IDBDatabase>(async resolve => {
      const request = indexedDB.open(dbName, getNextVersion());
      wrappedRequest = wrap(request);
      request.addEventListener('success', () => resolve(request.result));
    });

    assert.instanceOf(wrappedRequest, Promise, 'Wrapped request type');
    db = wrap(idb);

    typeAssert<IsExact<typeof db, IDBPDatabase>>(true);

    assert.instanceOf(db, IDBDatabase, 'DB type');
    assert.property(db, 'getAllFromIndex', 'DB looks wrapped');
    assert.strictEqual(
      db,
      await wrappedRequest,
      'Wrapped request and wrapped db are same',
    );
  });

  test('unwrap', async () => {
    const openPromise = openDB<TestDBSchema>(dbName, getNextVersion());
    const request = unwrap(openPromise);

    typeAssert<IsExact<typeof request, IDBOpenDBRequest>>(true);

    assert.instanceOf(request, IDBOpenDBRequest, 'Request type');
    db = (await openPromise) as IDBPDatabase;
    const idb = unwrap(db);

    typeAssert<IsExact<typeof idb, IDBDatabase>>(true);

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
    db = (await openDBWithSchema()) as IDBPDatabase;
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
      blocked() {
        blockedCalled = true;
      },
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
      blocked() {
        closeDbBlockedCalled = true;
      },
    });

    assert.isFalse(blockedCalled);
    assert.isTrue(blockingCalled);
    assert.isTrue(closeDbBlockedCalled);
  });
});
