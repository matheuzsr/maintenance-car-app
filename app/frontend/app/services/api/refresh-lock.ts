const REFRESH_LOCK_NAME = 'garage-em-dia:refresh-session';

interface LockManagerLike {
  request<T>(name: string, callback: () => T | PromiseLike<T>): Promise<T>;
}

export function runRefreshExclusive<T>(action: () => Promise<T>): Promise<T> {
  const locks = (
    globalThis.navigator as Navigator & { locks?: LockManagerLike }
  ).locks;
  return locks ? locks.request<T>(REFRESH_LOCK_NAME, action) : action();
}
