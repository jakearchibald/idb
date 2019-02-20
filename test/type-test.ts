// This code isn't designed to run, it's designed to test the TypeScript typings, and how they
// integrate in editors such as VSCode.
import { openDb, DBSchema } from '../lib/index';

interface TestDbSchema extends DBSchema {
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

async function demo() {
  const db = await openDb<TestDbSchema>('test-db', 1);
  // Test: The name of the store should be limited to the keys in TestDbSchema, and should
  // autocomplete.
  const tx1 = db.transaction('key-val-store');
  // Test: The items in the array should also autocomplete
  const tx2 = db.transaction(['key-val-store', 'object-store']);
  // Test: This should fail.
  db.transaction('not real');
  // Test: This should fail.
  db.transaction(['key-val-store', 'not-real']);

  const tx = db.transaction('key-val-store');
  // Test: This should autocomplete.
  tx.objectStore('key-val-store');
  // Test: This should fail, as it isn't part of the transaction
  tx.objectStore('object-store');
  // Test: This should fail.
  tx.objectStore('not-real');

  let store = tx.objectStore('key-val-store');
  // Test: This should work, and val should have type number or undefined.
  const val = await store.get('foo');
  // Test: These should fail. The expected type should be string.
  await store.get(123);
  await store.getAll(123);
  await store.getAllKeys(123);
  await store.getKey(123);
  await store.count(123);
  await store.openCursor(123);
  await store.openKeyCursor(123);
  // Test: This should work, and val2 should have type string.
  const val2 = await store.add(123, 'foo');
  // Test: This should work, and val3 should have type string.
  const val3 = await store.put(123, 'foo');
  // Test: These should fail.
  store.add('213', 123);
  store.put('213', 123);

  // Test: tx should be IDBPTransaction<TestDbSchema>
  store.transaction;
  // Test: tx should be IDBPDatabase<TestDbSchema>
  const otherDb = tx.db;

  let cursor = await store.openCursor('123');
  // Test: should be number
  const val4 = cursor!.value;
  // Test: should be string or range
  const val5 = cursor!.key;
  // Test: should be object store
  store = cursor!.source;

  // Test: these should fail due to key type.
  cursor!.continue(123);
  cursor!.continuePrimaryKey(123, 123);

  cursor = await cursor!.continue('foo');
  cursor = await cursor!.advance(5);
  cursor = await cursor!.continuePrimaryKey('hello', 'world');
  // Test: key should be of type string.
  cursor!.key;

  // Test: should be number
  const val6 = cursor!.value;
  // Test: should be string or range
  const val7 = cursor!.key;

  // Test: Should work and autocomplete
  const objStore = db.createObjectStore('object-store');
  // Test: These should fail due to incorrect index name.
  objStore.createIndex('foo', 'date');
  objStore.index('foo');

  // Test: Should work and index name should autocomplete
  const index = objStore.index('date');
  // Test: These should fail, as the key must be a date.
  await index.get(123);
  await index.getAll(123);
  await index.getAllKeys(123);
  await index.getKey(123);
  await index.count(123);
  await index.openCursor(123);
  await index.openKeyCursor(123);

  // Test: Should work & val8 should have id, title, date fields.
  const val8 = await index.get(new Date());

  // Test: These should all work.
  let cursor2 = await index.openCursor(new Date());
  cursor2 = await cursor2!.continue(new Date());
  cursor2 = await cursor2!.advance(5);
  cursor2 = await cursor2!.continuePrimaryKey(new Date(), 123);
  // Test: should be index
  cursor2!.source;
}

// This is the same as above, but untyped. This shouldn't cause failures.
async function demoUntyped() {
  const db = await openDb('test-db', 1);
  let tx = db.transaction('key-val-store');
  tx = db.transaction(['key-val-store', 'object-store']);
  tx = db.transaction('not real');
  tx = db.transaction(['key-val-store', 'not-real']);

  tx = db.transaction('key-val-store');
  tx.objectStore('key-val-store');
  tx.objectStore('object-store');
  tx.objectStore('not-real');

  const store = tx.objectStore('key-val-store');
  const val = await store.get('foo');
  await store.get(123);
  await store.getAll(123);
  await store.getAllKeys(123);
  await store.getKey(123);
  await store.count(123);
  await store.openCursor(123);
  await store.openKeyCursor(123);
  const val2 = await store.add(123, 'foo');
  const val3 = await store.put(123, 'foo');
  store.add('213', 123);
  store.put('213', 123);

  tx = store.transaction;
  const otherDb = tx.db;

  let cursor = await store.openCursor('123');
  const val4 = cursor!.value;
  const val5 = cursor!.key;
  const store2 = cursor!.source;

  cursor!.continue(123);
  cursor!.continuePrimaryKey(123, 123);

  cursor = await cursor!.continue();
  cursor = await cursor!.advance(5);
  cursor = await cursor!.continuePrimaryKey('hello', 'world');

  const val6 = cursor!.value;
  const val7 = cursor!.key;

  const objStore = db.createObjectStore('object-store');
  objStore.createIndex('foo', 'date');
  objStore.index('foo');

  const index = objStore.index('date');
  await index.get(123);
  await index.getAll(123);
  await index.getAllKeys(123);
  await index.getKey(123);
  await index.count(123);
  await index.openCursor(123);
  await index.openKeyCursor(123);

  const val8 = await index.get(new Date());
}
