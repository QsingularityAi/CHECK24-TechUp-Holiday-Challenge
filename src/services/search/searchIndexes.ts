import { Hotel, Offer, SearchIndexes } from '../../types';

/**
 * String interning utility for memory optimization
 */
class StringInterner {
  private internedStrings = new Map<string, string>();

  /**
   * Interns a string to reduce memory usage
   */
  intern(str: string): string {
    const existing = this.internedStrings.get(str);
    if (existing !== undefined) {
      return existing;
    }
    this.internedStrings.set(str, str);
    return str;
  }

  /**
   * Gets the number of interned strings
   */
  getCount(): number {
    return this.internedStrings.size;
  }

  /**
   * Clears all interned strings
   */
  clear(): void {
    this.internedStrings.clear();
  }
}

/**
 * Optimized offer structure for memory efficiency
 */
export interface OptimizedOffer {
  hotelId: number;
  price: number;
  countAdults: number;
  countChildren: number;
  outboundDepartureTimestamp: number; // Unix timestamp for faster comparison
  inboundDepartureTimestamp: number;
  outboundDepartureAirport: string; // Interned string
  inboundDepartureAirport: string; // Interned string
  outboundArrivalAirport: string; // Interned string
  inboundArrivalAirport: string; // Interned string
  mealType: string; // Interned string
  oceanView: boolean;
  roomType: string; // Interned string
  duration: number;
}

/**
 * Index building statistics
 */
export interface IndexStats {
  totalOffers: number;
  totalHotels: number;
  hotelIndexSize: number;
  airportIndexSize: number;
  dateRangeIndexSize: number;
  passengerCountIndexSize: number;
  internedStringsCount: number;
  buildTimeMs: number;
  memoryUsageMB: number;
}

/**
 * Streaming index building configuration
 */
export interface StreamingConfig {
  chunkSize: number;
  enableMemoryMonitoring: boolean;
  memoryThresholdMB: number;
  gcInterval: number; // Process N chunks before triggering GC
}

/**
 * SearchIndexes implementation with streaming index building for massive datasets
 */
export class SearchIndexesImpl implements SearchIndexes {
  byHotel: Map<number, OptimizedOffer[]> = new Map();
  byAirport: Map<string, OptimizedOffer[]> = new Map();
  byDateRange: Map<string, OptimizedOffer[]> = new Map();
  byPassengerCount: Map<string, OptimizedOffer[]> = new Map();

  private stringInterner = new StringInterner();
  private hotelMap = new Map<number, Hotel>();
  private buildStats: IndexStats | null = null;
  private offersCount = 0;
  private streamingConfig: StreamingConfig;
  private chunkCount = 0;
  private lastGCTime = Date.now();

  constructor(streamingConfig?: Partial<StreamingConfig>) {
    this.streamingConfig = {
      chunkSize: 10000, // Process 10K offers at a time
      enableMemoryMonitoring: true,
      memoryThresholdMB: 12000, // 12GB threshold
      gcInterval: 50, // Trigger GC every 50 chunks
      ...streamingConfig
    };
  }

  /**
   * Initializes the indexes with hotel data. Must be called before adding offers.
   */
  initializeHotels(hotels: Hotel[]): void {
    const startTime = Date.now();
    console.log(`Initializing indexes with ${hotels.length} hotels...`);
    this.clearIndexes();
    this.buildHotelMap(hotels);
    this.buildStats = {
      totalOffers: 0,
      totalHotels: hotels.length,
      hotelIndexSize: 0,
      airportIndexSize: 0,
      dateRangeIndexSize: 0,
      passengerCountIndexSize: 0,
      internedStringsCount: 0,
      buildTimeMs: Date.now() - startTime,
      memoryUsageMB: 0
    };
  }

  /**
   * STREAMING: Adds a batch of offers to the indexes without accumulating in memory.
   * This is the key method for handling massive datasets.
   */
  addOffers(offers: Offer[]): void {
    const startTime = Date.now();
    this.chunkCount++;
    
    // Filter out offers that reference hotels we don't know.
    // This prevents downstream "Hotel <id> not found in index" and ensures
    // UI results only include valid hotels from hotels.csv.
    const validOffers = offers.filter((offer) => this.hotelMap.has(offer.hotelId));
    const dropped = offers.length - validOffers.length;
    if (dropped > 0 && this.chunkCount % 50 === 0) {
      console.warn(
        `Dropped ${dropped.toLocaleString()} offers in chunk ${this.chunkCount} due to unknown hotelId`
      );
    }

    // Convert and process only valid offers in this chunk
    const optimizedOffers = this.optimizeOffers(validOffers);
    
    // Build indexes for this chunk only
    this.buildHotelIndexChunk(optimizedOffers);
    this.buildAirportIndexChunk(optimizedOffers);
    this.buildDateRangeIndexChunk(optimizedOffers);
    this.buildPassengerCountIndexChunk(optimizedOffers);
    
    this.offersCount += validOffers.length;
    
    // Memory management for massive datasets
    if (this.streamingConfig.enableMemoryMonitoring) {
      this.monitorMemoryUsage();
    }
    
    // Periodic garbage collection
    if (this.chunkCount % this.streamingConfig.gcInterval === 0) {
      this.performGarbageCollection();
    }
    
    const chunkTime = Date.now() - startTime;
    if (this.chunkCount % 100 === 0) {
      console.log(`Processed chunk ${this.chunkCount} (${this.offersCount.toLocaleString()} valid offers) in ${chunkTime}ms`);
    }
  }

  /**
   * Finalizes the index build process and calculates stats.
   */
  finalizeBuild(startTime: number): IndexStats {
    const buildTime = Date.now() - startTime;
    const memoryUsage = this.estimateMemoryUsage();
    
    // Perform final optimization and cleanup
    this.optimizeIndexes();
    
    this.buildStats = {
      ...this.buildStats!,
      totalOffers: this.offersCount,
      hotelIndexSize: this.byHotel.size,
      airportIndexSize: this.byAirport.size,
      dateRangeIndexSize: this.byDateRange.size,
      passengerCountIndexSize: this.byPassengerCount.size,
      internedStringsCount: this.stringInterner.getCount(),
      buildTimeMs: buildTime,
      memoryUsageMB: memoryUsage
    };

    console.log(`Streaming index building completed in ${buildTime}ms`);
    console.log(`Processed ${this.chunkCount} chunks with ${this.offersCount.toLocaleString()} total offers`);
    console.log(`Memory usage: ${memoryUsage.toFixed(2)}MB`);
    console.log(`Interned strings: ${this.stringInterner.getCount()}`);

    return this.buildStats;
  }

  /**
   * Builds all indexes from hotels and offers data.
   * @deprecated Use initializeHotels, addOffers, and finalizeBuild for streaming.
   */
  buildIndexes(hotels: Hotel[], offers: Offer[]): IndexStats {
    const startTime = Date.now();
    
    console.log(`Building indexes for ${hotels.length} hotels and ${offers.length} offers...`);

    // Clear existing indexes
    this.clearIndexes();

    // Build hotel map
    this.buildHotelMap(hotels);

    // Convert offers to optimized format
    const optimizedOffers = this.optimizeOffers(offers);

    // Build all indexes
    this.buildHotelIndex(optimizedOffers);
    this.buildAirportIndex(optimizedOffers);
    this.buildDateRangeIndex(optimizedOffers);
    this.buildPassengerCountIndex(optimizedOffers);

    const buildTime = Date.now() - startTime;
    const memoryUsage = this.estimateMemoryUsage();

    this.buildStats = {
      totalOffers: offers.length,
      totalHotels: hotels.length,
      hotelIndexSize: this.byHotel.size,
      airportIndexSize: this.byAirport.size,
      dateRangeIndexSize: this.byDateRange.size,
      passengerCountIndexSize: this.byPassengerCount.size,
      internedStringsCount: this.stringInterner.getCount(),
      buildTimeMs: buildTime,
      memoryUsageMB: memoryUsage
    };

    console.log(`Index building completed in ${buildTime}ms`);
    console.log(`Memory usage: ${memoryUsage.toFixed(2)}MB`);
    console.log(`Interned strings: ${this.stringInterner.getCount()}`);

    return this.buildStats;
  }

  /**
   * Gets hotel information by ID
   */
  getHotel(hotelId: number): Hotel | undefined {
    return this.hotelMap.get(hotelId);
  }

  /**
   * Gets all hotels
   */
  getAllHotels(): Hotel[] {
    return Array.from(this.hotelMap.values());
  }

  /**
   * Gets build statistics
   */
  getStats(): IndexStats | null {
    return this.buildStats;
  }

  /**
   * Clears all indexes and frees memory
   */
  clearIndexes(): void {
    this.byHotel.clear();
    this.byAirport.clear();
    this.byDateRange.clear();
    this.byPassengerCount.clear();
    this.stringInterner.clear();
    this.hotelMap.clear();
    this.buildStats = null;
    this.offersCount = 0;
    this.chunkCount = 0;
  }

  /**
   * Builds hotel lookup map
   */
  private buildHotelMap(hotels: Hotel[]): void {
    for (const hotel of hotels) {
      this.hotelMap.set(hotel.id, hotel);
    }
  }

  /**
   * Converts offers to optimized format with string interning
   */
  private optimizeOffers(offers: Offer[]): OptimizedOffer[] {
    return offers.map(offer => ({
      hotelId: offer.hotelId,
      price: offer.price,
      countAdults: offer.countAdults,
      countChildren: offer.countChildren,
      outboundDepartureTimestamp: offer.outboundDepartureDateTime.getTime(),
      inboundDepartureTimestamp: offer.inboundDepartureDateTime.getTime(),
      outboundDepartureAirport: this.stringInterner.intern(offer.outboundDepartureAirport),
      inboundDepartureAirport: this.stringInterner.intern(offer.inboundDepartureAirport),
      outboundArrivalAirport: this.stringInterner.intern(offer.outboundArrivalAirport),
      inboundArrivalAirport: this.stringInterner.intern(offer.inboundArrivalAirport),
      mealType: this.stringInterner.intern(offer.mealType),
      oceanView: offer.oceanView,
      roomType: this.stringInterner.intern(offer.roomType),
      duration: offer.duration
    }));
  }

  /**
   * STREAMING: Builds hotel-based index for a single chunk without accumulating all offers
   */
  private buildHotelIndexChunk(offers: OptimizedOffer[]): void {
    for (const offer of offers) {
      let hotelOffers = this.byHotel.get(offer.hotelId);
      
      if (!hotelOffers) {
        hotelOffers = [];
        this.byHotel.set(offer.hotelId, hotelOffers);
      }
      
      // Insert offer in sorted position (insertion sort for memory efficiency)
      this.insertSorted(hotelOffers, offer);
    }
  }

  /**
   * STREAMING: Builds airport-based index for a single chunk
   */
  private buildAirportIndexChunk(offers: OptimizedOffer[]): void {
    for (const offer of offers) {
      // Outbound departure airport
      let airportOffers = this.byAirport.get(offer.outboundDepartureAirport);
      if (!airportOffers) {
        airportOffers = [];
        this.byAirport.set(offer.outboundDepartureAirport, airportOffers);
      }
      airportOffers.push(offer);
      
      // Inbound departure airport
      airportOffers = this.byAirport.get(offer.inboundDepartureAirport);
      if (!airportOffers) {
        airportOffers = [];
        this.byAirport.set(offer.inboundDepartureAirport, airportOffers);
      }
      airportOffers.push(offer);
    }
  }

  /**
   * STREAMING: Builds date range index for a single chunk
   */
  private buildDateRangeIndexChunk(offers: OptimizedOffer[]): void {
    for (const offer of offers) {
      // Use month keys (YYYY-MM format) to match getOffersByDateRange method
      const outboundDate = new Date(offer.outboundDepartureTimestamp);
      const monthKey = this.getMonthKey(outboundDate);
      
      let dateOffers = this.byDateRange.get(monthKey);
      if (!dateOffers) {
        dateOffers = [];
        this.byDateRange.set(monthKey, dateOffers);
      }
      dateOffers.push(offer);
    }
  }

  /**
   * STREAMING: Builds passenger count index for a single chunk
   */
  private buildPassengerCountIndexChunk(offers: OptimizedOffer[]): void {
    for (const offer of offers) {
      // Use the same key format as getOffersByPassengerCount
      const passengerKey = `${Number(offer.countAdults)}a${Number(offer.countChildren)}c`;
      let passengerOffers = this.byPassengerCount.get(passengerKey);
      if (!passengerOffers) {
        passengerOffers = [];
        this.byPassengerCount.set(passengerKey, passengerOffers);
      }
      passengerOffers.push(offer);
    }
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  private buildHotelIndex(offers: OptimizedOffer[]): void {
    this.buildHotelIndexChunk(offers);
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  private buildAirportIndex(offers: OptimizedOffer[]): void {
    this.buildAirportIndexChunk(offers);
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  private buildDateRangeIndex(offers: OptimizedOffer[]): void {
    this.buildDateRangeIndexChunk(offers);
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  private buildPassengerCountIndex(offers: OptimizedOffer[]): void {
    this.buildPassengerCountIndexChunk(offers);
  }

  /**
   * Inserts an offer into a sorted array at the correct position
   * Uses binary search for O(log n) lookup + O(n) insertion
   */
  private insertSorted(sortedArray: OptimizedOffer[], offer: OptimizedOffer): void {
    // For very small arrays, just use linear search
    if (sortedArray.length < 10) {
      let insertIndex = 0;
      while (insertIndex < sortedArray.length && sortedArray[insertIndex]!.price <= offer.price) {
        insertIndex++;
      }
      sortedArray.splice(insertIndex, 0, offer);
      return;
    }

    // Binary search for insertion point
    let left = 0;
    let right = sortedArray.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (sortedArray[mid]!.price <= offer.price) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    sortedArray.splice(left, 0, offer);
  }

  /**
   * Monitors memory usage and logs warnings if approaching threshold
   */
  private monitorMemoryUsage(): void {
    if (typeof global.gc === 'function') {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      if (heapUsedMB > this.streamingConfig.memoryThresholdMB) {
        console.warn(`⚠️ High memory usage: ${heapUsedMB.toFixed(1)}MB (threshold: ${this.streamingConfig.memoryThresholdMB}MB)`);
        
        // Force garbage collection if available
        if (Date.now() - this.lastGCTime > 30000) { // Max once every 30 seconds
          this.performGarbageCollection();
        }
      }
    }
  }

  /**
   * Performs garbage collection if available
   */
  private performGarbageCollection(): void {
    if (typeof global.gc === 'function') {
      const beforeGC = process.memoryUsage().heapUsed;
      global.gc();
      const afterGC = process.memoryUsage().heapUsed;
      const freedMB = (beforeGC - afterGC) / 1024 / 1024;
      
      if (freedMB > 100) { // Only log if we freed significant memory
        console.log(`🧹 Garbage collection freed ${freedMB.toFixed(1)}MB`);
      }
      
      this.lastGCTime = Date.now();
    }
  }

  /**
   * Optimizes indexes after all data has been processed
   */
  private optimizeIndexes(): void {
    // For very large hotel arrays, we could implement additional optimizations
    // like converting to TypedArrays or implementing skip lists for faster access
    // For now, we'll just ensure the arrays are properly sorted
    
    console.log('Optimizing indexes for performance...');
    
    // Log some statistics about the largest arrays
    let maxHotelOffers = 0;
    let maxHotelId = 0;
    
    for (const [hotelId, offers] of this.byHotel.entries()) {
      if (offers.length > maxHotelOffers) {
        maxHotelOffers = offers.length;
        maxHotelId = hotelId;
      }
    }
    
    if (maxHotelOffers > 100000) {
      console.log(`📊 Largest hotel array: Hotel ${maxHotelId} with ${maxHotelOffers.toLocaleString()} offers`);
    }
  }

  /**
   * Estimates memory usage of the indexes
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    // Estimate size of hotel index
    for (const offers of this.byHotel.values()) {
      totalSize += offers.length * 64; // Rough estimate: 64 bytes per offer
    }
    
    // Estimate size of other indexes
    for (const offers of this.byAirport.values()) {
      totalSize += offers.length * 64;
    }
    
    for (const offers of this.byDateRange.values()) {
      totalSize += offers.length * 64;
    }
    
    for (const offers of this.byPassengerCount.values()) {
      totalSize += offers.length * 64;
    }
    
    // Add string interner size
    totalSize += this.stringInterner.getCount() * 100; // Rough estimate
    
    return totalSize / (1024 * 1024); // Convert to MB
  }

  // ===== COMPATIBILITY METHODS =====
  // These methods are kept for backward compatibility

  /**
   * Gets offers by hotel ID with optional filtering
   */
  getOffersByHotel(hotelId: number): OptimizedOffer[] {
    return this.byHotel.get(hotelId) || [];
  }

  /**
   * Gets offers by departure airport
   */
  getOffersByAirport(airport: string): OptimizedOffer[] {
    // Intern the search query airport to match indexed strings
    const internedAirport = this.stringInterner.intern(airport);
    return this.byAirport.get(internedAirport) || [];
  }

  /**
   * Gets offers by date range with memory-optimized lookup
   */
  getOffersByDateRange(startDate: Date, endDate: Date): OptimizedOffer[] {
    const startTime = startDate.getTime();
    // Treat end date as inclusive end-of-day to match user expectations
    const endInclusive = new Date(endDate);
    endInclusive.setHours(23, 59, 59, 999);
    const endTime = endInclusive.getTime();
    
    // Get all months in the range
    const monthKeys = this.getMonthKeysInRange(startDate, endDate);
    
    // Use Map for deduplication instead of Set for better performance with large datasets
    const seenOffers = new Map<OptimizedOffer, boolean>();
    const offers: OptimizedOffer[] = [];
    
    for (const monthKey of monthKeys) {
      const monthOffers = this.byDateRange.get(monthKey);
      if (!monthOffers) continue;
      
      for (let i = 0; i < monthOffers.length; i++) {
        const offer = monthOffers[i]!;
        
        // Skip if already seen
        if (seenOffers.has(offer)) continue;
        
        // Check exact date range immediately to avoid storing irrelevant offers
        const departureTime = offer.outboundDepartureTimestamp;
        if (departureTime >= startTime && departureTime <= endTime) {
          seenOffers.set(offer, true);
          offers.push(offer);
        }
      }
    }
    
    return offers;
  }

  /**
   * Gets offers by passenger count
   */
  getOffersByPassengerCount(adults: number, children: number): OptimizedOffer[] {
    const passengerKey = `${Number(adults)}a${Number(children)}c`;
    return this.byPassengerCount.get(passengerKey) || [];
  }

  /**
   * Gets all month keys in a date range
   */
  private getMonthKeysInRange(startDate: Date, endDate: Date): string[] {
    const keys: string[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (current <= end) {
      keys.push(this.getMonthKey(current));
      current.setMonth(current.getMonth() + 1);
    }
    
    return keys;
  }

  /**
   * Creates a month key for date indexing (YYYY-MM format)
   */
  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Converts optimized offer back to regular offer format
   */
  convertToOffer(optimizedOffer: OptimizedOffer): Offer {
    return {
      hotelId: optimizedOffer.hotelId,
      price: optimizedOffer.price,
      countAdults: optimizedOffer.countAdults,
      countChildren: optimizedOffer.countChildren,
      outboundDepartureDateTime: new Date(optimizedOffer.outboundDepartureTimestamp),
      inboundDepartureDateTime: new Date(optimizedOffer.inboundDepartureTimestamp),
      outboundArrivalDateTime: new Date(optimizedOffer.outboundDepartureTimestamp + 2 * 60 * 60 * 1000), // 2 hours after departure
      inboundArrivalDateTime: new Date(optimizedOffer.inboundDepartureTimestamp + 2 * 60 * 60 * 1000), // 2 hours after departure
      outboundDepartureAirport: optimizedOffer.outboundDepartureAirport,
      inboundDepartureAirport: optimizedOffer.inboundDepartureAirport,
      outboundArrivalAirport: optimizedOffer.outboundArrivalAirport,
      inboundArrivalAirport: optimizedOffer.inboundArrivalAirport,
      mealType: optimizedOffer.mealType,
      oceanView: optimizedOffer.oceanView,
      roomType: optimizedOffer.roomType,
      duration: optimizedOffer.duration
    };
  }

  /**
   * Memory optimization: Force garbage collection of temporary data structures
   */
  optimizeMemoryUsage(): void {
    // Trigger garbage collection if available (Node.js with --expose-gc flag)
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Gets memory usage statistics for monitoring
   */
  getMemoryStats(): {
    hotelIndexSize: number;
    airportIndexSize: number;
    dateRangeIndexSize: number;
    passengerCountIndexSize: number;
    internedStringsCount: number;
    estimatedMemoryMB: number;
  } {
    return {
      hotelIndexSize: this.byHotel.size,
      airportIndexSize: this.byAirport.size,
      dateRangeIndexSize: this.byDateRange.size,
      passengerCountIndexSize: this.byPassengerCount.size,
      internedStringsCount: this.stringInterner.getCount(),
      estimatedMemoryMB: this.estimateMemoryUsage()
    };
  }
}
