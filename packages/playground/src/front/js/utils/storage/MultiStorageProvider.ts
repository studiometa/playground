import { StorageProviderInterface } from './StorageProviderInterface.js';

export class MultiStorageProvider<T = unknown> implements StorageProviderInterface<T> {
  stores: Array<StorageProviderInterface<T>>;

  constructor(stores: Array<StorageProviderInterface<T>>) {
    this.stores = stores;
  }

  async get(key: string): Promise<T | undefined> {
    const values = new Set(this.stores.map((store) => store.get(key)));

    if (values.size > 1) {
      console.warn('Value mismatch in MultiStorageProvider.', Array.from(values));
    }

    return Array.from(values).shift();
  }

  async set(key: string, value: T) {
    for (const store of this.stores) {
      store.set(key, value);
    }
  }

  async has(key: string) {
    return this.stores.every((store) => store.has(key));
  }

  async delete(key: string) {
    for (const store of this.stores) {
      store.delete(key);
    }
  }
}
