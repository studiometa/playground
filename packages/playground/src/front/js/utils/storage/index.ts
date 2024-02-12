import { URLStorage } from './URLStorage.js';
import { LocalStorage } from './LocalStorage.js';
import { SyncedStorage } from './SyncedStorage.js';
import { FallbackStorage } from './FallbackStorage.js';
import { ZipStorage } from './ZipStorage.js';

export const urlSearchStore = new URLStorage(
  new URLSearchParams(window.location.hash.slice(1)),
  'search',
);
export const urlHashStore = new URLStorage(
  new URLSearchParams(window.location.hash.slice(1)),
  'hash',
);
export const urlStore = urlHashStore;
export const zipUrlStore = new ZipStorage(urlStore);
export const localStore = new LocalStorage(window.localStorage);
export const syncedStore = new SyncedStorage(urlStore, localStore);
export const fallbackStore = new FallbackStorage(urlStore, localStore);
