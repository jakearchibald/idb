var idb = (function (exports) {
    'use strict';

    const idbProxyableTypes = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction];
    const cursorAdvanceMethods = [
        IDBCursor.prototype.advance,
        IDBCursor.prototype.continue,
        IDBCursor.prototype.continuePrimaryKey,
    ];
    const cursorRequestMap = new WeakMap();
    const transactionDoneMap = new WeakMap();
    const transformCache = new WeakMap();
    const reverseTransformCache = new WeakMap();
    const instanceOfAny = (object, constructors) => constructors.some(c => object instanceof c);
    function promisifyRequest(request) {
        const promise = new Promise((resolve, reject) => {
            const unlisten = () => {
                request.removeEventListener('success', success);
                request.removeEventListener('error', error);
            };
            const success = () => {
                resolve(wrap(request.result));
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
                cursorRequestMap.set(value, request);
            }
        });
        // This is the only mapping that exists in reverseTransformCache, but the reverse doesn't exist in
        // transformCache. This is because we create many promises from a single IDBRequest.
        reverseTransformCache.set(promise, request);
        return promise;
    }
    function cacheDonePromiseForTransaction(tx) {
        // Early bail if we've already created a done promise for this transaction.
        if (transactionDoneMap.has(tx))
            return;
        const done = new Promise((resolve, reject) => {
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
    const idbObjectHandler = {
        get(target, prop) {
            // Special handling for transaction.done.
            if (prop === 'done' && target instanceof IDBTransaction)
                return transactionDoneMap.get(target);
            // Else transform whatever we get back.
            return wrap(target[prop]);
        },
    };
    function wrapFunction(func) {
        // Due to expected object equality (which is enforced by the caching in `wrap`), we
        // only create one new func per func, so we can't refer to `parent` inside the function, as it may
        // be different at call time.
        // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
        // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
        // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
        // with real promises, so each advance methods returns a new promise for the cursor object, or
        // undefined if the end of the cursor has been reached.
        if (cursorAdvanceMethods.includes(func)) {
            return function (...args) {
                // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
                // the original object.
                const originalCursor = unwrap(this);
                func.apply(originalCursor, args);
                const request = cursorRequestMap.get(this);
                return wrap(request);
            };
        }
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            const originalParent = unwrap(this);
            const value = func.apply(originalParent, args);
            return wrap(value);
        };
    }
    function transformCachableValue(value) {
        if (typeof value === 'function')
            return wrapFunction(value);
        // This doesn't return, it just creates a 'done' promise for the transaction,
        // which is later returned for transaction.done (see idbObjectHandler).
        if (value instanceof IDBTransaction)
            cacheDonePromiseForTransaction(value);
        if (instanceOfAny(value, idbProxyableTypes))
            return new Proxy(value, idbObjectHandler);
        // Return the same value back if we're not going to transform it.
        return value;
    }
    /**
     * Enhance an object/function with library helpers.
     *
     * @param value The thing to enhance.
     */
    function wrap(value) {
        // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
        // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
        if (value instanceof IDBRequest)
            return promisifyRequest(value);
        // If we've already transformed this value before, reuse the transformed value.
        // This is faster, but it also provides object equality.
        if (transformCache.has(value))
            return transformCache.get(value);
        const newValue = transformCachableValue(value);
        // Not all types are transformed.
        // These may be primitive types, so they can't be WeakMap keys.
        if (newValue !== value) {
            transformCache.set(value, newValue);
            reverseTransformCache.set(newValue, value);
        }
        return newValue;
    }
    /**
     * Revert an enhanced IDB object to a plain old miserable IDB one.
     *
     * Will also revert a promise back to an IDBRequest.
     *
     * @param value The enhanced object to revert.
     */
    const unwrap = (value) => reverseTransformCache.get(value);

    /**
     * Open a database.
     *
     * @param name Name of the database.
     * @param version Schema version.
     * @param callbacks Additional callbacks.
     */
    function openDb(name, version, callbacks = {}) {
        const { blocked, upgrade, blocking } = callbacks;
        const request = indexedDB.open(name, version);
        const openPromise = wrap(request);
        if (upgrade) {
            request.addEventListener('upgradeneeded', (event) => {
                upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction));
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
    function deleteDb(name) {
        const request = indexedDB.deleteDatabase(name);
        return wrap(request);
    }

    exports.openDb = openDb;
    exports.deleteDb = deleteDb;
    exports.unwrap = unwrap;

    return exports;

}({}));
