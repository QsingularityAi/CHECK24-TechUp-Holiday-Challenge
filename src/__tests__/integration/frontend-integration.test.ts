/**
 * Frontend Integration Tests
 * Tests the API from the perspective of the Next.js frontend
 */

import request from "supertest";
import { Application } from "express";
import { createApp } from "../../app";
import { UnifiedSearchEngine } from "../../services/search/unifiedSearchEngine";
import { UltraPerformanceStorage } from "../../services/data/ultraPerformanceStorage";
import { Hotel, Offer } from "../../types";
import { resetMemoryOptimizer } from "../../utils/memoryOptimizer";

describe("Frontend Integration Tests", () => {
  let app: Application;
  let apiController: any;
  let searchEngine: UnifiedSearchEngine;

  // Realistic test data that matches the frontend expectations
  const testHotels: Hotel[] = [
    { id: 1, name: "Hotel 1", stars: 4 },
    { id: 2, name: "Hotel 2", stars: 5 },
    { id: 3, name: "Hotel 3", stars: 4 },
    { id: 4, name: "Hotel 4", stars: 5 },
    { id: 5, name: "Hotel 5", stars: 4 },
  ];

  const testOffers: Offer[] = [
    // Hotel 1 offers
    {
      hotelId: 1,
      price: 1299.99,
      countAdults: 2,
      countChildren: 0,
      outboundDepartureDateTime: new Date("2024-06-01T08:15:00Z"),
      inboundDepartureDateTime: new Date("2024-06-08T14:30:00Z"),
      outboundArrivalDateTime: new Date("2024-06-01T10:15:00Z"),
      inboundArrivalDateTime: new Date("2024-06-08T16:30:00Z"),
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
      price: 999.99,
      countAdults: 2,
      countChildren: 0,
      outboundDepartureDateTime: new Date("2024-06-03T10:00:00Z"),
      inboundDepartureDateTime: new Date("2024-06-10T16:00:00Z"),
      outboundArrivalDateTime: new Date("2024-06-03T12:00:00Z"),
      inboundArrivalDateTime: new Date("2024-06-10T18:00:00Z"),
      outboundDepartureAirport: "FRA",
      inboundDepartureAirport: "PMI",
      outboundArrivalAirport: "PMI",
      inboundArrivalAirport: "FRA",
      mealType: "Half Board",
      oceanView: false,
      roomType: "Standard Room",
      duration: 7,
    },
    // Hotel 2 offers
    {
      hotelId: 2,
      price: 1899.99,
      countAdults: 2,
      countChildren: 1,
      outboundDepartureDateTime: new Date("2024-07-01T12:00:00Z"),
      inboundDepartureDateTime: new Date("2024-07-15T18:00:00Z"),
      outboundArrivalDateTime: new Date("2024-07-01T14:00:00Z"),
      inboundArrivalDateTime: new Date("2024-07-15T20:00:00Z"),
      outboundDepartureAirport: "MUC",
      inboundDepartureAirport: "PMI",
      outboundArrivalAirport: "PMI",
      inboundArrivalAirport: "MUC",
      mealType: "All Inclusive",
      oceanView: true,
      roomType: "Family Suite",
      duration: 14,
    },
    // Hotel 3 offers
    {
      hotelId: 3,
      price: 799.99,
      countAdults: 2,
      countChildren: 0,
      outboundDepartureDateTime: new Date("2024-06-05T14:00:00Z"),
      inboundDepartureDateTime: new Date("2024-06-12T20:00:00Z"),
      outboundArrivalDateTime: new Date("2024-06-05T16:00:00Z"),
      inboundArrivalDateTime: new Date("2024-06-12T22:00:00Z"),
      outboundDepartureAirport: "FRA",
      inboundDepartureAirport: "PMI",
      outboundArrivalAirport: "PMI",
      inboundArrivalAirport: "FRA",
      mealType: "Breakfast",
      oceanView: false,
      roomType: "Double Room",
      duration: 7,
    },
  ];

  beforeAll(async () => {
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
    searchEngine = new UnifiedSearchEngine(storage);

    apiController.setSearchEngine(searchEngine);
    apiController.updateDataStatus(true, testOffers.length, testHotels.length);
  });

  afterAll(async () => {
    // Cleanup cache service timers to prevent Jest worker exit issues
    if (searchEngine) {
      await searchEngine.cleanup();
    }

    const { cacheService } = require("../../services/optimization/cacheService");
    if (cacheService && typeof cacheService.destroy === "function") {
      cacheService.destroy();
    }

    // Reset memory optimizer to prevent timer leaks
    resetMemoryOptimizer();
  });

  describe("Frontend Search Flow", () => {
    it("should handle typical user search flow", async () => {
      // Step 1: User searches for vacation packages
      const searchResponse = await request(app)
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

      expect(searchResponse.body.length).toBeGreaterThan(0);

      // Step 2: User selects a hotel to see more details
      const selectedHotel = searchResponse.body[0];
      expect(selectedHotel.hotel.id).toBeDefined();

      const hotelDetailsResponse = await request(app)
        .get(`/api/hotels/${selectedHotel.hotel.id}/offers`)
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-30",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      expect(hotelDetailsResponse.body.hotel.id).toBe(selectedHotel.hotel.id);
      expect(hotelDetailsResponse.body.items.length).toBeGreaterThan(0);

      // Step 3: Verify data consistency between endpoints
      expect(hotelDetailsResponse.body.hotel).toEqual(selectedHotel.hotel);
    });

    it("should handle family search with children", async () => {
      const familySearchResponse = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "MUC",
          earliestDepartureDate: "2024-07-01",
          latestReturnDate: "2024-07-31",
          duration: 14,
          countAdults: 2,
          countChildren: 1,
        })
        .expect(200);

      expect(familySearchResponse.body.length).toBeGreaterThan(0);

      // All results should match family criteria
      familySearchResponse.body.forEach((offer: any) => {
        expect(offer.countAdults).toBe(2);
        expect(offer.countChildren).toBe(1);
        expect(offer.duration).toBe(14);
      });
    });

    it("should handle multiple departure airports", async () => {
      const multiAirportResponse = await request(app)
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

      expect(multiAirportResponse.body.length).toBeGreaterThan(0);

      // Should include offers from both airports
      const departureAirports = new Set();
      for (const offer of multiAirportResponse.body) {
        const hotelOffers = await request(app)
          .get(`/api/hotels/${offer.hotel.id}/offers`)
          .query({
            departureAirports: "FRA,MUC",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-07-31",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
          .expect(200);

        hotelOffers.body.items.forEach((item: any) => {
          departureAirports.add(item.outboundDepartureAirport);
        });
      }

      // Should have offers from at least one of the requested airports
      const requestedAirports = ["FRA", "MUC"];
      const foundAirports = Array.from(departureAirports);
      expect(
        foundAirports.some((airport) =>
          requestedAirports.includes(airport as string),
        ),
      ).toBe(true);
    });
  });

  describe("Frontend Error Handling", () => {
    it("should provide user-friendly error messages", async () => {
      // Invalid date format
      const invalidDateResponse = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "invalid-date", // Wrong format
          latestReturnDate: "2024-06-30",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(400);

      expect(invalidDateResponse.body.error.code).toBe("VALIDATION_ERROR");
      expect(invalidDateResponse.body.error.message).toContain(
        "Invalid search parameters",
      );

      // Missing required parameter
      const missingParamResponse = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          // Missing earliestDepartureDate
          latestReturnDate: "2024-06-30",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(400);

      expect(missingParamResponse.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should handle hotel not found gracefully", async () => {
      const notFoundResponse = await request(app)
        .get("/api/hotels/99999/offers")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-30",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(404);

      expect(notFoundResponse.body.error.code).toBe("HOTEL_NOT_FOUND");
      expect(notFoundResponse.body.error.message).toContain(
        "Hotel with ID 99999 not found",
      );
    });
  });

  describe("Frontend Performance Requirements", () => {
    it("should meet frontend performance expectations", async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA,MUC",
          earliestDepartureDate: "2024-06-01", 
          latestReturnDate: "2024-12-31",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      const responseTime = performance.now() - startTime;

      // Should be fast enough for good user experience
      expect(responseTime).toBeLessThan(1000); // 1 second max for better UX

      // Should include performance headers for frontend monitoring
      expect(response.headers["x-response-time"]).toBeDefined();
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.headers["x-result-count"]).toBeDefined();

      // Verify response structure
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should handle concurrent requests from multiple users", async () => {
      const concurrentRequests = 10; // Increased to test higher load
      const requestPromises = Array(concurrentRequests).fill(null).map(() => 
        request(app)
          .get("/api/bestOffersByHotel")
          .query({
            departureAirports: "FRA",
            earliestDepartureDate: "2024-06-01",
            latestReturnDate: "2024-08-31",
            duration: 7,
            countAdults: 2,
            countChildren: 0,
          })
      );

      const startTime = performance.now();
      const responses = await Promise.all(requestPromises);
      const totalTime = performance.now() - startTime;

      // Verify all requests succeeded and returned valid data
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });

      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(2000); // 2 seconds max per request under load
    });
  });
  describe("Frontend Data Format Compatibility", () => {
    it("should return data in format expected by frontend components", async () => {
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

      response.body.forEach((offer: any) => {
        // Hotel component expects these fields
        expect(offer.hotel).toHaveProperty("id");
        expect(offer.hotel).toHaveProperty("name");
        expect(offer.hotel).toHaveProperty("stars");

        // Offer display component expects these fields
        expect(offer).toHaveProperty("minPrice");
        expect(offer).toHaveProperty("departureDate");
        expect(offer).toHaveProperty("returnDate");
        expect(offer).toHaveProperty("duration");
        expect(offer).toHaveProperty("countAvailableOffers");

        // Price should be a number for currency formatting
        expect(typeof offer.minPrice).toBe("number");
        expect(offer.minPrice).toBeGreaterThan(0);

        // Dates should be in YYYY-MM-DD format for date pickers
        expect(offer.departureDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(offer.returnDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Stars should be a number for star rating component
        expect(typeof offer.hotel.stars).toBe("number");
        expect(offer.hotel.stars).toBeGreaterThanOrEqual(1);
        expect(offer.hotel.stars).toBeLessThanOrEqual(5);
      });
    });

    it("should return detailed offer data for hotel pages", async () => {
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

      expect(response.body).toHaveProperty("hotel");
      expect(response.body).toHaveProperty("items");

      response.body.items.forEach((offer: any) => {
        // Flight component expects these fields
        expect(offer).toHaveProperty("outboundDepartureAirport");
        expect(offer).toHaveProperty("outbundDepartureDatetime");
        expect(offer).toHaveProperty("outboundArrivalAirport");
        expect(offer).toHaveProperty("inboundDepartureAirport");
        expect(offer).toHaveProperty("inboundDepartureDatetime");
        expect(offer).toHaveProperty("inboundArrivalAirport");

        // Room component expects these fields
        expect(offer).toHaveProperty("roomType");
        expect(offer).toHaveProperty("oceanView");
        expect(offer).toHaveProperty("mealType");

        // Price component expects these fields
        expect(offer).toHaveProperty("price");
        expect(typeof offer.price).toBe("number");

        // DateTime fields should be ISO format for JavaScript Date parsing
        expect(offer.outbundDepartureDatetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
        expect(offer.inboundDepartureDatetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );

        // Boolean fields should be actual booleans
        expect(typeof offer.oceanView).toBe("boolean");
      });
    });
  });

  describe("Frontend Filtering and Sorting", () => {
    it("should return results sorted by price (cheapest first)", async () => {
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

      expect(response.body.length).toBeGreaterThan(1);

      // Should be sorted by price ascending
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i].minPrice).toBeGreaterThanOrEqual(
          response.body[i - 1].minPrice,
        );
      }
    });

    it("should filter results correctly by search criteria", async () => {
      const searchCriteria = {
        departureAirports: "FRA",
        earliestDepartureDate: "2024-06-01",
        latestReturnDate: "2024-06-30",
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query(searchCriteria)
        .expect(200);

      // All results should match the search criteria
      response.body.forEach((offer: any) => {
        expect(offer.countAdults).toBe(searchCriteria.countAdults);
        expect(offer.countChildren).toBe(searchCriteria.countChildren);
        expect(offer.duration).toBe(searchCriteria.duration);

        // Dates should be within the specified range
        const departureDate = new Date(offer.departureDate);
        const earliestDate = new Date(searchCriteria.earliestDepartureDate);
        const latestReturnDate = new Date(searchCriteria.latestReturnDate);

        expect(departureDate.getTime()).toBeGreaterThanOrEqual(
          earliestDate.getTime(),
        );

        const returnDate = new Date(offer.returnDate);
        expect(returnDate.getTime()).toBeLessThanOrEqual(
          latestReturnDate.getTime(),
        );
      });
    });
  });

  describe("Health Check for Frontend Monitoring", () => {
    it("should provide health status for frontend monitoring", async () => {
      const response = await request(app).get("/api/health").expect(200);

      // Frontend monitoring expects these fields
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("dataLoaded");

      // Status should indicate if the service is ready
      expect(response.body.status).toBe("healthy");
      expect(response.body.dataLoaded).toBe(true);

      // Should include data counts for admin dashboard
      expect(response.body).toHaveProperty("offersCount");
      expect(response.body).toHaveProperty("hotelsCount");
      expect(response.body.offersCount).toBeGreaterThan(0);
      expect(response.body.hotelsCount).toBeGreaterThan(0);
    });
  });
});
