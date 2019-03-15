import {
  DBSchema, IDBPDatabase, openDB, DeleteDBCallbacks, deleteDB,
} from '../lib/';

export interface ObjectStoreValue {
  id: number;
  title: string;
  date: Date;
}

export interface TestDBSchema extends DBSchema {
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
    },
  });
}

let dbWithDataCreated = false;

export async function openDBWithData() {
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

export function deleteDatabase(callbacks: DeleteDBCallbacks = {}) {
  version = 0;
  dbWithSchemaCreated = false;
  dbWithDataCreated = false;
  return deleteDB(dbName, callbacks);
}
