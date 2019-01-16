/**
 * Enhance an object/function with library helpers.
 *
 * @param value The thing to enhance.
 */
export declare function wrap(value: any): any;
/**
 * Revert an enhanced IDB object to a plain old miserable IDB one.
 *
 * Will also revert a promise back to an IDBRequest.
 *
 * @param value The enhanced object to revert.
 */
export declare const unwrap: <T extends object>(value: T) => T | undefined;
