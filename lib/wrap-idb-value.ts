import {
  IDBPCursor, IDBPCursorWithValue, IDBPDatabase, IDBPIndex, IDBPObjectStore, IDBPTransaction,
} from './entry';
import { Constructor, Func, instanceOfAny } from './util';

let idbProxyableTypes: Constructor[];
let cursorAdvanceMethods: Func[];

// This is a function to prevent it throwing up in node environments.
function getIdbProxyableTypes(): Constructor[] {
  if (!idbProxyableTypes) {
    idbProxyableTypes = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction];
  }
  return idbProxyableTypes;
}

// This is a function to prevent it throwing up in node environments.
function getCursorAdvanceMethods(): Func[] {
  if (!cursorAdvanceMethods) {
    cursorAdvanceMethods = [
      IDBCursor.prototype.advance,
      IDBCursor.prototype.continue,
      IDBCursor.prototype.continuePrimaryKey,
    ];
  }
  return cursorAdvanceMethods;
}

const cursorRequestMap: WeakMap<IDBPCursor, IDBRequest<IDBCursor>> = new WeakMap();
const transactionDoneMap: WeakMap<IDBTransaction, Promise<void>> = new WeakMap();
const transformCache = new WeakMap();
const reverseTransformCache = new WeakMap();

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  const promise = new Promise<T>((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener('success', success);
      request.removeEventListener('error', error);
    };
    const success = () => {
      resolve(wrap(request.result as any) as any);
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener('success', success);
    request.addEventListener('error', error);
  });

  promise.then((value) => {
    // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
    // (see wrapFunction).
    if (value instanceof IDBCursor) {
      cursorRequestMap.set(
        value as unknown as IDBPCursor,
        request as unknown as IDBRequest<IDBCursor>,
      );
    }
  });

  // This is the only mapping that exists in reverseTransformCache where the reverse doesn't exist
  // in transformCache. This is because we create many promises from a single IDBRequest.
  reverseTransformCache.set(promise, request);
  return promise;
}

function cacheDonePromiseForTransaction(tx: IDBTransaction): void {
  // Early bail if we've already created a done promise for this transaction.
  if (transactionDoneMap.has(tx)) return;

  const done = new Promise<void>((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener('complete', complete);
      tx.removeEventListener('error', error);
      tx.removeEventListener('abort', error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error);
      unlisten();
    };
    tx.addEventListener('complete', complete);
    tx.addEventListener('error', error);
    tx.addEventListener('abort', error);
  });

  // Cache it for later retrieval.
  transactionDoneMap.set(tx, done);
}

let idbProxyTraps: ProxyHandler<any> = {
  get(target, prop, receiver) {
    if (target instanceof IDBTransaction) {
      // Special handling for transaction.done.
      if (prop === 'done') return transactionDoneMap.get(target);
      // Make tx.store return the only store in the transaction, or undefined if there are many.
      if (prop === 'store') {
        return target.objectStoreNames[1] ?
          undefined : receiver.objectStore(target.objectStoreNames[0]);
      }
    }
    // Else transform whatever we get back.
    return wrap(target[prop]);
  },
  has(target, prop) {
    if (target instanceof IDBTransaction && (prop === 'done' || prop === 'store')) return true;
    return prop in target;
  },
};

export function addTraps(callback: (currentTraps: ProxyHandler<any>) => ProxyHandler<any>): void {
  idbProxyTraps = callback(idbProxyTraps);
}

function wrapFunction<T extends Func>(func: T): Function {
  // Due to expected object equality (which is enforced by the caching in `wrap`), we
  // only create one new func per func.

  // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
  // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
  // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
  // with real promises, so each advance methods returns a new promise for the cursor object, or
  // undefined if the end of the cursor has been reached.
  if (getCursorAdvanceMethods().includes(func)) {
    return function (this: IDBPCursor, ...args: Parameters<T>) {
      // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
      // the original object.
      const originalCursor = unwrap(this);
      func.apply(originalCursor, args);
      const request = cursorRequestMap.get(this)!;
      return wrap(request);
    };
  }

  return function (this: any, ...args: Parameters<T>) {
    // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
    // the original object.
    const originalParent = unwrap(this);
    const value = func.apply(originalParent, args);
    return wrap(value);
  };
}

function transformCachableValue(value: any): any {
  if (typeof value === 'function') return wrapFunction(value);

  // This doesn't return, it just creates a 'done' promise for the transaction,
  // which is later returned for transaction.done (see idbObjectHandler).
  if (value instanceof IDBTransaction) cacheDonePromiseForTransaction(value);

  if (instanceOfAny(value, getIdbProxyableTypes())) return new Proxy(value, idbProxyTraps);

  // Return the same value back if we're not going to transform it.
  return value;
}

/**
 * Enhance an IDB object with helpers.
 *
 * @param value The thing to enhance.
 */
export function wrap(value: IDBCursorWithValue): IDBPCursorWithValue;
export function wrap(value: IDBCursor): IDBPCursor;
export function wrap(value: IDBDatabase): IDBPDatabase;
export function wrap(value: IDBIndex): IDBPIndex;
export function wrap(value: IDBObjectStore): IDBPObjectStore;
export function wrap(value: IDBTransaction): IDBPTransaction;
export function wrap(value: IDBOpenDBRequest): Promise<IDBPDatabase | undefined>;
export function wrap<T>(value: IDBRequest<T>): Promise<T>;
export function wrap(value: any): any {
  // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
  // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
  if (value instanceof IDBRequest) return promisifyRequest(value);

  // If we've already transformed this value before, reuse the transformed value.
  // This is faster, but it also provides object equality.
  if (transformCache.has(value)) return transformCache.get(value);
  const newValue = transformCachableValue(value);

  // Not all types are transformed.
  // These may be primitive types, so they can't be WeakMap keys.
  if (newValue !== value) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }

  return newValue;
}

/**
 * Revert an enhanced IDB object to a plain old miserable IDB one.
 *
 * Will also revert a promise back to an IDBRequest.
 *
 * @param value The enhanced object to revert.
 */
export function unwrap(value: IDBPCursorWithValue): IDBCursorWithValue;
export function unwrap(value: IDBPCursor): IDBCursor;
export function unwrap(value: IDBPDatabase): IDBDatabase;
export function unwrap(value: IDBPIndex): IDBIndex;
export function unwrap(value: IDBPObjectStore<any, any, any>): IDBObjectStore;
export function unwrap(value: IDBPTransaction<any, any>): IDBTransaction;
export function unwrap<T extends any>(value: Promise<IDBPDatabase<T>>): IDBOpenDBRequest;
export function unwrap(value: Promise<IDBPDatabase>): IDBOpenDBRequest;
export function unwrap<T>(value: Promise<T>): IDBRequest<T>;
export function unwrap(value: any): any {
  return reverseTransformCache.get(value);
}
