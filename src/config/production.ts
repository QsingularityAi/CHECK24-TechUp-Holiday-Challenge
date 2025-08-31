/**
 * Production Configuration for Large-Scale Data Processing
 * 
 * This configuration ensures optimal performance and reliability
 * for handling massive datasets (100M+ offers, 300K+ hotels) in production.
 */

import { CsvProcessingConfig, ProcessingMode } from '../services/data/unifiedCsvProcessor';

/**
 * Production environment configuration
 */
export interface ProductionConfig {
  // Data processing settings
  dataProcessing: {
    maxMemoryUsageMB: number;
    maxConcurrentOperations: number;
    enableMemoryMonitoring: boolean;
    enablePerformanceMetrics: boolean;
    enableHealthChecks: boolean;
  };
  
  // CSV processing configuration
  csvProcessing: {
    defaultConfig: CsvProcessingConfig;
    hotelsConfig: CsvProcessingConfig;
    offersConfig: CsvProcessingConfig;
  };
  
  // Error handling and recovery
  errorHandling: {
    maxRetries: number;
    retryDelayMs: number;
    enableErrorRecovery: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    enableDetailedErrorReporting: boolean;
  };
  
  // Resource management
  resourceManagement: {
    enableGarbageCollection: boolean;
    gcIntervalMs: number;
    maxFileHandles: number;
    enableResourceCleanup: boolean;
    memoryThresholdForCleanup: number;
  };
  
  // Monitoring and alerting
  monitoring: {
    enableMetrics: boolean;
    metricsIntervalMs: number;
    enableAlerts: boolean;
    alertThresholds: {
      memoryUsagePercent: number;
      processingTimeMs: number;
      errorRate: number;
    };
  };
}

/**
 * Default production configuration optimized for large datasets
 */
export const PRODUCTION_CONFIG: ProductionConfig = {
  dataProcessing: {
    maxMemoryUsageMB: 8192, // 8GB memory limit
    maxConcurrentOperations: require('os').cpus().length,
    enableMemoryMonitoring: true,
    enablePerformanceMetrics: true,
    enableHealthChecks: true
  },
  
  csvProcessing: {
    defaultConfig: {
      mode: ProcessingMode.STREAMING,
      batchSize: 10000,
      enableValidation: false, // Disabled for performance in production
      skipErrors: true, // Continue processing on errors
      progressInterval: 5000,
      memoryThresholdMB: 2048
    },
    
    hotelsConfig: {
      mode: ProcessingMode.STANDARD,
      batchSize: 5000,
      enableValidation: true, // Hotels are smaller, can afford validation
      skipErrors: false, // Hotels must be valid
      progressInterval: 2000,
      memoryThresholdMB: 512
    },
    
    offersConfig: {
      mode: ProcessingMode.ULTRA, // Use ultra mode for 100M+ offers
      batchSize: 50000,
      numWorkers: require('os').cpus().length * 2,
      enableValidation: false,
      skipErrors: true,
      progressInterval: 1000,
      memoryThresholdMB: 4096
    }
  },
  
  errorHandling: {
    maxRetries: 3,
    retryDelayMs: 1000,
    enableErrorRecovery: true,
    logLevel: 'info',
    enableDetailedErrorReporting: true
  },
  
  resourceManagement: {
    enableGarbageCollection: true,
    gcIntervalMs: 30000, // Force GC every 30 seconds
    maxFileHandles: 1000,
    enableResourceCleanup: true,
    memoryThresholdForCleanup: 6144 // Cleanup when memory exceeds 6GB
  },
  
  monitoring: {
    enableMetrics: true,
    metricsIntervalMs: 10000,
    enableAlerts: true,
    alertThresholds: {
      memoryUsagePercent: 85,
      processingTimeMs: 300000, // 5 minutes
      errorRate: 0.05 // 5% error rate
    }
  }
};

/**
 * Development configuration for testing
 */
export const DEVELOPMENT_CONFIG: ProductionConfig = {
  ...PRODUCTION_CONFIG,
  
  dataProcessing: {
    ...PRODUCTION_CONFIG.dataProcessing,
    maxMemoryUsageMB: 2048, // 2GB for development
    enablePerformanceMetrics: false
  },
  
  csvProcessing: {
    ...PRODUCTION_CONFIG.csvProcessing,
    defaultConfig: {
      ...PRODUCTION_CONFIG.csvProcessing.defaultConfig,
      mode: ProcessingMode.STANDARD,
      enableValidation: true,
      skipErrors: false
    },
    offersConfig: {
      ...PRODUCTION_CONFIG.csvProcessing.offersConfig,
      mode: ProcessingMode.STREAMING,
      batchSize: 1000,
      numWorkers: 2
    }
  },
  
  errorHandling: {
    ...PRODUCTION_CONFIG.errorHandling,
    logLevel: 'debug',
    enableDetailedErrorReporting: true
  },
  
  monitoring: {
    ...PRODUCTION_CONFIG.monitoring,
    enableAlerts: false,
    metricsIntervalMs: 5000
  }
};

/**
 * Get configuration based on environment
 */
export function getConfig(): ProductionConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'development':
    case 'test':
      return DEVELOPMENT_CONFIG;
    default:
      console.warn(`Unknown environment: ${env}, using development config`);
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * Validate configuration settings
 */
export function validateConfig(config: ProductionConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate memory settings
  if (config.dataProcessing.maxMemoryUsageMB < 512) {
    errors.push('maxMemoryUsageMB must be at least 512MB');
  }
  
  if (config.resourceManagement.memoryThresholdForCleanup >= config.dataProcessing.maxMemoryUsageMB) {
    errors.push('memoryThresholdForCleanup must be less than maxMemoryUsageMB');
  }
  
  // Validate CSV processing settings
  if (config.csvProcessing.defaultConfig.batchSize && config.csvProcessing.defaultConfig.batchSize < 100) {
    errors.push('batchSize must be at least 100');
  }
  
  // Validate error handling settings
  if (config.errorHandling.maxRetries < 0 || config.errorHandling.maxRetries > 10) {
    errors.push('maxRetries must be between 0 and 10');
  }
  
  // Validate monitoring thresholds
  if (config.monitoring.alertThresholds.memoryUsagePercent < 50 || config.monitoring.alertThresholds.memoryUsagePercent > 95) {
    errors.push('memoryUsagePercent threshold must be between 50 and 95');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export default getConfig;