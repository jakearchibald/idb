'use strict';

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisifyCursorRequest(request) {
  return promisifyRequest.then(value => {
    if (!value) return;
    return new Cursor(value, request);
  })
}

function proxyProperties(ProxyClass, targetProp, properties) {
  for (let prop of properties) {
    Object.defineProperty(ProxyClass.prototype, prop, {
      get: function() {
        return this[targetProp][prop];
      }
    });
  }
}

function proxyRequestMethods(ProxyClass, targetProp, properties) {
  for (let prop of properties) {
    ProxyClass.prototype[prop] = function() {
      return promisifyRequest(this[targetProp][prop](...arguments));
    };
  }
}

function proxyMethods(ProxyClass, targetProp, properties) {
  for (let prop of properties) {
    ProxyClass.prototype[prop] = function() {
      return this[targetProp][prop](...arguments);
    };
  }
}

function proxyCursorRequestMethods(ProxyClass, targetProp, properties) {
  for (let prop of properties) {
    ProxyClass.prototype[prop] = function() {
      return promisifyCursorRequest(this[targetProp][prop](...arguments));
    };
  }
}

class Index {
  constructor(index) {
    this._index = index;
  }
}

proxyProperties(Index, '_index', [
  'name',
  'keyPath',
  'multiEntry',
  'unique'
]);

proxyRequestMethods(Index, '_index', [
  'get',
  'getKey',
  'getAll',
  'getAllKeys',
  'count'
]);

proxyCursorRequestMethods(Index, '_index', [
  'openCursor',
  'openKeyCursor'
]);

class Cursor {
  constructor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }
}

proxyProperties(Cursor, '_cursor', [
  'direction',
  'key',
  'primaryKey'
]);

proxyRequestMethods(Cursor, '_cursor', ['update', 'delete']);

// proxy 'next' methods
for (let methodName of ['advance', 'continue', 'continuePrimaryKey']) {
  Cursor.prototype[methodName] = function() {
    this._cursor[methodName](...arguments);
    return promisifyCursorRequest(this._request);
  };
}

class ObjectStore {
  constructor(store) {
    this._store = store;
  }

  createIndex() {
    return new Index(this._store.createIndex(...arguments));
  }

  index() {
    return new Index(this._store.createIndex(...arguments));
  }
}

proxyProperties(ObjectStore, '_store', [
  'name',
  'keyPath',
  'indexNames',
  'autoIncrement'
]);

proxyRequestMethods(ObjectStore, '_store', [
  'put',
  'add',
  'delete',
  'clear',
  'get',
  'getAll',
  'getAllKeys',
  'count'
]);

proxyCursorRequestMethods(ObjectStore, '_store', [
  'openCursor',
  'openKeyCursor'
]);

proxyMethod(ObjectStore, '_store', [
  'deleteIndex'
]);

class Transaction {
  constructor(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise((resolve, reject) => {
      idbTransaction.oncomplete = () => resolve();
      idbTransaction.onerror = () => reject(idbTransaction.error);
    });
  }

  objectStore() {
    return new ObjectStore(this._tx.objectStore(...arguments));
  }
}

proxyProperties(Transaction, '_tx', [
  'objectStoreNames',
  'mode'
]);

proxyMethod(Transaction, '_tx', [
  'abort'
]);

class UpgradeDB {
  constructor(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  createObjectStore() {
    return new ObjectStore(this._db.createObjectStore(...arguments));
  }
}

proxyProperties(UpgradeDB, '_db', [
  'name',
  'version',
  'objectStoreNames'
]);

proxyMethod(UpgradeDB, '_db', [
  'deleteObjectStore',
  'close'
]);

class DB {
  constructor(db) {
    this._db = db;
  }

  transaction() {
    return this._db.transaction(...arguments).then(tx => new Transaction());
  }
}

proxyProperties(DB, '_db', [
  'name',
  'version',
  'objectStoreNames'
]);

proxyMethod(DB, '_db', [
  'close'
]);

export function openIDB(name, version, upgradeCallback) {
  var request = indexedDB.open(name, version);
  request.onupgradeneeded = function(event) {
    upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
  };
  return promisifyRequest(request).then(db => new DB(db));
}

export function deleteIDB(name) {
  return promisifyRequest(indexedDB.deleteDatabase(name));
}