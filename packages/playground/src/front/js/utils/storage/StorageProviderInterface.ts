export interface StorageProviderInterface<U = unknown> {
  get(key: string): Promise<U | undefined>;
  set(key: string, value: U): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
