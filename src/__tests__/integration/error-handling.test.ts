/**
 * Error handling integration tests
 * Tests various error scenarios and graceful degradation
 */

import request from "supertest";
import { Application } from "express";
import { createApp } from "../../app";
import { UnifiedSearchEngine } from "../../services/search/unifiedSearchEngine";
import { UltraPerformanceStorage } from "../../services/data/ultraPerformanceStorage";
import { Hotel, Offer } from "../../types";
import { resetMemoryOptimizer } from "../../utils/memoryOptimizer";

describe("Error Handling Integration Tests", () => {
  let app: Application;
  let apiController: any;

  beforeAll(async () => {
    const appResult = createApp();
    app = appResult.app;
    apiController = appResult.apiController;
  });

  afterAll(async () => {
    try {
      // Cleanup cache service timers to prevent Jest worker exit issues
      const { cacheService } = require("../../services/optimization/cacheService");
      if (cacheService && typeof cacheService.destroy === "function") {
        cacheService.destroy();
      }

      // Reset memory optimizer to prevent timer leaks
      resetMemoryOptimizer();
      
      // Force garbage collection to clean up any remaining resources
      if (global.gc) {
        global.gc();
      }
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  });

  describe("Service Unavailable Scenarios", () => {
    it("should return 503 when data is not loaded", async () => {
      // Ensure data is not loaded
      apiController.updateDataStatus(false, 0, 0);

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
        .expect(503);

      expect(response.body.error).toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        message: "Data is still loading, please try again later",
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.requestId).toBeDefined();
    });

    it("should return loading status in health check when data not loaded", async () => {
      // Ensure data is not loaded
      apiController.updateDataStatus(false, 0, 0);

      const response = await request(app).get("/api/health").expect(503);

      expect(response.body).toMatchObject({
        status: "loading",
        dataLoaded: false,
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should handle search engine not initialized", async () => {
      // Set data as loaded but don't set search engine
      apiController.updateDataStatus(true, 100, 10);
      apiController.setSearchEngine(undefined);

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
        .expect(503);

      expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
    });
  });

  describe("Validation Error Scenarios", () => {
    beforeAll(() => {
      // Set up minimal working state for validation tests
      const storage = new UltraPerformanceStorage();
      const searchEngine = new UnifiedSearchEngine(storage);
      apiController.setSearchEngine(searchEngine);
      apiController.updateDataStatus(true, 1, 1);
    });

    describe("Missing Parameters", () => {
      it("should handle missing departure airports", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error).toMatchObject({
          code: "VALIDATION_ERROR",
          message: "Invalid search parameters",
        });
        expect(response.body.error.details.errors).toContain(
          "departureAirports must be a non-empty array",
        );
      });

      it("should handle missing dates", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "earliestDepartureDate must be a valid Date",
        );
        expect(response.body.error.details.errors).toContain(
          "latestReturnDate must be a valid Date",
        );
      });

      it("should handle missing passenger counts", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "countAdults must be a number between 1 and 10",
        );
        expect(response.body.error.details.errors).toContain(
          "countChildren must be a number between 0 and 10",
        );
      });

      it("should handle missing duration", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            countAdults: 2,
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "duration must be a number between 1 and 365 days",
        );
      });
    });

    describe("Invalid Parameter Values", () => {
      it("should handle invalid airport codes", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "INVALID,XX",
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
        expect(response.body.error.details.errors).toContain(
          "departureAirports[1] must be a 3-character airport code",
        );
      });

      it("should handle invalid date formats", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "invalid-date",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "earliestDepartureDate must be a valid Date",
        );
      });

      it("should handle invalid date ranges", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-30",
            latestReturnDate: "2024-06-01", // Return before departure
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

      it("should handle invalid passenger counts", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 0, // Invalid: must be at least 1
            countChildren: -1, // Invalid: cannot be negative
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "countAdults must be a number between 1 and 10",
        );
        expect(response.body.error.details.errors).toContain(
          "countChildren must be a number between 0 and 10",
        );
      });

      it("should handle excessive passenger counts", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 7,
            countAdults: 15, // Too many
            countChildren: 15, // Too many
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "countAdults must be a number between 1 and 10",
        );
        expect(response.body.error.details.errors).toContain(
          "countChildren must be a number between 0 and 10",
        );
      });

      it("should handle invalid duration values", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 0, // Invalid: must be at least 1
            countAdults: 2,
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "duration must be a number between 1 and 365 days",
        );
      });

      it("should handle excessive duration values", async () => {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-06-30",
            duration: 400, // Too long
            countAdults: 2,
            countChildren: 0,
          })
          .expect(400);

        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details.errors).toContain(
          "duration must be a number between 1 and 365 days",
        );
      });
    });

    describe("Hotel ID Validation", () => {
      it("should handle invalid hotel ID format", async () => {
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

        expect(response.body.error).toMatchObject({
          code: "VALIDATION_ERROR",
          message: "Invalid hotel ID",
        });
        expect(response.body.error.details.errors).toContain(
          "hotelId must be a positive integer",
        );
      });

      it("should handle negative hotel ID", async () => {
        const response = await request(app)
          .get("/api/hotels/-1/offers")
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
        expect(response.body.error.details.errors).toContain(
          "hotelId must be a positive integer",
        );
      });

      it("should handle zero hotel ID", async () => {
        const response = await request(app)
          .get("/api/hotels/0/offers")
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
        expect(response.body.error.details.errors).toContain(
          "hotelId must be a positive integer",
        );
      });

      it("should handle decimal hotel ID", async () => {
        const response = await request(app)
          .get("/api/hotels/1.5/offers")
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
        expect(response.body.error.details.errors).toContain(
          "hotelId must be a positive integer",
        );
      });
    });
  });

  describe("Not Found Scenarios", () => {
    beforeAll(() => {
      // Set up working state with test data
      const testHotels: Hotel[] = [{ id: 1, name: "Test Hotel", stars: 4.0 }];
      const testOffers: Offer[] = [];

      const storage = new UltraPerformanceStorage();
      for (const hotel of testHotels) {
        storage.addHotel(hotel);
      }
      for (const offer of testOffers) {
        storage.addOffer(offer);
      }
      storage.buildIndexes();
      const searchEngine = new UnifiedSearchEngine(storage);

      apiController.setSearchEngine(searchEngine);
      apiController.updateDataStatus(
        true,
        testOffers.length,
        testHotels.length,
      );
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

      expect(response.body.error).toMatchObject({
        code: "HOTEL_NOT_FOUND",
        message: "Hotel with ID 999 not found",
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.requestId).toBeDefined();
    });

    it("should return 404 for non-existent API endpoints", async () => {
      const response = await request(app)
        .get("/api/non-existent-endpoint")
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: "NOT_FOUND",
        message: "Endpoint GET /api/non-existent-endpoint not found",
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.requestId).toBeDefined();
    });

    it("should return 404 for unsupported HTTP methods", async () => {
      const response = await request(app).post("/api/health").expect(404);

      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Error Response Format", () => {
    beforeAll(() => {
      // Set up minimal state for error format tests
      const storage = new UltraPerformanceStorage();
      const searchEngine = new UnifiedSearchEngine(storage);
      apiController.setSearchEngine(searchEngine);
      apiController.updateDataStatus(true, 0, 0);
    });

    it("should return consistent error response format", async () => {
      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "INVALID",
        })
        .expect(400);

      // Check error response structure
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("requestId");

      expect(response.body.error).toHaveProperty("code");
      expect(response.body.error).toHaveProperty("message");
      expect(response.body.error).toHaveProperty("details");

      // Check timestamp format
      expect(new Date(response.body.timestamp).toISOString()).toBe(
        response.body.timestamp,
      );

      // Check request ID format
      expect(typeof response.body.requestId).toBe("string");
      expect(response.body.requestId.length).toBeGreaterThan(0);
    });

    it("should include validation details in error responses", async () => {
      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "INVALID,XX",
          earliestDepartureDate: "invalid-date",
          countAdults: 0,
        })
        .expect(400);

      expect(response.body.error.details).toHaveProperty("errors");
      expect(Array.isArray(response.body.error.details.errors)).toBe(true);
      expect(response.body.error.details.errors.length).toBeGreaterThan(0);

      expect(response.body.error.details).toHaveProperty("receivedParameters");
      expect(
        Array.isArray(response.body.error.details.receivedParameters),
      ).toBe(true);
    });

    it("should not expose sensitive information in production mode", async () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const response = await request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "INVALID",
          })
          .expect(400);

        // In production, should not expose internal details
        expect(response.body.error.details).not.toHaveProperty("stack");
        expect(response.body.error.details).not.toHaveProperty("originalError");
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe("Request ID Tracking", () => {
    it("should include unique request IDs in all responses", async () => {
      const responses = await Promise.all([
        request(app).get("/api/health"),
        request(app).get("/api/health"),
        request(app).get("/api/health"),
      ]);

      const requestIds = responses.map(
        (r) => r.body.requestId || r.headers["x-request-id"],
      );

      // All should have request IDs
      requestIds.forEach((id) => {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      });

      // All should be unique
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(requestIds.length);
    });

    it("should include request ID in error responses", async () => {
      const response = await request(app).get("/api/non-existent").expect(404);

      expect(response.body.requestId).toBeDefined();
      expect(typeof response.body.requestId).toBe("string");
      expect(response.body.requestId.length).toBeGreaterThan(0);
    });
  });

  describe("Performance Under Error Conditions", () => {
    it("should handle validation errors quickly", async () => {
      const startTime = Date.now();

      await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "INVALID",
        })
        .expect(400);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100); // Should be very fast
    });

    it("should handle 404 errors quickly", async () => {
      const startTime = Date.now();

      await request(app).get("/api/non-existent-endpoint").expect(404);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100); // Should be very fast
    });

    it("should not degrade performance after many error requests", async () => {
      // Generate error requests in smaller batches to avoid socket hang up
      const batchSize = 10;
      const totalRequests = 30;
      const responses: any[] = [];

      const startTime = Date.now();

      // Process requests in batches with small delays
      for (let i = 0; i < totalRequests; i += batchSize) {
        const batch = Array.from(
          { length: Math.min(batchSize, totalRequests - i) },
          () =>
            request(app)
              .get("/api/bestOffersByHotel")
              .query({ departureAirports: "INVALID" })
              .timeout(5000), // Add timeout to prevent hanging
        );

        const batchResponses = await Promise.all(batch);
        responses.push(...batchResponses);

        // Small delay between batches to prevent overwhelming the server
        if (i + batchSize < totalRequests) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      const totalTime = Date.now() - startTime;

      // All should be errors
      responses.forEach((response) => {
        expect(response.status).toBe(400);
      });

      // Average response time should still be reasonable (increased threshold due to batching)
      const avgTime = totalTime / responses.length;
      expect(avgTime).toBeLessThan(100);
    });
  });
});
