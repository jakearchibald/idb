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
    indexes: { 'date': Date },
  };
}

async function demo() {
  const db = await openDb<TestDbSchema>('test-db', 1);

  // TODO: make objectStoreNames do something better

  // Test: The name of the store should be limited to the keys in TestDbSchema, and should
  // autocomplete.
  let tx = db.transaction('key-val-store');
  // Test: The items in the array should also autocomplete
  tx = db.transaction(['key-val-store', 'key-val-store']);
  // Test: This should fail.
  tx = db.transaction('not real');
  // Test: This should fail.
  tx = db.transaction(['key-val-store', 'not-real']);
}
