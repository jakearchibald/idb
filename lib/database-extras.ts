import { Func } from './util';
import { addTraps } from './wrap-idb-value';
import { IDBPDatabase, IDBPObjectStore, IDBPIndex } from '.';

function potentialDatabaseExtra(target: any, prop: string | number | symbol) {
  return (target instanceof IDBDatabase) &&
    !(prop in target) &&
    typeof prop === 'string';
}

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];

// Add index methods
readMethods.push(...readMethods.map(n => n + 'FromIndex'));

const cachedMethods = new Map<string, Func>();

function getMethod(prop: string): Func | undefined {
  if (readMethods.includes(prop)) {
    return function (this: IDBPDatabase, storeName: string, ...args: any[]) {
      // Are we dealing with an index method?
      let indexName: string = '';
      let targetFuncName: string = prop;
      if (targetFuncName.endsWith('FromIndex')) {
        indexName = args.shift();
        targetFuncName = targetFuncName.slice(0, -9); // remove "FromIndex"
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
    if (!potentialDatabaseExtra(target, prop)) {
      return oldTraps.get!(target, prop, receiver);
    }

    // tslint:disable-next-line:no-parameter-reassignment
    prop = prop as string;

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
    return (
      potentialDatabaseExtra(target, prop) &&
      (readMethods.includes(prop as string) || writeMethods.includes(prop as string))
    ) || oldTraps.has!(target, prop);
  },
}));
