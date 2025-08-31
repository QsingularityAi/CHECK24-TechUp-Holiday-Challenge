/**
 * Services Module
 * 
 * This is the main entry point for all services in the application.
 * Services are organized into logical categories for better maintainability.
 * 
 * CONSOLIDATED ARCHITECTURE:
 * - ConsolidatedDataService: Unified data processing and search (RECOMMENDED)
 * - Legacy services: Available for backward compatibility but deprecated
 */

// RECOMMENDED: Consolidated Services (New Architecture)
export {
  ConsolidatedDataService,
  ConsolidatedServiceFactory,
  consolidatedDataService
} from './consolidatedServices';
export type {
  ConsolidatedServiceConfig,
  ServiceMetrics,
  ServiceResult
} from './consolidatedServices';

// Data Processing Services (Legacy - Use ConsolidatedDataService instead)
export { DataLoader } from './data/dataLoader';
export { UnifiedCsvProcessor } from './data/unifiedCsvProcessor';
export { UltraPerformanceStorage } from './data/ultraPerformanceStorage';

// Search Services (Legacy - Use ConsolidatedDataService instead)
export { UnifiedSearchEngine, UltraFastSearchEngine } from './search';
export { AdaptiveConfigOptimizer } from './search';
export { SearchIndexesImpl } from './search';
export type { UnifiedSearchResult, UltraSearchResult, AdaptiveSearchConfig, DatasetMetrics } from './search';

// Optimization Services
export * from './optimization';

// User Services
export * from './user';

// Backward compatibility exports for commonly used services
// Note: DataLoader and UnifiedSearchEngine are already exported above
export { CacheService, cacheService } from './optimization/cacheService';
export { RecommendationService } from './user/recommendationService';
export { ShortlistService, shortlistService } from './user/shortlistService';

// Re-export important types
export type {
  SmartRecommendation,
  UserShortlist,
  ShortlistItem,
  PriceAlert
} from '../types';

// Production configuration
export { getConfig } from '../config/production';
export { ProductionErrorHandler } from '../utils/productionErrorHandler';