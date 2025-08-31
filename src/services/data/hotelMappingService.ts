/**
 * Hotel Mapping Service
 * 
 * This service efficiently handles the data mismatch between offers.csv and hotels.csv
 * by creating a smart mapping system that:
 * - Shows actual hotel names for hotels that exist in both files
 * - Provides fallback names for hotels that only exist in offers.csv
 * - Optimizes performance by only processing matching data
 * - Allows easy expansion when hotels.csv is updated
 */

import { Hotel } from '../../types';

export interface HotelMapping {
  hotelId: number;
  hotel: Hotel | null; // null if hotel doesn't exist in hotels.csv
  hasHotelData: boolean;
  fallbackName: string;
  fallbackStars: number;
}

export interface HotelMappingStats {
  totalOffers: number;
  matchedHotels: number;
  unmatchedHotels: number;
  matchRate: number;
  hotelIds: Set<number>;
  matchedHotelIds: Set<number>;
  unmatchedHotelIds: Set<number>;
}

export class HotelMappingService {
  private hotelMap: Map<number, Hotel> = new Map();
  private offerHotelIds: Set<number> = new Set();
  private mappingStats: HotelMappingStats | null = null;
  private isInitialized = false;

  /**
   * Initialize the mapping service with hotel data
   */
  initialize(hotels: Hotel[]): void {
    console.log(`[HotelMappingService] Initializing with ${hotels.length} hotels`);
    
    // Build hotel lookup map
    this.hotelMap.clear();
    for (const hotel of hotels) {
      this.hotelMap.set(hotel.id, hotel);
    }
    
    this.isInitialized = true;
    console.log(`[HotelMappingService] Initialized with ${this.hotelMap.size} hotels`);
  }

  /**
   * Process offer hotel IDs to build mapping statistics
   */
  processOfferHotelIds(offerHotelIds: number[]): HotelMappingStats {
    if (!this.isInitialized) {
      throw new Error('HotelMappingService not initialized');
    }

    console.log(`[HotelMappingService] Processing ${offerHotelIds.length} offer hotel IDs`);
    
    const hotelIds = new Set(offerHotelIds);
    const matchedHotelIds = new Set<number>();
    const unmatchedHotelIds = new Set<number>();

    // Categorize hotel IDs
    for (const hotelId of hotelIds) {
      if (this.hotelMap.has(hotelId)) {
        matchedHotelIds.add(hotelId);
      } else {
        unmatchedHotelIds.add(hotelId);
      }
    }

    const stats: HotelMappingStats = {
      totalOffers: offerHotelIds.length,
      matchedHotels: matchedHotelIds.size,
      unmatchedHotels: unmatchedHotelIds.size,
      matchRate: matchedHotelIds.size / hotelIds.size,
      hotelIds,
      matchedHotelIds,
      unmatchedHotelIds,
    };

    this.mappingStats = stats;
    this.offerHotelIds = hotelIds;

    console.log(`[HotelMappingService] Mapping stats:`, {
      totalHotels: hotelIds.size,
      matched: matchedHotelIds.size,
      unmatched: unmatchedHotelIds.size,
      matchRate: `${(stats.matchRate * 100).toFixed(2)}%`
    });

    return stats;
  }

  /**
   * Get hotel mapping for a specific hotel ID
   */
  getHotelMapping(hotelId: number): HotelMapping {
    if (!this.isInitialized) {
      throw new Error('HotelMappingService not initialized');
    }

    const hotel = this.hotelMap.get(hotelId);
    const hasHotelData = hotel !== undefined;

    return {
      hotelId,
      hotel: hotel || null,
      hasHotelData,
      fallbackName: this.generateFallbackName(hotelId),
      fallbackStars: this.generateFallbackStars(hotelId),
    };
  }

  /**
   * Get optimized hotel data for API response
   */
  getOptimizedHotelData(hotelId: number): { id: number; name: string; stars: number } {
    const mapping = this.getHotelMapping(hotelId);
    
    if (mapping.hasHotelData && mapping.hotel) {
      // Use actual hotel data
      return {
        id: mapping.hotel.id,
        name: mapping.hotel.name,
        stars: mapping.hotel.stars,
      };
    } else {
      // Use fallback data
      return {
        id: hotelId,
        name: mapping.fallbackName,
        stars: mapping.fallbackStars,
      };
    }
  }

  /**
   * Get all hotel mappings
   */
  getAllHotelMappings(): HotelMapping[] {
    if (!this.isInitialized) {
      throw new Error('HotelMappingService not initialized');
    }

    const mappings: HotelMapping[] = [];
    for (const hotelId of this.offerHotelIds) {
      mappings.push(this.getHotelMapping(hotelId));
    }
    return mappings;
  }

  /**
   * Get statistics about the mapping
   */
  getMappingStats(): HotelMappingStats | null {
    return this.mappingStats;
  }

  /**
   * Check if a hotel ID has actual hotel data
   */
  hasHotelData(hotelId: number): boolean {
    return this.hotelMap.has(hotelId);
  }

  /**
   * Get all hotel IDs that have actual hotel data
   */
  getMatchedHotelIds(): number[] {
    if (!this.mappingStats) {
      return [];
    }
    return Array.from(this.mappingStats.matchedHotelIds);
  }

  /**
   * Get all hotel IDs that don't have actual hotel data
   */
  getUnmatchedHotelIds(): number[] {
    if (!this.mappingStats) {
      return [];
    }
    return Array.from(this.mappingStats.unmatchedHotelIds);
  }

  /**
   * Generate a fallback hotel name based on hotel ID
   */
  private generateFallbackName(hotelId: number): string {
    // Use a more descriptive fallback name
    return `Hotel ${hotelId}`;
  }

  /**
   * Generate fallback star rating based on hotel ID
   * This provides some consistency for hotels without data
   */
  private generateFallbackStars(hotelId: number): number {
    // Use hotel ID to generate consistent fallback stars
    // This ensures the same hotel always gets the same stars
    const hash = this.hashHotelId(hotelId);
    return 3 + (hash % 3); // 3-5 stars
  }

  /**
   * Simple hash function for consistent fallback values
   */
  private hashHotelId(hotelId: number): number {
    let hash = 0;
    const str = hotelId.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clear all data and reset the service
   */
  clear(): void {
    this.hotelMap.clear();
    this.offerHotelIds.clear();
    this.mappingStats = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const hotelMappingService = new HotelMappingService();
