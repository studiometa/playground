export class AbstractStorageProvider<T> {
  store: T;

  constructor(store: T) {
    this.store = store;
  }
}
