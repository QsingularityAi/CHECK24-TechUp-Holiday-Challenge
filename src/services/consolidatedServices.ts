/**
 * Consolidated Services Architecture
 * 
 * This file consolidates redundant services and creates a unified approach
 * for data processing and search operations, removing unnecessary abstractions
 * while maintaining performance optimizations.
 */

import { SearchCriteria, BestHotelOffer, Offer, Hotel } from '../types';
import { UnifiedCsvProcessor, ProcessingMode, CsvProcessingConfig } from './data/unifiedCsvProcessor';
import { UnifiedSearchEngine, UnifiedSearchResult } from './search/unifiedSearchEngine';
import { AdaptiveConfigOptimizer, DatasetMetrics } from './search/adaptiveConfig';
import { UltraPerformanceStorage } from './data/ultraPerformanceStorage';
import { ProductionErrorHandler } from '../utils/productionErrorHandler';
import { getConfig } from '../config/production';
import { getMemoryOptimizer, MemoryPressureLevel } from '../utils/memoryOptimizer';

/**
 * Unified service configuration
 */
export interface ConsolidatedServiceConfig {
  datasetSize: 'small' | 'medium' | 'large' | 'massive';
  enableAdvancedOptimizations: boolean;
  maxMemoryUsageMB: number;
  enableCaching: boolean;
  enableMetrics: boolean;
}

/**
 * Service performance metrics
 */
export interface ServiceMetrics {
  dataLoadingTimeMs: number;
  searchPerformanceMs: number;
  memoryUsageMB: number;
  cacheHitRate: number;
  errorCount: number;
}

/**
 * Consolidated service result
 */
export interface ServiceResult<T> {
  data: T;
  metrics: ServiceMetrics;
  errors: string[];
  warnings: string[];
}

/**
 * Main consolidated service class that replaces multiple redundant services
 */
export class ConsolidatedDataService {
  private config: ConsolidatedServiceConfig;
  private csvProcessor: UnifiedCsvProcessor;
  private searchEngine: UnifiedSearchEngine | null = null;
  private storage: UltraPerformanceStorage | null = null;
  private errorHandler: ProductionErrorHandler;
  private memoryOptimizer = getMemoryOptimizer();
  private metrics: ServiceMetrics;
  private configOptimizer: AdaptiveConfigOptimizer;

  constructor(config?: Partial<ConsolidatedServiceConfig>) {
    this.config = {
      datasetSize: 'medium',
      enableAdvancedOptimizations: false,
      maxMemoryUsageMB: 4096,
      enableCaching: true,
      enableMetrics: true,
      ...config
    };

    this.errorHandler = new ProductionErrorHandler(getConfig());
    this.csvProcessor = UnifiedCsvProcessor;
    this.metrics = this.initializeMetrics();
    this.configOptimizer = new AdaptiveConfigOptimizer();
    
    // Initialize unified search engine
    this.initializeSearchEngine();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ServiceMetrics {
    return {
      dataLoadingTimeMs: 0,
      searchPerformanceMs: 0,
      memoryUsageMB: 0,
      cacheHitRate: 0,
      errorCount: 0
    };
  }

  /**
   * Initialize the unified search engine with adaptive configuration
   */
  private initializeSearchEngine(): void {
    if (this.storage) {
      // Get adaptive configuration based on dataset size and system capabilities
       const datasetMetrics: DatasetMetrics = {
         estimatedOfferCount: 0, // Will be updated after data loading
         estimatedHotelCount: 0,
         estimatedMemoryUsageMB: 1024,
         complexity: 'medium'
       };
       
       const adaptiveConfig = this.configOptimizer.optimizeConfig({}, datasetMetrics);

      // Create unified search engine with adaptive configuration
       this.searchEngine = new UnifiedSearchEngine(
         this.storage,
         adaptiveConfig,
         datasetMetrics
       );
    }
  }

  /**
   * Unified data loading method that automatically selects the best processing approach
   */
  async loadData(
    hotelsFilePath: string,
    offersFilePath: string,
    progressCallback?: (progress: { recordsProcessed: number; totalRecords: number; percentage: number }) => void
  ): Promise<ServiceResult<{ hotels: Hotel[]; offers: Offer[] }>> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Start memory monitoring
    this.memoryOptimizer.startMonitoring();

    try {
      // Determine processing mode based on dataset size
      const processingMode = this.determineProcessingMode();
      
      const csvConfig: CsvProcessingConfig = {
        mode: processingMode,
        batchSize: this.getBatchSize(),
        numWorkers: this.getOptimalWorkerCount(),
        enableValidation: true,
        skipErrors: false,
        progressInterval: 1000
      };

      // Process hotels
      const hotelResult = await UnifiedCsvProcessor.processHotels(hotelsFilePath, csvConfig, progressCallback ? (progress) => progressCallback({ recordsProcessed: progress.recordsProcessed, totalRecords: progress.totalRecords || 0, percentage: ((progress.recordsProcessed / (progress.totalRecords || 1)) * 100) }) : undefined);
      if (hotelResult.errors.length > 0) {
        errors.push(...hotelResult.errors.map(e => `Hotel processing: ${e}`));
      }

      // Process offers
      const offerResult = await UnifiedCsvProcessor.processOffers(offersFilePath, csvConfig, progressCallback ? (progress) => progressCallback({ recordsProcessed: progress.recordsProcessed, totalRecords: progress.totalRecords || 0, percentage: ((progress.recordsProcessed / (progress.totalRecords || 1)) * 100) }) : undefined);
      if (offerResult.errors.length > 0) {
        errors.push(...offerResult.errors.map(e => `Offer processing: ${e}`));
      }

      // Initialize storage if using advanced optimizations
      if (this.config.enableAdvancedOptimizations) {
        this.storage = new UltraPerformanceStorage(
          offerResult.data.length,
          hotelResult.data.length
        );
        
        // Add data to storage
        for (const hotel of hotelResult.data) {
          // Storage integration would be implemented here
        }
        
        for (const offer of offerResult.data) {
          // Storage integration would be implemented here
        }
        
        // Reinitialize search engine with storage
        this.initializeSearchEngine();
      }

      // Update metrics
      this.metrics.dataLoadingTimeMs = Date.now() - startTime;
      this.metrics.memoryUsageMB = this.getMemoryUsage();

      return {
        data: {
          hotels: hotelResult.data,
          offers: offerResult.data
        },
        metrics: this.metrics,
        errors,
        warnings
      };

    } catch (error) {
      const errorInfo = await this.errorHandler.handleError(error as Error, { category: 'DATA_LOADING' });
      errors.push(errorInfo.message);
      
      return {
        data: { hotels: [], offers: [] },
        metrics: this.metrics,
        errors,
        warnings
      };
    } finally {
      // Stop memory monitoring and update metrics
      this.memoryOptimizer.stopMonitoring();
      const memoryStats = this.memoryOptimizer.getMemoryStats();
      this.metrics.memoryUsageMB = Math.round(memoryStats.heapUsed / 1024 / 1024);
      
      // Force GC if memory pressure is high
      const pressureLevel = this.memoryOptimizer['calculateMemoryPressure'](memoryStats);
      if (pressureLevel === MemoryPressureLevel.HIGH || pressureLevel === MemoryPressureLevel.CRITICAL) {
        this.memoryOptimizer.forceGC();
      }
    }
  }

  /**
   * Unified search method that automatically uses the best search engine
   */
  async search(criteria: SearchCriteria): Promise<ServiceResult<BestHotelOffer[]>> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!this.searchEngine) {
        throw new Error('Search engine not initialized');
      }

      // Use unified search engine with adaptive execution
       const searchResult = await this.searchEngine.search(criteria);
      
      // Update metrics from unified search
       this.metrics.searchPerformanceMs = searchResult.executionTimeMs;
       this.metrics.memoryUsageMB = searchResult.memoryUsageMB;
       this.metrics.cacheHitRate = searchResult.cacheHit ? 1.0 : 0.0;

      // Add performance warnings if needed
       if (searchResult.executionTimeMs > 5000) {
         warnings.push('Search took longer than expected. Consider optimizing criteria.');
       }

       return {
         data: searchResult.hotels,
         metrics: this.metrics,
         errors,
         warnings
       };

    } catch (error) {
      const errorInfo = await this.errorHandler.handleError(error as Error, { category: 'SEARCH' });
      errors.push(errorInfo.message);
      
      return {
        data: [],
        metrics: this.metrics,
        errors,
        warnings
      };
    }
  }

  /**
   * Determine the optimal processing mode based on configuration
   */
  private determineProcessingMode(): ProcessingMode {
    switch (this.config.datasetSize) {
      case 'small':
        return ProcessingMode.STANDARD;
      case 'medium':
        return ProcessingMode.STREAMING;
      case 'large':
        return ProcessingMode.PARALLEL;
      case 'massive':
        return ProcessingMode.ULTRA;
      default:
        return ProcessingMode.STREAMING;
    }
  }

  /**
   * Get optimal batch size based on configuration
   */
  private getBatchSize(): number {
    switch (this.config.datasetSize) {
      case 'small':
        return 1000;
      case 'medium':
        return 10000;
      case 'large':
        return 50000;
      case 'massive':
        return 100000;
      default:
        return 10000;
    }
  }

  /**
   * Get optimal worker count
   */
  private getOptimalWorkerCount(): number {
    const cpuCount = require('os').cpus().length;
    
    switch (this.config.datasetSize) {
      case 'small':
        return 1;
      case 'medium':
        return Math.min(2, cpuCount - 1);
      case 'large':
        return Math.min(4, cpuCount - 1);
      case 'massive':
        return Math.max(1, cpuCount - 1);
      default:
        return Math.min(2, cpuCount - 1);
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024);
  }

  /**
   * Get service metrics
   */
  getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get service configuration
   */
  getConfig(): ConsolidatedServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<ConsolidatedServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeSearchEngine();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.storage) {
      // Storage cleanup would be implemented here
    }
    
    if (this.searchEngine) {
      this.searchEngine.cleanup();
    }
    
    this.errorHandler.cleanup();
  }
}

/**
 * Factory for creating consolidated services with different configurations
 */
export class ConsolidatedServiceFactory {
  /**
   * Create service optimized for small datasets (< 100K records)
   */
  static createForSmallDataset(): ConsolidatedDataService {
    return new ConsolidatedDataService({
      datasetSize: 'small',
      enableAdvancedOptimizations: false,
      maxMemoryUsageMB: 512,
      enableCaching: true,
      enableMetrics: true
    });
  }

  /**
   * Create service optimized for medium datasets (100K - 10M records)
   */
  static createForMediumDataset(): ConsolidatedDataService {
    return new ConsolidatedDataService({
      datasetSize: 'medium',
      enableAdvancedOptimizations: false,
      maxMemoryUsageMB: 2048,
      enableCaching: true,
      enableMetrics: true
    });
  }

  /**
   * Create service optimized for large datasets (10M - 50M records)
   */
  static createForLargeDataset(): ConsolidatedDataService {
    return new ConsolidatedDataService({
      datasetSize: 'large',
      enableAdvancedOptimizations: true,
      maxMemoryUsageMB: 8192,
      enableCaching: true,
      enableMetrics: true
    });
  }

  /**
   * Create service optimized for massive datasets (50M+ records)
   */
  static createForMassiveDataset(): ConsolidatedDataService {
    return new ConsolidatedDataService({
      datasetSize: 'massive',
      enableAdvancedOptimizations: true,
      maxMemoryUsageMB: 16384,
      enableCaching: true,
      enableMetrics: true
    });
  }

  /**
   * Create service with production configuration
   */
  static createForProduction(): ConsolidatedDataService {
    const prodConfig = getConfig();
    
    return new ConsolidatedDataService({
      datasetSize: 'large',
      enableAdvancedOptimizations: true,
      maxMemoryUsageMB: 8192,
      enableCaching: true,
      enableMetrics: prodConfig.monitoring.enableMetrics
    });
  }
}

// Export singleton instance for common use
export const consolidatedDataService = ConsolidatedServiceFactory.createForMediumDataset();