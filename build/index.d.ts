import './database-extras';
import './async-iterators';
interface OpenDbCallbacks<DBTypes extends DBSchema | unknown> {
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
    upgrade?(database: IDBPDatabase<DBTypes>, oldVersion: number, newVersion: number | null, transaction: IDBPTransaction<DBTypes>): void;
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
export declare function openDb<DBTypes extends DBSchema | unknown = unknown>(name: string, version: number, callbacks?: OpenDbCallbacks<DBTypes>): Promise<IDBPDatabase<DBTypes>>;
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
export declare function deleteDb(name: string, callbacks?: DeleteDbCallbacks): Promise<void>;
export { unwrap, wrap } from './wrap-idb-value';
declare type KnownKeys<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends {
    [_ in keyof T]: infer U;
} ? U : never;
declare type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
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
declare type StoreNames<DBTypes extends DBSchema | unknown> = DBTypes extends DBSchema ? KnownKeys<DBTypes> : string;
declare type StoreValue<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>> = DBTypes extends DBSchema ? DBTypes[StoreName]['value'] : any;
declare type StoreKey<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>> = DBTypes extends DBSchema ? DBTypes[StoreName]['key'] : IDBValidKey;
declare type IndexNames<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>> = DBTypes extends DBSchema ? keyof DBTypes[StoreName]['indexes'] : string;
declare type IndexKey<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName>> = DBTypes extends DBSchema ? IndexName extends keyof DBTypes[StoreName]['indexes'] ? DBTypes[StoreName]['indexes'][IndexName] : IDBValidKey : IDBValidKey;
declare type CursorSource<DBTypes extends DBSchema | unknown, TxStores extends StoreNames<DBTypes>[], StoreName extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown> = IndexName extends IndexNames<DBTypes, StoreName> ? IDBPIndex<DBTypes, TxStores, StoreName, IndexName> : IDBPObjectStore<DBTypes, TxStores, StoreName>;
declare type CursorKey<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown> = IndexName extends IndexNames<DBTypes, StoreName> ? IndexKey<DBTypes, StoreName, IndexName> : StoreKey<DBTypes, StoreName>;
declare type IDBPDatabaseExtends = Omit<IDBDatabase, 'createObjectStore' | 'deleteObjectStore' | 'transaction'>;
export interface IDBPDatabase<DBTypes extends DBSchema | unknown = any> extends IDBPDatabaseExtends {
    /**
     * Creates a new object store.
     *
     * Throws a "InvalidStateError" DOMException if not called within an upgrade transaction.
     */
    createObjectStore<Name extends StoreNames<DBTypes>>(name: Name, optionalParameters?: IDBObjectStoreParameters): IDBPObjectStore<DBTypes, StoreNames<DBTypes>[], Name>;
    /**
     * Deletes the object store with the given name.
     *
     * Throws a "InvalidStateError" DOMException if not called within an upgrade transaction.
     */
    deleteObjectStore(name: StoreNames<DBTypes>): void;
    /**
     * Start a new transaction.
     *
     * @param storeNames The object store(s) this transaction needs.
     * @param mode
     */
    transaction<Name extends StoreNames<DBTypes>>(storeNames: Name, mode?: IDBTransactionMode): IDBPTransaction<DBTypes, [Name]>;
    transaction<Names extends StoreNames<DBTypes>[]>(storeNames: Names, mode?: IDBTransactionMode): IDBPTransaction<DBTypes, Names>;
}
declare type IDBPTransactionExtends = Omit<IDBTransaction, 'db' | 'objectStore' | 'objectStoreNames'>;
export interface IDBPTransaction<DBTypes extends DBSchema | unknown = unknown, TxStores extends StoreNames<DBTypes>[] = StoreNames<DBTypes>[]> extends IDBPTransactionExtends {
    /**
     * The names of stores in scope for this transaction.
     */
    readonly objectStoreNames: TxStores;
    /**
     * The transaction's connection.
     */
    readonly db: IDBPDatabase<DBTypes>;
    /**
     * Promise for the completion of this transaction.
     */
    readonly done: Promise<undefined>;
    /**
     * Shortcut to the first store associated with this transaction.
     */
    readonly store: TxStores[1] extends undefined ? IDBPObjectStore<DBTypes, TxStores, TxStores[0]> : undefined;
    /**
     * Returns an IDBObjectStore in the transaction's scope.
     */
    objectStore<StoreName extends TxStores[number]>(name: StoreName): IDBPObjectStore<DBTypes, TxStores, StoreName>;
}
declare type IDBPObjectStoreExtends = Omit<IDBObjectStore, 'transaction' | 'add' | 'clear' | 'count' | 'createIndex' | 'delete' | 'get' | 'getAll' | 'getAllKeys' | 'getKey' | 'index' | 'openCursor' | 'openKeyCursor' | 'put'>;
export interface IDBPObjectStore<DBTypes extends DBSchema | unknown = unknown, TxStores extends StoreNames<DBTypes>[] = StoreNames<DBTypes>[], StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>> extends IDBPObjectStoreExtends {
    /**
     * The associated transaction.
     */
    readonly transaction: IDBPTransaction<DBTypes, TxStores>;
    /**
     * Add to the database.
     *
     * Rejects if an item of a given key already exists in the database.
     */
    add(value: StoreValue<DBTypes, StoreName>, key?: StoreKey<DBTypes, StoreName> | IDBKeyRange): Promise<StoreKey<DBTypes, StoreName>>;
    /**
     * Deletes all records in store.
     */
    clear(): Promise<undefined>;
    /**
     * Retrieves the number of records matching the given query.
     */
    count(key?: StoreKey<DBTypes, StoreName> | IDBKeyRange): Promise<number>;
    /**
     * Creates a new index in store.
     *
     * Throws an "InvalidStateError" DOMException if not called within an upgrade transaction.
     */
    createIndex<IndexName extends IndexNames<DBTypes, StoreName>>(name: IndexName, keyPath: string | string[], options?: IDBIndexParameters): IDBPIndex<DBTypes, TxStores, StoreName, IndexName>;
    /**
     * Deletes records in store matching the given query.
     */
    delete(key: StoreKey<DBTypes, StoreName> | IDBKeyRange): Promise<undefined>;
    /**
     * Retrieves the value of the first record matching the query.
     *
     * Resolves with undefined if no match is found.
     */
    get(query: StoreKey<DBTypes, StoreName> | IDBKeyRange): Promise<StoreValue<DBTypes, StoreName> | undefined>;
    /**
     * Retrieves all values that match the query.
     *
     * @param query
     * @param count Maximum number of values to return.
     */
    getAll(query?: StoreKey<DBTypes, StoreName> | IDBKeyRange, count?: number): Promise<StoreValue<DBTypes, StoreName>[]>;
    /**
     * Retrieves the keys of records matching the query.
     *
     * @param query
     * @param count Maximum number of keys to return.
     */
    getAllKeys(query?: StoreKey<DBTypes, StoreName> | IDBKeyRange, count?: number): Promise<StoreKey<DBTypes, StoreName>[]>;
    /**
     * Retrieves the key of the first record that matches the query.
     *
     * Resolves with undefined if no match is found.
     */
    getKey(query: StoreKey<DBTypes, StoreName> | IDBKeyRange): Promise<StoreKey<DBTypes, StoreName> | undefined>;
    /**
     * Get a query of a given name.
     */
    index<IndexName extends IndexNames<DBTypes, StoreName>>(name: IndexName): IDBPIndex<DBTypes, TxStores, StoreName, IndexName>;
    /**
     * Opens a cursor over the records matching the query.
     *
     * Resolves with null if no matches are found.
     *
     * @param query If null, all records match.
     * @param direction
     */
    openCursor(query?: StoreKey<DBTypes, StoreName> | IDBKeyRange, direction?: IDBCursorDirection): Promise<IDBPCursorWithValue<DBTypes, TxStores, StoreName> | null>;
    /**
     * Opens a cursor over the keys matching the query.
     *
     * Resolves with null if no matches are found.
     *
     * @param query If null, all records match.
     * @param direction
     */
    openKeyCursor(query?: StoreKey<DBTypes, StoreName> | IDBKeyRange, direction?: IDBCursorDirection): Promise<IDBPCursor<DBTypes, TxStores, StoreName> | null>;
    /**
     * Put an item in the database.
     *
     * Replaces any item with the same key.
     */
    put(value: StoreValue<DBTypes, StoreName>, key?: StoreKey<DBTypes, StoreName> | IDBKeyRange): Promise<StoreKey<DBTypes, StoreName>>;
}
declare type IDBPIndexExtends = Omit<IDBIndex, 'objectStore' | 'count' | 'get' | 'getAll' | 'getAllKeys' | 'getKey' | 'openCursor' | 'openKeyCursor'>;
export interface IDBPIndex<DBTypes extends DBSchema | unknown = unknown, TxStores extends StoreNames<DBTypes>[] = StoreNames<DBTypes>[], StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> = IndexNames<DBTypes, StoreName>> extends IDBPIndexExtends {
    /**
     * The IDBObjectStore the index belongs to.
     */
    readonly objectStore: IDBPObjectStore<DBTypes, TxStores, StoreName>;
    /**
     * Retrieves the number of records matching the given query.
     */
    count(key?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange): Promise<number>;
    /**
     * Retrieves the value of the first record matching the query.
     *
     * Resolves with undefined if no match is found.
     */
    get(query: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange): Promise<StoreValue<DBTypes, StoreName> | undefined>;
    /**
     * Retrieves all values that match the query.
     *
     * @param query
     * @param count Maximum number of values to return.
     */
    getAll(query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange, count?: number): Promise<StoreValue<DBTypes, StoreName>[]>;
    /**
     * Retrieves the keys of records matching the query.
     *
     * @param query
     * @param count Maximum number of keys to return.
     */
    getAllKeys(query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange, count?: number): Promise<IndexKey<DBTypes, StoreName, IndexName>[]>;
    /**
     * Retrieves the key of the first record that matches the query.
     *
     * Resolves with undefined if no match is found.
     */
    getKey(query: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange): Promise<IndexKey<DBTypes, StoreName, IndexName> | undefined>;
    /**
     * Opens a cursor over the records matching the query.
     *
     * Resolves with null if no matches are found.
     *
     * @param query If null, all records match.
     * @param direction
     */
    openCursor(query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange, direction?: IDBCursorDirection): Promise<IDBPCursorWithValue<DBTypes, TxStores, StoreName, IndexName> | null>;
    /**
     * Opens a cursor over the keys matching the query.
     *
     * Resolves with null if no matches are found.
     *
     * @param query If null, all records match.
     * @param direction
     */
    openKeyCursor(query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange, direction?: IDBCursorDirection): Promise<IDBPCursor<DBTypes, TxStores, StoreName, IndexName> | null>;
}
declare type IDBPCursorExtends = Omit<IDBCursor, 'key' | 'primaryKey' | 'source' | 'advance' | 'continue' | 'continuePrimaryKey' | 'delete' | 'update'>;
export interface IDBPCursor<DBTypes extends DBSchema | unknown = unknown, TxStores extends StoreNames<DBTypes>[] = StoreNames<DBTypes>[], StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown> extends IDBPCursorExtends {
    /**
     * The key of the current index or object store item.
     */
    readonly key: CursorKey<DBTypes, StoreName, IndexName>;
    /**
     * The key of the current object store item.
     */
    readonly primaryKey: StoreKey<DBTypes, StoreName>;
    /**
     * Returns the IDBObjectStore or IDBIndex the cursor was opened from.
     */
    readonly source: CursorSource<DBTypes, TxStores, StoreName, IndexName>;
    /**
     * Advances the cursor a given number of records.
     *
     * Resolves to null if no matching records remain.
     */
    advance<T>(this: T, count: number): Promise<T | null>;
    /**
     * Advance the cursor by one record (unless 'key' is provided).
     *
     * Resolves to null if no matching records remain.
     *
     * @param key Advance to the index or object store with a key equal to or greater than this value.
     */
    continue<T>(this: T, key?: CursorKey<DBTypes, StoreName, IndexName> | IDBKeyRange): Promise<T | null>;
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
    continuePrimaryKey<T>(this: T, key: CursorKey<DBTypes, StoreName, IndexName> | IDBKeyRange, primaryKey: StoreKey<DBTypes, StoreName> | IDBKeyRange): Promise<T | null>;
    /**
     * Delete the current record.
     */
    delete(): Promise<undefined>;
    /**
     * Updated the current record.
     */
    update(value: StoreValue<DBTypes, StoreName>): Promise<StoreKey<DBTypes, StoreName>>;
}
export interface IDBPCursorWithValue<DBTypes extends DBSchema | unknown = unknown, TxStores extends StoreNames<DBTypes>[] = StoreNames<DBTypes>[], StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown> extends IDBPCursor<DBTypes, TxStores, StoreName, IndexName> {
    /**
     * The value of the current item.
     */
    readonly value: StoreValue<DBTypes, StoreName>;
}