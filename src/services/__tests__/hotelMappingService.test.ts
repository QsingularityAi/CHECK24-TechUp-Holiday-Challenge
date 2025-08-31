import { hotelMappingService } from '../data/hotelMappingService';
import { Hotel } from '../../types';

describe('HotelMappingService', () => {
  beforeEach(() => {
    hotelMappingService.clear();
  });

  describe('initialize', () => {
    it('should initialize with hotel data', () => {
      const hotels: Hotel[] = [
        { id: 1, name: 'Hotel A', stars: 4 },
        { id: 2, name: 'Hotel B', stars: 5 },
        { id: 3, name: 'Hotel C', stars: 3 },
      ];

      hotelMappingService.initialize(hotels);

      // Test that hotels are properly mapped
      const mapping1 = hotelMappingService.getHotelMapping(1);
      expect(mapping1.hasHotelData).toBe(true);
      expect(mapping1.hotel?.name).toBe('Hotel A');
      expect(mapping1.hotel?.stars).toBe(4);

      const mapping2 = hotelMappingService.getHotelMapping(2);
      expect(mapping2.hasHotelData).toBe(true);
      expect(mapping2.hotel?.name).toBe('Hotel B');
      expect(mapping2.hotel?.stars).toBe(5);
    });
  });

  describe('processOfferHotelIds', () => {
    it('should categorize hotel IDs correctly', () => {
      const hotels: Hotel[] = [
        { id: 1, name: 'Hotel A', stars: 4 },
        { id: 2, name: 'Hotel B', stars: 5 },
      ];

      hotelMappingService.initialize(hotels);

      const offerHotelIds = [1, 2, 3, 4, 5]; // 1,2 exist in hotels.csv, 3,4,5 don't
      const stats = hotelMappingService.processOfferHotelIds(offerHotelIds);

      expect(stats.totalOffers).toBe(5);
      expect(stats.matchedHotels).toBe(2);
      expect(stats.unmatchedHotels).toBe(3);
      expect(stats.matchRate).toBe(0.4); // 2/5 = 0.4
    });
  });

  describe('getOptimizedHotelData', () => {
    it('should return actual hotel data for existing hotels', () => {
      const hotels: Hotel[] = [
        { id: 1, name: 'Hotel A', stars: 4 },
      ];

      hotelMappingService.initialize(hotels);

      const hotelData = hotelMappingService.getOptimizedHotelData(1);
      expect(hotelData.name).toBe('Hotel A');
      expect(hotelData.stars).toBe(4);
    });

    it('should return fallback data for non-existing hotels', () => {
      const hotels: Hotel[] = [
        { id: 1, name: 'Hotel A', stars: 4 },
      ];

      hotelMappingService.initialize(hotels);

      const hotelData = hotelMappingService.getOptimizedHotelData(999);
      expect(hotelData.name).toBe('Hotel 999');
      expect(hotelData.stars).toBeGreaterThanOrEqual(3);
      expect(hotelData.stars).toBeLessThanOrEqual(5);
    });

    it('should provide consistent fallback stars for the same hotel ID', () => {
      const hotels: Hotel[] = [];

      hotelMappingService.initialize(hotels);

      const hotelData1 = hotelMappingService.getOptimizedHotelData(123);
      const hotelData2 = hotelMappingService.getOptimizedHotelData(123);

      expect(hotelData1.stars).toBe(hotelData2.stars);
      expect(hotelData1.name).toBe(hotelData2.name);
    });
  });

  describe('getMatchedHotelIds and getUnmatchedHotelIds', () => {
    it('should return correct hotel ID lists', () => {
      const hotels: Hotel[] = [
        { id: 1, name: 'Hotel A', stars: 4 },
        { id: 2, name: 'Hotel B', stars: 5 },
      ];

      hotelMappingService.initialize(hotels);

      const offerHotelIds = [1, 2, 3, 4, 5];
      hotelMappingService.processOfferHotelIds(offerHotelIds);

      const matchedIds = hotelMappingService.getMatchedHotelIds();
      const unmatchedIds = hotelMappingService.getUnmatchedHotelIds();

      expect(matchedIds).toContain(1);
      expect(matchedIds).toContain(2);
      expect(matchedIds).toHaveLength(2);

      expect(unmatchedIds).toContain(3);
      expect(unmatchedIds).toContain(4);
      expect(unmatchedIds).toContain(5);
      expect(unmatchedIds).toHaveLength(3);
    });
  });

  describe('hasHotelData', () => {
    it('should correctly identify hotels with data', () => {
      const hotels: Hotel[] = [
        { id: 1, name: 'Hotel A', stars: 4 },
      ];

      hotelMappingService.initialize(hotels);

      expect(hotelMappingService.hasHotelData(1)).toBe(true);
      expect(hotelMappingService.hasHotelData(999)).toBe(false);
    });
  });
});
