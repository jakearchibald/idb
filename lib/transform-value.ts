import RequestPromise from './request-promise';

type IDBCursorAdvanceMethod =
  IDBCursor['advance'] | IDBCursor['continue'] | IDBCursor['continuePrimaryKey'];
type Constructor = new (...args: any[]) => any;
type Func = (...args: any[]) => any;

const idbProxyableTypes = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction];
const cursorAdvanceMethods: IDBCursorAdvanceMethod[] = [
  IDBCursor.prototype.advance,
  IDBCursor.prototype.continue,
  IDBCursor.prototype.continuePrimaryKey,
];
const cursorRequestMap: WeakMap<IDBCursor, IDBRequest<IDBCursor>> = new WeakMap();
const transactionDoneMap: WeakMap<IDBTransaction, Promise<void>> = new WeakMap();
const transformCache = new WeakMap();
const reverseTransformCache = new WeakMap();

const instanceOfAny = (object: any, constructors: Constructor[]): boolean =>
  constructors.some(c => object instanceof c);

function promisifyRequest<T>(request: IDBRequest<T>): RequestPromise<T> {
  const promise = new RequestPromise(request, (resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener('success', success);
      request.removeEventListener('error', error);
    };
    const success = () => {
      resolve(transformIdbValue(request.result));
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
      cursorRequestMap.set(value, request as unknown as IDBRequest<IDBCursor>);
    }
  });

  return promise as RequestPromise<T>;
}

function cacheDonePromiseForTransaction(tx: IDBTransaction) {
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

const idbObjectHandler: ProxyHandler<any> = {
  get(target, prop) {
    // Special handling for transaction.done.
    if (prop === 'done' && target instanceof IDBTransaction) return transactionDoneMap.get(target);
    // Else transform whatever we get back.
    return transformIdbValue(target[prop]);
  },
};

function wrapFunction<T extends Func>(func: T): Function {
  // Due to expected object equality (which is enforced by the caching in transformIdbValue), we
  // only create one new func per func, so we can't refer to `parent` inside the function, as it may
  // be different at call time.

  // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
  // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
  // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
  // with real promises, so each advance methods returns a new promise for the cursor object, or
  // undefined if the end of the cursor has been reached.
  if (cursorAdvanceMethods.includes(func)) {
    return function (this: IDBCursor, ...args: Parameters<T>) {
      // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
      // the original object.
      const originalCursor = reverseTransformCache.get(this);
      func.apply(originalCursor, args);
      const request = cursorRequestMap.get(this);
      return transformIdbValue(request);
    };
  }

  return function (this: any, ...args: Parameters<T>) {
    // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
    // the original object.
    const originalParent = reverseTransformCache.get(this);
    const value = func.apply(originalParent, args);
    return transformIdbValue(value);
  };
}

function transformCachableValue(value: any): any {
  if (typeof value === 'function') return wrapFunction(value);

  // This doesn't return, it just creates a 'done' promise for the transaction,
  // which is later returned for transaction.done (see idbObjectHandler).
  if (value instanceof IDBTransaction) cacheDonePromiseForTransaction(value);

  if (instanceOfAny(value, idbProxyableTypes)) return new Proxy(value, idbObjectHandler);

  // Return the same value back if we're not going to transform it.
  return value;
}

/**
 * Enhance an object/function with library helpers.
 *
 * @param value The thing to enhance.
 */
export default function transformIdbValue(value: any): any {
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
