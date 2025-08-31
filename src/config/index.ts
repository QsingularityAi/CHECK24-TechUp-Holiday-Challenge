/**
 * Application configuration
 */
export interface AppConfig {
  port: number;
  environment: "development" | "production" | "test";
  logLevel: "debug" | "info" | "warn" | "error";
  // Data paths
  offersDataPath: string;
  hotelsDataPath: string;
  // Request handling
  requestTimeout: number;
  maxRequestSize: string;
  // Advanced optimization configuration
  enableAdvancedOptimizations: boolean;
  enableStreamingIndexBuilding: boolean; // NEW: Enable streaming index building
  // Ultra-performance configuration
  enableUltraPerformance: boolean;
  ultraPerformanceConfig: {
    maxOffers: number;
    maxHotels: number;
    useColumnarStorage: boolean;
    useMemoryMapping: boolean;
    useBitSetIndexes: boolean;
    useParallelProcessing: boolean;
    numWorkers: number;
  };
  streamingConfig: {
    // NEW: Streaming configuration
    chunkSize: number;
    enableMemoryMonitoring: boolean;
    memoryThresholdMB: number;
    gcInterval: number;
  };
  advancedOptimizationConfig: {
    useMemoryMappedStorage: boolean;
    useBloomFilters: boolean;
    useCompressedStorage: boolean;
    useMultiThreading: boolean;
    useAdvancedIndexing: boolean;
  };
}

/**
 * Default configuration values
 */
export const defaultConfig: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  environment:
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "development",
  logLevel:
    (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info",
  offersDataPath: process.env.OFFERS_DATA_PATH || "./data/offers.csv",
  hotelsDataPath: process.env.HOTELS_DATA_PATH || "./data/hotels.csv",
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "30000", 10),
  maxRequestSize: process.env.MAX_REQUEST_SIZE || "10mb",
  enableAdvancedOptimizations:
    process.env.ENABLE_ADVANCED_OPTIMIZATIONS === "true",
  enableStreamingIndexBuilding:
    process.env.ENABLE_STREAMING_INDEX_BUILDING !== "false", // Default to true
  // Ultra-performance configuration
  enableUltraPerformance: process.env.ENABLE_ULTRA_PERFORMANCE === "true",
  ultraPerformanceConfig: {
    maxOffers: parseInt(process.env.ULTRA_MAX_OFFERS || "100000000", 10), // 100M offers
    maxHotels: parseInt(process.env.ULTRA_MAX_HOTELS || "300000", 10), // 300K hotels
    useColumnarStorage: process.env.ULTRA_USE_COLUMNAR_STORAGE !== "false", // Default true
    useMemoryMapping: process.env.ULTRA_USE_MEMORY_MAPPING === "true",
    useBitSetIndexes: process.env.ULTRA_USE_BITSET_INDEXES !== "false", // Default true
    useParallelProcessing:
      process.env.ULTRA_USE_PARALLEL_PROCESSING !== "false", // Default true
    numWorkers:
      parseInt(process.env.ULTRA_NUM_WORKERS || "0", 10) ||
      require("os").cpus().length - 1,
  },
  streamingConfig: {
    chunkSize: parseInt(process.env.STREAMING_CHUNK_SIZE || "10000", 10),
    enableMemoryMonitoring: process.env.ENABLE_MEMORY_MONITORING !== "false", // Default to true
    memoryThresholdMB: parseInt(process.env.MEMORY_THRESHOLD_MB || "12000", 10), // 12GB default
    gcInterval: parseInt(process.env.GC_INTERVAL || "50", 10), // GC every 50 chunks
  },
  advancedOptimizationConfig: {
    useMemoryMappedStorage: process.env.USE_MEMORY_MAPPED_STORAGE === "true",
    useBloomFilters: process.env.USE_BLOOM_FILTERS === "true",
    useCompressedStorage: process.env.USE_COMPRESSED_STORAGE === "true",
    useMultiThreading: process.env.USE_MULTI_THREADING === "true",
    useAdvancedIndexing: process.env.USE_ADVANCED_INDEXING === "true",
  },
};

/**
 * Get configuration with environment overrides
 */
export function getConfig(): AppConfig {
  return {
    ...defaultConfig,
    // Override with environment-specific settings
    ...(process.env.NODE_ENV === "production" && {
      logLevel: "warn",
      enableAdvancedOptimizations: true, // Enable in production by default
      enableUltraPerformance: true, // Enable ultra-performance in production
      ultraPerformanceConfig: {
        ...defaultConfig.ultraPerformanceConfig,
        useColumnarStorage: true,
        useMemoryMapping: true,
        useBitSetIndexes: true,
        useParallelProcessing: true,
      },
      advancedOptimizationConfig: {
        ...defaultConfig.advancedOptimizationConfig,
        useMemoryMappedStorage: true,
        useBloomFilters: true,
        useCompressedStorage: true,
        useAdvancedIndexing: true,
      },
    }),
  };
}

/**
 * Get configuration singleton
 */
export const config = getConfig();
