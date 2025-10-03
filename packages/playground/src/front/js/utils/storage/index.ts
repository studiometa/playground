import { URLStorageProvider } from './URLStorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { SyncedStorageProvider } from './SyncedStorageProvider.js';
import { FallbackStorageProvider } from './FallbackStorageProvider.js';
import { ZipStorageProvider } from './ZipStorageProvider.js';
import { StorageProviderInterface } from './StorageProviderInterface.js';
import { MemoryStorageProvider } from './MemoryStorageProvider.js';
import { WatchableStore } from './WatchableStore.js';

export const memoryStorageProvider = new MemoryStorageProvider(new Map());
export const urlSearchStorageProvider = new URLStorageProvider(
  new URLSearchParams(window.location.search),
  'search',
);
export const urlHashStorageProvider = new URLStorageProvider(
  new URLSearchParams(window.location.hash.slice(1)),
  'hash',
);
export const urlStorageProvider = urlHashStorageProvider;
export const zipUrlStorageProvider = new ZipStorageProvider(urlStorageProvider);
export const localStorageProvider = new LocalStorageProvider(window.localStorage);
export const syncedStorageProvider = new SyncedStorageProvider(
  urlStorageProvider,
  localStorageProvider,
);
export const fallbackStorageProvider = new FallbackStorageProvider(
  urlStorageProvider,
  localStorageProvider,
);

export function createWatchableStore<T extends StorageProviderInterface = MemoryStorageProvider>(
  provider: T,
) {
  return new WatchableStore<T>(provider);
}

// @todo better support for serialization
// @todo get rid of the abstract class, use default value for each provider (new Map(), etc.)
// @todo maybe drop classes
export const memoryStore = createWatchableStore(memoryStorageProvider);
export const urlSearchStore = createWatchableStore(urlSearchStorageProvider);
export const urlHashStore = createWatchableStore(urlHashStorageProvider);
export const urlStore = createWatchableStore(urlStorageProvider);
export const zipUrlStore = createWatchableStore(zipUrlStorageProvider);
export const localStore = createWatchableStore(localStorageProvider);
export const syncedStore = createWatchableStore(syncedStorageProvider);
export const fallbackStore = createWatchableStore(fallbackStorageProvider);
