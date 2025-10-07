import { zip, unzip } from '../../../../lib/utils/zip.js';
import { StorageProviderInterface } from './StorageProviderInterface.js';
import { AbstractStorageProvider } from './AbstractStorageProvider.js';

export class ZipStorageProvider
  extends AbstractStorageProvider<StorageProviderInterface<string>>
  implements StorageProviderInterface<string>
{
  async get(key: string): Promise<string | null> {
    const value = await this.store.get(key);

    if (value) {
      return unzip(value);
    }

    return value;
  }

  async set(key: string, value: string) {
    this.store.set(key, zip(value));
  }

  async has(key: string) {
    return this.store.has(key);
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}
