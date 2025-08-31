/**
 * OpenAPI Compatibility Tests
 * Validates that the API responses match the OpenAPI specification
 */

import request from "supertest";
import { Application } from "express";
import { createApp } from "../../app";
import { UnifiedSearchEngine } from "../../services/search/unifiedSearchEngine";
import { UltraPerformanceStorage } from "../../services/data/ultraPerformanceStorage";
import { Hotel, Offer } from "../../types";
import { resetMemoryOptimizer } from "../../utils/memoryOptimizer";

describe("OpenAPI Compatibility Tests", () => {
  let app: Application;
  let apiController: any;
  let searchEngine: UnifiedSearchEngine;

  // Test data that matches the expected API response format
  const testHotels: Hotel[] = [
    { id: 1, name: "Hotel 1", stars: 4 },
    { id: 2, name: "Hotel 2", stars: 5 },
  ];

  const testOffers: Offer[] = [
    {
      hotelId: 1,
      price: 1299.99,
      countAdults: 2,
      countChildren: 0,
      outboundDepartureDateTime: new Date("2024-06-01T08:15:00Z"),
      inboundDepartureDateTime: new Date("2024-06-08T14:30:00Z"),
      outboundArrivalDateTime: new Date("2024-06-01T11:30:00Z"),
      inboundArrivalDateTime: new Date("2024-06-08T17:45:00Z"),
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
      hotelId: 2,
      price: 1599.99,
      countAdults: 2,
      countChildren: 0,
      outboundDepartureDateTime: new Date("2024-06-02T10:45:00Z"),
      inboundDepartureDateTime: new Date("2024-06-09T16:00:00Z"),
      outboundArrivalDateTime: new Date("2024-06-02T14:00:00Z"),
      inboundArrivalDateTime: new Date("2024-06-09T19:15:00Z"),
      outboundDepartureAirport: "MUC",
      inboundDepartureAirport: "PMI",
      outboundArrivalAirport: "PMI",
      inboundArrivalAirport: "MUC",
      mealType: "Half Board",
      oceanView: false,
      roomType: "Suite",
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
    await storage.buildIndexes();
    console.log(`DEBUG: Storage has ${storage.getMemoryStats().offers} offers and ${storage.getMemoryStats().hotels} hotels`);
    
    searchEngine = new UnifiedSearchEngine(storage);
    await searchEngine.initialize();

    // Configure the API controller
    apiController.setSearchEngine(searchEngine);
    apiController.updateDataStatus(true, testOffers.length, testHotels.length);
    
    console.log(`DEBUG: Test setup complete - offers: ${testOffers.length}, hotels: ${testHotels.length}`);
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

  describe("GET /bestOffersByHotel", () => {
    it("should return response matching OpenAPI BestHotelOffer schema", async () => {
      const queryParams = {
        departureAirports: "FRA,MUC",
        earliestDepartureDate: "2024-06-01",
        latestReturnDate: "2024-06-15",
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };
      console.log(`DEBUG: Making request with query params:`, queryParams);
      
      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query(queryParams)
        .expect(200);
        
      console.log(`DEBUG: Response body length: ${response.body.length}`);

      // Should return an array
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Validate each BestHotelOffer object
      response.body.forEach((offer: any) => {
        // Required fields according to OpenAPI spec
        expect(offer).toHaveProperty("hotel");
        expect(offer).toHaveProperty("minPrice");
        expect(offer).toHaveProperty("departureDate");
        expect(offer).toHaveProperty("returnDate");
        expect(offer).toHaveProperty("countAdults");
        expect(offer).toHaveProperty("countChildren");
        expect(offer).toHaveProperty("duration");
        expect(offer).toHaveProperty("countAvailableOffers");

        // Hotel object validation
        expect(offer.hotel).toHaveProperty("id");
        expect(offer.hotel).toHaveProperty("name");
        expect(offer.hotel).toHaveProperty("stars");
        expect(typeof offer.hotel.id).toBe("number");
        expect(typeof offer.hotel.name).toBe("string");
        expect(typeof offer.hotel.stars).toBe("number");

        // Field type validation
        expect(typeof offer.minPrice).toBe("number");
        expect(typeof offer.departureDate).toBe("string");
        expect(typeof offer.returnDate).toBe("string");
        expect(typeof offer.countAdults).toBe("number");
        expect(typeof offer.countChildren).toBe("number");
        expect(typeof offer.duration).toBe("number");
        expect(typeof offer.countAvailableOffers).toBe("number");

        // Date format validation (should be YYYY-MM-DD)
        expect(offer.departureDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(offer.returnDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Optional fields (if present, should be correct type)
        if (offer.roomType !== undefined) {
          expect(typeof offer.roomType).toBe("string");
        }
        if (offer.mealType !== undefined) {
          expect(typeof offer.mealType).toBe("string");
        }

        // Value validation
        expect(offer.minPrice).toBeGreaterThan(0);
        expect(offer.countAdults).toBeGreaterThanOrEqual(1);
        expect(offer.countChildren).toBeGreaterThanOrEqual(0);
        expect(offer.duration).toBeGreaterThan(0);
        expect(offer.countAvailableOffers).toBeGreaterThan(0);
      });
    });

    it("should handle all required query parameters", async () => {
      const requiredParams = {
        departureAirports: "FRA",
        earliestDepartureDate: "2024-06-01",
        latestReturnDate: "2024-06-15",
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      // Test with all parameters
      await request(app)
        .get("/api/bestOffersByHotel")
        .query(requiredParams)
        .expect(200);

      // Test missing each parameter
      for (const [key, value] of Object.entries(requiredParams)) {
        const incompleteParams = { ...requiredParams };
        delete (incompleteParams as any)[key];

        await request(app)
          .get("/api/bestOffersByHotel")
          .query(incompleteParams)
          .expect(400);
      }
    });

    it("should validate parameter types according to OpenAPI spec", async () => {
      // Test invalid date format
      await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "invalid-date",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(400);

      // Test invalid integer values
      await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: "invalid",
          countAdults: 2,
          countChildren: 0,
        })
        .expect(400);

      // Test invalid array format
      await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "", // Empty array should be invalid
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(400);
    });
  });

  describe("GET /hotels/{hotelId}/offers", () => {
    it("should return response matching OpenAPI GetHotelOffersResponse schema", async () => {
      const response = await request(app)
        .get("/api/hotels/1/offers")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      // Response should have hotel and items properties
      expect(response.body).toHaveProperty("hotel");
      expect(response.body).toHaveProperty("items");

      // Hotel object validation
      expect(response.body.hotel).toHaveProperty("id");
      expect(response.body.hotel).toHaveProperty("name");
      expect(response.body.hotel).toHaveProperty("stars");
      expect(typeof response.body.hotel.id).toBe("number");
      expect(typeof response.body.hotel.name).toBe("string");
      expect(typeof response.body.hotel.stars).toBe("number");

      // Items should be an array
      expect(Array.isArray(response.body.items)).toBe(true);

      // Validate each offer object
      response.body.items.forEach((offer: any) => {
        // Required fields according to OpenAPI spec
        const requiredFields = [
          "price",
          "countAdults",
          "countChildren",
          "inboundDepartureAirport",
          "inboundDepartureDatetime",
          "inboundArrivalAirport",
          "inboundArrivalDatetime",
          "outboundDepartureAirport",
          "outbundDepartureDatetime", // Note: typo in OpenAPI spec
          "outboundArrivalAirport",
          "outboundArrivalDatetime",
          "mealType",
          "oceanView",
          "roomType",
        ];

        requiredFields.forEach((field) => {
          expect(offer).toHaveProperty(field);
        });

        // Type validation
        expect(typeof offer.price).toBe("number");
        expect(typeof offer.countAdults).toBe("number");
        expect(typeof offer.countChildren).toBe("number");
        expect(typeof offer.inboundDepartureAirport).toBe("string");
        expect(typeof offer.inboundDepartureDatetime).toBe("string");
        expect(typeof offer.inboundArrivalAirport).toBe("string");
        expect(typeof offer.inboundArrivalDatetime).toBe("string");
        expect(typeof offer.outboundDepartureAirport).toBe("string");
        expect(typeof offer.outbundDepartureDatetime).toBe("string");
        expect(typeof offer.outboundArrivalAirport).toBe("string");
        expect(typeof offer.outboundArrivalDatetime).toBe("string");
        expect(typeof offer.mealType).toBe("string");
        expect(typeof offer.oceanView).toBe("boolean");
        expect(typeof offer.roomType).toBe("string");

        // DateTime format validation (should be ISO 8601)
        expect(offer.inboundDepartureDatetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
        expect(offer.inboundArrivalDatetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
        expect(offer.outbundDepartureDatetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
        expect(offer.outboundArrivalDatetime).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );

        // Value validation
        expect(offer.price).toBeGreaterThan(0);
        expect(offer.countAdults).toBeGreaterThanOrEqual(1);
        expect(offer.countChildren).toBeGreaterThanOrEqual(0);
        expect(offer.inboundDepartureAirport.length).toBe(3);
        expect(offer.inboundArrivalAirport.length).toBe(3);
        expect(offer.outboundDepartureAirport.length).toBe(3);
        expect(offer.outboundArrivalAirport.length).toBe(3);
      });
    });

    it("should validate hotelId parameter", async () => {
      // Valid hotel ID
      await request(app)
        .get("/api/hotels/1/offers")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      // Invalid hotel ID format
      await request(app)
        .get("/api/hotels/invalid/offers")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(400);

      // Non-existent hotel ID (should return 404)
      await request(app)
        .get("/api/hotels/999/offers")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(404);
    });

    it("should handle same query parameters as bestOffersByHotel", async () => {
      const queryParams = {
        departureAirports: "FRA,MUC",
        earliestDepartureDate: "2024-06-01",
        latestReturnDate: "2024-06-15",
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      // Should accept the same parameters
      await request(app)
        .get("/api/hotels/1/offers")
        .query(queryParams)
        .expect(200);

      // Should validate parameters the same way
      await request(app)
        .get("/api/hotels/1/offers")
        .query({
          ...queryParams,
          earliestDepartureDate: "invalid-date",
        })
        .expect(400);
    });
  });

  describe("Response Headers", () => {
    it("should include correct Content-Type header", async () => {
      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should include performance headers", async () => {
      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      expect(response.headers["x-response-time"]).toBeDefined();
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.headers["x-result-count"]).toBeDefined();
    });

    it("should include CORS headers", async () => {
      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });
  });

  describe("Error Response Format", () => {
    it("should return consistent error format for validation errors", async () => {
      const response = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "INVALID",
        })
        .expect(400);

      // Error response should match expected format
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("requestId");

      expect(response.body.error).toHaveProperty("code");
      expect(response.body.error).toHaveProperty("message");
      expect(response.body.error.code).toBe("VALIDATION_ERROR");

      // Timestamp should be valid ISO string
      expect(new Date(response.body.timestamp).toISOString()).toBe(
        response.body.timestamp,
      );
    });

    it("should return consistent error format for not found errors", async () => {
      const response = await request(app)
        .get("/api/hotels/999/offers")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(404);

      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("requestId");

      expect(response.body.error.code).toBe("HOTEL_NOT_FOUND");
      expect(response.body.error.message).toContain(
        "Hotel with ID 999 not found",
      );
    });
  });

  describe("Data Consistency", () => {
    it("should return consistent hotel information between endpoints", async () => {
      // Get best offers
      const bestOffersResponse = await request(app)
        .get("/api/bestOffersByHotel")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      const hotelFromBestOffers = bestOffersResponse.body.find(
        (offer: any) => offer.hotel.id === 1,
      );
      expect(hotelFromBestOffers).toBeDefined();

      // Get hotel offers
      const hotelOffersResponse = await request(app)
        .get("/api/hotels/1/offers")
        .query({
          departureAirports: "FRA",
          earliestDepartureDate: "2024-06-01",
          latestReturnDate: "2024-06-15",
          duration: 7,
          countAdults: 2,
          countChildren: 0,
        })
        .expect(200);

      // Hotel information should be identical
      expect(hotelOffersResponse.body.hotel).toEqual(hotelFromBestOffers.hotel);
    });

    it("should return offers that match search criteria", async () => {
      const searchCriteria = {
        departureAirports: "FRA",
        earliestDepartureDate: "2024-06-01",
        latestReturnDate: "2024-06-15",
        duration: 7,
        countAdults: 2,
        countChildren: 0,
      };

      const response = await request(app)
        .get("/api/hotels/1/offers")
        .query(searchCriteria)
        .expect(200);

      // All offers should match the search criteria
      response.body.items.forEach((offer: any) => {
        expect(offer.countAdults).toBe(searchCriteria.countAdults);
        expect(offer.countChildren).toBe(searchCriteria.countChildren);

        // Departure airport should be in the list
        expect(searchCriteria.departureAirports.split(",")).toContain(
          offer.outboundDepartureAirport,
        );

        // Duration should match (calculated from dates)
        const departureDate = new Date(offer.outbundDepartureDatetime);
        const returnDate = new Date(offer.inboundDepartureDatetime);
        const calculatedDuration = Math.round(
          (returnDate.getTime() - departureDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        expect(calculatedDuration).toBe(searchCriteria.duration);
      });
    });
  });
});
