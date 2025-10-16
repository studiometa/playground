import { StorageProviderInterface } from './StorageProviderInterface';

export type WatchableStoreHandler = (key: string, newValue: unknown, oldValue: unknown) => void;

export class WatchableStore<T extends StorageProviderInterface<U>, U = unknown>
  implements StorageProviderInterface<U>
{
  provider: T;
  handlers = new Set<WatchableStoreHandler>();

  constructor(provider: T) {
    this.provider = provider;
  }

  async get(key: string): Promise<U | undefined> {
    return this.provider.get(key);
  }

  async set(key: string, value: U) {
    const oldValue = await this.provider.get(key);
    this.provider.set(key, value);
    for (const handler of this.handlers) {
      handler(key, value, oldValue);
    }
  }

  async has(key: string) {
    return this.provider.has(key);
  }

  async delete(key: string) {
    return this.provider.delete(key);
  }

  watch(handler: WatchableStoreHandler) {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }

  unwatch() {
    this.handlers = new Set();
  }
}
