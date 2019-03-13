'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var __chunk_1 = require('./chunk.js');

/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
function openDB(name, version, { blocked, upgrade, blocking } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = __chunk_1.wrap(request);
    if (upgrade) {
        request.addEventListener('upgradeneeded', (event) => {
            upgrade(__chunk_1.wrap(request.result), event.oldVersion, event.newVersion, __chunk_1.wrap(request.transaction));
        });
    }
    if (blocked)
        request.addEventListener('blocked', () => blocked());
    if (blocking)
        openPromise.then(db => db.addEventListener('versionchange', blocking));
    return openPromise;
}
/**
 * Delete a database.
 *
 * @param name Name of the database.
 */
function deleteDB(name, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name);
    if (blocked)
        request.addEventListener('blocked', () => blocked());
    return __chunk_1.wrap(request).then(() => undefined);
}

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];
const cachedMethods = new Map();
function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase &&
        !(prop in target) &&
        typeof prop === 'string'))
        return;
    if (cachedMethods.get(prop))
        return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, '');
    const useIndex = prop !== targetFuncName;
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    if (!(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype)) {
        return;
    }
    let method;
    if (readMethods.includes(targetFuncName)) {
        method = function (storeName, ...args) {
            let target = this.transaction(storeName).store;
            if (useIndex)
                target = target.index(args.shift());
            return target[targetFuncName](...args);
        };
    }
    if (writeMethods.includes(targetFuncName)) {
        method = function (storeName, ...args) {
            const tx = this.transaction(storeName, 'readwrite');
            tx.store[targetFuncName](...args);
            return tx.done;
        };
    }
    if (method)
        cachedMethods.set(prop, method);
    return method;
}
__chunk_1.addTraps(oldTraps => ({
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
}));

exports.unwrap = __chunk_1.unwrap;
exports.wrap = __chunk_1.wrap;
exports.openDB = openDB;
exports.deleteDB = deleteDB;
