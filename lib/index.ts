import { wrap } from './wrap-idb-value';
export { unwrap } from './wrap-idb-value';

interface OpenDbCallbacks {
  /**
   * Called if this version of the database has never been opened before. Use it to specify the
   * schema for the database.
   *
   * @param database A database instance that you can use to add/remove stores and indexes.
   * @param oldVersion Last version of the database opened by the user.
   * @param newVersion Whatever new version you provided.
   */
  upgrade?(database: IDBDatabase, oldVersion: number, newVersion: number | null): void;
  /**
   * There are older versions of the database open on the origin, so this version cannot open.
   */
  blocked?(): void;
}

/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
export function openDb(
  name: string, version: number, callbacks: OpenDbCallbacks = {},
): Promise<IDBDatabase> {
  const { blocked, upgrade } = callbacks;
  const request = indexedDB.open(name, version);
  const openPromise = wrap(request);

  if (upgrade) {
    request.addEventListener('upgradeneeded', (event) => {
      upgrade(wrap(request.result), event.oldVersion, event.newVersion);
    });
  }

  if (blocked) request.addEventListener('blocked', () => blocked());
  return openPromise;
}

/**
 * Delete a database.
 *
 * @param name Name of the database.
 */
export function deleteDb(name: string): Promise<void> {
  const request = indexedDB.deleteDatabase(name);
  return wrap(request);
}
