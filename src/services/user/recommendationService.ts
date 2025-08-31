import { SmartRecommendation, BestHotelOffer, SearchCriteria } from "../../types";
import { UnifiedSearchEngine } from "../search/unifiedSearchEngine";
import { shortlistService } from "./shortlistService";
import { BloomFilter } from "../optimization/bloomFilter";
import { cacheService } from "../optimization/cacheService";

/**
 * Smart recommendation engine that provides personalized hotel suggestions
 */
export class RecommendationService {
  private hotelBloomFilter: BloomFilter;
  private airportBloomFilter: BloomFilter;
  private recommendationCache = new Map<
    string,
    { result: SmartRecommendation[]; timestamp: number }
  >();
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(private searchEngine: UnifiedSearchEngine) {
    // Initialize bloom filters for fast existence checks
    this.hotelBloomFilter = new BloomFilter(10000, 0.001);
    this.airportBloomFilter = new BloomFilter(1000, 0.001);
    this.initializeBloomFilters();
  }

  /**
   * Initialize bloom filters with existing hotel data
   */
  private initializeBloomFilters(): void {
    try {
      // Pre-populate bloom filters with known hotels and airports
      // Pre-populate bloom filters with known hotels and airports
      // In a real implementation, this would get actual hotel data
      const sampleHotels = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Hotel ${i + 1}`,
      }));
      sampleHotels.forEach((hotel) => {
        this.hotelBloomFilter.add(hotel.id.toString());
      });

      console.log(
        `🔹 Bloom filters initialized with ${sampleHotels.length} hotels`,
      );
    } catch (error) {
      console.warn("Could not initialize bloom filters:", error);
    }
  }

  /**
   * Generates smart recommendations based on user preferences and behavior
   */
  async generateRecommendations(
    userId: string,
    criteria: SearchCriteria,
    limit: number = 10,
  ): Promise<SmartRecommendation[]> {
    try {
      // Generate cache key for recommendations
      const cacheKey = cacheService.generateKey("recommendations", {
        userId,
        criteria,
        limit,
      });

      // Check cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        console.log("🚀 Recommendations served from cache");
        return cached;
      }

      // Use bloom filter to pre-filter invalid requests
      if (
        criteria.departureAirports &&
        criteria.departureAirports.length > 0 &&
        !criteria.departureAirports.some((airport) =>
          this.airportBloomFilter.mightContain(airport),
        )
      ) {
        console.log(
          `❌ Airports ${criteria.departureAirports.join(", ")} likely don't exist (bloom filter)`,
        );
        return [];
      }

      // Get all offers matching criteria
      const allOffers = await this.searchEngine.findBestOffersByHotel(criteria);

      if (allOffers.length === 0) {
        return [];
      }

      // Filter offers using bloom filter for hotel existence
      const validOffers = allOffers.filter((offer) =>
        this.hotelBloomFilter.mightContain(offer.hotelId.toString()),
      );

      console.log(
        `🔹 Bloom filter reduced offers from ${allOffers.length} to ${validOffers.length}`,
      );

      // Get user's shortlist preferences for personalization
      const userShortlists = shortlistService.getUserShortlists(userId);
      const shortlistedHotels = new Set(
        userShortlists.flatMap((list) =>
          list.items.map((item) => item.hotelId),
        ),
      );

      // Score each offer
      const scoredOffers = validOffers.map((offer) =>
        this.scoreOffer(offer, criteria, shortlistedHotels),
      );

      // Sort by score and take top recommendations
      const topRecommendations = scoredOffers
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Cache the results
      cacheService.set(cacheKey, topRecommendations, this.CACHE_TTL);

      return topRecommendations;
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [];
    }
  }

  /**
   * Generates recommendations for similar hotels based on a reference hotel
   */
  async getSimilarHotels(
    hotelId: number,
    criteria: SearchCriteria,
    limit: number = 5,
  ): Promise<SmartRecommendation[]> {
    try {
      // Quick bloom filter check for hotel existence
      if (!this.hotelBloomFilter.mightContain(hotelId.toString())) {
        console.log(`❌ Hotel ${hotelId} likely doesn't exist (bloom filter)`);
        return [];
      }

      const cacheKey = cacheService.generateKey("similar-hotels", {
        hotelId,
        criteria,
        limit,
      });
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const referenceHotel = this.searchEngine.getHotel(hotelId);
      if (!referenceHotel) {
        return [];
      }

      // Get all offers
      const allOffers = await this.searchEngine.findBestOffersByHotel(criteria);

      // Filter offers using bloom filter and exclude reference hotel
      const validOffers = allOffers.filter(
        (offer) =>
          offer.hotelId !== hotelId &&
          this.hotelBloomFilter.mightContain(offer.hotelId.toString()),
      );

      // Score similarity
      const similarOffers = validOffers
        .map((offer) => this.scoreSimilarity(offer, referenceHotel))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Cache results
      cacheService.set(cacheKey, similarOffers, this.CACHE_TTL);

      return similarOffers;
    } catch (error) {
      console.error("Error finding similar hotels:", error);
      return [];
    }
  }

  /**
   * Gets trending hotels based on search patterns
   */
  async getTrendingHotels(
    criteria: SearchCriteria,
    limit: number = 10,
  ): Promise<SmartRecommendation[]> {
    try {
      const cacheKey = cacheService.generateKey("trending-hotels", {
        criteria,
        limit,
      });
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const allOffers = await this.searchEngine.findBestOffersByHotel(criteria);

      // Filter using bloom filter
      const validOffers = allOffers.filter((offer) =>
        this.hotelBloomFilter.mightContain(offer.hotelId.toString()),
      );

      // Simulate trending based on star rating and price value
      const trendingOffers = validOffers
        .map((offer) => this.scoreTrending(offer))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Cache results
      cacheService.set(cacheKey, trendingOffers, this.CACHE_TTL);

      return trendingOffers;
    } catch (error) {
      console.error("Error getting trending hotels:", error);
      return [];
    }
  }

  /**
   * Gets value deals (best price-to-quality ratio)
   */
  async getValueDeals(
    criteria: SearchCriteria,
    limit: number = 10,
  ): Promise<SmartRecommendation[]> {
    try {
      const cacheKey = cacheService.generateKey("value-deals", {
        criteria,
        limit,
      });
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const allOffers = await this.searchEngine.findBestOffersByHotel(criteria);

      // Filter using bloom filter
      const validOffers = allOffers.filter((offer) =>
        this.hotelBloomFilter.mightContain(offer.hotelId.toString()),
      );

      const valueDeals = validOffers
        .map((offer) => this.scoreValue(offer))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Cache results
      cacheService.set(cacheKey, valueDeals, this.CACHE_TTL);

      return valueDeals;
    } catch (error) {
      console.error("Error getting value deals:", error);
      return [];
    }
  }

  /**
   * Scores an offer based on various factors
   */
  private scoreOffer(
    offer: BestHotelOffer,
    criteria: SearchCriteria,
    shortlistedHotels: Set<number>,
  ): SmartRecommendation {
    let score = 0;
    const reasons: string[] = [];

    // Base score from hotel stars (0-5 points)
    score += offer.hotelStars;
    if (offer.hotelStars >= 4) {
      reasons.push(`${offer.hotelStars}-star hotel`);
    }

    // Price competitiveness (0-3 points)
    // Normalize price score (lower prices get higher scores)
    const priceScore = Math.max(0, 3 - offer.minPrice / 1000);
    score += priceScore;
    if (priceScore >= 2) {
      reasons.push("Great price");
    }

    // Ocean view bonus (1 point)
    if (
      offer.roomType?.toLowerCase().includes("ocean") ||
      offer.roomType?.toLowerCase().includes("sea")
    ) {
      score += 1;
      reasons.push("Ocean view");
    }

    // Meal type preference bonus
    if (offer.mealType === "All Inclusive") {
      score += 1;
      reasons.push("All inclusive");
    }

    // User preference bonus (if user has shortlisted similar star hotels)
    if (shortlistedHotels.size > 0) {
      // This is a simplified version - in a real system you'd analyze patterns
      score += 0.5;
      reasons.push("Matches your preferences");
    }

    // Duration preference bonus
    if (criteria.duration >= 7) {
      score += 0.5;
      reasons.push("Perfect for longer stays");
    }

    // Availability bonus (more offers = better availability)
    if (offer.availableOffers > 10) {
      score += 0.5;
      reasons.push("Great availability");
    }

    return {
      hotelId: offer.hotelId,
      hotelName: offer.hotelName,
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      reasons,
      offer,
    };
  }

  /**
   * Scores similarity to a reference hotel
   */
  private scoreSimilarity(
    offer: BestHotelOffer,
    referenceHotel: { stars: number },
  ): SmartRecommendation {
    let score = 0;
    const reasons: string[] = [];

    // Star rating similarity (0-5 points)
    const starDiff = Math.abs(offer.hotelStars - referenceHotel.stars);
    score += Math.max(0, 5 - starDiff);

    if (starDiff === 0) {
      reasons.push("Same star rating");
    } else if (starDiff <= 0.5) {
      reasons.push("Similar star rating");
    }

    // Price range similarity
    score += 2; // Base similarity score
    reasons.push("Similar hotel type");

    return {
      hotelId: offer.hotelId,
      hotelName: offer.hotelName,
      score: Math.round(score * 10) / 10,
      reasons,
      offer,
    };
  }

  /**
   * Scores trending potential
   */
  private scoreTrending(offer: BestHotelOffer): SmartRecommendation {
    let score = 0;
    const reasons: string[] = [];

    // High-rated hotels
    if (offer.hotelStars >= 4.5) {
      score += 3;
      reasons.push("Highly rated");
    }

    // Good availability
    if (offer.availableOffers > 15) {
      score += 2;
      reasons.push("High availability");
    }

    // Competitive pricing
    if (offer.minPrice < 500) {
      score += 2;
      reasons.push("Competitive pricing");
    }

    // Premium amenities
    if (offer.mealType === "All Inclusive") {
      score += 1;
      reasons.push("All inclusive package");
    }

    reasons.push("Trending destination");

    return {
      hotelId: offer.hotelId,
      hotelName: offer.hotelName,
      score: Math.round(score * 10) / 10,
      reasons,
      offer,
    };
  }

  /**
   * Scores value for money
   */
  private scoreValue(offer: BestHotelOffer): SmartRecommendation {
    let score = 0;
    const reasons: string[] = [];

    // Value = Quality / Price ratio
    const qualityScore = offer.hotelStars;
    const priceNormalized = offer.minPrice / 100; // Normalize price

    if (priceNormalized > 0) {
      score = (qualityScore / priceNormalized) * 10;
    }

    // Additional value factors
    if (offer.mealType === "All Inclusive") {
      score += 2;
      reasons.push("All inclusive value");
    }

    if (offer.availableOffers > 10) {
      score += 1;
      reasons.push("Good availability");
    }

    reasons.push("Great value for money");

    return {
      hotelId: offer.hotelId,
      hotelName: offer.hotelName,
      score: Math.round(score * 10) / 10,
      reasons,
      offer,
    };
  }

  /**
   * Gets recommendation statistics
   */
  getStats(): {
    totalRecommendationsGenerated: number;
    averageScore: number;
    topReasons: { reason: string; count: number }[];
    bloomFilterStats: any;
    cacheStats: any;
  } {
    return {
      totalRecommendationsGenerated: 0,
      averageScore: 0,
      topReasons: [],
      bloomFilterStats: {
        hotels: this.hotelBloomFilter.getStats(),
        airports: this.airportBloomFilter.getStats(),
      },
      cacheStats: cacheService.getStats(),
    };
  }

  /**
   * Add a hotel to the bloom filter (when new hotels are added)
   */
  addHotelToBloomFilter(hotelId: number): void {
    this.hotelBloomFilter.add(hotelId.toString());
  }

  /**
   * Add an airport to the bloom filter
   */
  addAirportToBloomFilter(airport: string): void {
    this.airportBloomFilter.add(airport);
  }

  /**
   * Clear recommendation cache
   */
  clearCache(): void {
    cacheService.clear();
  }
}

export default RecommendationService;
