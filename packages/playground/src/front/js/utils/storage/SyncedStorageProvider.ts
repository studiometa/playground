import { StorageProviderInterface } from './StorageProviderInterface.js';
import { AbstractStorageProvider } from './AbstractStorageProvider.js';

export class SyncedStorageProvider<
    T extends StorageProviderInterface<V>,
    U extends StorageProviderInterface<V>,
    V = unknown,
  >
  extends AbstractStorageProvider<T>
  implements StorageProviderInterface<V>
{
  childStore: U;

  constructor(store: T, childStore: U) {
    super(store);
    this.childStore = childStore;
  }

  async get(key: string): Promise<V | null> {
    const value = await this.store.get(key);

    if (this.childStore.get(key) !== value) {
      this.childStore.set(key, value);
    }

    return value;
  }

  async set(key: string, value: V) {
    this.store.set(key, value);
    this.childStore.set(key, value);
  }

  async has(key: string) {
    return this.store.has(key);
  }

  async delete(key: string) {
    this.store.delete(key);
    this.childStore.delete(key);
  }
}
