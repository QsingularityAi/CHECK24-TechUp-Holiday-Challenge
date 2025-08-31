/**
 * Unified Search Engine - Optimized for 100M+ Records
 * 
 * This engine combines the best features from SearchEngine and UltraFastSearchEngine:
 * - BitSet-based indexes for ultra-fast filtering
 * - Streaming search capabilities for memory efficiency
 * - Adaptive configuration based on dataset size
 * - Vectorized operations and parallel processing
 * - Memory pressure handling and automatic optimization
 */

import { SearchCriteria, BestHotelOffer, Offer, Hotel } from '../../types';
import { UltraPerformanceStorage, UltraFastBitSet } from '../data/ultraPerformanceStorage';
import { ISearchEngine } from './searchEngineInterface';
import { adaptiveConfigOptimizer, AdaptiveSearchConfig, DatasetMetrics } from './adaptiveConfig';
import { getMemoryOptimizer, MemoryPressureLevel } from '../../utils/memoryOptimizer';
import { cacheService } from '../optimization/cacheService';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as os from 'os';

/**
 * Enhanced search result with comprehensive metrics
 */
export interface UnifiedSearchResult {
  offers: Offer[];
  hotels: BestHotelOffer[];
  executionTimeMs: number;
  candidateOffers: number;
  filteredOffers: number;
  indexesUsed: string[];
  memoryUsageMB: number;
  searchStrategy: string;
  cacheHit: boolean;
  optimizationLevel: string;
}

/**
 * Search metrics for performance monitoring
 */
export interface SearchMetrics {
  searchType: 'bestOffers' | 'hotelOffers' | 'streaming';
  executionTimeMs: number;
  candidateOffers: number;
  filteredOffers: number;
  resultCount: number;
  indexesUsed: string[];
  timestamp: Date;
  memoryUsageMB: number;
  cacheHit: boolean;
}

/**
 * Streaming search configuration
 */
export interface StreamingConfig {
  chunkSize: number;
  maxConcurrentChunks: number;
  enableBackpressure: boolean;
  timeoutMs: number;
}

/**
 * Vectorized operations for high-performance filtering
 */
class OptimizedVectorOperations {
  /**
   * Fast range filtering using typed arrays
   */
  static filterByRange(
    values: Float32Array | Uint32Array,
    min: number,
    max: number,
    resultBitSet: UltraFastBitSet
  ): void {
    const length = values.length;
    
    // Process in SIMD-friendly chunks
    for (let i = 0; i < length; i += 8) {
      const end = Math.min(i + 8, length);
      
      for (let j = i; j < end; j++) {
        if (values[j]! >= min && values[j]! <= max) {
          resultBitSet.set(j);
        }
      }
    }
  }
  
  /**
   * Fast set membership test with early termination
   */
  static filterBySet(
    values: Uint16Array,
    targetSet: Set<number>,
    resultBitSet: UltraFastBitSet
  ): void {
    const length = values.length;
    
    for (let i = 0; i < length; i++) {
      if (targetSet.has(values[i]!)) {
        resultBitSet.set(i);
      }
    }
  }
  
  /**
   * Optimized timestamp range filtering
   */
  static filterByTimestampRange(
    timestamps: BigUint64Array,
    startTimestamp: bigint,
    endTimestamp: bigint,
    resultBitSet: UltraFastBitSet
  ): void {
    const length = timestamps.length;
    
    for (let i = 0; i < length; i++) {
      const ts = timestamps[i]!;
      if (ts >= startTimestamp && ts <= endTimestamp) {
        resultBitSet.set(i);
      }
    }
  }
}

/**
 * Result streamer for memory-efficient result processing
 */
class ResultStreamer {
  private results: Offer[] = [];
  private streamingThreshold: number;
  private onBatch: ((batch: Offer[]) => void) | undefined;
  private totalResults = 0;
  
  constructor(streamingThreshold: number, onBatch?: (batch: Offer[]) => void) {
    this.streamingThreshold = streamingThreshold;
    this.onBatch = onBatch;
  }
  
  addResult(offer: Offer): void {
    this.results.push(offer);
    this.totalResults++;
    
    if (this.results.length >= this.streamingThreshold && this.onBatch) {
      this.onBatch([...this.results]);
      this.results = []; // Clear to free memory
    }
  }
  
  flush(): Offer[] {
    if (this.results.length > 0 && this.onBatch) {
      this.onBatch([...this.results]);
    }
    
    const finalResults = [...this.results];
    this.results = [];
    return finalResults;
  }
  
  getTotalCount(): number {
    return this.totalResults;
  }
}

/**
 * Unified Search Engine - Main Implementation
 */
export class UnifiedSearchEngine implements ISearchEngine {
  private storage: UltraPerformanceStorage;
  private config: AdaptiveSearchConfig;
  private searchMetrics: SearchMetrics[] = [];
  private memoryOptimizer = getMemoryOptimizer();
  private workerPool: Worker[] = [];
  private resultCache = new Map<string, UnifiedSearchResult>();
  private isInitialized = false;
  
  constructor(
    storage: UltraPerformanceStorage,
    baseConfig?: Partial<AdaptiveSearchConfig>,
    datasetMetrics?: DatasetMetrics
  ) {
    this.storage = storage;
    this.config = adaptiveConfigOptimizer.optimizeConfig(baseConfig, datasetMetrics);
    
    if (this.config.enableParallel) {
      this.initializeWorkerPool();
    }
  }
  
  /**
   * Initialize the search engine and build indexes
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('Initializing Unified Search Engine...');
    const startTime = Date.now();
    
    // Build storage indexes
    await this.storage.buildIndexes();
    
    const initTime = Date.now() - startTime;
    console.log(`Unified Search Engine initialized in ${initTime}ms`);
    console.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);
    
    this.isInitialized = true;
  }
  
  /**
   * Main search method with adaptive optimization
   */
  async search(criteria: SearchCriteria): Promise<UnifiedSearchResult> {
    console.log('DEBUG: UnifiedSearchEngine.search called with criteria:', JSON.stringify(criteria, null, 2));
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    // Update configuration based on runtime conditions
    this.config = adaptiveConfigOptimizer.updateConfigForRuntime(this.config);
    
    // Check cache first
    const cacheKey = this.createCacheKey(criteria);
    const cachedResult = this.resultCache.get(cacheKey);
    
    if (cachedResult && this.config.cacheResults) {
      return {
        ...cachedResult,
        cacheHit: true,
        executionTimeMs: Math.max(1, Math.round(performance.now() - startTime))
      };
    }
    
    // Determine optimal search strategy
    const strategy = this.selectSearchStrategy(criteria);
    
    let result: UnifiedSearchResult;
    
    switch (strategy) {
      case 'parallel':
        result = await this.executeParallelSearch(criteria);
        break;
      case 'streaming':
        result = await this.executeStreamingSearch(criteria);
        break;
      default:
        result = await this.executeSequentialSearch(criteria);
    }
    
    // Cache result if enabled
    if (this.config.cacheResults && result.offers.length > 0) {
      this.resultCache.set(cacheKey, { ...result, cacheHit: false });
    }
    
    // Record metrics
    this.recordMetrics({
      searchType: 'bestOffers',
      executionTimeMs: result.executionTimeMs,
      candidateOffers: result.candidateOffers,
      filteredOffers: result.filteredOffers,
      resultCount: result.offers.length,
      indexesUsed: result.indexesUsed,
      timestamp: new Date(),
      memoryUsageMB: result.memoryUsageMB,
      cacheHit: false
    });
    
    return result;
  }
  
  /**
   * Streaming search for memory-efficient processing
   */
  async* searchStream(
    criteria: SearchCriteria,
    chunkSize: number = this.config.resultStreamingThreshold
  ): AsyncGenerator<BestHotelOffer[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const streamer = new ResultStreamer(chunkSize);
    const result = await this.executeStreamingSearch(criteria, streamer);
    
    // Yield results in chunks
    const hotels = result.hotels;
    for (let i = 0; i < hotels.length; i += chunkSize) {
      yield hotels.slice(i, i + chunkSize);
    }
  }
  
  /**
   * Execute sequential search (optimized single-threaded)
   */
  private async executeSequentialSearch(criteria: SearchCriteria): Promise<UnifiedSearchResult> {
    const startTime = performance.now();
    const indexesUsed: string[] = [];
    
    // Get candidate offers using optimized indexes
    const candidateOffers = await this.getCandidateOffers(criteria, indexesUsed);
    
    // Apply detailed filtering
    const filteredOffers = this.applyDetailedFiltering(candidateOffers, criteria);
    
    // Group by hotel and find best offers
    const bestOffersByHotel = this.findBestOffersPerHotel(filteredOffers);
    
    // Convert to final format
    const hotels = this.convertToBestHotelOffers(bestOffersByHotel);
    
    const executionTime = Math.max(1, Math.round(performance.now() - startTime));
    const memoryUsage = this.getMemoryUsage();
    
    return {
      offers: filteredOffers.slice(0, this.config.maxResults),
      hotels: hotels.slice(0, this.config.maxResults),
      executionTimeMs: executionTime,
      candidateOffers: candidateOffers.length,
      filteredOffers: filteredOffers.length,
      indexesUsed,
      memoryUsageMB: memoryUsage,
      searchStrategy: 'sequential-bitset-optimized',
      cacheHit: false,
      optimizationLevel: this.config.datasetSizeHint || 'auto'
    };
  }
  
  /**
   * Execute parallel search using worker threads
   */
  private async executeParallelSearch(criteria: SearchCriteria): Promise<UnifiedSearchResult> {
    const startTime = performance.now();
    
    // Split criteria into chunks for parallel processing
    const searchChunks = this.createSearchChunks(criteria);
    
    // Execute searches in parallel
    const promises = searchChunks.map((chunk, index) => 
      this.executeWorkerSearch(chunk, index)
    );
    
    const results = await Promise.all(promises);
    
    // Merge results
    const mergedResult = this.mergeSearchResults(results);
    
    return {
      ...mergedResult,
      executionTimeMs: Math.max(1, Math.round(performance.now() - startTime)),
      searchStrategy: 'parallel-bitset-optimized',
      cacheHit: false,
      optimizationLevel: this.config.datasetSizeHint || 'auto'
    };
  }
  
  /**
   * Execute streaming search for large result sets
   */
  private async executeStreamingSearch(
    criteria: SearchCriteria,
    streamer?: ResultStreamer
  ): Promise<UnifiedSearchResult> {
    const startTime = performance.now();
    const indexesUsed: string[] = [];
    const totalOffers = this.storage.getMemoryStats().offers;
    
    const resultStreamer = streamer || new ResultStreamer(this.config.resultStreamingThreshold);
    
    // Process offers in streaming chunks
    const candidateOffers = await this.getCandidateOffers(criteria, indexesUsed);
    
    let processedCount = 0;
    // Use smaller chunk sizes for massive datasets to prevent memory overflow
    const baseChunkSize = this.config.chunkSize;
    const chunkSize = totalOffers > 50_000_000 ? Math.min(baseChunkSize, 10_000) : baseChunkSize;
    
    // More aggressive GC for massive datasets
    const gcInterval = totalOffers > 50_000_000 ? 2 : this.config.gcInterval;
    
    for (let i = 0; i < candidateOffers.length; i += chunkSize) {
      const chunk = candidateOffers.slice(i, i + chunkSize);
      const filteredChunk = this.applyDetailedFiltering(chunk, criteria);
      
      filteredChunk.forEach(offer => resultStreamer.addResult(offer));
      processedCount += chunk.length;
      
      // More aggressive memory pressure handling for massive datasets
      if (i % (chunkSize * gcInterval) === 0) {
        const memoryPressure = this.memoryOptimizer.getMemoryPressureLevel();
        const memoryStats = this.memoryOptimizer.getMemoryStats();
        
        // Force GC if memory pressure is high or we're using >3GB
        if (memoryPressure === MemoryPressureLevel.HIGH || 
            memoryPressure === MemoryPressureLevel.CRITICAL ||
            memoryStats.heapUsed > 3 * 1024 * 1024 * 1024) {
          this.memoryOptimizer.forceGarbageCollection();
          
          // Add a small delay to allow GC to complete
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Log progress for massive datasets
        if (totalOffers > 50_000_000 && i % (chunkSize * 10) === 0) {
          const memoryUsedMB = Math.round(memoryStats.heapUsed / 1024 / 1024);
          console.log(`[STREAMING] Processed ${processedCount.toLocaleString()}/${candidateOffers.length.toLocaleString()} offers (${memoryUsedMB}MB heap)`);
        }
      }
    }
    
    const finalOffers = resultStreamer.flush();
    const bestOffersByHotel = this.findBestOffersPerHotel(finalOffers);
    const hotels = this.convertToBestHotelOffers(bestOffersByHotel);
    
    const executionTime = Math.max(1, Math.round(performance.now() - startTime));
    const memoryUsage = this.getMemoryUsage();
    
    return {
      offers: finalOffers.slice(0, this.config.maxResults),
      hotels: hotels.slice(0, this.config.maxResults),
      executionTimeMs: executionTime,
      candidateOffers: candidateOffers.length,
      filteredOffers: finalOffers.length,
      indexesUsed,
      memoryUsageMB: memoryUsage,
      searchStrategy: 'streaming-ultra-optimized',
      cacheHit: false,
      optimizationLevel: this.config.datasetSizeHint || 'auto'
    };
  }
  
  /**
   * Get candidate offers using optimized indexes
   */
  private async getCandidateOffers(criteria: SearchCriteria, indexesUsed: string[]): Promise<Offer[]> {
    console.log('DEBUG: UnifiedSearchEngine.getCandidateOffers called with criteria:', JSON.stringify(criteria, null, 2));
    // Use UltraPerformanceStorage's optimized search
    indexesUsed.push('ultra-performance-search');
    const results = this.storage.search(criteria);
    console.log(`DEBUG: UnifiedSearchEngine.getCandidateOffers returning ${results.length} offers`);
    return results;
  }
  
  /**
   * Apply detailed filtering to offers
   */
  private applyDetailedFiltering(offers: Offer[], criteria: SearchCriteria): Offer[] {
    return offers.filter(offer => {
      // Apply all search criteria filters
      if (criteria.countAdults && offer.countAdults !== criteria.countAdults) return false;
      if (criteria.countChildren && offer.countChildren !== criteria.countChildren) return false;
      if (criteria.duration && offer.duration !== criteria.duration) return false;
      
      // Date range filtering
      if (criteria.earliestDepartureDate) {
        const departureDate = new Date(offer.outboundDepartureDateTime);
        if (departureDate < criteria.earliestDepartureDate) return false;
      }
      
      if (criteria.latestReturnDate) {
        const returnDate = new Date(offer.inboundDepartureDateTime);
        if (returnDate > criteria.latestReturnDate) return false;
      }
      
      // Airport filtering
      if (criteria.departureAirports && criteria.departureAirports.length > 0) {
        if (!criteria.departureAirports.includes(offer.outboundDepartureAirport)) return false;
      }
      
      return true;
    });
  }
  
  /**
   * Find best offers per hotel
   */
  private findBestOffersPerHotel(offers: Offer[]): Map<number, Offer> {
    const bestOffers = new Map<number, Offer>();
    
    for (const offer of offers) {
      const existing = bestOffers.get(offer.hotelId);
      if (!existing || offer.price < existing.price) {
        bestOffers.set(offer.hotelId, offer);
      }
    }
    
    return bestOffers;
  }
  
  /**
   * Convert to BestHotelOffer format
   */
  private convertToBestHotelOffers(bestOffers: Map<number, Offer>): BestHotelOffer[] {
    const results: BestHotelOffer[] = [];
    
    for (const [hotelId, offer] of bestOffers) {
      // Get actual hotel data from storage
      const hotel = this.storage.getHotel(hotelId);
      
      // Create BestHotelOffer using the correct interface structure
      const bestHotelOffer: BestHotelOffer = {
        hotelId: hotelId,
        hotelName: hotel ? hotel.name : `Hotel ${hotelId}`, // Use actual hotel name or fallback
        hotelStars: hotel ? hotel.stars : 4, // Use actual hotel stars or default
        minPrice: offer.price,
        departureDate: offer.outboundDepartureDateTime,
        returnDate: offer.inboundDepartureDateTime,
        roomType: offer.roomType,
        mealType: offer.mealType,
        countAdults: offer.countAdults,
        countChildren: offer.countChildren,
        duration: offer.duration,
        availableOffers: 1 // Default to 1 offer available
      };
      
      results.push(bestHotelOffer);
    }
    
    return results.sort((a, b) => a.minPrice - b.minPrice);
  }
  
  /**
   * Select optimal search strategy based on criteria and system state
   */
  private selectSearchStrategy(criteria: SearchCriteria): 'sequential' | 'parallel' | 'streaming' {
    const memoryPressure = this.memoryOptimizer.getMemoryPressureLevel();
    const memoryStats = this.memoryOptimizer.getMemoryStats();
    const totalOffers = this.storage.getMemoryStats().offers;
    
    // Force streaming for massive datasets (50M+ offers) to prevent memory overflow
    if (totalOffers > 50_000_000) {
      return 'streaming';
    }
    
    // Force streaming for high memory pressure or when using >3GB memory
    if (memoryPressure === MemoryPressureLevel.CRITICAL || 
        memoryPressure === MemoryPressureLevel.HIGH ||
        memoryStats.heapUsed > 3 * 1024 * 1024 * 1024) {
      return 'streaming';
    }
    
    // Use streaming for large datasets or potentially large result sets
    if (this.config.datasetSizeHint === 'massive' || 
        this.config.datasetSizeHint === 'large' ||
        totalOffers > 10_000_000) {
      return 'streaming';
    }
    
    // Use parallel for complex queries if enabled and memory allows
    if (this.config.enableParallel && 
        this.hasComplexCriteria(criteria) && 
        memoryPressure === MemoryPressureLevel.LOW) {
      return 'parallel';
    }
    
    return 'sequential';
  }
  
  /**
   * Check if criteria is complex enough to benefit from parallel processing
   */
  private hasComplexCriteria(criteria: SearchCriteria): boolean {
    let complexity = 0;
    
    if (criteria.departureAirports && criteria.departureAirports.length > 1) complexity++;
    if (criteria.earliestDepartureDate && criteria.latestReturnDate) complexity++;
    if (criteria.countAdults || criteria.countChildren) complexity++;
    if (criteria.duration) complexity++;
    
    return complexity >= 2;
  }
  
  /**
   * Initialize worker pool for parallel processing
   */
  private initializeWorkerPool(): void {
    // Worker pool implementation would go here
    // For now, we'll use the main thread
  }
  
  /**
   * Create search chunks for parallel processing
   */
  private createSearchChunks(criteria: SearchCriteria): SearchCriteria[] {
    // For now, return single chunk - can be enhanced for true parallelization
    return [criteria];
  }
  
  /**
   * Execute search in worker thread
   */
  private async executeWorkerSearch(criteria: SearchCriteria, workerIndex: number): Promise<UnifiedSearchResult> {
    // For now, execute sequentially - can be enhanced with actual workers
    return this.executeSequentialSearch(criteria);
  }
  
  /**
   * Merge results from parallel searches
   */
  private mergeSearchResults(results: UnifiedSearchResult[]): UnifiedSearchResult {
    if (results.length === 1) return results[0]!;
    
    const merged: UnifiedSearchResult = {
      offers: [],
      hotels: [],
      executionTimeMs: Math.max(...results.map(r => r.executionTimeMs)),
      candidateOffers: results.reduce((sum, r) => sum + r.candidateOffers, 0),
      filteredOffers: results.reduce((sum, r) => sum + r.filteredOffers, 0),
      indexesUsed: [...new Set(results.flatMap(r => r.indexesUsed))],
      memoryUsageMB: Math.max(...results.map(r => r.memoryUsageMB)),
      searchStrategy: 'parallel-bitset-optimized',
      cacheHit: false,
      optimizationLevel: this.config.datasetSizeHint || 'auto'
    };
    
    // Merge and deduplicate offers
    const allOffers = results.flatMap(r => r.offers);
    const offerMap = new Map<string, Offer>();
    
    for (const offer of allOffers) {
      const key = `${offer.hotelId}-${offer.price}-${offer.outboundDepartureDateTime}`;
      if (!offerMap.has(key)) {
        offerMap.set(key, offer);
      }
    }
    
    merged.offers = Array.from(offerMap.values()).slice(0, this.config.maxResults);
    
    // Merge hotels
    const bestOffers = this.findBestOffersPerHotel(merged.offers);
    merged.hotels = this.convertToBestHotelOffers(bestOffers);
    
    return merged;
  }
  
  /**
   * Create cache key for search criteria
   */
  private createCacheKey(criteria: SearchCriteria): string {
    return JSON.stringify(criteria);
  }
  
  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / (1024 * 1024));
  }
  
  /**
   * Record search metrics
   */
  private recordMetrics(metrics: SearchMetrics): void {
    this.searchMetrics.push(metrics);
    
    // Keep only recent metrics (last 1000)
    if (this.searchMetrics.length > 1000) {
      this.searchMetrics = this.searchMetrics.slice(-1000);
    }
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalSearches: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    memoryUsage: number;
    optimizationLevel: string;
  } {
    const totalSearches = this.searchMetrics.length;
    const avgTime = totalSearches > 0 
      ? this.searchMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / totalSearches 
      : 0;
    
    const cacheHits = this.searchMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = totalSearches > 0 ? (cacheHits / totalSearches) * 100 : 0;
    
    return {
      totalSearches,
      averageExecutionTime: Math.round(avgTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      memoryUsage: this.getMemoryUsage(),
      optimizationLevel: this.config.datasetSizeHint || 'auto'
    };
  }
  
  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<AdaptiveSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): AdaptiveSearchConfig {
    return { ...this.config };
  }
  
  /**
   * Clear caches and reset metrics
   */
  clearCache(): void {
    this.resultCache.clear();
    this.searchMetrics = [];
  }
  
  /**
   * Legacy compatibility method - equivalent to search().hotels
   */
  async findBestOffersByHotel(criteria: SearchCriteria): Promise<BestHotelOffer[]> {
    console.log('DEBUG: UnifiedSearchEngine.findBestOffersByHotel called with criteria:', JSON.stringify(criteria, null, 2));
    const result = await this.search(criteria);
    console.log(`DEBUG: UnifiedSearchEngine.findBestOffersByHotel returning ${result.hotels.length} hotels`);
    return result.hotels;
  }

  /**
   * Legacy compatibility method - get hotel by ID from storage
   */
  getHotel(hotelId: number): Hotel | undefined {
    return this.storage.getHotel(hotelId);
  }

  /**
   * Legacy compatibility method - find offers for specific hotel
   */
  async findHotelOffers(hotelId: number, criteria: SearchCriteria): Promise<Offer[]> {
    const result = await this.search(criteria);
    // Filter results to only include offers for the specified hotel
    return result.offers.filter(offer => offer.hotelId === hotelId);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearCache();
    this.storage.cleanup();
    
    // Cleanup worker pool
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
  }
}