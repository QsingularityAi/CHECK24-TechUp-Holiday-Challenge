/**
 * Data Processing Services
 * 
 * This module contains all services related to data loading, processing,
 * and storage optimization for large datasets.
 */

// Core data loading and processing
export { DataLoader } from './dataLoader';
export type { DataLoadResult, CsvParseResult, ProgressUpdate } from './dataLoader';

// Advanced data processing for ultra-large datasets
export { default as AdvancedDataSystem } from './advancedDataProcessor';
export {
  MemoryMappedOfferStore,
  StreamingDataProcessor,
  ParallelDataProcessor,
  AdvancedIndexedStorage
} from './advancedDataProcessor';

// Streaming CSV processing
export { StreamingCsvProcessor } from './streamingCsvProcessor';
export type {
  StreamingConfig,
  ProcessingProgress
} from './streamingCsvProcessor';

// Unified CSV Processing
export { UnifiedCsvProcessor, ProcessingMode, CsvProcessingConfig, CsvProcessingResult } from './unifiedCsvProcessor';
export { ProcessingProgress as UnifiedProcessingProgress } from './unifiedCsvProcessor';

// Unified Data Pipeline
export { UnifiedDataPipeline, PipelineConfig, PipelineMetrics, PipelineResult, PipelineConfigFactory } from './unifiedDataPipeline';

// Storage optimization
export { default as UltraCompressedStorage } from './compressedStorage';
export {
  UltraPerformanceStorage,
  UltraFastBitSet,
  ColumnarOfferStorage
} from './ultraPerformanceStorage';