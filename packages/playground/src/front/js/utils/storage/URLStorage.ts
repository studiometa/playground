import { historyReplace } from '@studiometa/js-toolkit/utils';
import { StorageInterface } from './StorageInterface.js';
import { AbstractStorage } from './AbstractStorage.js';

export class URLStorage
  extends AbstractStorage<URLSearchParams>
  implements StorageInterface<string>
{
  declare ['constructor']: typeof URLStorage;

  static MODES = {
    SEARCH: 'search',
    HASH: 'hash',
  };

  mode: 'search' | 'hash';

  constructor(store: URLSearchParams, mode: 'search' | 'hash' = 'search') {
    super(store);
    this.mode = mode;
  }

  get(key: string): string | null {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
    historyReplace({
      [this.mode]: this.mode === this.constructor.MODES.SEARCH ? this.store : this.store.toString(),
    });
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}
