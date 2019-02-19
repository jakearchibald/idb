import { addTraps, Func } from './wrap-idb-value';
import { IDBPDatabase, IDBPObjectStore, IDBPIndex } from '.';

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];

// Add index methods
readMethods.push(...readMethods.map(n => n + 'Index'));

const cachedMethods = new Map<string, Func>();

function getMethod(prop: string): Func | undefined {
  if (readMethods.includes(prop)) {
    return function (this: IDBPDatabase, storeName: string, ...args: any[]) {
      // Are we dealing with an index method?
      let indexName: string = '';
      let targetFuncName: string = prop;
      if (targetFuncName.endsWith('Index')) {
        indexName = args.shift();
        targetFuncName = targetFuncName.slice(0, -5); // remove "Index"
      }

      const tx = this.transaction(storeName);
      let target: IDBPObjectStore | IDBPIndex = tx.objectStore(storeName);
      if (indexName) target = target.index(indexName);

      return (target as any)[targetFuncName](...args);
    };
  }
  if (writeMethods.includes(prop)) {
    return function (this: IDBPDatabase, storeName: string, ...args: any[]) {
      const tx = this.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      (store as any)[prop](...args);
      return tx.done;
    };
  }
}

addTraps(oldTraps => ({
  get(target, prop, receiver) {
    // Quick bails
    if (!(target instanceof IDBDatabase) || prop in target || typeof prop !== 'string') {
      return oldTraps.get!(target, prop, receiver);
    }

    const cachedMethod = cachedMethods.get(prop);
    if (cachedMethod) return cachedMethod;

    const method: Func | undefined = getMethod(prop);

    if (method) {
      cachedMethods.set(prop, method);
      return method;
    }

    return oldTraps.get!(target, prop, receiver);
  },
  has(target, prop) {
    if (
      target instanceof IDBDatabase && typeof prop === 'string' &&
      (readMethods.includes(prop) || writeMethods.includes(prop))
    ) return true;
    return oldTraps.has!(target, prop);
  },
}));
