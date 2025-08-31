import { SearchEngine, SearchMetrics } from "../search/searchEngine";
import { SearchIndexesImpl } from "../search/searchIndexes";
import { Hotel, Offer, SearchCriteria } from "../../types";
import { cacheService } from "../optimization/cacheService";
import { resetMemoryOptimizer } from "../../utils/memoryOptimizer";

describe("SearchEngine", () => {
  let searchEngine: SearchEngine;
  let searchIndexes: SearchIndexesImpl;
  let testHotels: Hotel[];
  let testOffers: Offer[];
  let logMessages: Array<{ message: string; level: string }>;

  beforeEach(() => {
    // Clear cache to ensure metrics are recorded
    cacheService.clear();

    logMessages = [];
    const mockLogger = (
      message: string,
      level: "info" | "info" | "warn" | "error" = "info",
    ) => {
      logMessages.push({ message, level });
    };

    // Create search indexes with streaming configuration for tests
    const streamingConfig = {
      chunkSize: 1000,
      enableMemoryMonitoring: false, // Disable for tests
      memoryThresholdMB: 1000,
      gcInterval: 100,
    };
    
    searchIndexes = new SearchIndexesImpl(streamingConfig);

    testHotels = [
      { id: 1, name: "Hotel Paradise", stars: 4.0 },
      { id: 2, name: "Beach Resort", stars: 3.5 },
      { id: 3, name: "Luxury Suite", stars: 5.0 },
    ];

    testOffers = [
      {
        hotelId: 1,
        price: 1200,
        countAdults: 2,
        countChildren: 0,
        outboundDepartureDateTime: new Date("2024-06-01T10:00:00Z"),
        inboundDepartureDateTime: new Date("2024-06-08T14:00:00Z"),
        outboundArrivalDateTime: new Date("2024-06-01T13:15:00Z"),
        inboundArrivalDateTime: new Date("2024-06-08T17:15:00Z"),
        outboundDepartureAirport: "FRA",
        inboundDepartureAirport: "PMI",
        outboundArrivalAirport: "PMI",
        inboundArrivalAirport: "FRA",
        mealType: "All Inclusive",
        oceanView: true,
        roomType: "Double Room",
        duration: 7,
      },
      {
        hotelId: 1,
        price: 900,
        countAdults: 2,
        countChildren: 0,
        outboundDepartureDateTime: new Date("2024-06-02T08:00:00Z"),
        inboundDepartureDateTime: new Date("2024-06-09T12:00:00Z"),
        outboundArrivalDateTime: new Date("2024-06-02T11:15:00Z"),
        inboundArrivalDateTime: new Date("2024-06-09T15:15:00Z"),
        outboundDepartureAirport: "FRA",
        inboundDepartureAirport: "PMI",
        outboundArrivalAirport: "PMI",
        inboundArrivalAirport: "FRA",
        mealType: "Breakfast",
        oceanView: false,
        roomType: "Single Room",
        duration: 7,
      },
      {
        hotelId: 2,
        price: 1500,
        countAdults: 1,
        countChildren: 1,
        outboundDepartureDateTime: new Date("2024-07-10T09:00:00Z"),
        inboundDepartureDateTime: new Date("2024-07-17T15:00:00Z"),
        outboundArrivalDateTime: new Date("2024-07-10T12:15:00Z"),
        inboundArrivalDateTime: new Date("2024-07-17T18:15:00Z"),
        outboundDepartureAirport: "MUC",
        inboundDepartureAirport: "PMI",
        outboundArrivalAirport: "PMI",
        inboundArrivalAirport: "MUC",
        mealType: "Half Board",
        oceanView: true,
        roomType: "Family Room",
        duration: 7,
      },
      {
        hotelId: 3,
        price: 2000,
        countAdults: 2,
        countChildren: 0,
        outboundDepartureDateTime: new Date("2024-06-15T14:00:00Z"),
        inboundDepartureDateTime: new Date("2024-06-22T18:00:00Z"),
        outboundArrivalDateTime: new Date("2024-06-15T17:15:00Z"),
        inboundArrivalDateTime: new Date("2024-06-22T21:15:00Z"),
        outboundDepartureAirport: "FRA",
        inboundDepartureAirport: "PMI",
        outboundArrivalAirport: "PMI",
        inboundArrivalAirport: "FRA",
        mealType: "All Inclusive",
        oceanView: true,
        roomType: "Suite",
        duration: 7,
      },
    ];

    // Use the new streaming approach to build indexes
    searchIndexes.initializeHotels(testHotels);
    searchIndexes.addOffers(testOffers);
    searchIndexes.finalizeBuild(Date.now());
    
    searchEngine = new SearchEngine(searchIndexes, {}, mockLogger);
  });

  afterEach(() => {
    // Clear cache and cleanup
    cacheService.clear();
    if (searchEngine) {
      searchEngine.clearMetrics();
      searchEngine.cleanup();
    }
    // Reset memory optimizer to prevent timer leaks
    resetMemoryOptimizer();
  });

  afterAll(() => {
    // Cleanup cache service timers to prevent open handles
    (cacheService as any).destroy?.();
  });

  describe("findBestOffersByHotel", () => {
    it("should find best offers for each hotel matching criteria", async () => {
      const criteria: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      const results = await searchEngine.findBestOffersByHotel(criteria);

      expect(results).toHaveLength(2); // Hotel 1 and Hotel 3 match criteria

      // Results should be sorted by price
      expect(results[0]!.minPrice).toBeLessThanOrEqual(results[1]!.minPrice);

      // Check Hotel 1 (should have the cheaper offer)
      const hotel1Result = results.find((r) => r.hotelId === 1);
      expect(hotel1Result).toBeDefined();
      expect(hotel1Result!.minPrice).toBe(900); // Cheaper offer should be selected
      expect(hotel1Result!.hotelName).toBe("Hotel Paradise");

      // Check Hotel 3
      const hotel3Result = results.find((r) => r.hotelId === 3);
      expect(hotel3Result).toBeDefined();
      expect(hotel3Result!.minPrice).toBe(2000);
      expect(hotel3Result!.hotelName).toBe("Luxury Suite");
    });

    it("should handle empty results when no offers match criteria", async () => {
      const criteria: SearchCriteria = {
        departureAirports: ["BCN"], // Non-existent airport
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      const results = await searchEngine.findBestOffersByHotel(criteria);
      expect(results).toHaveLength(0);
    });

    it("should filter by passenger count correctly", async () => {
      const criteria: SearchCriteria = {
        departureAirports: ["MUC"],
        earliestDepartureDate: new Date("2024-07-01"),
        latestReturnDate: new Date("2024-07-31"),
        duration: 7,
        countAdults: 1,
        countChildren: 1,
      };

      const results = await searchEngine.findBestOffersByHotel(criteria);
      expect(results).toHaveLength(1); // Only Hotel 2 matches
      expect(results[0]!.hotelId).toBe(2);
      expect(results[0]!.countAdults).toBe(1);
      expect(results[0]!.countChildren).toBe(1);
    });

    it("should filter by date range correctly", async () => {
      const criteria: SearchCriteria = {
        departureAirports: ["MUC"],
        earliestDepartureDate: new Date("2024-07-01"),
        latestReturnDate: new Date("2024-07-31"),
        duration: 7,
        countAdults: 1,
        countChildren: 1,
      };

      const results = await searchEngine.findBestOffersByHotel(criteria);
      expect(results).toHaveLength(1); // Only Hotel 2 matches July dates
      expect(results[0]!.hotelId).toBe(2);
    });

    it("should record performance metrics", async () => {
      // Clear cache to ensure search runs and metrics are recorded
      cacheService.clear();

      const criteria: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      await searchEngine.findBestOffersByHotel(criteria);

      const metrics = searchEngine.getSearchMetrics(1);
      expect(metrics).toHaveLength(1);

      const metric = metrics[0]!;
      expect(metric.searchType).toBe("bestOffers");
      expect(metric.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(metric.candidateOffers).toBeGreaterThan(0);
      expect(metric.resultCount).toBeGreaterThan(0);
      expect(metric.indexesUsed).toContain("byAirport");
    });
  });

  describe("findHotelOffers", () => {
    it("should find all offers for a specific hotel matching criteria", async () => {
      const criteria: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      const results = await searchEngine.findHotelOffers(1, criteria);

      expect(results).toHaveLength(2); // Both offers for Hotel 1 match

      // Check that all results are for Hotel 1
      expect(results.every((offer) => offer.hotelId === 1)).toBe(true);

      // Check that all results match criteria
      expect(results.every((offer: Offer) => offer.countAdults === 2)).toBe(true);
      expect(results.every((offer: Offer) => offer.countChildren === 0)).toBe(true);
      expect(results.every((offer: Offer) => offer.duration === 7)).toBe(true);
      expect(
        results.every((offer: Offer) => offer.outboundDepartureAirport === "FRA"),
      ).toBe(true);

      // Results should be sorted by price (cheapest first)
      expect(results[0]!.price).toBe(900);
      expect(results[1]!.price).toBe(1200);
    });

    it("should return empty array for non-existent hotel", async () => {
      const criteria: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      const results = await searchEngine.findHotelOffers(999, criteria);
      expect(results).toHaveLength(0);
    });

    it("should filter hotel offers by criteria", async () => {
      const criteria: SearchCriteria = {
        departureAirports: ["MUC"], // Different airport
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      const results = await searchEngine.findHotelOffers(1, criteria);
      expect(results).toHaveLength(0); // Hotel 1 offers don't match MUC airport
    });

    it("should record performance metrics for hotel searches", async () => {
      // Clear cache to ensure search runs and metrics are recorded
      cacheService.clear();

      const criteria: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      await searchEngine.findHotelOffers(1, criteria);

      const metrics = searchEngine.getSearchMetrics(1);
      expect(metrics).toHaveLength(1);

      const metric = metrics[0]!;
      expect(metric.searchType).toBe("hotelOffers");
      expect(metric.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(metric.indexesUsed).toContain("byHotel");
    });
  });

  describe("performance monitoring", () => {
    it("should track search metrics correctly", async () => {
      // Clear cache to ensure all searches run and metrics are recorded
      cacheService.clear();

      const criteria1: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      const criteria2: SearchCriteria = {
        departureAirports: ["MUC"],
        earliestDepartureDate: new Date("2024-07-01"),
        latestReturnDate: new Date("2024-07-31"),
        duration: 7,
        countAdults: 1,
        countChildren: 1,
      };

      // Perform multiple searches with different criteria to avoid cache hits
      await searchEngine.findBestOffersByHotel(criteria1);
      await searchEngine.findHotelOffers(1, criteria1);
      await searchEngine.findHotelOffers(2, criteria2);

      const metrics = searchEngine.getSearchMetrics();
      expect(metrics).toHaveLength(3);

      const stats = searchEngine.getPerformanceStats();
      expect(stats.totalSearches).toBe(3);
      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it("should limit stored metrics to prevent memory growth", async () => {
      const criteria: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      // Create search engine with many metrics (simulating long-running service)
      const manyMetricsEngine = new SearchEngine(searchIndexes);

      // Simulate many searches (more than the 1000 limit)
      for (let i = 0; i < 1005; i++) {
        await manyMetricsEngine.findBestOffersByHotel(criteria);
      }

      const metrics = manyMetricsEngine.getSearchMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });

    it("should clear metrics when requested", async () => {
      // Clear cache to ensure search runs and metrics are recorded
      cacheService.clear();

      const criteria: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      await searchEngine.findBestOffersByHotel(criteria);
      expect(searchEngine.getSearchMetrics()).toHaveLength(1);

      searchEngine.clearMetrics();
      expect(searchEngine.getSearchMetrics()).toHaveLength(0);
    });
  });

  describe("configuration", () => {
    it("should allow configuration updates", async () => {
      const initialConfig = searchEngine.getConfig();
      expect(initialConfig.enablePerformanceLogging).toBe(true);

      searchEngine.updateConfig({
        enablePerformanceLogging: false,
        maxResultsPerHotel: 500,
      });

      const updatedConfig = searchEngine.getConfig();
      expect(updatedConfig.enablePerformanceLogging).toBe(false);
      expect(updatedConfig.maxResultsPerHotel).toBe(500);
    });

    it("should respect maxResultsPerHotel configuration", async () => {
      // Create multiple offers for one hotel
      const manyOffers = Array.from({ length: 10 }, (_, i) => ({
        ...testOffers[0]!,
        price: 1000 + i * 100,
      }));

      const newIndexes = new SearchIndexesImpl();
      newIndexes.buildIndexes(testHotels, manyOffers);

      const limitedEngine = new SearchEngine(newIndexes, {
        maxResultsPerHotel: 5,
      });

      const criteria: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      const results = await limitedEngine.findHotelOffers(1, criteria);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("error handling", () => {
    it("should handle search errors gracefully", async () => {
      // Create a search engine with empty indexes (no hotels/offers loaded)
      const brokenIndexes = new SearchIndexesImpl();
      const brokenEngine = new SearchEngine(brokenIndexes);

      const criteria: SearchCriteria = {
        departureAirports: ["FRA"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      // Should not throw, but return empty results since no data is loaded
      const results = await brokenEngine.findBestOffersByHotel(criteria);
      expect(results).toHaveLength(0);
    });

    it("should log performance warnings for slow searches", async () => {
      // Clear cache to ensure search actually runs
      cacheService.clear();

      // Mock a slow search by creating an engine that logs warnings
      const warningEngine = new SearchEngine(
        searchIndexes,
        {},
        (message: string, level?: "info" | "warn" | "error") => {
          logMessages.push({ message, level: level || "info" });
        },
      );

      // Manually add a slow metric to trigger warning
      const slowMetric: SearchMetrics = {
        searchType: "bestOffers",
        executionTimeMs: 2000, // Slow search
        candidateOffers: 1000,
        filteredOffers: 100,
        resultCount: 10,
        indexesUsed: ["byAirport"],
        timestamp: new Date(),
      };

      // Access private method for testing
      (warningEngine as any).recordMetrics(slowMetric);

      expect(
        logMessages.some(
          (log) =>
            log.level === "warn" &&
            log.message.includes("Slow search detected"),
        ),
      ).toBe(true);
    });
  });

  describe("index intersection optimization", () => {
    it("should use multiple indexes for efficient filtering", async () => {
      // Clear cache to ensure fresh search
      cacheService.clear();

      const criteria: SearchCriteria = {
        departureAirports: ["FRA", "MUC"],
        earliestDepartureDate: new Date("2024-06-01"),
        latestReturnDate: new Date("2024-06-30"),
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      await searchEngine.findBestOffersByHotel(criteria);

      const metrics = searchEngine.getSearchMetrics(1);
      expect(metrics).toHaveLength(1);

      const metric = metrics[0]!;

      // Should use multiple indexes for optimization
      expect(metric.indexesUsed.length).toBeGreaterThan(1);
      expect(metric.indexesUsed).toContain("byAirport");
      expect(metric.indexesUsed).toContain("byDateRange");
      expect(metric.indexesUsed).toContain("byPassengerCount");
    });
  });
});
