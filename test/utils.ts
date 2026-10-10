import {
  DBSchema,
  IDBPDatabase,
  openDB,
  DeleteDBCallbacks,
  deleteDB,
} from '../src/';

export interface ObjectStoreValue {
  id: number;
  title: string;
  date: Date;
}

export interface TestDBSchema extends DBSchema {
  'key-val-store': {
    key: string;
    value: number;
  };
  'object-store': {
    value: ObjectStoreValue;
    key: number;
    indexes: { date: Date; title: string };
  };
  'union-store':
    | {
        key: 1;
        value: 'one';
      }
    | {
        key: 2;
        value: 'two';
      }
    | {
        key: 3;
        value: 'three';
      }
    | {
        key: 4;
        value: 'four';
      }
    | {
        key: 5;
        value: 'five';
      };
}

export const dbName = 'test-db';
let version = 0;

export function getNextVersion(): number {
  version += 1;
  return version;
}

let dbWithSchemaCreated = false;

export function openDBWithSchema(): Promise<IDBPDatabase<TestDBSchema>> {
  if (dbWithSchemaCreated) return openDB<TestDBSchema>(dbName, version);
  dbWithSchemaCreated = true;
  return openDB<TestDBSchema>(dbName, getNextVersion(), {
    upgrade(db) {
      db.createObjectStore('key-val-store');
      const store = db.createObjectStore('object-store', { keyPath: 'id' });
      store.createIndex('date', 'date');
      store.createIndex('title', 'title');
      db.createObjectStore('union-store');
    },
  });
}

let dbWithDataCreated = false;

export async function openDBWithData() {
  if (dbWithDataCreated) return openDB<TestDBSchema>(dbName, version);
  dbWithDataCreated = true;
  const db = await openDBWithSchema();
  const tx = db.transaction(
    ['key-val-store', 'object-store', 'union-store'],
    'readwrite',
  );
  const keyStore = tx.objectStore('key-val-store');
  const objStore = tx.objectStore('object-store');
  const unionStore = tx.objectStore('union-store');
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
  unionStore.put('one', 1);
  unionStore.put('two', 2);
  unionStore.put('three', 3);
  unionStore.put('four', 4);
  return db;
}

export function deleteDatabase(callbacks: DeleteDBCallbacks = {}) {
  version = 0;
  dbWithSchemaCreated = false;
  dbWithDataCreated = false;
  return deleteDB(dbName, callbacks);
}
