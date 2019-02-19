import { instanceOfAny } from './util';
import { addTraps } from './wrap-idb-value';
import { IDBPObjectStore, IDBPIndex, IDBPCursor } from '.';

async function* iterate(this: IDBPObjectStore | IDBPIndex | IDBPCursor):
  AsyncIterableIterator<any> {
  // tslint:disable-next-line:no-this-assignment
  let cursor: typeof this | null = this;

  if (!(cursor instanceof IDBCursor)) {
    cursor = await (cursor as IDBPObjectStore | IDBPIndex).openCursor();
  }

  cursor = cursor as IDBPCursor;

  while (cursor) {
    if (cursor instanceof IDBCursorWithValue) yield [cursor.key, cursor.value];
    else yield cursor.key;
    cursor = await cursor.continue();
  }
}

function isIteratorProp(target: any, prop: number | string | symbol) {
  return prop === Symbol.asyncIterator &&
    instanceOfAny(target, [IDBCursor, IDBObjectStore, IDBIndex]);
}

addTraps(oldTraps => ({
  get(target, prop, receiver) {
    if (isIteratorProp(target, prop)) return iterate;
    return oldTraps.get!(target, prop, receiver);
  },
  has(target, prop) {
    return isIteratorProp(target, prop) || oldTraps.has!(target, prop);
  },
}));
