/**
 * Search Services
 * 
 * This module contains all services related to search functionality,
 * indexing, and query processing.
 */

// Unified search engine (replaces SearchEngine and UltraFastSearchEngine)
export { UnifiedSearchEngine } from './unifiedSearchEngine';
export type {
  UnifiedSearchResult,
  SearchMetrics,
  StreamingConfig
} from './unifiedSearchEngine';

// Adaptive configuration system
export { AdaptiveConfigOptimizer } from './adaptiveConfig';
export type {
  AdaptiveSearchConfig,
  DatasetMetrics,
  SystemCapabilities
} from './adaptiveConfig';

// Legacy exports for backward compatibility (deprecated)
// @deprecated Use UnifiedSearchEngine instead
export { UltraFastSearchEngine } from './ultraFastSearchEngine';
export type {
  UltraSearchResult,
  UltraSearchConfig
} from './ultraFastSearchEngine';

// Search indexes (still used by legacy code)
export { SearchIndexesImpl } from './searchIndexes';
export type {
  OptimizedOffer,
  IndexStats
} from './searchIndexes';