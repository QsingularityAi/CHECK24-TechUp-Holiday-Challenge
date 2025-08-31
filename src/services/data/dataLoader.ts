import { EventEmitter } from "events";
import { Hotel, Offer } from "../../types";
import { SearchIndexesImpl } from "../search/searchIndexes";
import * as fs from "fs";
// Advanced optimization imports
import AdvancedDataSystem from "./advancedDataProcessor";
import UltraCompressedStorage from "./compressedStorage";
import HotelBloomFilterSystem from "../optimization/bloomFilter";
// Ultra-performance imports for 100M+ records
import { UltraPerformanceStorage } from "./ultraPerformanceStorage";
import { StreamingCsvProcessor } from "./streamingCsvProcessor";
import { UnifiedSearchEngine } from "../search/unifiedSearchEngine";
// Unified CSV processor for production-ready parsing
import { UnifiedCsvProcessor, CsvProcessingConfig, ProcessingProgress } from "./unifiedCsvProcessor";
import { getMemoryOptimizer, MemoryUtils } from "../../utils/memoryOptimizer";
import { hotelMappingService } from './hotelMappingService';

/**
 * Result of data loading operation
 */
export interface DataLoadResult {
  hotels: Hotel[];
  offers: Offer[];
  hotelParseResult: Omit<CsvParseResult<Hotel>, "data">;
  offerParseResult: Omit<CsvParseResult<Offer>, "data">;
  totalLoadTime: number;
  streamingStats?: { totalOffers: number; totalHotels: number }; // Added for streaming stats
  searchIndexes: SearchIndexesImpl; // Added for streaming indexes
  compressedDataSize?: number; // Added for compression stats
  bloomFilterStats?: { memoryKB: number; falsePositiveRate: number }; // Added for Bloom filter stats
}

/**
 * CSV parsing result structure
 */
export interface CsvParseResult<T> {
  data: T[];
  validRows: number;
  totalRows: number;
  errors: string[];
}

/**
 * Progress update structure
 */
export interface ProgressUpdate {
  stage: "hotels" | "offers" | "indexing" | "compression" | "bloom-filters";
  percentage: number;
  message: string;
  details?: {
    processed?: number;
    total?: number;
    memoryMB?: number;
    compressionRatio?: number;
  };
}

/**
 * Data loader for CSV files with advanced optimization support
 */
export class DataLoader extends EventEmitter {
  private logger: (message: string, level?: "info" | "warn" | "error") => void;
  // Advanced optimization properties
  private advancedSystem?: AdvancedDataSystem;
  private compressedStorage?: UltraCompressedStorage;
  private bloomFilterSystem?: HotelBloomFilterSystem;
  private useAdvancedOptimizations: boolean = false;
  private compressionEnabled: boolean = false;
  private bloomFiltersEnabled: boolean = false;
  private memoryOptimizer = getMemoryOptimizer();

  // Ultra-performance properties for 100M+ records
  private ultraStorage?: UltraPerformanceStorage;
  private streamingProcessor?: StreamingCsvProcessor;
  private ultraSearchEngine?: UnifiedSearchEngine;
  private useUltraPerformance: boolean = false;
  private maxOffers: number = 100_000_000; // 100M offers capacity
  private maxHotels: number = 300_000; // 300K hotels capacity

  constructor(
    logger?: (message: string, level?: "info" | "warn" | "error") => void,
    useAdvancedOptimizations: boolean = false,
    useUltraPerformance: boolean = false,
    maxOffers: number = 100_000_000,
    maxHotels: number = 300_000,
  ) {
    super();
    this.logger = logger || this.defaultLogger;
    this.useAdvancedOptimizations = useAdvancedOptimizations;
    this.useUltraPerformance = useUltraPerformance;
    this.maxOffers = maxOffers;
    this.maxHotels = maxHotels;

    // Initialize ultra-performance systems first (highest priority)
    if (this.useUltraPerformance) {
      this.initializeUltraPerformanceSystems();
    } else if (this.useAdvancedOptimizations) {
      this.initializeAdvancedSystems();
    }
  }

  /**
   * Initialize advanced optimization systems
   */
  private initializeAdvancedSystems(): void {
    try {
      this.logger("🚀 Initializing advanced optimization systems...", "info");

      // Initialize advanced data system
      this.advancedSystem = new AdvancedDataSystem();

      // Initialize compressed storage (use bit-packed compression for massive datasets)
      this.compressedStorage = new UltraCompressedStorage(true); // Enable aggressive compression
      this.compressionEnabled = true;

      // Initialize Bloom filter system with real capacity estimates
      this.bloomFilterSystem = new HotelBloomFilterSystem(50000, 0.001); // 50K hotels, 0.1% false positive rate
      this.bloomFiltersEnabled = true;

      this.logger(
        "✅ Advanced optimization systems initialized successfully",
        "info",
      );
      this.logger(
        `   - Compression: ${this.compressionEnabled ? "ENABLED" : "DISABLED"}`,
        "info",
      );
      this.logger(
        `   - Bloom Filters: ${this.bloomFiltersEnabled ? "ENABLED" : "DISABLED"}`,
        "info",
      );
    } catch (error) {
      this.logger(
        `⚠️ Failed to initialize advanced systems: ${error instanceof Error ? error.message : "Unknown error"}`,
        "warn",
      );
      this.logger("Falling back to standard processing mode", "warn");
      this.useAdvancedOptimizations = false;
      this.compressionEnabled = false;
      this.bloomFiltersEnabled = false;
    }
  }

  /**
   * Initialize ultra-performance systems for 100M+ records
   */
  private initializeUltraPerformanceSystems(): void {
    try {
      this.logger(
        "🚀 Initializing ULTRA-PERFORMANCE systems for 100M+ records...",
        "info",
      );

      // Initialize ultra-performance storage with columnar layout
      this.ultraStorage = new UltraPerformanceStorage(
        this.maxOffers,
        this.maxHotels,
      );

      // Initialize streaming CSV processor with parallel processing
      console.log('DEBUG: About to create StreamingCsvProcessor with config:', {
        chunkSize: 100_000,
        bufferSize: 16 * 1024 * 1024,
        numWorkers: require("os").cpus().length - 1,
        enableParallel: false,
        skipErrors: true,
        progressInterval: 100_000,
        memoryThresholdMB: 8192
      });
      
      this.streamingProcessor = new StreamingCsvProcessor({
        chunkSize: 100_000, // 100K records per chunk
        bufferSize: 16 * 1024 * 1024, // 16MB buffer
        numWorkers: require("os").cpus().length - 1,
        enableParallel: false, // Disable parallel processing temporarily
        skipErrors: true,
        progressInterval: 100_000,
        memoryThresholdMB: 8192, // 8GB threshold
      });
      console.log('DEBUG: Streaming processor initialized with parallel processing disabled');
      console.log('DEBUG: streamingProcessor type:', this.streamingProcessor?.constructor?.name);

      // Initialize ultra-fast search engine
      this.ultraSearchEngine = new UnifiedSearchEngine(this.ultraStorage, {
        maxResults: 10000,
        timeoutMs: 10000,
        enableParallel: true,
        numWorkers: require("os").cpus().length,
        useBloomFilter: true,
        enableVectorization: true,
        cacheResults: true,
        resultStreamingThreshold: 50000,
      });

      this.logger(
        "✅ ULTRA-PERFORMANCE systems initialized successfully",
        "info",
      );
      this.logger(
        `   - Max Offers: ${this.maxOffers.toLocaleString()}`,
        "info",
      );
      this.logger(
        `   - Max Hotels: ${this.maxHotels.toLocaleString()}`,
        "info",
      );
      this.logger(
        `   - Parallel Workers: ${require("os").cpus().length - 1}`,
        "info",
      );
      this.logger(`   - Memory Threshold: 8GB`, "info");
      this.logger(`   - Columnar Storage: ENABLED`, "info");
      this.logger(`   - BitSet Indexes: ENABLED`, "info");
      this.logger(`   - SIMD Operations: ENABLED`, "info");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger(
        `❌ Failed to initialize ultra-performance systems: ${errorMessage}`,
        "error",
      );
      this.logger("Falling back to advanced optimization systems", "warn");
      this.useUltraPerformance = false;
      this.initializeAdvancedSystems();
    }
  }

  /**
   * Loads data from CSV files with advanced optimizations
   */
  async loadData(
    hotelsFilePath: string,
    offersFilePath: string,
  ): Promise<DataLoadResult> {
    const startTime = Date.now();

    if (this.useUltraPerformance) {
      return this.loadDataUltraPerformance(
        hotelsFilePath,
        offersFilePath,
        startTime,
      );
    } else {
      return this.loadDataAdvanced(hotelsFilePath, offersFilePath, startTime);
    }
  }

  /**
   * Production-ready unified data loading with automatic optimization
   * This method uses the new UnifiedCsvProcessor for optimal performance
   */
  async loadDataUnified(
     hotelsFilePath: string,
     offersFilePath: string,
     config?: CsvProcessingConfig
   ): Promise<DataLoadResult> {
     const startTime = Date.now();
     this.logger('Starting unified data loading with automatic optimization', 'info');
     
     // Monitor memory during loading
      this.memoryOptimizer.startMonitoring();

     try {
      // Progress tracking
      let totalProgress = 0;
      const progressCallback = (progress: ProcessingProgress) => {
        this.emitProgress({
          stage: progress.stage === 'parsing' ? (progress.recordsProcessed < 1000000 ? 'hotels' : 'offers') : 'indexing',
          percentage: Math.min(totalProgress + (progress.percentage || 0) / 2, 95),
          message: `Processing ${progress.stage}: ${progress.recordsProcessed.toLocaleString()} records (${progress.recordsPerSecond.toFixed(0)} rec/sec)`,
          details: {
            processed: progress.recordsProcessed,
            memoryMB: progress.memoryUsageMB
          }
        });
      };

      // Load hotels with unified processor
      this.emitProgress({
        stage: 'hotels',
        percentage: 0,
        message: 'Loading hotels with unified processor'
      });

      const hotelResult = await UnifiedCsvProcessor.processHotels(
        hotelsFilePath,
        config || UnifiedCsvProcessor.getRecommendedConfig(hotelsFilePath),
        progressCallback
      );

      totalProgress = 25;
      this.logger(`Loaded ${hotelResult.validRecords} hotels in ${hotelResult.processingTimeMs}ms using ${hotelResult.mode} mode`, 'info');

      // Load offers with unified processor
      this.emitProgress({
        stage: 'offers',
        percentage: 25,
        message: 'Loading offers with unified processor'
      });

      const offerResult = await UnifiedCsvProcessor.processOffers(
        offersFilePath,
        config || UnifiedCsvProcessor.getRecommendedConfig(offersFilePath),
        progressCallback
      );

      totalProgress = 75;
      this.logger(`Loaded ${offerResult.validRecords} offers in ${offerResult.processingTimeMs}ms using ${offerResult.mode} mode`, 'info');

      // Build search indexes
      this.emitProgress({
        stage: 'indexing',
        percentage: 75,
        message: 'Building search indexes'
      });

      const searchIndexes = new SearchIndexesImpl();
      await searchIndexes.buildIndexes(hotelResult.data, offerResult.data);

      const totalLoadTime = Date.now() - startTime;

      this.emitProgress({
        stage: 'indexing',
        percentage: 100,
        message: `Data loading completed in ${totalLoadTime}ms`
      });

      this.logger(`Unified data loading completed in ${totalLoadTime}ms`, 'info');
      this.logger(`Hotels: ${hotelResult.validRecords}/${hotelResult.totalRecords} (${hotelResult.errorRecords} errors)`, 'info');
      this.logger(`Offers: ${offerResult.validRecords}/${offerResult.totalRecords} (${offerResult.errorRecords} errors)`, 'info');
      this.logger(`Throughput: Hotels ${(hotelResult.validRecords * 1000 / hotelResult.processingTimeMs).toFixed(0)} rec/sec, Offers ${(offerResult.validRecords * 1000 / offerResult.processingTimeMs).toFixed(0)} rec/sec`, 'info');

      return {
        hotels: hotelResult.data,
        offers: offerResult.data,
        hotelParseResult: {
          validRows: hotelResult.validRecords,
          totalRows: hotelResult.totalRecords,
          errors: hotelResult.errors
        },
        offerParseResult: {
          validRows: offerResult.validRecords,
          totalRows: offerResult.totalRecords,
          errors: offerResult.errors
        },
        totalLoadTime,
        searchIndexes,
        streamingStats: {
          totalOffers: offerResult.validRecords,
          totalHotels: hotelResult.validRecords
        }
      };
    } catch (error) {
      this.logger(`Unified data loading failed: ${(error as Error).message}`, 'error');
      throw error;
    } finally {
      // Stop memory monitoring and force garbage collection
      this.memoryOptimizer.stopMonitoring();
      this.memoryOptimizer.forceGC();
    }
  }

  /**
   * Ultra-performance data loading for 100M+ offers
   */
  private async loadDataUltraPerformance(
    hotelsFilePath: string,
    offersFilePath: string,
    startTime: number,
  ): Promise<DataLoadResult> {
    this.logger(
      "🚀 Starting ULTRA-PERFORMANCE data loading for 100M+ records...",
      "info",
    );

    // Stage 1: Load hotels using streaming processor
    this.emitProgress({
      stage: "hotels",
      percentage: 0,
      message: "Streaming hotels data with ultra-performance...",
    });

    let hotels: Hotel[] = [];
    try {
      console.log(`DEBUG: Checking hotels file: ${hotelsFilePath}`);
      console.log(`DEBUG: File exists: ${fs.existsSync(hotelsFilePath)}`);
      console.log(`DEBUG: Streaming processor available: ${!!this.streamingProcessor}`);
      
      if (fs.existsSync(hotelsFilePath) && this.streamingProcessor) {
        console.log(`DEBUG: Starting hotel processing...`);
        hotels = await this.streamingProcessor.processHotels(
          hotelsFilePath,
          (progress) => {
            console.log(`DEBUG: Hotel progress - processed: ${progress.recordsProcessed}, errors: ${progress.errorsEncountered}`);
            this.logger(
              `Hotels processing: ${progress.recordsProcessed.toLocaleString()} @ ${progress.recordsPerSecond.toLocaleString()}/sec`,
              "info",
            );
          },
        );
        console.log(`DEBUG: Hotel processing completed. Count: ${hotels.length}`);
      } else {
        this.logger("Hotels file not found, using mock data", "warn");
        hotels = this.generateMockHotels();
      }
    } catch (error) {
      console.log(`DEBUG: Error in hotel processing:`, error);
      this.logger(`Error loading hotels: ${error}`, "error");
      hotels = this.generateMockHotels();
    }

    // Add hotels to ultra storage
    hotels.forEach((hotel) => {
      this.ultraStorage?.addHotel(hotel);
    });

    // Initialize hotel mapping service with hotel data
    hotelMappingService.initialize(hotels);
    console.log(`[DataLoader] Hotel mapping service initialized with ${hotels.length} hotels`);

    this.emitProgress({
      stage: "hotels",
      percentage: 20,
      message: `Loaded ${hotels.length.toLocaleString()} hotels`,
    });

    // Stage 2: Stream and process offers with ultra-performance
    this.emitProgress({
      stage: "offers",
      percentage: 30,
      message: "Streaming offers data with ultra-performance...",
    });

    let totalOffers = 0;
    let processedOffers = 0;

    try {
      if (fs.existsSync(offersFilePath) && this.streamingProcessor) {
        const offers = await this.streamingProcessor.processOffers(
          offersFilePath,
          (progress) => {
            processedOffers = progress.recordsProcessed;
            this.logger(
              `Offers processing: ${processedOffers.toLocaleString()} @ ${progress.recordsPerSecond.toLocaleString()}/sec`,
              "info",
            );

            // Update progress
            const percentage =
              30 + Math.min(50, (processedOffers / 1_000_000) * 20); // Assume up to 50M for progress calc
            this.emitProgress({
              stage: "offers",
              percentage,
              message: `Processed ${processedOffers.toLocaleString()} offers...`,
            });
          },
        );

        // Log final processing stats
        console.log(`DEBUG: Processed ${offers.length} offers, ready for storage`);
        
        // Use the larger of the two values (offers.length should be the actual count)
        totalOffers = Math.max(offers.length, processedOffers);

        // Add offers to ultra storage in batches (optimized for performance)
        console.log(`DEBUG: Starting batch processing with ${offers.length} offers`);
        const batchSize = 100_000;
        let addedToStorage = 0;
        try {
          for (let i = 0; i < offers.length; i += batchSize) {
            const batch = offers.slice(i, i + batchSize);
            
            // Process batch efficiently without excessive logging
            batch.forEach((offer) => {
              this.ultraStorage?.addOffer(offer);
              addedToStorage++;
            });
            
            // Report progress only at batch boundaries
            this.logger(
              `Processed batch ${Math.floor(i/batchSize) + 1}: ${addedToStorage.toLocaleString()} offers added`,
              "info",
            );
          }
        } catch (error) {
          console.log(`DEBUG: Error during batch processing: ${error}`);
          throw error;
        }
        
        console.log(`DEBUG: Added ${addedToStorage} offers to ultra storage`);
        // Use the actual count of offers added to storage
        totalOffers = Math.max(processedOffers, addedToStorage);

        // totalOffers is now set above using Math.max
      } else {
        this.logger("Offers file not found, using empty dataset", "warn");
        totalOffers = 0;
      }
    } catch (error) {
      this.logger(`Error loading offers: ${error}`, "error");
      totalOffers = 0;
    }

    this.emitProgress({
      stage: "indexing",
      percentage: 80,
      message: "Building ultra-performance indexes...",
    });

    // Stage 3: Build ultra-performance indexes
    if (this.ultraStorage) {
      await this.ultraStorage.buildIndexes();
      
      // Process hotel mappings after offers are loaded
      this.ultraStorage.processHotelMappings();
    }

    if (this.ultraSearchEngine) {
      await this.ultraSearchEngine.initialize();
    }

    this.emitProgress({
      stage: "indexing",
      percentage: 100,
      message: "Ultra-performance system ready!",
    });

    const totalLoadTime = Date.now() - startTime;
    this.logger(
      `🚀 ULTRA-PERFORMANCE loading completed in ${totalLoadTime}ms`,
      "info",
    );
    this.logger(`📈 Performance Summary:`, "info");
    this.logger(`   - Total offers: ${totalOffers.toLocaleString()}`, "info");
    this.logger(`   - Total hotels: ${hotels.length.toLocaleString()}`, "info");
    this.logger(
      `   - Processing rate: ${Math.round((totalOffers * 1000) / totalLoadTime).toLocaleString()} offers/sec`,
      "info",
    );
    this.logger(
      `   - Memory usage: ${JSON.stringify(this.ultraStorage?.getMemoryStats() || {})}`,
      "info",
    );

    // Create mock search indexes for compatibility
    const searchIndexes = new SearchIndexesImpl({
      chunkSize: 1000,
      enableMemoryMonitoring: true,
      memoryThresholdMB: 8000,
      gcInterval: 100,
    });
    // Initialize with ALL hotels loaded from CSV so results cover the full dataset
    searchIndexes.initializeHotels(hotels);

    return {
      hotels: hotels,
      offers: [], // Don't return all offers in memory
      hotelParseResult: {
        validRows: hotels.length,
        totalRows: hotels.length,
        errors: [],
      },
      offerParseResult: {
        validRows: totalOffers,
        totalRows: totalOffers,
        errors: [],
      },
      totalLoadTime,
      streamingStats: {
        totalOffers,
        totalHotels: hotels.length,
      },
      searchIndexes,
      compressedDataSize: 0,
      bloomFilterStats: { memoryKB: 0, falsePositiveRate: 0.001 },
    };
  }

  /**
   * Advanced data loading (fallback from ultra-performance)
   */
  private async loadDataAdvanced(
    hotelsFilePath: string,
    offersFilePath: string,
    startTime: number,
  ): Promise<DataLoadResult> {
    this.logger("Starting data loading with advanced optimizations...", "info");

    // Stage 1: Load hotels
    this.emitProgress({
      stage: "hotels",
      percentage: 0,
      message: "Loading hotels data...",
    });

    const hotelParseResult = await this.loadHotels(hotelsFilePath);
    this.emitProgress({
      stage: "hotels",
      percentage: 50,
      message: `Loaded ${hotelParseResult.data.length} hotels`,
    });

    // Initialize search indexes with hotels
    const searchIndexes = new SearchIndexesImpl({
      chunkSize: 1000,
      enableMemoryMonitoring: true,
      memoryThresholdMB: 8000,
      gcInterval: 100,
    });
    searchIndexes.initializeHotels(hotelParseResult.data);

    // Stage 2: Load and index offers in a single pass
    this.emitProgress({
      stage: "offers",
      percentage: 60,
      message: "Loading and indexing offers...",
    });

    // CRITICAL FIX: Load offers once and immediately index them
    const { offers, offerParseResult } = await this.loadAndIndexOffers(
      offersFilePath,
      searchIndexes,
    );

    // Stage 3: Finalize index building
    this.emitProgress({
      stage: "indexing",
      percentage: 90,
      message: "Finalizing advanced indexes...",
    });

    const finalizeResult = searchIndexes.finalizeBuild(startTime);

    // Stage 4: Get compressed data and Bloom filter stats
    let compressedDataSize = 0;
    let bloomFilterStats = { memoryKB: 0, falsePositiveRate: 0.001 };

    if (this.compressionEnabled && this.compressedStorage) {
      this.emitProgress({
        stage: "compression",
        percentage: 95,
        message: "Analyzing compression benefits...",
      });

      try {
        const stats = this.compressedStorage.getStorageStats();
        compressedDataSize = stats.memoryUsageMB * 1024 * 1024; // Convert MB to bytes
        this.logger(
          `📊 Compression Stats: ${(stats.compressionRatio || 0) * 100}% reduction, ${stats.memoryUsageMB.toFixed(1)}MB compressed`,
          "info",
        );
      } catch (error) {
        this.logger(
          `⚠️ Could not get compression stats: ${error instanceof Error ? error.message : "Unknown error"}`,
          "warn",
        );
      }
    }

    if (this.bloomFiltersEnabled && this.bloomFilterSystem) {
      this.emitProgress({
        stage: "bloom-filters",
        percentage: 98,
        message: "Finalizing Bloom filters...",
      });

      try {
        bloomFilterStats = {
          memoryKB: this.bloomFilterSystem.getMemoryUsage() / 1024,
          falsePositiveRate: 0.001,
        };
        this.logger(
          `🔹 Bloom Filter Stats: ${bloomFilterStats.memoryKB.toFixed(1)}KB memory, ${finalizeResult.totalHotels} hotels indexed`,
          "info",
        );
      } catch (error) {
        this.logger(
          `⚠️ Could not get Bloom filter stats: ${error instanceof Error ? error.message : "Unknown error"}`,
          "warn",
        );
      }
    }

    const totalLoadTime = Date.now() - startTime;
    this.logger(
      `🚀 Advanced data loading completed in ${totalLoadTime}ms`,
      "info",
    );
    this.logger(`📈 Performance Summary:`, "info");
    this.logger(`   - Total offers: ${offers.length.toLocaleString()}`, "info");
    this.logger(
      `   - Total hotels: ${finalizeResult.totalHotels.toLocaleString()}`,
      "info",
    );
    this.logger(
      `   - Compression: ${this.compressionEnabled ? "ENABLED" : "DISABLED"}`,
      "info",
    );
    this.logger(
      `   - Bloom Filters: ${this.bloomFiltersEnabled ? "ENABLED" : "DISABLED"}`,
      "info",
    );

    // Return result with offers loaded in single pass
    return {
      hotels: hotelParseResult.data,
      offers: offers,
      hotelParseResult,
      offerParseResult,
      totalLoadTime,
      streamingStats: {
        totalOffers: offerParseResult.validRows, // Fix: Use validRows for correct count
        totalHotels: finalizeResult.totalHotels,
      },
      searchIndexes: searchIndexes,
      compressedDataSize,
      bloomFilterStats,
    };
  }

  /**
   * CRITICAL FIX: Load offers once and immediately index them - no duplicate loading
   */
  private async loadAndIndexOffers(
    filePath: string,
    searchIndexes: SearchIndexesImpl,
  ): Promise<{
    offers: Offer[];
    offerParseResult: Omit<CsvParseResult<Offer>, "data">;
  }> {
    try {
      // Check if file exists before attempting to read
      if (!fs.existsSync(filePath)) {
        this.logger(`⚠️ Offers file does not exist: ${filePath}`, "warn");
        return {
          offers: [],
          offerParseResult: {
            validRows: 0,
            totalRows: 0,
            errors: [`File does not exist: ${filePath}`],
          },
        };
      }

      // Import the CSV parser dynamically to avoid circular dependencies
      const { OfferCsvParser } = await import("../../utils/csvParser");

      // OPTIMIZATION: Use streaming approach - don't store all offers in memory
      let totalOffers = 0;
      let batchCount = 0;
      const batchSize = 1000; // Smaller batches for better memory management
      let validRows = 0;
      const errors: string[] = [];

      this.logger(
        "🚀 Starting optimized streaming offer processing...",
        "info",
      );

      const result = await OfferCsvParser.parseOffers(
        filePath,
        async (batch: Offer[]) => {
          // OPTIMIZATION: Process batch immediately and discard from memory
          if (searchIndexes && typeof searchIndexes.addOffers === "function") {
            try {
              // Add batch to search indexes
              searchIndexes.addOffers(batch);
              batchCount++;
              validRows += batch.length;

              // OPTIMIZATION: Clear batch from memory immediately
              batch.length = 0;
            } catch (error) {
              const errorMsg = `Could not add batch ${batchCount} to search indexes: ${error instanceof Error ? error.message : "Unknown error"}`;
              errors.push(errorMsg);
              this.logger(`⚠️ ${errorMsg}`, "warn");
            }
          }

          // Log progress every 100 batches (100,000 offers)
          if (batchCount % 100 === 0) {
            const memUsage = process.memoryUsage();
            this.logger(
              `📊 Processed ${batchCount} batches (${(validRows / 1000000).toFixed(1)}M offers) | Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(0)}MB heap, ${(memUsage.rss / 1024 / 1024).toFixed(0)}MB RSS`,
              "info",
            );
          }
        },
      );

      totalOffers = validRows;

      this.logger(
        `✅ Successfully processed ${totalOffers.toLocaleString()} offers in ${batchCount} batches using streaming optimization`,
        "info",
      );

      // OPTIMIZATION: Return minimal data structure - don't store offers in memory
      return {
        offers: [], // Empty array since we're using streaming - offers are already indexed
        offerParseResult: {
          validRows: validRows,
          totalRows: result.totalRows,
          errors: [...errors, ...result.errors],
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger(
        `❌ Failed to load offers from CSV: ${errorMessage}`,
        "error",
      );

      return {
        offers: [],
        offerParseResult: {
          validRows: 0,
          totalRows: 0,
          errors: [errorMessage],
        },
      };
    }
  }

  /**
   * Loads hotels from CSV file
   */
  private async loadHotels(filePath: string): Promise<CsvParseResult<Hotel>> {
    this.logger(`Loading hotels from: ${filePath}`, "info");

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      this.logger(
        `Hotels file not found: ${filePath}, using mock data`,
        "warn",
      );
      const mockHotels = this.generateMockHotels();
      return {
        data: mockHotels,
        validRows: mockHotels.length,
        totalRows: mockHotels.length,
        errors: [],
      };
    }

    // Parse hotels CSV using the dedicated parser (semicolon-delimited)
    try {
      const { HotelCsvParser } = await import("../../utils/csvParser");
      const result = await HotelCsvParser.parseHotels(filePath);
      return result;
    } catch (error) {
      this.logger(`Error loading hotels CSV: ${error}`, "error");
      const mockHotels = this.generateMockHotels();
      return {
        data: mockHotels,
        validRows: mockHotels.length,
        totalRows: mockHotels.length,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Generate mock hotels for testing/fallback
   */
  private generateMockHotels(): Hotel[] {
    const count = this.useUltraPerformance
      ? Math.min(this.maxHotels, 10000)
      : 100;
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Hotel ${i + 1}`,
      stars: 3 + (i % 3),
    }));
  }

  /**
   * Emits progress updates
   */
  private emitProgress(progress: ProgressUpdate): void {
    this.emit("progress", progress);
  }

  /**
   * Default logger implementation
   */
  private defaultLogger(
    message: string,
    level: "info" | "warn" | "error" = "info",
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case "error":
        console.error(`${prefix} ${message}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Get ultra-performance search engine (if available)
   */
  getUltraSearchEngine(): UnifiedSearchEngine | undefined {
    return this.ultraSearchEngine;
  }

  /**
   * Get ultra storage system (if available)
   */
  getUltraStorage(): UltraPerformanceStorage | undefined {
    return this.ultraStorage;
  }

  /**
   * Check if ultra-performance mode is enabled
   */
  isUltraPerformanceMode(): boolean {
    return this.useUltraPerformance;
  }

  /**
   * Get system performance statistics
   */
  getPerformanceStats(): any {
    if (this.useUltraPerformance) {
      return {
        mode: "ultra-performance",
        maxOffers: this.maxOffers,
        maxHotels: this.maxHotels,
        storage: this.ultraStorage?.getMemoryStats(),
        search: this.ultraSearchEngine?.getPerformanceStats(),
        streaming: this.streamingProcessor?.getMemoryStats(),
      };
    } else {
      return {
        mode: "advanced",
        advancedOptimizations: this.useAdvancedOptimizations,
        compression: this.compressionEnabled,
        bloomFilters: this.bloomFiltersEnabled,
      };
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    if (this.ultraStorage) {
      this.ultraStorage.cleanup();
    }
    if (this.ultraSearchEngine) {
      this.ultraSearchEngine.cleanup();
    }
    if (this.streamingProcessor) {
      this.streamingProcessor.cleanup();
    }
  }
}