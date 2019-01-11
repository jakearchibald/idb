type IDBProxyable = IDBDatabase | IDBObjectStore | IDBIndex | IDBCursor | IDBTransaction;
type IDBCursorAdvanceMethod =
  IDBCursor['advance'] | IDBCursor['continue'] | IDBCursor['continuePrimaryKey'];

const idbProxyableTypes = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction];
const cursorAdvanceMethods: IDBCursorAdvanceMethod[] = [
  IDBCursor.prototype.advance,
  IDBCursor.prototype.continue,
  IDBCursor.prototype.continuePrimaryKey,
];
const cursorRequestMap: WeakMap<IDBCursor, IDBRequest<IDBCursor>> = new WeakMap();
const transactionDoneMap: WeakMap<IDBTransaction, Promise<void>> = new WeakMap();

// type Func = (...args: any[]) => any;
type Constructor = new (...args: any[]) => any;

function instanceOfAny(object: any, constructors: Constructor[]): boolean {
  for (const constructor of constructors) {
    if (object instanceof constructor) return true;
  }
  return false;
}

class RequestPromise<T> extends Promise<T> {
  static get [Symbol.species]() { return Promise; }

  constructor(
    public request: IDBRequest,
    executor:
      (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void,
  ) {
    super(executor);
  }
}

function promisifyRequest<T>(request: IDBRequest<T>): RequestPromise<T> {
  const promise = new RequestPromise(request, (resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener('success', success);
      request.removeEventListener('error', error);
    };
    const success = () => {
      resolve(handleIdbReturnValue(request, request.result));
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
    // Remember the request for later
    if (value instanceof IDBCursor) {
      cursorRequestMap.set(value, request as unknown as IDBRequest<IDBCursor>);
    }
  });

  return promise as RequestPromise<T>;
}

function processTransaction(tx: IDBTransaction) {
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

  transactionDoneMap.set(tx, done);
}

function handleIdbReturnValue(target: any, value: any) {
  // We can generate multiple promises from a single
  if (value instanceof IDBRequest) return promisifyRequest(value);

  if (typeof value === 'function') {
    // Functions are always bound to prevent ILLEGAL INVOCATION errors when thisArg is a proxy.
    const func = value.bind(target);

    if (target instanceof IDBCursor && cursorAdvanceMethods.includes(value)) {
      return function (this: typeof target, ...args: Parameters<typeof func>) {
        func(...args);
        const request = cursorRequestMap.get(this)!;
        return promisifyRequest(request);
      };
    }

    return function (this: typeof target, ...args: Parameters<typeof func>) {
      const value = func(...args);
      return handleIdbReturnValue(target, value);
    };
  }

  if (value instanceof IDBTransaction) processTransaction(value); // Doesn't return
  if (instanceOfAny(value, idbProxyableTypes)) return proxyIdbObject(value);
  return value;
}

const idbObjectHandler: ProxyHandler<any> = {
  get(target, prop) {
    if (prop === 'done' && target instanceof IDBTransaction) {
      return transactionDoneMap.get(target);
    }

    const value = target[prop];
    return handleIdbReturnValue(target, value);
  },
};

function proxyIdbObject<T extends IDBProxyable>(target: T): T {
  return new Proxy(target, idbObjectHandler);
}

interface OpenDbOptions {
  upgrade?(database: IDBDatabase, oldVersion: number, newVersion: number | null): void;
  blocked?(): void;
}

export function openDb(
  name: string, version: number, options: OpenDbOptions,
) {
  const { blocked, upgrade } = options;
  const request = indexedDB.open(name, version);

  return new RequestPromise(request, (resolve, reject) => {
    if (upgrade) {
      request.addEventListener('upgradeneeded', (event) => {
        upgrade(proxyIdbObject(request.result), event.oldVersion, event.newVersion);
      });
    }

    if (blocked) request.addEventListener('blocked', () => blocked());

    promisifyRequest(request).then(proxyIdbObject).then(resolve, reject);
  });
}

export function deleteDb(name: string) {
  const request = indexedDB.deleteDatabase(name);
  return promisifyRequest(request);
}
