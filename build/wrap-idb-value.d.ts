import { IDBPCursor, IDBPCursorWithValue, IDBPDatabase, IDBPIndex, IDBPObjectStore, IDBPTransaction } from './entry';
export declare function addTraps(callback: (currentTraps: ProxyHandler<any>) => ProxyHandler<any>): void;
/**
 * Enhance an IDB object with helpers.
 *
 * @param value The thing to enhance.
 */
export declare function wrap(value: IDBCursorWithValue): IDBPCursorWithValue;
export declare function wrap(value: IDBCursor): IDBPCursor;
export declare function wrap(value: IDBDatabase): IDBPDatabase;
export declare function wrap(value: IDBIndex): IDBPIndex;
export declare function wrap(value: IDBObjectStore): IDBPObjectStore;
export declare function wrap(value: IDBTransaction): IDBPTransaction;
export declare function wrap(value: IDBOpenDBRequest): Promise<IDBPDatabase | undefined>;
export declare function wrap<T>(value: IDBRequest<T>): Promise<T>;
/**
 * Revert an enhanced IDB object to a plain old miserable IDB one.
 *
 * Will also revert a promise back to an IDBRequest.
 *
 * @param value The enhanced object to revert.
 */
export declare function unwrap(value: IDBPCursorWithValue): IDBCursorWithValue;
export declare function unwrap(value: IDBPCursor): IDBCursor;
export declare function unwrap(value: IDBPDatabase): IDBDatabase;
export declare function unwrap(value: IDBPIndex<any, any, any, any>): IDBIndex;
export declare function unwrap(value: IDBPObjectStore<any, any, any>): IDBObjectStore;
export declare function unwrap(value: IDBPTransaction<any, any>): IDBTransaction;
export declare function unwrap<T extends any>(value: Promise<IDBPDatabase<T>>): IDBOpenDBRequest;
export declare function unwrap(value: Promise<IDBPDatabase>): IDBOpenDBRequest;
export declare function unwrap<T>(value: Promise<T>): IDBRequest<T>;
