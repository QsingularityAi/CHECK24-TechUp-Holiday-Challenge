import { SearchCache } from '../../types';

/**
 * High-performance in-memory cache service for search results
 * Designed for sub-100ms query times
 */
export class CacheService {
  private cache = new Map<string, SearchCache>();
  private readonly defaultTTL = 300000; // 5 minutes
  private readonly maxCacheSize = 10000; // Maximum number of cached items
  private readonly cleanupInterval = 60000; // 1 minute cleanup interval
  private cleanupTimer?: NodeJS.Timeout | undefined;
  private isDestroyed = false;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generates a cache key from search criteria
   */
  generateKey(prefix: string, criteria: any): string {
    // Create a normalized, deterministic key
    const normalized = this.normalizeObject(criteria);
    return `${prefix}:${this.hashObject(normalized)}`;
  }

  /**
   * Stores a value in the cache
   */
  set(key: string, value: any, ttl: number = this.defaultTTL): void {
    // Prevent cache overflow
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    const cacheItem: SearchCache = {
      key,
      result: value,
      timestamp: new Date(),
      ttl
    };

    this.cache.set(key, cacheItem);
  }

  /**
   * Retrieves a value from the cache
   */
  get(key: string): any | null {
    const cacheItem = this.cache.get(key);
    
    if (!cacheItem) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    const itemAge = now - cacheItem.timestamp.getTime();
    
    if (itemAge > cacheItem.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cacheItem.result;
  }

  /**
   * Checks if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Removes a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsageEstimate: string;
  } {
    // Simple memory estimation
    const estimatedSize = this.cache.size * 1000; // Rough estimate: 1KB per entry
    
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // TODO: Implement hit rate tracking
      memoryUsageEstimate: `${Math.round(estimatedSize / 1024)}KB`
    };
  }

  /**
   * Normalizes an object for consistent key generation
   */
  private normalizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeObject(item)).sort();
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const normalized: any = {};
      const keys = Object.keys(obj).sort();
      
      for (const key of keys) {
        if (obj[key] !== undefined) {
          normalized[key] = this.normalizeObject(obj[key]);
        }
      }
      
      return normalized;
    }

    if (obj instanceof Date) {
      return obj.getTime();
    }

    return obj;
  }

  /**
   * Creates a hash from an object (simple but fast)
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Evicts the oldest cache entries
   */
  private evictOldest(): void {
    const entriesToEvict = Math.floor(this.maxCacheSize * 0.1); // Remove 10%
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
    
    for (let i = 0; i < entriesToEvict && i < entries.length; i++) {
      this.cache.delete(entries[i]![0]);
    }
  }

  /**
   * Starts the cleanup timer to remove expired entries
   */
  private startCleanupTimer(): void {
    if (this.isDestroyed) return;
    
    this.cleanupTimer = setInterval(() => {
      if (!this.isDestroyed) {
        this.cleanupExpiredEntries();
      }
    }, this.cleanupInterval);
    
    // Unref the timer to prevent it from keeping the process alive
    this.cleanupTimer.unref();
  }

  /**
   * Removes expired entries from cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cacheItem] of this.cache.entries()) {
      const itemAge = now - cacheItem.timestamp.getTime();
      if (itemAge > cacheItem.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0 && !this.isDestroyed) {
      // Only log during development, not in tests
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.isDestroyed = true;
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null as any;
    }
    this.clear();
  }
}

// Singleton instance
export const cacheService = new CacheService();
