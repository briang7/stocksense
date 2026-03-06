import fs from 'node:fs'
import path from 'node:path'

const CACHE_DIR = path.join(process.cwd(), '.cache')

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function keyToFile(key: string): string {
  // Simple hash to avoid filesystem issues with special chars
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
  return path.join(CACHE_DIR, `${safe}.json`)
}

interface CacheEntry<T> {
  data: T
  expires: number
  staleAt: number
}

/**
 * Persistent stale-while-revalidate cache.
 * - Returns fresh data if within TTL
 * - Returns stale data immediately if expired but still on disk, triggers background refresh
 * - Only fetches synchronously on complete cache miss
 */
export class PersistentCache {
  private mem = new Map<string, CacheEntry<unknown>>()
  private refreshing = new Set<string>()

  constructor() {
    ensureCacheDir()
  }

  get<T>(key: string): { data: T; stale: boolean } | null {
    // Check memory first
    const memEntry = this.mem.get(key) as CacheEntry<T> | undefined
    if (memEntry) {
      const now = Date.now()
      if (now < memEntry.expires) return { data: memEntry.data, stale: false }
      // Stale but usable
      return { data: memEntry.data, stale: true }
    }

    // Check disk
    try {
      const file = keyToFile(key)
      if (fs.existsSync(file)) {
        const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as CacheEntry<T>
        // Load into memory
        this.mem.set(key, raw)
        const now = Date.now()
        if (now < raw.expires) return { data: raw.data, stale: false }
        return { data: raw.data, stale: true }
      }
    } catch {
      // Corrupt cache file, ignore
    }

    return null
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    const entry: CacheEntry<T> = {
      data,
      expires: Date.now() + ttlMs,
      staleAt: Date.now() + ttlMs,
    }
    this.mem.set(key, entry)

    // Write to disk async
    try {
      const file = keyToFile(key)
      fs.writeFileSync(file, JSON.stringify(entry))
    } catch {
      // Non-critical
    }
  }

  isRefreshing(key: string): boolean {
    return this.refreshing.has(key)
  }

  markRefreshing(key: string): void {
    this.refreshing.add(key)
  }

  clearRefreshing(key: string): void {
    this.refreshing.delete(key)
  }
}

export const persistentCache = new PersistentCache()
