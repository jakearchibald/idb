import { wrap } from './wrap-idb-value';

interface OpenDbCallbacks<DBTypes extends DBSchema | undefined> {
  /**
   * Called if this version of the database has never been opened before. Use it to specify the
   * schema for the database.
   *
   * @param database A database instance that you can use to add/remove stores and indexes.
   * @param oldVersion Last version of the database opened by the user.
   * @param newVersion Whatever new version you provided.
   * @param transaction The transaction for this upgrade. This is useful if you need to get data
   * from other stores as part of a migration.
   */
  upgrade?(
    database: IDBPDatabase<DBTypes>,
    oldVersion: number,
    newVersion: number | null,
    transaction: IDBPTransaction<DBTypes>,
  ): void;
  /**
   * Called if there are older versions of the database open on the origin, so this version cannot
   * open.
   */
  blocked?(): void;
  /**
   * Called if this connection is blocking a future version of the database from opening.
   */
  blocking?(): void;
}

/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
export function openDb<DBTypes extends DBSchema | undefined = undefined>(
  name: string, version: number, callbacks: OpenDbCallbacks<DBTypes> = {},
): Promise<IDBPDatabase<DBTypes>> {
  const { blocked, upgrade, blocking } = callbacks;
  const request = indexedDB.open(name, version);
  const openPromise = wrap(request) as Promise<IDBPDatabase<DBTypes>>;

  if (upgrade) {
    request.addEventListener('upgradeneeded', (event) => {
      upgrade(
        wrap(request.result) as IDBPDatabase<DBTypes>,
        event.oldVersion,
        event.newVersion,
        wrap(request.transaction!) as IDBPTransaction<DBTypes>,
      );
    });
  }

  if (blocked) request.addEventListener('blocked', () => blocked());
  if (blocking) openPromise.then(db => db.addEventListener('versionchange', blocking));

  return openPromise;
}

interface DeleteDbCallbacks {
  /**
   * Called if there are connections to this database open, so it cannot be deleted.
   */
  blocked?(): void;
}

/**
 * Delete a database.
 *
 * @param name Name of the database.
 */
export function deleteDb(name: string, callbacks: DeleteDbCallbacks = {}): Promise<void> {
  const { blocked } = callbacks;
  const request = indexedDB.deleteDatabase(name);
  if (blocked) request.addEventListener('blocked', () => blocked());
  return wrap(request).then(() => undefined);
}

export { unwrap, wrap } from './wrap-idb-value';

// === The rest of this file is type defs ===
type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K
} extends { [_ in keyof T]: infer U } ? U : never;

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export interface DBSchema {
  [s: string]: DBSchemaValue;
}

interface IndexKeys {
  [s: string]: IDBValidKey;
}

interface DBSchemaValue {
  key: IDBValidKey;
  value: any;
  indexes?: IndexKeys;
}

type IDBPDatabaseExtends = Omit<IDBDatabase, keyof IDBPDatabase>;

export interface IDBPDatabase
  <DBTypes extends DBSchema | undefined = undefined> extends IDBPDatabaseExtends {
  /**
   * Creates a new object store.
   *
   * Throws a "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  createObjectStore
    <K extends DBTypes extends DBSchema ? KnownKeys<DBTypes> : any>
    (name: K, optionalParameters?: IDBObjectStoreParameters):
    IDBPObjectStore<
      DBTypes,
      DBTypes[K]['key'], DBTypes[K]['value'],
      DBTypes[K]['indexes']
    >;

  /**
   * Deletes the object store with the given name.
   *
   * Throws a "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  deleteObjectStore
    <K extends DBTypes extends DBSchema ? KnownKeys<DBTypes> : string>
    (name: K): void;

  /**
   * Start a new transaction.
   *
   * @param storeNames The object store(s) this transaction needs.
   * @param mode
   */
  transaction
    <K extends DBTypes extends DBSchema ? KnownKeys<DBTypes> : string>
    (storeNames: K | K[], mode?: IDBTransactionMode):
    IDBPTransaction<DBTypes>;
}

type IDBPObjectStoreExtends = Omit<IDBObjectStore, keyof IDBPObjectStore>;

export interface IDBPObjectStore<
  DBTypes extends DBSchema | undefined = undefined,
  K extends IDBValidKey = IDBValidKey, V extends any = any,
  IndexKeyTypes extends IndexKeys | undefined = undefined,
> extends IDBPObjectStoreExtends {
  /**
   * The associated transaction.
   */
  readonly transaction: IDBPTransaction<DBTypes>;
  /**
   * Add to the database.
   *
   * Rejects if an item of a given key already exists in the database.
   */
  add(value: V, key?: K | IDBKeyRange): Promise<K>;
  /**
   * Deletes all records in store.
   */
  clear(): Promise<void>;
  /**
   * Retrieves the number of records matching the given query.
   */
  count(key?: K | IDBKeyRange): Promise<number>;
  /**
   * Creates a new index in store.
   *
   * Throws an "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  createIndex
    <I extends IndexKeyTypes extends IndexKeys ? KnownKeys<IndexKeyTypes> : any>
    (name: I, keyPath: string | string[], options?: IDBIndexParameters):
    IDBPIndex<DBTypes, K, V, IndexKeyTypes, IndexKeyTypes[I]>;
  /**
   * Deletes records in store matching the given query.
   */
  delete(key: K | IDBKeyRange): Promise<void>;
  /**
   * Retrieves the value of the first record matching the query.
   *
   * Resolves with undefined if no match is found.
   */
  get(query: K | IDBKeyRange): Promise<V | undefined>;
  /**
   * Retrieves all values that match the query.
   *
   * @param query
   * @param count Maximum number of values to return.
   */
  getAll(query?: K | IDBKeyRange, count?: number): Promise<V[]>;
  /**
   * Retrieves the keys of records matching the query.
   *
   * @param query
   * @param count Maximum number of keys to return.
   */
  getAllKeys(query?: K | IDBKeyRange, count?: number): Promise<K[]>;
  /**
   * Retrieves the key of the first record that matches the query.
   *
   * Resolves with undefined if no match is found.
   */
  getKey(query: K | IDBKeyRange): Promise<K | undefined>;
  /**
   * Get a query of a given name.
   */
  index
    <I extends (IndexKeyTypes extends IndexKeys ? KnownKeys<IndexKeyTypes> : any)>
    (name: I):
    IDBPIndex<DBTypes, K, V, IndexKeyTypes, IndexKeyTypes[I]>;

  /**
   * Opens a cursor over the records matching the query.
   *
   * Resolves with null if no matches are found.
   *
   * @param range If null, all records match.
   * @param direction
   */
  openCursor(range?: K | IDBKeyRange, direction?: IDBCursorDirection):
    Promise<IDBPCursorWithValue<IDBPObjectStore, DBTypes, K, V, IndexKeyTypes, K> | null>;

  /**
   * Opens a cursor over the keys matching the query.
   *
   * Resolves with null if no matches are found.
   *
   * @param range If null, all records match.
   * @param direction
   */
  openKeyCursor(query?: K | IDBKeyRange, direction?: IDBCursorDirection):
    Promise<IDBPCursor<IDBPObjectStore, DBTypes, K, V, IndexKeyTypes, K> | null>;

  /**
   * Put an item in the database.
   *
   * Replaces any item with the same key.
   */
  put(value: V, key?: K | IDBKeyRange): Promise<K>;
}

type IDBPTransactionExtends = Omit<IDBTransaction, keyof IDBPTransaction>;

export interface IDBPTransaction<DBTypes extends DBSchema | undefined = undefined>
  extends IDBPTransactionExtends {
  /**
   * The transaction's connection.
   */
  readonly db: IDBPDatabase<DBTypes>;

  /**
   * Promise for the completion of this transaction.
   */
  readonly done: Promise<void>;

  /**
   * Returns an IDBObjectStore in the transaction's scope.
   */
  objectStore
    <K extends (DBTypes extends DBSchema ? KnownKeys<DBTypes> : any)>
    (name: K):
    IDBPObjectStore<
      DBTypes,
      DBTypes[K]['key'], DBTypes[K]['value'],
      DBTypes[K]['indexes'] extends IndexKeys ? DBTypes[K]['indexes'] : any
    >;
}

type IDBPIndexExtends = Omit<IDBIndex, keyof IDBPIndex>;

export interface IDBPIndex<
  DBTypes extends DBSchema | undefined = undefined,
  StoreKey extends IDBValidKey = IDBValidKey, V extends any = any,
  IndexKeyTypes extends IndexKeys | undefined = undefined,
  K extends IDBValidKey = IDBValidKey,
> extends IDBPIndexExtends {
  /**
   * The IDBObjectStore the index belongs to.
   */
  readonly objectStore: IDBPObjectStore<DBTypes, StoreKey, V, IndexKeyTypes>;

  /**
   * Retrieves the number of records matching the given query.
   */
  count(key?: K | IDBKeyRange): Promise<number>;
  /**
   * Retrieves the value of the first record matching the query.
   *
   * Resolves with undefined if no match is found.
   */
  get(query: K | IDBKeyRange): Promise<V | undefined>;
  /**
   * Retrieves all values that match the query.
   *
   * @param query
   * @param count Maximum number of values to return.
   */
  getAll(query?: K | IDBKeyRange, count?: number): Promise<V[]>;
  /**
   * Retrieves the keys of records matching the query.
   *
   * @param query
   * @param count Maximum number of keys to return.
   */
  getAllKeys(query?: K | IDBKeyRange, count?: number): Promise<K[]>;
  /**
   * Retrieves the key of the first record that matches the query.
   *
   * Resolves with undefined if no match is found.
   */
  getKey(query: K | IDBKeyRange): Promise<K | undefined>;
  /**
   * Opens a cursor over the records matching the query.
   *
   * Resolves with null if no matches are found.
   *
   * @param range If null, all records match.
   * @param direction
   */
  openCursor(range?: K | IDBKeyRange, direction?: IDBCursorDirection):
    Promise<IDBPCursorWithValue<IDBPObjectStore, DBTypes, K, V, IndexKeyTypes, K> | null>;
  /**
   * Opens a cursor over the keys matching the query.
   *
   * Resolves with null if no matches are found.
   *
   * @param range If null, all records match.
   * @param direction
   */
  openKeyCursor(query?: K | IDBKeyRange, direction?: IDBCursorDirection):
    Promise<IDBPCursor<IDBPObjectStore, DBTypes, K, V, IndexKeyTypes, K> | null>;
}

type IDBPCursorExtends = Omit<IDBCursor, keyof IDBPCursor<IDBPObjectStore>>;

export interface IDBPCursor<
  Source extends IDBPObjectStore | IDBPIndex = IDBPObjectStore | IDBPIndex,
  DBTypes extends DBSchema | undefined = undefined,
  StoreKey extends IDBValidKey = IDBValidKey, V extends any = any,
  IndexKeyTypes extends IndexKeys | undefined = undefined,
  K extends IDBValidKey = IDBValidKey,
> extends IDBPCursorExtends {
  /**
   * The key of the current index or object store item.
   */
  readonly key: K | IDBKeyRange;
  /**
   * The key of the current object store item.
   */
  readonly primaryKey: StoreKey | IDBKeyRange;
  /**
   * Returns the IDBObjectStore or IDBIndex the cursor was opened from.
   */
  readonly source: Source extends IDBPObjectStore ?
    IDBPObjectStore<DBTypes, StoreKey, V, IndexKeyTypes> :
    IDBPIndex<DBTypes, StoreKey, V, IndexKeyTypes, K>;
  /**
   * Advances the cursor a given number of records.
   *
   * Resolves to null if no matching records remain.
   */
  advance<T extends any>(this: T, count: number): Promise<T | null>;
  /**
   * Advance the cursor by one record (unless 'key' is provided).
   *
   * Resolves to null if no matching records remain.
   *
   * @param key Advance to the index or object store with a key equal to or greater than this value.
   */
  continue<T extends any>(this: T, key?: K | IDBKeyRange): Promise<T | null>;
  /**
   * Advance the cursor by given keys.
   *
   * The operation is 'and' – both keys must be satisfied.
   *
   * Resolves to null if no matching records remain.
   *
   * @param key Advance to the index or object store with a key equal to or greater than this value.
   * @param primaryKey and where the object store has a key equal to or greater than this value.
   */
  continuePrimaryKey<T extends any>
    (this: T, key: K | IDBKeyRange, primaryKey: StoreKey | IDBKeyRange):
    Promise<T | null>;
  /**
   * Delete the current record.
   */
  delete(): Promise<undefined>;
  /**
   * Updated the current record.
   */
  update(value: V): Promise<K>;
}

export interface IDBPCursorWithValue<
  Source extends IDBPObjectStore | IDBPIndex = IDBPObjectStore | IDBPIndex,
  DBTypes extends DBSchema | undefined = undefined,
  StoreKey extends IDBValidKey = IDBValidKey, V extends any = any,
  IndexKeyTypes extends IndexKeys | undefined = undefined,
  K extends IDBValidKey = IDBValidKey,
> extends IDBPCursor<Source, DBTypes, StoreKey, V, IndexKeyTypes, K> {
  /**
   * The value of the current item.
   */
  readonly value: V;
}
