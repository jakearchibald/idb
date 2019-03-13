import { Func } from './util';
import { addTraps } from './wrap-idb-value';
import { IDBPDatabase, IDBPObjectStore, IDBPIndex } from './entry';

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];
const cachedMethods = new Map<string, Func>();

function getMethod(target: any, prop: string | number | symbol): Func | undefined {
  if (!(
    target instanceof IDBDatabase &&
    !(prop in target) &&
    typeof prop === 'string'
  )) return;

  if (cachedMethods.get(prop)) return cachedMethods.get(prop);

  const targetFuncName: string = prop.replace(/FromIndex$/, '');
  const useIndex = prop !== targetFuncName;

  // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
  if (!(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype)) {
    return;
  }

  let method: Func | undefined;

  if (readMethods.includes(targetFuncName)) {
    method = function (this: IDBPDatabase, storeName: string, ...args: any[]) {
      let target: IDBPObjectStore | IDBPIndex = this.transaction(storeName).store;
      if (useIndex) target = target.index(args.shift());
      return (target as any)[targetFuncName](...args);
    };
  }
  if (writeMethods.includes(targetFuncName)) {
    method = function (this: IDBPDatabase, storeName: string, ...args: any[]) {
      const tx = this.transaction(storeName, 'readwrite');
      (tx.store as any)[targetFuncName](...args);
      return tx.done;
    };
  }

  if (method) cachedMethods.set(prop, method);
  return method;
}

addTraps(oldTraps => ({
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get!(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has!(target, prop),
}));
