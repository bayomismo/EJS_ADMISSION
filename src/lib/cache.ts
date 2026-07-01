// Lightweight in-memory cache with TTL — used to keep public read endpoints
// fast under load (environment restricts extra caching middleware).

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = 60_000): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheDelete(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function cacheClear(): void {
  store.clear();
}

// Convenience: get-or-set helper
export async function cacheMemo<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== undefined) return cached;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}
