import RequestPromise from './request-promise';
import transformIdbValue from './transform-value';

interface OpenDbOptions {
  upgrade?(database: IDBDatabase, oldVersion: number, newVersion: number | null): void;
  blocked?(): void;
}

export function openDb(
  name: string, version: number, options: OpenDbOptions,
) {
  const { blocked, upgrade } = options;
  const request = indexedDB.open(name, version);

  return new RequestPromise(request, (resolve, reject) => {
    if (upgrade) {
      request.addEventListener('upgradeneeded', (event) => {
        upgrade(transformIdbValue(request.result), event.oldVersion, event.newVersion);
      });
    }

    if (blocked) request.addEventListener('blocked', () => blocked());

    transformIdbValue(request).then(transformIdbValue).then(resolve, reject);
  });
}

export function deleteDb(name: string) {
  const request = indexedDB.deleteDatabase(name);
  return transformIdbValue(request);
}
