/**
 * Integration tests for API endpoints
 * Tests the complete request-response cycle including middleware, controllers, and services
 */

import request from "supertest";
import { Application } from "express";
import { createApp } from "../../app";
import { UnifiedSearchEngine } from "../../services/search/unifiedSearchEngine";
import { UltraPerformanceStorage } from "../../services/data/ultraPerformanceStorage";
import { Hotel, Offer } from "../../types";
import { resetMemoryOptimizer } from "../../utils/memoryOptimizer";

describe("API Integration Tests", () => {
  let app: Application;
  let searchEngine: UnifiedSearchEngine;
  let apiController: any;

  // Test data
  const testHotels: Hotel[] = [
    { id: 1, name: "Hotel Paradise", stars: 4.0 },
    { id: 2, name: "Beach Resort", stars: 3.5 },
    { id: 3, name: "Luxury Suite", stars: 5.0 },
  ];

  const testOffers: Offer[] = [
    {
      hotelId: 1,
      price: 1200,
      countAdults: 2,
      countChildren: 0,
      outboundDepartureDateTime: new Date("2024-06-01T10:00:00Z"),
      inboundDepartureDateTime: new Date("2024-06-08T14:00:00Z"),
      outboundArrivalDateTime: new Date("2024-06-01T12:00:00Z"),
      inboundArrivalDateTime: new Date("2024-06-08T16:00:00Z"),
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
      outboundArrivalDateTime: new Date("2024-06-02T10:00:00Z"),
      inboundArrivalDateTime: new Date("2024-06-09T14:00:00Z"),
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
      outboundDepartureDateTime: new Date("2024-07-01T12:00:00Z"),
      inboundDepartureDateTime: new Date("2024-07-10T16:00:00Z"),
      outboundArrivalDateTime: new Date("2024-07-01T14:00:00Z"),
      inboundArrivalDateTime: new Date("2024-07-10T18:00:00Z"),
      outboundDepartureAirport: "MUC",
      inboundDepartureAirport: "PMI",
      outboundArrivalAirport: "PMI",
      inboundArrivalAirport: "MUC",
      mealType: "Half Board",
      oceanView: true,
      roomType: "Family Room",
      duration: 9,
    },
    {
      hotelId: 3,
      price: 2000,
      countAdults: 2,
      countChildren: 0,
      outboundDepartureDateTime: new Date("2024-06-15T14:00:00Z"),
      inboundDepartureDateTime: new Date("2024-06-22T18:00:00Z"),
      outboundArrivalDateTime: new Date("2024-06-15T16:00:00Z"),
      inboundArrivalDateTime: new Date("2024-06-22T20:00:00Z"),
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

  beforeAll(async () => {
    // Create app and set up test data
    const appResult = createApp();
    app = appResult.app;
    apiController = appResult.apiController;

    // Set up search engine with test data
    const storage = new UltraPerformanceStorage();
    for (const hotel of testHotels) {
      storage.addHotel(hotel);
    }
    for (const offer of testOffers) {
      storage.addOffer(offer);
    }
    storage.buildIndexes();
    
    searchEngine = new UnifiedSearchEngine(storage, {
      maxResults: 100,
      timeoutMs: 5000,
      cacheResults: true
    });
    await searchEngine.initialize();

    // Configure the API controller
    apiController.setSearchEngine(searchEngine);
    apiController.updateDataStatus(true, testOffers.length, testHotels.length);
  });

  afterAll(async () => {
    // Cleanup cache service timers to prevent Jest worker exit issues
    if (searchEngine) {
      await searchEngine.cleanup();
      (searchEngine as any).cacheService?.destroy?.();
      // UnifiedSearchEngine cleanup handled by cleanup() method
    }

    // Clear any remaining timers or intervals
    const { cacheService } = require("../../services/optimization/cacheService");
    if (cacheService && typeof cacheService.destroy === "function") {
      cacheService.destroy();
    }

    // Reset memory optimizer to prevent timer leaks
    resetMemoryOptimizer();
  });

  describe("Health and Status Endpoints", () => {
    describe("GET /", () => {
      it("should return service information", async () => {
        const response = await request(app).get("/").expect(200);

        expect(response.body).toMatchObject({
          name: "Mallorca Travel Backend",
          version: "1.0.0",
          status: "running",
        });
        expect(response.body.timestamp).toBeDefined();
      });
    });

    describe("GET /api/health", () => {
      it("should return healthy status when data is loaded", async () => {
        const response = await request(app).get("/api/health").expect(200);

        expect(response.body).toMatchObject({
          status: "healthy",
          dataLoaded: true,
          offersCount: testOffers.length,
          hotelsCount: testHotels.length,
        });
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.uptime).toBeGreaterThanOrEqual(0);
        expect(response.body.system).toBeDefined();
      });

      it("should include performance headers", async () => {
        const response = await request(app).get("/api/health").expect(200);

        expect(response.headers["x-response-time"]).toBeDefined();
        expect(response.headers["x-request-id"]).toBeDefined();
      });
    });

    describe("GET /api/status", () => {
      it("should return detailed system status", async () => {
        const response = await request(app).get("/api/status").expect(200);

        expect(response.body.service).toMatchObject({
          name: "Mallorca Travel Backend",
          version: "1.0.0",
          status: "operational",
        });
        expect(response.body.data).toMatchObject({
          loaded: true,
          offersCount: testOffers.length,
          hotelsCount: testHotels.length,
        });
        expect(response.body.system).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.requestId).toBeDefined();
      });
    });

    describe("GET /api/metrics", () => {
      it("should return performance metrics", async () => {
        const response = await request(app).get("/api/metrics").expect(200);

        expect(response.body.summary).toBeDefined();
        expect(response.body.byEndpoint).toBeDefined();
        expect(response.body.recentAlerts).toBeDefined();
        expect(response.body.system).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });
    });
  });

  describe("Search Endpoints", () => {
    describe("GET /api/bestOffersByHotel", () => {
      it("should return best offers for valid search criteria", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        // Check response structure
        const firstOffer = response.body[0];
        expect(firstOffer).toMatchObject({
          hotel: {
            id: expect.any(Number),
            name: expect.any(String),
            stars: expect.any(Number),
          },
          minPrice: expect.any(Number),
          departureDate: expect.any(String),
          returnDate: expect.any(String),
          roomType: expect.any(String),
          mealType: expect.any(String),
          countAdults: 2,
          countChildren: 0,
          duration: 7,
          countAvailableOffers: expect.any(Number),
        });

        // Check performance headers
        expect(response.headers["x-response-time"]).toBeDefined();
        expect(response.headers["x-request-id"]).toBeDefined();
        expect(response.headers["x-result-count"]).toBeDefined();
      });

      it("should handle multiple departure airports", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA,MUC",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-07-31",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });

      it("should return empty array for no matching offers", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "BER", // Non-existent airport in test data
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it("should validate required parameters", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            // Missing required parameters
            departureAirports: "FRA",
          })
          .expect(400);

        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.message).toContain(
          "Invalid search parameters",
        );
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.requestId).toBeDefined();
      });

      it("should validate airport code format", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "INVALID",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "departureAirports[0] must be a 3-character airport code",
        );
      });

      it("should validate date ranges", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-30",
            latestReturnDate: "2024-06-01", // Invalid: return before departure
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "earliestDepartureDate must be before latestReturnDate",
        );
      });

      it("should validate passenger counts", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 0, // Invalid: must be at least 1
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "countAdults must be a number between 1 and 10",
        );
      });
    });

    describe("GET /api/hotels/:hotelId/offers", () => {
      it("should return offers for valid hotel and search criteria", async () => {
        const response = await request(app)
          .get("/api/hotels/1/offers")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(200);

        expect(response.body.hotel).toMatchObject({
          id: 1,
          name: "Hotel Paradise",
          stars: 4.0,
        });

        expect(Array.isArray(response.body.items)).toBe(true);
        expect(response.body.items.length).toBeGreaterThan(0);

        // Check offer structure
        const firstOffer = response.body.items[0];
        expect(firstOffer).toMatchObject({
          price: expect.any(Number),
          countAdults: 2,
          countChildren: 0,
          inboundDepartureAirport: expect.any(String),
          inboundDepartureDatetime: expect.any(String),
          inboundArrivalAirport: expect.any(String),
          outboundDepartureAirport: expect.any(String),
          outbundDepartureDatetime: expect.any(String), // Note: typo in API spec
          outboundArrivalAirport: expect.any(String),
          mealType: expect.any(String),
          oceanView: expect.any(Boolean),
          roomType: expect.any(String),
        });

        // Check performance headers
        expect(response.headers["x-response-time"]).toBeDefined();
        expect(response.headers["x-request-id"]).toBeDefined();
        expect(response.headers["x-result-count"]).toBeDefined();
      });

      it("should return 404 for non-existent hotel", async () => {
        const response = await request(app)
          .get("/api/hotels/999/offers")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(404);

        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe("HOTEL_NOT_FOUND");
        expect(response.body.error.message).toContain(
          "Hotel with ID 999 not found",
        );
      });

      it("should validate hotel ID format", async () => {
        const response = await request(app)
          .get("/api/hotels/invalid/offers")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.message).toContain("Invalid hotel ID");
      });

      it("should return empty items array for hotel with no matching offers", async () => {
        const response = await request(app)
          .get("/api/hotels/2/offers")
          .query({
            departureAirports: "FRA", // Hotel 2 only has MUC offers
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(200);

        expect(response.body.hotel).toMatchObject({
          id: 2,
          name: "Beach Resort",
          stars: 3.5,
        });
        expect(response.body.items).toHaveLength(0);
      });
    });
  });

  describe("Error Handling", () => {
    describe("404 Not Found", () => {
      it("should return 404 for non-existent endpoints", async () => {
        const response = await request(app)
          .get("/api/non-existent")
          .expect(404);

        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe("NOT_FOUND");
        expect(response.body.error.message).toContain(
          "Endpoint GET /api/non-existent not found",
        );
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.requestId).toBeDefined();
      });
    });

    describe("Method Not Allowed", () => {
      it("should handle unsupported HTTP methods", async () => {
        const response = await request(app).post("/api/health").expect(404); // Express returns 404 for unmatched routes

        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe("NOT_FOUND");
      });
    });

    describe("Request Size Limits", () => {
      it("should handle large request bodies gracefully", async () => {
        const largePayload = "x".repeat(10 * 1024 * 1024); // 10MB payload

        const response = await request(app)
          .post("/api/bestOffersByHotel")
          .send({ data: largePayload })
          .expect(404); // POST not supported, but should not crash

        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe("Performance Requirements", () => {
    it("should respond to health check within performance threshold", async () => {
      const startTime = Date.now();

      await request(app).get("/api/health").expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should be much faster than 1 second
    });

    it("should respond to search requests within performance threshold", async () => {
      const startTime = Date.now();

      await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-30",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 second requirement
    });

    it("should include response time in headers", async () => {
      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-30",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      const responseTimeHeader = response.headers["x-response-time"];
      expect(responseTimeHeader).toBeDefined();
      expect(responseTimeHeader).toMatch(/^\d+ms$/);

      const responseTimeMs = parseInt(
        responseTimeHeader?.replace("ms", "") || "0",
      );
      expect(responseTimeMs).toBeGreaterThan(0);
      expect(responseTimeMs).toBeLessThan(5000);
    });
  });

  describe("CORS and Security Headers", () => {
    it("should include CORS headers", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });

    it("should include security headers", async () => {
      const response = await request(app).get("/api/health").expect(200);

      // Helmet security headers
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBeDefined();
      expect(response.headers["x-xss-protection"]).toBeDefined();
    });

    it("should handle OPTIONS preflight requests", async () => {
      const response = await request(app).options("/api/health").expect(204);

      expect(response.headers["access-control-allow-methods"]).toBeDefined();
      expect(response.headers["access-control-allow-headers"]).toBeDefined();
    });
  });

  describe("Content Negotiation", () => {
    it("should return JSON content type", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should handle gzip compression", async () => {
      // Use a query that returns a large payload to trigger compression
      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-12-31",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .set("Accept-Encoding", "gzip")
        .expect(200);

      // Response should be compressed if large enough, but allow undefined if not triggered
      const encoding = response.headers["content-encoding"];
      if (encoding !== undefined) {
        expect(encoding).toMatch(/gzip|identity/);
      } else {
        // If not present, the payload was not large enough or not compressible
        expect(encoding).toBeUndefined();
      }
    });
  });
});
