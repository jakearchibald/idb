export default class RequestPromise<T> extends Promise<T> {
  // The request property only exists for this instance. Resolving this promise, eg calling .then
  // will return a regular Promise.
  static get [Symbol.species]() { return Promise; }

  /** The original IDBRequest for this action. */
  public request: IDBRequest;

  constructor(
    request: IDBRequest,
    executor:
      (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void,
  ) {
    super(executor);
    this.request = request;
  }
}
