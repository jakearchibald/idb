declare var idb: IDBStatic
export default idb

export interface IDBStatic {
  open(name: string, version: number, upgradeCallback?: (db: UpgradeDB) => void): Promise<DB>
  delete(name: string): Promise<void>
}

export interface DB {
  readonly name: string
  readonly version: number
  readonly objectStoreNames: DOMStringList

  close(): void
  transaction(storeNames: string | string[], mode?: string): Transaction
}

export interface UpgradeDB {
  readonly name: string
  readonly version: number
  readonly oldVersion: number
  readonly objectStoreNames: DOMStringList

  readonly transaction: Transaction

  createObjectStore(name: string, optionalParameters?: IDBObjectStoreParameters): ObjectStore
  deleteObjectStore(name: string): void
}

export interface Transaction {
  readonly complete: Promise<void>

  readonly objectStoreNames: DOMStringList
  readonly mode: string

  abort(): void
  objectStore(name: string): ObjectStore
}

export interface ObjectStore {
  readonly name: string
  readonly keyPath: string | string[]
  readonly indexNames: DOMStringList
  readonly autoIncrement: boolean

  put(value: any, key?: IDBKeyRange | IDBValidKey): Promise<IDBValidKey>
  add(value: any, key?: IDBKeyRange | IDBValidKey): Promise<IDBValidKey>
  delete(key: IDBKeyRange | IDBValidKey): Promise<void>
  clear(): Promise<void>
  get(key: any): Promise<any>
  getAll(query?: IDBKeyRange | IDBValidKey, count?: number): Promise<any[]>
  getAllKeys(query?: IDBKeyRange, count?: number): Promise<any[]>
  count(key?: IDBKeyRange | IDBValidKey): Promise<number>

  openCursor(range?: IDBKeyRange | IDBValidKey, direction?: string): Promise<Cursor>
  openKeyCursor(range?: IDBKeyRange | IDBValidKey, direction?: string): Promise<Cursor>

  createIndex(name: string, keyPath: string | string[], optionalParameters?: IDBIndexParameters): Index
  deleteIndex(indexName: string): void
  index(name: string): Index

  iterateCursor(callback: (c: Cursor) => void): void
  iterateKeyCursor(callback: (c: Cursor) => void): void
}

export interface Index {
  readonly name: string
  readonly keyPath: string | string[]
  readonly multiEntry: boolean
  readonly unique: boolean

  count(key?: IDBKeyRange | IDBValidKey): Promise<number>
  get(key: IDBKeyRange | IDBValidKey): Promise<any>
  getKey(key: IDBKeyRange | IDBValidKey): Promise<any>
  getAll(query?: IDBKeyRange | IDBValidKey, count?: number): Promise<any[]>
  getAllKeys(query?: IDBKeyRange, count?: number): Promise<any[]>

  openCursor(range?: IDBKeyRange | IDBValidKey, direction?: string): Promise<Cursor>
  openKeyCursor(range?: IDBKeyRange | IDBValidKey, direction?: string): Promise<Cursor>

  iterateCursor(callback: (c: Cursor) => void): void
  iterateKeyCursor(callback: (c: Cursor) => void): void
}

export interface Cursor {
  readonly key: IDBKeyRange | IDBValidKey
  readonly primaryKey: any
  readonly direction: string
  readonly value: any

  delete(): Promise<void>
  update(value: any): Promise<void>

  advance(count: number): Promise<Cursor>
  continue(key?: IDBKeyRange | IDBValidKey): Promise<Cursor>
  continuePrimaryKey(key?: IDBKeyRange | IDBValidKey, primaryKey?: any): Promise<Cursor>
}
