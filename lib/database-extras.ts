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
  const isWrite = writeMethods.includes(targetFuncName);

  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
    !(isWrite || readMethods.includes(targetFuncName))
  ) return;

  const method = async function (this: IDBPDatabase, storeName: string, ...args: any[]) {
    // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
    const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
    let target: IDBPObjectStore | IDBPIndex = tx.store;
    if (useIndex) target = target.index(args.shift());
    const returnVal = (target as any)[targetFuncName](...args);
    if (isWrite) await tx.done;
    return returnVal;
  };

  cachedMethods.set(prop, method);
  return method;
}

addTraps(oldTraps => ({
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get!(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has!(target, prop),
}));
