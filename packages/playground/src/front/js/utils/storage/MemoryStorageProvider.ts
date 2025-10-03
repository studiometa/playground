import { StorageProviderInterface } from './StorageProviderInterface.js';
import { AbstractStorageProvider } from './AbstractStorageProvider.js';

export class MemoryStorageProvider
  extends AbstractStorageProvider<Map<string, string>>
  implements StorageProviderInterface<string>
{
  async get(key: string): Promise<string | null> {
    return this.store.get(key);
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
  }

  async has(key: string) {
    return this.store.has(key);
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}
