import { historyReplace } from '@studiometa/js-toolkit/utils';
import { StorageProviderInterface } from './StorageProviderInterface.js';
import { AbstractStorageProvider } from './AbstractStorageProvider.js';

export class URLStorageProvider
  extends AbstractStorageProvider<URLSearchParams>
  implements StorageProviderInterface<string>
{
  declare ['constructor']: typeof URLStorageProvider;

  static MODES = {
    SEARCH: 'search',
    HASH: 'hash',
  };

  mode: 'search' | 'hash';

  constructor(store: URLSearchParams, mode: 'search' | 'hash' = 'search') {
    super(store);
    this.mode = mode;
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key);
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    historyReplace({
      [this.mode]: this.mode === this.constructor.MODES.SEARCH ? this.store : this.store.toString(),
    });
  }

  async has(key: string) {
    return this.store.has(key);
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}
