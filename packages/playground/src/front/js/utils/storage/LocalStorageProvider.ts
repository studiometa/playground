import { isString } from '@studiometa/js-toolkit/utils';
import { StorageProviderInterface } from './StorageProviderInterface.js';
import { AbstractStorageProvider } from './AbstractStorageProvider.js';

export class LocalStorageProvider
  extends AbstractStorageProvider<Storage>
  implements StorageProviderInterface<string>
{
  async get(key: string): Promise<string | null> {
    return this.store.getItem(key);
  }

  async set(key: string, value: string) {
    this.store.setItem(key, value);
  }

  async has(key: string) {
    return isString(this.get(key));
  }

  async delete(key: string) {
    this.store.removeItem(key);
  }
}
