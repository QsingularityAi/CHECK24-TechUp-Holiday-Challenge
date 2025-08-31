/**
 * Optimization Services
 * 
 * This module contains services for performance optimization,
 * caching, and memory-efficient data structures.
 */

// Caching service
export { CacheService, cacheService } from './cacheService';

// Bloom filters for fast existence checks
export {
  BloomFilter,
  CountingBloomFilter,
  ScalableBloomFilter,
  HotelBloomFilterSystem
} from './bloomFilter';
export { default as DefaultBloomFilter } from './bloomFilter';