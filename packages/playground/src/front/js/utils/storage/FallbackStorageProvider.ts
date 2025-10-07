import { StorageProviderInterface } from './StorageProviderInterface.js';
import { AbstractStorageProvider } from './AbstractStorageProvider.js';

export class FallbackStorageProvider<
    T extends StorageProviderInterface<V>,
    U extends StorageProviderInterface<V>,
    V = unknown,
  >
  extends AbstractStorageProvider<T>
  implements StorageProviderInterface<V>
{
  fallbackStore: U;

  constructor(store: T, fallbackStore: U) {
    super(store);
    this.fallbackStore = fallbackStore;
  }

  async get(key: string): Promise<V | null> {
    return this.store.get(key) ?? this.fallbackStore.get(key);
  }

  async set(key: string, value: V) {
    this.store.set(key, value);
    this.fallbackStore.set(key, value);
  }

  async has(key: string) {
    return this.store.has(key) || this.fallbackStore.has(key);
  }

  async delete(key: string) {
    this.store.delete(key);
    this.fallbackStore.delete(key);
  }
}
