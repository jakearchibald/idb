export default class RequestPromise<T> extends Promise<T> {
  static get [Symbol.species]() { return Promise; }

  constructor(
    public request: IDBRequest,
    executor:
      (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void,
  ) {
    super(executor);
  }
}
