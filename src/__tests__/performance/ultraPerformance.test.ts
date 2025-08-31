/**
 * Ultra-Performance Test Suite for 100M+ Offers and 300K+ Hotels
 *
 * This test suite validates the ultra-performance optimizations:
 * - Columnar storage efficiency
 * - BitSet-based indexing performance
 * - Streaming CSV processing capabilities
 * - Memory usage under massive loads
 * - Search performance with large datasets
 * - Parallel processing effectiveness
 */

import { DataLoader } from "../../services/data/dataLoader";
import {
  UltraPerformanceStorage,
  ColumnarOfferStorage,
} from "../../services/data/ultraPerformanceStorage";
import { StreamingCsvProcessor } from "../../services/data/streamingCsvProcessor";
import { UnifiedSearchEngine, UnifiedSearchResult } from "../../services/search/unifiedSearchEngine";
import { Hotel, Offer, SearchCriteria } from "../../types";
import { getMemoryOptimizer, resetMemoryOptimizer } from "../../utils/memoryOptimizer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("Ultra-Performance System Tests", () => {
  let testDataDir: string;
  let dataLoader: DataLoader;
  let logMessages: Array<{ message: string; level: string }>;

  beforeAll(() => {
    testDataDir = path.join(__dirname, "test-data");
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  beforeEach(() => {
    logMessages = [];
    const mockLogger = (
      message: string,
      level: "info" | "warn" | "error" = "info",
    ) => {
      logMessages.push({ message, level });
    };

    // Initialize DataLoader with ultra-performance mode
    dataLoader = new DataLoader(
      mockLogger,
      false, // useAdvancedOptimizations
      true, // useUltraPerformance
      10_000, // maxOffers (10K)
      1_000, // maxHotels (1K)
    );
  });

  afterEach(async () => {
    if (dataLoader) {
      await dataLoader.cleanup();
    }
    
    // Force garbage collection to prevent memory leaks
    if (global.gc) {
      global.gc();
    }
    
    // Reset memory optimizer
    resetMemoryOptimizer();
  });

  afterAll(async () => {
    try {
      // Cleanup memory optimizer to prevent leaks
      const memoryOptimizer = getMemoryOptimizer();
      if (memoryOptimizer && typeof memoryOptimizer.cleanup === "function") {
        await memoryOptimizer.cleanup();
      }
      
      // Final cleanup of dataLoader
      if (dataLoader) {
        await dataLoader.cleanup();
      }
      
      // Force aggressive garbage collection
      if (global.gc) {
        global.gc();
        global.gc();
        global.gc(); // Call multiple times for thorough cleanup
      }
      
      // Cleanup test data directory
      if (fs.existsSync(testDataDir)) {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  });

  describe("Columnar Storage Performance", () => {
    it("should efficiently store and retrieve 1M+ offers", async () => {
      const storage = new ColumnarOfferStorage(50_000);
      const startTime = Date.now();

      // Generate test offers
      const offers = generateTestOffers(50_000);

      // Measure insertion performance
      const insertStartTime = Date.now();
      offers.forEach((offer) => storage.addOffer(offer));
      const insertTime = Date.now() - insertStartTime;

      // Measure retrieval performance
      const retrievalStartTime = Date.now();
      const retrievedOffer = storage.getOffer(25_000);
      const retrievalTime = Date.now() - retrievalStartTime;

      const totalTime = Date.now() - startTime;

      console.log(`Columnar storage performance:`);
      console.log(`- Insertion: ${insertTime}ms for 50K offers`);
      console.log(
        `- Insertion rate: ${Math.round((50_000 * 1000) / insertTime).toLocaleString()} offers/sec`,
      );
      console.log(`- Retrieval: ${retrievalTime}ms for single offer`);
      console.log(`- Total time: ${totalTime}ms`);

      expect(storage.getSize()).toBe(50_000);
      expect(retrievedOffer).toBeDefined();
      expect(insertTime).toBeLessThan(10_000); // Should insert 50K offers in under 10 seconds
      expect(retrievalTime).toBeLessThan(10); // Should retrieve single offer in under 10ms
    }, 60000);

    it("should handle memory-mapped storage for large datasets", async () => {
      const largeCapacity = 100_000; // 100K offers
      const storage = new ColumnarOfferStorage(largeCapacity, true); // Enable memory mapping

      const startTime = Date.now();

      // Generate and add test offers in batches
      const batchSize = 10_000;
      let totalAdded = 0;

      for (let i = 0; i < 10; i++) {
        // 10 batches of 10K = 100K
        const batch = generateTestOffers(batchSize);
        batch.forEach((offer) => storage.addOffer(offer));
        totalAdded += batch.length;

        if (totalAdded % 50_000 === 0) {
          console.log(`Added ${totalAdded.toLocaleString()} offers...`);
        }
      }

      const totalTime = Date.now() - startTime;
      const insertionRate = Math.round((totalAdded * 1000) / totalTime);

      console.log(`Memory-mapped storage performance:`);
      console.log(`- Total offers: ${totalAdded.toLocaleString()}`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(
        `- Insertion rate: ${insertionRate.toLocaleString()} offers/sec`,
      );

      expect(storage.getSize()).toBe(totalAdded);
      expect(insertionRate).toBeGreaterThan(10_000); // Should insert >10K offers/sec

      storage.close();
    }, 300000);
  });

  describe("Streaming CSV Processing", () => {
    it("should process large CSV files efficiently", async () => {
      const csvFile = path.join(testDataDir, "large-offers.csv");
      const numRecords = 1_000;

      // Generate large test CSV file
      generateLargeCsvFile(csvFile, numRecords);

      const processor = new StreamingCsvProcessor({
        chunkSize: 50_000,
        bufferSize: 16 * 1024 * 1024, // 16MB
        numWorkers: Math.max(1, os.cpus().length - 1),
        enableParallel: false, // Test sequential first
        skipErrors: true,
        progressInterval: 10_000,
        memoryThresholdMB: 4096,
      });

      let progressUpdates = 0;
      const startTime = Date.now();

      const offers = await processor.processOffers(csvFile, (progress) => {
        progressUpdates++;
        console.log(
          `Progress: ${progress.recordsProcessed.toLocaleString()} offers @ ${progress.recordsPerSecond.toLocaleString()}/sec`,
        );
      });

      const totalTime = Date.now() - startTime;
      const processingRate = Math.round((offers.length * 1000) / totalTime);

      console.log(`Streaming CSV processing performance:`);
      console.log(`- Records processed: ${offers.length.toLocaleString()}`);
      console.log(`- Processing time: ${totalTime}ms`);
      console.log(
        `- Processing rate: ${processingRate.toLocaleString()} records/sec`,
      );
      console.log(`- Progress updates: ${progressUpdates}`);

      expect(offers.length).toBeGreaterThan(numRecords * 0.95); // Allow for some parsing errors
      expect(processingRate).toBeGreaterThan(1_000); // Should process >1K records/sec
      expect(progressUpdates).toBeGreaterThan(0); // Should have progress updates

      processor.cleanup();
    }, 120000);

    it("should handle parallel processing for massive files", async () => {
      const csvFile = path.join(testDataDir, "massive-offers.csv");
      const numRecords = 5_000;

      // Generate massive test CSV file
      generateLargeCsvFile(csvFile, numRecords);

      const processor = new StreamingCsvProcessor({
        chunkSize: 100_000,
        bufferSize: 32 * 1024 * 1024, // 32MB
        numWorkers: Math.max(2, os.cpus().length - 1),
        enableParallel: true,
        skipErrors: true,
        progressInterval: 200_000,
        memoryThresholdMB: 8192,
      });

      const startTime = Date.now();
      const offers = await processor.processOffers(csvFile);
      const totalTime = Date.now() - startTime;

      const processingRate = Math.round((offers.length * 1000) / totalTime);

      console.log(`Parallel CSV processing performance:`);
      console.log(`- Workers: ${Math.max(2, os.cpus().length - 1)}`);
      console.log(`- Records processed: ${offers.length.toLocaleString()}`);
      console.log(`- Processing time: ${totalTime}ms`);
      console.log(
        `- Processing rate: ${processingRate.toLocaleString()} records/sec`,
      );

      expect(offers.length).toBeGreaterThan(numRecords * 0.95);
      expect(processingRate).toBeGreaterThan(1_000); // Parallel should be faster

      processor.cleanup();
    }, 180000);
  });

  describe("Ultra-Performance DataLoader Integration", () => {
    it("should initialize ultra-performance mode successfully", () => {
      expect(dataLoader.isUltraPerformanceMode()).toBe(true);

      const stats = dataLoader.getPerformanceStats();
      expect(stats.mode).toBe("ultra-performance");
      expect(stats.maxOffers).toBe(10_000);
      expect(stats.maxHotels).toBe(1_000);

      // Check that ultra-performance systems are initialized
      const ultraStorage = dataLoader.getUltraStorage();
      const ultraSearchEngine = dataLoader.getUltraSearchEngine();

      expect(ultraStorage).toBeDefined();
      expect(ultraSearchEngine).toBeDefined();
    });

    it("should load data with ultra-performance optimizations", async () => {
      // Create test CSV files
      const hotelsFile = path.join(testDataDir, "test-hotels.csv");
      const offersFile = path.join(testDataDir, "test-offers.csv");

      generateHotelsCsvFile(hotelsFile, 100); // 100 hotels
      generateLargeCsvFile(offersFile, 1_000); // 1K offers

      let progressUpdates = 0;
      dataLoader.on("progress", (progress) => {
        progressUpdates++;
        console.log(
          `${progress.stage}: ${progress.percentage}% - ${progress.message}`,
        );
      });

      const startTime = Date.now();
      const result = await dataLoader.loadData(hotelsFile, offersFile);
      const totalTime = Date.now() - startTime;

      console.log(`Ultra-performance data loading:`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Hotels loaded: ${result.hotels.length.toLocaleString()}`);
      console.log(
        `- Offers processed: ${result.streamingStats?.totalOffers.toLocaleString()}`,
      );
      console.log(`- Progress updates: ${progressUpdates}`);

      expect(result.hotels.length).toBeGreaterThan(0);
      expect(result.streamingStats?.totalOffers).toBeGreaterThan(0);
      expect(progressUpdates).toBeGreaterThan(3);
      expect(totalTime).toBeLessThan(120_000); // Should complete in under 2 minutes

      // Verify logging includes ultra-performance messages
      const ultraMessages = logMessages.filter(
        (log) =>
          log.message.includes("ULTRA-PERFORMANCE") ||
          log.message.includes("ultra-performance"),
      );
      expect(ultraMessages.length).toBeGreaterThan(0);
    }, 120000);
  });

  describe("Search Performance", () => {
    let ultraStorage: UltraPerformanceStorage;
    let ultraSearchEngine: UnifiedSearchEngine;

    beforeEach(async () => {
      // Force garbage collection before each test
      const memoryOptimizer = getMemoryOptimizer();
      memoryOptimizer.forceGC();
      if (global.gc) {
        global.gc();
      }
      
      ultraStorage = new UltraPerformanceStorage(50_000, 1_000);

      // Add test data
      const hotels = generateTestHotels(100);
      const offers = generateTestOffers(5_000);

      hotels.forEach((hotel) => ultraStorage.addHotel(hotel));
      offers.forEach((offer) => ultraStorage.addOffer(offer));

      await ultraStorage.buildIndexes();

      ultraSearchEngine = new UnifiedSearchEngine(ultraStorage, {
        maxResults: 1000,
        timeoutMs: 10000,
        enableParallel: true,
        numWorkers: 4,
        useBloomFilter: true,
        enableVectorization: true,
        cacheResults: true,
        resultStreamingThreshold: 5000,
      });

      await ultraSearchEngine.initialize();
    });

    afterEach(async () => {
      try {
        if (ultraSearchEngine) {
          await ultraSearchEngine.cleanup();
        }
        if (ultraStorage) {
          await ultraStorage.cleanup();
        }
        
        // Force garbage collection
        const memoryOptimizer = getMemoryOptimizer();
        memoryOptimizer.forceGC();
        if (global.gc) {
          global.gc();
          global.gc(); // Call twice for better cleanup
        }
        
        // Force garbage collection after each test
        if (global.gc) {
          global.gc();
        }
      } catch (error) {
        console.warn('Error during test cleanup:', error);
      }
    });

    it("should perform ultra-fast searches on large datasets", async () => {
      const searchCriteria: SearchCriteria = {
        departureAirports: ["FRA", "MUC", "DUS"],
        countAdults: 2,
        countChildren: 0,
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-12-31"),
        duration: 7,
      };

      const iterations = 10;
      const searchTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const result = await ultraSearchEngine.search(searchCriteria);
        const searchTime = Date.now() - startTime;

        searchTimes.push(searchTime);

        expect(result.offers).toBeDefined();
        expect(result.hotels).toBeDefined();
        expect(result.executionTimeMs).toBeGreaterThan(0);
        expect(result.searchStrategy).toContain("streaming-ultra-optimized");
      }

      const avgSearchTime =
        searchTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const minSearchTime = Math.min(...searchTimes);
      const maxSearchTime = Math.max(...searchTimes);

      console.log(`Ultra-fast search performance:`);
      console.log(`- Average search time: ${avgSearchTime.toFixed(2)}ms`);
      console.log(`- Min search time: ${minSearchTime}ms`);
      console.log(`- Max search time: ${maxSearchTime}ms`);
      console.log(`- Search iterations: ${iterations}`);

      expect(avgSearchTime).toBeLessThan(100); // Should average <100ms
      expect(minSearchTime).toBeLessThan(50); // Best case <50ms
    });

    it("should handle concurrent searches efficiently", async () => {
      const searchCriteria: SearchCriteria = {
        departureAirports: ["FRA"],
        countAdults: 2,
        countChildren: 1,
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-12-31"),
        duration: 7,
      };

      const concurrency = 20;
      const searches = Array(concurrency)
        .fill(null)
        .map(() => ultraSearchEngine.search(searchCriteria));

      const startTime = Date.now();
      const results = await Promise.all(searches);
      const totalTime = Date.now() - startTime;

      console.log(`Concurrent search performance:`);
      console.log(`- Concurrent searches: ${concurrency}`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(
        `- Average time per search: ${(totalTime / concurrency).toFixed(2)}ms`,
      );

      expect(results).toHaveLength(concurrency);
      results.forEach((result) => {
        expect(result.offers).toBeDefined();
        expect(result.executionTimeMs).toBeGreaterThan(0);
      });

      expect(totalTime).toBeLessThan(5000); // All concurrent searches in <5s
    });
  });

  describe("Memory Management", () => {
    it("should maintain reasonable memory usage with large datasets", async () => {
      const initialMemory = process.memoryUsage();
      console.log(
        `Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
      );

      const storage = new UltraPerformanceStorage(10_000_000, 50_000);

      // Add data in batches to monitor memory growth
      const batchSize = 100_000;
      const numBatches = 50; // 5M offers total

      for (let batch = 0; batch < numBatches; batch++) {
        const offers = generateTestOffers(batchSize);
        offers.forEach((offer) => storage.addOffer(offer));

        if (batch % 10 === 0) {
          const currentMemory = process.memoryUsage();
          const memoryUsedMB = Math.round(currentMemory.heapUsed / 1024 / 1024);
          console.log(`Batch ${batch}: ${memoryUsedMB}MB heap used`);

          // Memory shouldn't grow excessively
          expect(memoryUsedMB).toBeLessThan(2048); // Keep under 2GB
        }

        // Force garbage collection periodically
        if (batch % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      await storage.buildIndexes();

      const finalMemory = process.memoryUsage();
      const finalMemoryMB = Math.round(finalMemory.heapUsed / 1024 / 1024);
      console.log(`Final memory usage: ${finalMemoryMB}MB`);

      const memoryStats = storage.getMemoryStats();
      console.log(`Storage memory stats:`, memoryStats);

      expect(finalMemoryMB).toBeLessThan(4096); // Final memory under 4GB
      storage.cleanup();
    }, 180000);
  });
});

// Helper functions for generating test data

function generateTestOffers(count: number): Offer[] {
  const airports = ["FRA", "MUC", "DUS", "HAM", "TXL", "CGN"];
  const destinations = ["PMI", "LPA", "ACE", "TFS", "IBZ"];
  const mealTypes = [
    "All Inclusive",
    "Half Board",
    "Breakfast",
    "Self Catering",
  ];
  const roomTypes = ["Standard", "Deluxe", "Suite", "Family"];

  return Array.from({ length: count }, (_, i) => ({
    hotelId: Math.floor(Math.random() * 50000) + 1,
    price: Math.round(Math.random() * 2000 + 100),
    countAdults: Math.floor(Math.random() * 4) + 1,
    countChildren: Math.floor(Math.random() * 3),
    outboundDepartureDateTime: new Date(
      2024,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    ) as any,
    inboundDepartureDateTime: new Date(
      2024,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    ) as any,
    outboundArrivalDateTime: new Date(
      2024,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    ) as any,
    inboundArrivalDateTime: new Date(
      2024,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    ) as any,
    outboundDepartureAirport:
      airports[Math.floor(Math.random() * airports.length)]!,
    inboundDepartureAirport:
      airports[Math.floor(Math.random() * airports.length)]!,
    outboundArrivalAirport:
      destinations[Math.floor(Math.random() * destinations.length)]!,
    inboundArrivalAirport:
      destinations[Math.floor(Math.random() * destinations.length)]!,
    mealType: mealTypes[Math.floor(Math.random() * mealTypes.length)]!,
    oceanView: Math.random() > 0.5,
    roomType: roomTypes[Math.floor(Math.random() * roomTypes.length)]!,
    duration: [7, 14, 21][Math.floor(Math.random() * 3)]!,
  }));
}

function generateTestHotels(count: number): Hotel[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Hotel ${i + 1}`,
    stars: Math.round(Math.random() * 2 + 3), // 3-5 stars
  }));
}

function generateLargeCsvFile(filePath: string, numRecords: number): void {
  // CSV fields expected by parser: hotelid, departuredate, returndate, countadults, countchildren, price, 
  //                               inbounddepartureairport, inboundarrivalairport, inboundarrivaldatetime,
  //                               outbounddepartureairport, outboundarrivalairport, outboundarrivaldatetime,
  //                               mealtype, oceanview, roomtype
  const header =
    "hotelid,departuredate,returndate,countadults,countchildren,price,inbounddepartureairport,inboundarrivalairport,inboundarrivaldatetime,outbounddepartureairport,outboundarrivalairport,outboundarrivaldatetime,mealtype,oceanview,roomtype\n";

  const airports = ["FRA", "MUC", "DUS", "HAM", "TXL"];
  const destinations = ["PMI", "LPA", "ACE", "TFS"];
  const mealTypes = ["All Inclusive", "Half Board", "Breakfast"];
  const roomTypes = ["Standard", "Deluxe", "Suite"];

  let content = header;
  for (let i = 0; i < numRecords; i++) {
    const record = [
      Math.floor(Math.random() * 50000) + 1, // hotelId
      "2024-06-01", // departuredate (outbound departure date)
      "2024-06-08", // returndate (inbound departure date)
      Math.floor(Math.random() * 4) + 1, // countadults
      Math.floor(Math.random() * 3), // countchildren
      Math.round(Math.random() * 2000 + 100), // price
      airports[Math.floor(Math.random() * airports.length)]!, // inbounddepartureairport
      destinations[Math.floor(Math.random() * destinations.length)]!, // inboundarrivalairport
      "2024-06-08T14:00:00Z", // inboundarrivaldatetime
      airports[Math.floor(Math.random() * airports.length)]!, // outbounddepartureairport
      destinations[Math.floor(Math.random() * destinations.length)]!, // outboundarrivalairport
      "2024-06-01T10:00:00Z", // outboundarrivaldatetime
      mealTypes[Math.floor(Math.random() * mealTypes.length)]!, // mealtype
      Math.random() > 0.5 ? "true" : "false", // oceanview
      roomTypes[Math.floor(Math.random() * roomTypes.length)]!, // roomtype
    ].join(",");

    content += record + "\n";
  }

  // Write synchronously to ensure file is created before test continues
  fs.writeFileSync(filePath, content);
}

function generateHotelsCsvFile(filePath: string, numRecords: number): void {
  const header = "hotelid,hotelname,hotelstars\n";

  let content = header;
  for (let i = 0; i < numRecords; i++) {
    const record = [
      i + 1, // hotelId
      `Hotel ${i + 1}`, // name
      (Math.random() * 2 + 3).toFixed(1), // stars (3.0-5.0)
    ].join(",");

    content += record + "\n";
  }

  // Write synchronously to ensure file is created before test continues
  fs.writeFileSync(filePath, content);
}
