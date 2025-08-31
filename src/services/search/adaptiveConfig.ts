/**
 * Adaptive Configuration System for Unified Search Engine
 * 
 * Automatically optimizes search engine configuration based on:
 * - Dataset size
 * - Available system memory
 * - CPU cores
 * - Performance requirements
 */

import * as os from 'os';
import { getMemoryOptimizer } from '../../utils/memoryOptimizer';

export interface AdaptiveSearchConfig {
  // Core search settings
  maxResults: number;
  timeoutMs: number;
  
  // Performance optimizations
  enableParallel: boolean;
  numWorkers: number;
  useBloomFilter: boolean;
  enableVectorization: boolean;
  
  // Memory management
  cacheResults: boolean;
  resultStreamingThreshold: number;
  memoryThresholdMB: number;
  
  // Storage configuration
  enableMemoryMapping: boolean;
  chunkSize: number;
  gcInterval: number;
  
  // Index optimization
  enableBitSetIndexes: boolean;
  stringInterning: boolean;
  columnarStorage: boolean;
  
  // Adaptive behavior
  autoOptimize: boolean;
  datasetSizeHint?: 'small' | 'medium' | 'large' | 'massive';
}

export interface SystemCapabilities {
  totalMemoryMB: number;
  availableMemoryMB: number;
  cpuCores: number;
  architecture: string;
  nodeVersion: string;
}

export interface DatasetMetrics {
  estimatedOfferCount: number;
  estimatedHotelCount: number;
  estimatedMemoryUsageMB: number;
  complexity: 'low' | 'medium' | 'high';
}

/**
 * Adaptive configuration optimizer that selects optimal settings
 * based on system capabilities and dataset characteristics
 */
export class AdaptiveConfigOptimizer {
  private systemCapabilities: SystemCapabilities;
  private memoryOptimizer = getMemoryOptimizer();
  
  constructor() {
    this.systemCapabilities = this.detectSystemCapabilities();
  }
  
  /**
   * Generate optimal configuration for given dataset
   */
  optimizeConfig(
    baseConfig: Partial<AdaptiveSearchConfig> = {},
    datasetMetrics?: DatasetMetrics
  ): AdaptiveSearchConfig {
    const metrics = datasetMetrics || this.estimateDatasetMetrics();
    const memoryPressure = this.memoryOptimizer.getMemoryPressureLevel();
    
    // Start with intelligent defaults
    const config: AdaptiveSearchConfig = {
      // Core settings
      maxResults: 10000,
      timeoutMs: 30000,
      
      // Performance defaults
      enableParallel: true,
      numWorkers: Math.min(4, this.systemCapabilities.cpuCores),
      useBloomFilter: true,
      enableVectorization: true,
      
      // Memory defaults
      cacheResults: true,
      resultStreamingThreshold: 1000,
      memoryThresholdMB: Math.floor(this.systemCapabilities.totalMemoryMB * 0.8),
      
      // Storage defaults
      enableMemoryMapping: false,
      chunkSize: 10000,
      gcInterval: 50,
      
      // Index defaults
      enableBitSetIndexes: true,
      stringInterning: true,
      columnarStorage: true,
      
      // Adaptive behavior
      autoOptimize: true,
      
      // Override with base config
      ...baseConfig
    };
    
    // Apply dataset-specific optimizations
    this.optimizeForDatasetSize(config, metrics);
    
    // Apply memory pressure adjustments
    this.optimizeForMemoryPressure(config, memoryPressure);
    
    // Apply system-specific optimizations
    this.optimizeForSystemCapabilities(config);
    
    return config;
  }
  
  /**
   * Optimize configuration based on dataset size
   */
  private optimizeForDatasetSize(config: AdaptiveSearchConfig, metrics: DatasetMetrics): void {
    const { estimatedOfferCount, complexity } = metrics;
    
    if (estimatedOfferCount < 100000) {
      // Small dataset optimizations
      config.enableParallel = false;
      config.numWorkers = 1;
      config.useBloomFilter = false;
      config.enableMemoryMapping = false;
      config.resultStreamingThreshold = 5000;
      config.chunkSize = 5000;
      config.datasetSizeHint = 'small';
      
    } else if (estimatedOfferCount < 1000000) {
      // Medium dataset optimizations
      config.numWorkers = Math.min(2, this.systemCapabilities.cpuCores);
      config.resultStreamingThreshold = 2000;
      config.chunkSize = 10000;
      config.datasetSizeHint = 'medium';
      
    } else if (estimatedOfferCount < 10000000) {
      // Large dataset optimizations
      config.numWorkers = Math.min(4, this.systemCapabilities.cpuCores);
      config.resultStreamingThreshold = 1000;
      config.chunkSize = 20000;
      config.enableMemoryMapping = estimatedOfferCount > 5000000;
      config.datasetSizeHint = 'large';
      
    } else {
      // Massive dataset optimizations
      config.numWorkers = this.systemCapabilities.cpuCores;
      config.resultStreamingThreshold = 500;
      config.chunkSize = 50000;
      config.enableMemoryMapping = true;
      config.gcInterval = 25; // More frequent GC
      config.datasetSizeHint = 'massive';
    }
    
    // Adjust for complexity
    if (complexity === 'high') {
      config.timeoutMs *= 2;
      config.chunkSize = Math.floor(config.chunkSize * 0.7);
      config.gcInterval = Math.floor(config.gcInterval * 0.8);
    }
  }
  
  /**
   * Optimize configuration based on current memory pressure
   */
  private optimizeForMemoryPressure(config: AdaptiveSearchConfig, memoryPressure: string): void {
    switch (memoryPressure) {
      case 'CRITICAL':
        config.enableParallel = false;
        config.numWorkers = 1;
        config.cacheResults = false;
        config.resultStreamingThreshold = 100;
        config.chunkSize = Math.floor(config.chunkSize * 0.3);
        config.gcInterval = 10;
        break;
        
      case 'HIGH':
        config.numWorkers = Math.max(1, Math.floor(config.numWorkers * 0.5));
        config.resultStreamingThreshold = Math.floor(config.resultStreamingThreshold * 0.5);
        config.chunkSize = Math.floor(config.chunkSize * 0.6);
        config.gcInterval = Math.floor(config.gcInterval * 0.7);
        break;
        
      case 'MODERATE':
        config.chunkSize = Math.floor(config.chunkSize * 0.8);
        config.gcInterval = Math.floor(config.gcInterval * 0.9);
        break;
        
      // LOW and NORMAL - no adjustments needed
    }
  }
  
  /**
   * Optimize configuration based on system capabilities
   */
  private optimizeForSystemCapabilities(config: AdaptiveSearchConfig): void {
    const { totalMemoryMB, cpuCores, architecture } = this.systemCapabilities;
    
    // Memory-based optimizations
    if (totalMemoryMB < 4000) {
      // Low memory system
      config.enableMemoryMapping = false;
      config.cacheResults = false;
      config.chunkSize = Math.min(config.chunkSize, 5000);
      config.resultStreamingThreshold = Math.min(config.resultStreamingThreshold, 500);
      
    } else if (totalMemoryMB > 16000) {
      // High memory system
      config.chunkSize = Math.max(config.chunkSize, 20000);
      config.resultStreamingThreshold = Math.max(config.resultStreamingThreshold, 2000);
    }
    
    // CPU-based optimizations
    if (cpuCores === 1) {
      config.enableParallel = false;
      config.numWorkers = 1;
    } else if (cpuCores >= 8) {
      config.numWorkers = Math.min(cpuCores, 8); // Cap at 8 workers
    }
    
    // Architecture-specific optimizations
    if (architecture.includes('arm') || architecture.includes('aarch64')) {
      // ARM processors may have different SIMD capabilities
      config.enableVectorization = false;
    }
  }
  
  /**
   * Detect system capabilities
   */
  private detectSystemCapabilities(): SystemCapabilities {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    return {
      totalMemoryMB: Math.floor(totalMemory / (1024 * 1024)),
      availableMemoryMB: Math.floor(freeMemory / (1024 * 1024)),
      cpuCores: os.cpus().length,
      architecture: os.arch(),
      nodeVersion: process.version
    };
  }
  
  /**
   * Estimate dataset metrics (can be overridden with actual metrics)
   */
  private estimateDatasetMetrics(): DatasetMetrics {
    // Default conservative estimates
    return {
      estimatedOfferCount: 1000000,
      estimatedHotelCount: 10000,
      estimatedMemoryUsageMB: 500,
      complexity: 'medium'
    };
  }
  
  /**
   * Get current system status for monitoring
   */
  getSystemStatus(): {
    capabilities: SystemCapabilities;
    memoryPressure: string;
    recommendedConfig: AdaptiveSearchConfig;
  } {
    return {
      capabilities: this.systemCapabilities,
      memoryPressure: this.memoryOptimizer.getMemoryPressureLevel(),
      recommendedConfig: this.optimizeConfig()
    };
  }
  
  /**
   * Update configuration dynamically based on runtime conditions
   */
  updateConfigForRuntime(currentConfig: AdaptiveSearchConfig): AdaptiveSearchConfig {
    if (!currentConfig.autoOptimize) {
      return currentConfig;
    }
    
    const memoryPressure = this.memoryOptimizer.getMemoryPressureLevel();
    const updatedConfig = { ...currentConfig };
    
    // Apply runtime adjustments
    this.optimizeForMemoryPressure(updatedConfig, memoryPressure);
    
    return updatedConfig;
  }
}

// Export singleton instance
export const adaptiveConfigOptimizer = new AdaptiveConfigOptimizer();

// Export default configurations for different scenarios
export const DEFAULT_CONFIGS = {
  SMALL_DATASET: {
    maxResults: 5000,
    enableParallel: false,
    numWorkers: 1,
    useBloomFilter: false,
    resultStreamingThreshold: 2000,
    chunkSize: 5000
  } as Partial<AdaptiveSearchConfig>,
  
  MEDIUM_DATASET: {
    maxResults: 10000,
    enableParallel: true,
    numWorkers: 2,
    useBloomFilter: true,
    resultStreamingThreshold: 1000,
    chunkSize: 10000
  } as Partial<AdaptiveSearchConfig>,
  
  LARGE_DATASET: {
    maxResults: 20000,
    enableParallel: true,
    numWorkers: 4,
    useBloomFilter: true,
    resultStreamingThreshold: 500,
    chunkSize: 20000,
    enableMemoryMapping: true
  } as Partial<AdaptiveSearchConfig>,
  
  MASSIVE_DATASET: {
    maxResults: 50000,
    enableParallel: true,
    numWorkers: 8,
    useBloomFilter: true,
    resultStreamingThreshold: 200,
    chunkSize: 50000,
    enableMemoryMapping: true,
    gcInterval: 25
  } as Partial<AdaptiveSearchConfig>
};