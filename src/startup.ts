/**
 * Application startup and initialization with comprehensive error handling
 */

import { DataLoader } from "./services/data/dataLoader";
import { UnifiedSearchEngine } from "./services/search/unifiedSearchEngine";
import { SearchEngine } from "./services/search/searchEngine";
import { ISearchEngine } from "./services/search/searchEngineInterface";
import { SearchIndexesImpl } from "./services/search/searchIndexes";
import { ApiController } from "./controllers";
import { SystemError, SystemErrorType, ErrorLogger } from "./middleware";
import { config } from "./config";

export interface StartupResult {
  success: boolean;
  searchEngine?: ISearchEngine;
  errors: string[];
  warnings: string[];
  dataStats: {
    hotels: number;
    offers: number;
    loadTime: number;
  };
}

export class ApplicationStartup {
  private logger: (message: string, level?: "info" | "warn" | "error") => void;

  constructor(
    logger?: (message: string, level?: "info" | "warn" | "error") => void,
  ) {
    this.logger = logger || this.defaultLogger;
  }

  private defaultLogger(
    message: string,
    level: "info" | "warn" | "error" = "info",
  ): void {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();
    console.log(`[${timestamp}] [STARTUP] [${levelUpper}] ${message}`);
  }

  /**
   * Initialize the application with data loading and search engine setup
   */
  async initialize(apiController: ApiController): Promise<StartupResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let searchEngine: ISearchEngine | undefined;

    this.logger("Starting application initialization...", "info");

    try {
      // Update loading status
      apiController.updateLoadingProgress(0, "initializing");

      // Step 1: Initialize data loader with ultra-performance system
      // Determine if we should use ultra-performance mode based on config
      const useUltraPerformance = config.enableUltraPerformance;

      // Initialize with ultra-performance if enabled, otherwise use advanced optimizations
      const dataLoader = new DataLoader(
        this.logger,
        config.enableAdvancedOptimizations,
        useUltraPerformance,
        config.ultraPerformanceConfig.maxOffers,
        config.ultraPerformanceConfig.maxHotels,
      );

      this.logger(
        `Initializing data loader - Ultra-Performance: ${useUltraPerformance ? "ENABLED" : "DISABLED"}`,
        "info",
      );

      // Set up progress tracking
      dataLoader.on("progress", (progress) => {
        apiController.updateLoadingProgress(
          progress.percentage,
          progress.message,
        );
        this.logger(
          `Progress: ${progress.stage} - ${progress.percentage}% - ${progress.message}`,
          "info",
        );
      });

      // Step 2: Load data with error recovery
      apiController.updateLoadingProgress(10, "loading data files");

      const hotelsPath = config.hotelsDataPath || "./data/hotels.csv";
      const offersPath = config.offersDataPath || "./data/offers.csv";

      this.logger(
        `Loading data from: hotels=${hotelsPath}, offers=${offersPath}`,
        "info",
      );

      let dataResult;
      try {
        // Create search indexes with streaming configuration for massive datasets
        const streamingConfig = config.streamingConfig;

        const searchIndexes = new SearchIndexesImpl(streamingConfig);
        dataResult = await dataLoader.loadData(hotelsPath, offersPath);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown data loading error";
        ErrorLogger.logDataLoadingError(error as Error, hotelsPath);

        // Check if we can continue with partial data
        if (errorMessage.includes("file not found")) {
          errors.push(`Data files not found: ${errorMessage}`);
          throw new SystemError(
            SystemErrorType.FILE_SYSTEM_ERROR,
            "Required data files are missing",
            503,
            true,
            { hotelsPath, offersPath },
          );
        } else {
          errors.push(`Data loading failed: ${errorMessage}`);
          throw new SystemError(
            SystemErrorType.DATA_LOADING_ERROR,
            "Failed to load application data",
            503,
            true,
            { error: errorMessage },
          );
        }
      }

      // Step 3: Validate data quality
      apiController.updateLoadingProgress(60, "validating data integrity");

      // Basic validation - check if we have data
      if (dataResult.hotels.length === 0) {
        warnings.push("No hotels loaded - this may indicate a data issue");
      }

      // FIX: Use streaming stats for offers validation since streaming approach doesn't store offers in memory
      const totalOffers = dataResult.streamingStats?.totalOffers || 0;
      if (totalOffers === 0) {
        warnings.push("No offers loaded - this may indicate a data issue");
      }

      if (dataResult.hotels.length > 0 && totalOffers > 0) {
        this.logger("Data integrity validation passed", "info");
      } else {
        this.logger(
          "Data integrity issues detected but continuing with available data",
          "warn",
        );
      }

      // Check minimum data requirements
      if (dataResult.hotels.length === 0) {
        errors.push("No hotels loaded - service cannot function");
        throw new SystemError(
          SystemErrorType.DATA_LOADING_ERROR,
          "No hotel data available",
          503,
          true,
        );
      }

      if (totalOffers === 0) {
        errors.push("No offers loaded - search functionality unavailable");
        warnings.push(
          "Search functionality will be limited due to missing offer data",
        );
      }

      // Step 4: Build search indexes
      apiController.updateLoadingProgress(70, "building search indexes");

      // The streaming indexes are already built during data loading
      // We just need to get the stats and validate they were built correctly
      const streamingStats = dataResult.streamingStats;
      if (streamingStats && streamingStats.totalOffers > 0) {
        this.logger(
          `Streaming indexes built successfully with ${streamingStats.totalOffers.toLocaleString()} offers`,
          "info",
        );
      } else {
        this.logger(
          "Warning: No streaming stats available, indexes may not be properly built",
          "warn",
        );
      }

      // Note: Indexes are already built from streaming, no need to rebuild
      this.logger(`Search indexes built successfully`, "info");

      // Step 5: Initialize search engine
      apiController.updateLoadingProgress(85, "initializing search engine");

      try {
        // Try to initialize unified search engine first (ultra-performance mode)
        searchEngine = dataLoader.getUltraSearchEngine();
        if (searchEngine) {
          if (searchEngine.initialize) {
            await searchEngine.initialize();
          }
          apiController.setSearchEngine(searchEngine);
          this.logger("Ultra-performance search engine initialized successfully", "info");
        } else {
          // Fallback to regular search engine when ultra-performance is not enabled
          this.logger("Ultra-performance mode not enabled, falling back to regular search engine", "warn");
          const regularSearchEngine = new SearchEngine(
            dataResult.searchIndexes,
            {
              enablePerformanceLogging: true,
              maxResultsPerHotel: 1000,
              searchTimeoutMs: 10000,
            },
            this.logger,
            config.enableAdvancedOptimizations
          );
          searchEngine = regularSearchEngine;
          apiController.setSearchEngine(searchEngine);
          this.logger("Regular search engine initialized successfully", "info");
        }
      } catch (searchError) {
        const errorMessage =
          searchError instanceof Error
            ? searchError.message
            : "Unknown search engine error";
        errors.push(`Failed to initialize search engine: ${errorMessage}`);
        ErrorLogger.logSystemError(searchError as Error);

        throw new SystemError(
          SystemErrorType.SEARCH_ENGINE_ERROR,
          "Failed to initialize search engine",
          503,
          true,
          { error: errorMessage },
        );
      }

      // Step 6: Final validation and status update
      apiController.updateLoadingProgress(95, "finalizing initialization");

      // Get memory statistics from process
      const memoryUsage = process.memoryUsage();
      const totalMemoryMB =
        (memoryUsage.heapUsed + memoryUsage.external) / (1024 * 1024);
      this.logger(`Memory usage: ${totalMemoryMB.toFixed(2)} MB total`, "info");

      // Check memory usage warnings
      if (totalMemoryMB > 1000) {
        // 1GB
        warnings.push(`High memory usage: ${totalMemoryMB.toFixed(2)} MB`);
      }

      // Update final status
      const totalTime = Date.now() - startTime;
      // FIX: Use streaming stats for offers count since ultra-performance mode doesn't store offers in memory
      const actualOffersCount = dataResult.streamingStats?.totalOffers || dataResult.offers.length;
      apiController.updateDataStatus(
        true,
        actualOffersCount,
        dataResult.hotels.length,
      );
      apiController.updateLoadingProgress(100, "initialization complete");

      this.logger(
        `Application initialization completed successfully in ${totalTime}ms`,
        "info",
      );
      this.logger(
        `Loaded: ${dataResult.hotels.length} hotels, ${totalOffers} offers`,
        "info",
      );

      if (warnings.length > 0) {
        this.logger(
          `Initialization completed with ${warnings.length} warnings:`,
          "warn",
        );
        warnings.forEach((warning) => this.logger(`  - ${warning}`, "warn"));
      }

      return {
        success: true,
        searchEngine,
        errors,
        warnings,
        dataStats: {
          hotels: dataResult.hotels.length,
          offers: totalOffers,
          loadTime: totalTime,
        },
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown initialization error";

      this.logger(
        `Application initialization failed after ${totalTime}ms: ${errorMessage}`,
        "error",
      );

      // Update status to reflect failure
      apiController.updateLoadingProgress(0, "initialization failed");
      apiController.updateDataStatus(false, 0, 0);

      // Log the error
      ErrorLogger.logSystemError(error as Error, {
        initializationTime: totalTime,
        stage: "startup",
      });

      errors.push(errorMessage);

      return {
        success: false,
        errors,
        warnings,
        dataStats: {
          hotels: 0,
          offers: 0,
          loadTime: totalTime,
        },
      };
    }
  }

  /**
   * Perform health checks during startup
   */
  async performHealthChecks(): Promise<{ passed: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check memory availability
      const memoryUsage = process.memoryUsage();
      const availableMemory = memoryUsage.heapTotal - memoryUsage.heapUsed;

      if (availableMemory < 100 * 1024 * 1024) {
        // Less than 100MB available
        issues.push("Low available memory detected");
      }

      // Check file system access
      const fs = await import("fs");
      const testPath = "./data";

      try {
        await fs.promises.access(testPath, fs.constants.R_OK);
      } catch {
        issues.push("Data directory is not accessible");
      }

      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]!);

      if (majorVersion < 16) {
        issues.push(
          `Node.js version ${nodeVersion} may not be fully supported (recommended: 16+)`,
        );
      }

      this.logger(
        `Health checks completed: ${issues.length === 0 ? "PASSED" : "ISSUES DETECTED"}`,
        issues.length === 0 ? "info" : "warn",
      );

      if (issues.length > 0) {
        issues.forEach((issue) => this.logger(`  - ${issue}`, "warn"));
      }

      return {
        passed: issues.length === 0,
        issues,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown health check error";
      issues.push(`Health check failed: ${errorMessage}`);

      return {
        passed: false,
        issues,
      };
    }
  }
}
