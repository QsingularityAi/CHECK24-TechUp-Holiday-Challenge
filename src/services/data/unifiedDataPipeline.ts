/**
 * Unified Data Processing Pipeline for Massive Datasets
 * Handles 100M+ offers and 300K+ hotels with production-ready optimizations
 */

import { EventEmitter } from 'events';
import { UnifiedCsvProcessor, CsvProcessingConfig, ProcessingMode, CsvProcessingResult } from './unifiedCsvProcessor';
import { UltraPerformanceStorage } from './ultraPerformanceStorage';
import { UltraCompressedStorage } from './compressedStorage';
import { AdvancedDataSystem } from './advancedDataProcessor';
import { ProductionErrorHandler } from '../../utils/productionErrorHandler';
import { ProductionConfig } from '../../config/production';
import { Hotel, Offer } from '../../types';

export interface PipelineConfig {
  enableCompression: boolean;
  enableUltraPerformance: boolean;
  enableAdvancedProcessing: boolean;
  maxMemoryUsage: number; // in MB
  batchSize: number;
  parallelWorkers: number;
  enableMonitoring: boolean;
}

export interface PipelineMetrics {
  totalRecordsProcessed: number;
  processingTime: number;
  memoryUsage: number;
  compressionRatio?: number;
  throughput: number;
  errorCount: number;
  successRate: number;
}

export interface PipelineResult {
  success: boolean;
  metrics: PipelineMetrics;
  hotels: Hotel[];
  offers: Offer[];
  errors: string[];
  storageInstance?: UltraPerformanceStorage | UltraCompressedStorage | AdvancedDataSystem | undefined;
}

export class UnifiedDataPipeline extends EventEmitter {
  private config: PipelineConfig;
  private productionConfig: ProductionConfig;
  private errorHandler: ProductionErrorHandler;
  private csvProcessor: UnifiedCsvProcessor;
  private storageSystem?: UltraPerformanceStorage | UltraCompressedStorage | AdvancedDataSystem;
  private startTime = 0;
  private metrics: PipelineMetrics = {
    totalRecordsProcessed: 0,
    processingTime: 0,
    memoryUsage: 0,
    throughput: 0,
    errorCount: 0,
    successRate: 0
  };

  constructor(config: PipelineConfig, productionConfig: ProductionConfig) {
    super();
    this.config = config;
    this.productionConfig = productionConfig;
    this.errorHandler = new ProductionErrorHandler(productionConfig);
    this.csvProcessor = new UnifiedCsvProcessor();
    this.setupEventHandlers();
  }

  /**
   * Process data files through the unified pipeline
   */
  async processData(
    hotelFilePath: string,
    offerFilePath: string,
    options?: Partial<PipelineConfig>
  ): Promise<PipelineResult> {
    const finalConfig = { ...this.config, ...options };
    this.startTime = Date.now();
    
    try {
      this.emit('pipeline:started', { config: finalConfig });
      
      // Initialize storage system based on configuration
      await this.initializeStorageSystem(finalConfig);
      
      // Process hotels
      const hotelResult = await this.processHotels(hotelFilePath, finalConfig);
      if (hotelResult.errors.length > 0) {
        throw new Error(`Hotel processing failed: ${hotelResult.errors.join(', ')}`);
      }
      
      // Process offers
      const offerResult = await this.processOffers(offerFilePath, finalConfig);
      if (offerResult.errors.length > 0) {
        throw new Error(`Offer processing failed: ${offerResult.errors.join(', ')}`);
      }
      
      // Build indexes and optimize storage
      await this.optimizeStorage(hotelResult.data, offerResult.data);
      
      // Calculate final metrics
      const finalMetrics = this.calculateFinalMetrics(hotelResult, offerResult);
      
      const result: PipelineResult = {
        success: true,
        metrics: finalMetrics,
        hotels: hotelResult.data,
        offers: offerResult.data,
        errors: [],
        storageInstance: this.storageSystem
      };
      
      this.emit('pipeline:completed', result);
      return result;
      
    } catch (error) {
      const errorInfo = await this.errorHandler.handleError(error as Error, {
        pipeline: 'unified_data_pipeline',
        config: finalConfig
      });
      
      const result: PipelineResult = {
        success: false,
        metrics: this.metrics,
        hotels: [],
        offers: [],
        errors: [errorInfo.message],
        storageInstance: this.storageSystem
      };
      
      this.emit('pipeline:failed', result);
      return result;
    }
  }

  /**
   * Initialize the appropriate storage system based on configuration
   */
  private async initializeStorageSystem(config: PipelineConfig): Promise<void> {
    try {
      if (config.enableUltraPerformance) {
        this.storageSystem = new UltraPerformanceStorage(100_000_000, 300_000);
        this.emit('storage:initialized', { type: 'ultra_performance' });
      } else if (config.enableCompression) {
        this.storageSystem = new UltraCompressedStorage(true);
        this.emit('storage:initialized', { type: 'compressed' });
      } else if (config.enableAdvancedProcessing) {
        this.storageSystem = new AdvancedDataSystem();
        this.emit('storage:initialized', { type: 'advanced' });
      }
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        operation: 'storage_initialization',
        config
      });
      throw error;
    }
  }

  /**
   * Process hotel data
   */
  private async processHotels(
    filePath: string,
    config: PipelineConfig
  ): Promise<CsvProcessingResult<Hotel>> {
    const csvConfig: CsvProcessingConfig = {
      mode: this.determineProcessingMode(config),
      batchSize: config.batchSize,
      numWorkers: config.parallelWorkers,
      progressInterval: config.enableMonitoring ? 1000 : 0
    };

    this.emit('hotels:processing_started', { filePath, config: csvConfig });
    
    const result = await UnifiedCsvProcessor.processHotels(filePath, csvConfig);
    
    this.emit('hotels:processing_completed', {
      recordCount: result.data.length,
      errors: result.errors.length
    });
    
    return result;
  }

  /**
   * Process offer data
   */
  private async processOffers(
    filePath: string,
    config: PipelineConfig
  ): Promise<CsvProcessingResult<Offer>> {
    const csvConfig: CsvProcessingConfig = {
      mode: this.determineProcessingMode(config),
      batchSize: config.batchSize,
      numWorkers: config.parallelWorkers,
      progressInterval: config.enableMonitoring ? 1000 : 0
    };

    this.emit('offers:processing_started', { filePath, config: csvConfig });
    
    const result = await UnifiedCsvProcessor.processOffers(filePath, csvConfig);
    
    this.emit('offers:processing_completed', {
      recordCount: result.data.length,
      errors: result.errors.length
    });
    
    return result;
  }

  /**
   * Optimize storage after data loading
   */
  private async optimizeStorage(hotels: Hotel[], offers: Offer[]): Promise<void> {
    if (!this.storageSystem) return;

    try {
      this.emit('storage:optimization_started');
      
      if (this.storageSystem instanceof UltraPerformanceStorage) {
        // Build ultra-fast indexes
        await this.storageSystem.buildIndexes();
      } else if (this.storageSystem instanceof UltraCompressedStorage) {
        // Store with compression
        for (const offer of offers) {
          await this.storageSystem.storeOffer(offer);
        }
      } else if (this.storageSystem instanceof AdvancedDataSystem) {
        // Store data in advanced system
        if ('addHotel' in this.storageSystem) {
          hotels.forEach(hotel => (this.storageSystem as any).addHotel(hotel));
        }
        if ('addOffer' in this.storageSystem) {
          offers.forEach(offer => (this.storageSystem as any).addOffer(offer));
        }
      }
      
      this.emit('storage:optimization_completed');
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        operation: 'storage_optimization',
        hotelCount: hotels.length,
        offerCount: offers.length
      });
      throw error;
    }
  }

  /**
   * Determine processing mode based on configuration
   */
  private determineProcessingMode(config: PipelineConfig): ProcessingMode {
    if (config.enableUltraPerformance) {
      return ProcessingMode.ULTRA;
    } else if (config.enableAdvancedProcessing) {
      return ProcessingMode.PARALLEL;
    } else {
      return ProcessingMode.STANDARD;
    }
  }

  /**
   * Calculate final pipeline metrics
   */
  private calculateFinalMetrics(
    hotelResult: CsvProcessingResult<Hotel>,
    offerResult: CsvProcessingResult<Offer>
  ): PipelineMetrics {
    const processingTime = Date.now() - this.startTime;
    const totalRecords = hotelResult.data.length + offerResult.data.length;
    const totalErrors = hotelResult.errors.length + offerResult.errors.length;
    
    return {
      totalRecordsProcessed: totalRecords,
      processingTime,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      throughput: totalRecords / (processingTime / 1000), // records per second
      errorCount: totalErrors,
      successRate: totalRecords > 0 ? ((totalRecords - totalErrors) / totalRecords) * 100 : 0
    };
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(): void {
    if (this.config.enableMonitoring) {
      this.on('pipeline:started', (data) => {
        console.log(`[Pipeline] Started with config:`, data.config);
      });
      
      this.on('storage:initialized', (data) => {
        console.log(`[Pipeline] Storage initialized: ${data.type}`);
      });
      
      this.on('hotels:processing_completed', (data) => {
        console.log(`[Pipeline] Hotels processed: ${data.recordCount} records`);
      });
      
      this.on('offers:processing_completed', (data) => {
        console.log(`[Pipeline] Offers processed: ${data.recordCount} records`);
      });
      
      this.on('pipeline:completed', (result) => {
        console.log(`[Pipeline] Completed successfully:`);
        console.log(`  - Total records: ${result.metrics.totalRecordsProcessed}`);
        console.log(`  - Processing time: ${result.metrics.processingTime}ms`);
        console.log(`  - Throughput: ${result.metrics.throughput.toFixed(2)} records/sec`);
        console.log(`  - Success rate: ${result.metrics.successRate.toFixed(2)}%`);
      });
      
      this.on('pipeline:failed', (result) => {
        console.error(`[Pipeline] Failed:`, result.errors);
      });
    }
  }

  /**
   * Get current pipeline metrics
   */
  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  /**
   * Get storage system instance
   */
  getStorageSystem(): UltraPerformanceStorage | UltraCompressedStorage | AdvancedDataSystem | undefined {
    return this.storageSystem;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.storageSystem && 'cleanup' in this.storageSystem) {
        await (this.storageSystem as any).cleanup();
      }
      this.errorHandler.cleanup();
      this.removeAllListeners();
    } catch (error) {
      console.error('Error during pipeline cleanup:', error);
    }
  }
}

/**
 * Factory function to create optimized pipeline configurations
 */
export class PipelineConfigFactory {
  /**
   * Configuration for ultra-high performance (100M+ records)
   */
  static createUltraPerformanceConfig(): PipelineConfig {
    return {
      enableCompression: false,
      enableUltraPerformance: true,
      enableAdvancedProcessing: false,
      maxMemoryUsage: 8192, // 8GB
      batchSize: 100000,
      parallelWorkers: 8,
      enableMonitoring: true
    };
  }

  /**
   * Configuration for memory-constrained environments
   */
  static createMemoryOptimizedConfig(): PipelineConfig {
    return {
      enableCompression: true,
      enableUltraPerformance: false,
      enableAdvancedProcessing: false,
      maxMemoryUsage: 2048, // 2GB
      batchSize: 10000,
      parallelWorkers: 4,
      enableMonitoring: true
    };
  }

  /**
   * Configuration for balanced performance and memory usage
   */
  static createBalancedConfig(): PipelineConfig {
    return {
      enableCompression: false,
      enableUltraPerformance: false,
      enableAdvancedProcessing: true,
      maxMemoryUsage: 4096, // 4GB
      batchSize: 50000,
      parallelWorkers: 6,
      enableMonitoring: true
    };
  }

  /**
   * Configuration for development/testing
   */
  static createDevelopmentConfig(): PipelineConfig {
    return {
      enableCompression: false,
      enableUltraPerformance: false,
      enableAdvancedProcessing: false,
      maxMemoryUsage: 1024, // 1GB
      batchSize: 1000,
      parallelWorkers: 2,
      enableMonitoring: true
    };
  }
}

export default UnifiedDataPipeline;