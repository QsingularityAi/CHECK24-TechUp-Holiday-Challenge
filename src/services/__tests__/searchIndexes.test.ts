import { SearchIndexesImpl, OptimizedOffer } from '../search/searchIndexes';
import { Hotel, Offer } from '../../types';

describe('SearchIndexesImpl', () => {
  let searchIndexes: SearchIndexesImpl;
  let testHotels: Hotel[];
  let testOffers: Offer[];

  beforeEach(() => {
    searchIndexes = new SearchIndexesImpl();
    
    testHotels = [
      { id: 1, name: 'Hotel A', stars: 4.0 },
      { id: 2, name: 'Hotel B', stars: 3.5 },
      { id: 3, name: 'Hotel C', stars: 5.0 }
    ];

    testOffers = [
      {
        hotelId: 1,
        price: 1200,
        countAdults: 2,
        countChildren: 0,
        outboundDepartureDateTime: new Date('2024-06-01T10:00:00Z'),
        inboundDepartureDateTime: new Date('2024-06-08T14:00:00Z'),
        outboundArrivalDateTime: new Date('2024-06-01T13:15:00Z'),
        inboundArrivalDateTime: new Date('2024-06-08T17:15:00Z'),
        outboundDepartureAirport: 'FRA',
        inboundDepartureAirport: 'PMI',
        outboundArrivalAirport: 'PMI',
        inboundArrivalAirport: 'FRA',
        mealType: 'All Inclusive',
        oceanView: true,
        roomType: 'Double Room',
        duration: 7
      },
      {
        hotelId: 1,
        price: 900,
        countAdults: 2,
        countChildren: 0,
        outboundDepartureDateTime: new Date('2024-06-02T08:00:00Z'),
        inboundDepartureDateTime: new Date('2024-06-09T12:00:00Z'),
        outboundArrivalDateTime: new Date('2024-06-02T11:15:00Z'),
        inboundArrivalDateTime: new Date('2024-06-09T15:15:00Z'),
        outboundDepartureAirport: 'FRA',
        inboundDepartureAirport: 'PMI',
        outboundArrivalAirport: 'PMI',
        inboundArrivalAirport: 'FRA',
        mealType: 'Breakfast',
        oceanView: false,
        roomType: 'Single Room',
        duration: 7
      },
      {
        hotelId: 2,
        price: 1500,
        countAdults: 1,
        countChildren: 1,
        outboundDepartureDateTime: new Date('2024-07-01T12:00:00Z'),
        inboundDepartureDateTime: new Date('2024-07-10T16:00:00Z'),
        outboundArrivalDateTime: new Date('2024-07-01T15:15:00Z'),
        inboundArrivalDateTime: new Date('2024-07-10T19:15:00Z'),
        outboundDepartureAirport: 'MUC',
        inboundDepartureAirport: 'PMI',
        outboundArrivalAirport: 'PMI',
        inboundArrivalAirport: 'MUC',
        mealType: 'Half Board',
        oceanView: true,
        roomType: 'Family Room',
        duration: 9
      }
    ];
  });

  describe('buildIndexes', () => {
    it('should build all indexes successfully', () => {
      const stats = searchIndexes.buildIndexes(testHotels, testOffers);

      expect(stats.totalHotels).toBe(3);
      expect(stats.totalOffers).toBe(3);
      expect(stats.hotelIndexSize).toBe(2); // 2 hotels have offers
      expect(stats.airportIndexSize).toBe(3); // FRA, MUC, and PMI (both outbound and inbound departure airports)
      expect(stats.dateRangeIndexSize).toBe(2); // June and July
      expect(stats.passengerCountIndexSize).toBe(2); // 2a0c and 1a1c
      expect(stats.internedStringsCount).toBeGreaterThan(0);
      expect(stats.buildTimeMs).toBeGreaterThanOrEqual(0);
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
    });

    it('should sort offers by price within each hotel', () => {
      searchIndexes.buildIndexes(testHotels, testOffers);

      const hotel1Offers = searchIndexes.getOffersByHotel(1);
      expect(hotel1Offers).toHaveLength(2);
      expect(hotel1Offers[0]!.price).toBe(900); // Cheaper offer first
      expect(hotel1Offers[1]!.price).toBe(1200);
    });

    it('should handle empty data gracefully', () => {
      const stats = searchIndexes.buildIndexes([], []);

      expect(stats.totalHotels).toBe(0);
      expect(stats.totalOffers).toBe(0);
      expect(stats.hotelIndexSize).toBe(0);
      expect(stats.airportIndexSize).toBe(0);
      expect(stats.dateRangeIndexSize).toBe(0);
      expect(stats.passengerCountIndexSize).toBe(0);
    });
  });

  describe('hotel operations', () => {
    beforeEach(() => {
      searchIndexes.buildIndexes(testHotels, testOffers);
    });

    it('should retrieve hotel by ID', () => {
      const hotel = searchIndexes.getHotel(1);
      expect(hotel).toEqual(testHotels[0]);

      const nonExistentHotel = searchIndexes.getHotel(999);
      expect(nonExistentHotel).toBeUndefined();
    });

    it('should retrieve all hotels', () => {
      const allHotels = searchIndexes.getAllHotels();
      expect(allHotels).toHaveLength(3);
      expect(allHotels).toEqual(expect.arrayContaining(testHotels));
    });
  });

  describe('index queries', () => {
    beforeEach(() => {
      searchIndexes.buildIndexes(testHotels, testOffers);
    });

    it('should get offers by hotel ID', () => {
      const hotel1Offers = searchIndexes.getOffersByHotel(1);
      expect(hotel1Offers).toHaveLength(2);
      expect(hotel1Offers.every((offer: OptimizedOffer) => offer.hotelId === 1)).toBe(true);

      const hotel2Offers = searchIndexes.getOffersByHotel(2);
      expect(hotel2Offers).toHaveLength(1);
      expect(hotel2Offers[0]!.hotelId).toBe(2);

      const nonExistentHotelOffers = searchIndexes.getOffersByHotel(999);
      expect(nonExistentHotelOffers).toHaveLength(0);
    });

    it('should get offers by departure airport', () => {
      const fraOffers = searchIndexes.getOffersByAirport('FRA');
      expect(fraOffers).toHaveLength(2);
      expect(fraOffers.every((offer: OptimizedOffer) => offer.outboundDepartureAirport === 'FRA')).toBe(true);

      const mucOffers = searchIndexes.getOffersByAirport('MUC');
      expect(mucOffers).toHaveLength(1);
      expect(mucOffers[0]!.outboundDepartureAirport).toBe('MUC');

      const nonExistentAirportOffers = searchIndexes.getOffersByAirport('BER');
      expect(nonExistentAirportOffers).toHaveLength(0);
    });

    it('should get offers by passenger count', () => {
      const twoAdultsOffers = searchIndexes.getOffersByPassengerCount(2, 0);
      expect(twoAdultsOffers).toHaveLength(2);
      expect(twoAdultsOffers.every((offer: OptimizedOffer) => offer.countAdults === 2 && offer.countChildren === 0)).toBe(true);

      const familyOffers = searchIndexes.getOffersByPassengerCount(1, 1);
      expect(familyOffers).toHaveLength(1);
      expect(familyOffers[0]!.countAdults).toBe(1);
      expect(familyOffers[0]!.countChildren).toBe(1);

      const nonExistentPassengerOffers = searchIndexes.getOffersByPassengerCount(5, 5);
      expect(nonExistentPassengerOffers).toHaveLength(0);
    });

    it('should get offers by date range', () => {
      // June offers
      const juneStart = new Date('2024-06-01');
      const juneEnd = new Date('2024-06-30');
      const juneOffers = searchIndexes.getOffersByDateRange(juneStart, juneEnd);
      expect(juneOffers).toHaveLength(2);

      // July offers
      const julyStart = new Date('2024-07-01');
      const julyEnd = new Date('2024-07-31');
      const julyOffers = searchIndexes.getOffersByDateRange(julyStart, julyEnd);
      expect(julyOffers).toHaveLength(1);

      // Cross-month range
      const crossMonthStart = new Date('2024-06-15');
      const crossMonthEnd = new Date('2024-07-15');
      const crossMonthOffers = searchIndexes.getOffersByDateRange(crossMonthStart, crossMonthEnd);
      expect(crossMonthOffers).toHaveLength(1); // Only July offer should match

      // No matches
      const futureStart = new Date('2025-01-01');
      const futureEnd = new Date('2025-01-31');
      const futureOffers = searchIndexes.getOffersByDateRange(futureStart, futureEnd);
      expect(futureOffers).toHaveLength(0);
    });
  });

  describe('offer conversion', () => {
    beforeEach(() => {
      searchIndexes.buildIndexes(testHotels, testOffers);
    });

    it('should convert optimized offer back to regular offer', () => {
      const optimizedOffers = searchIndexes.getOffersByHotel(1);
      const optimizedOffer = optimizedOffers[0]!;
      
      const regularOffer = searchIndexes.convertToOffer(optimizedOffer);
      
      expect(regularOffer.hotelId).toBe(optimizedOffer.hotelId);
      expect(regularOffer.price).toBe(optimizedOffer.price);
      expect(regularOffer.countAdults).toBe(optimizedOffer.countAdults);
      expect(regularOffer.countChildren).toBe(optimizedOffer.countChildren);
      expect(regularOffer.outboundDepartureDateTime.getTime()).toBe(optimizedOffer.outboundDepartureTimestamp);
      expect(regularOffer.inboundDepartureDateTime.getTime()).toBe(optimizedOffer.inboundDepartureTimestamp);
      expect(regularOffer.outboundDepartureAirport).toBe(optimizedOffer.outboundDepartureAirport);
      expect(regularOffer.mealType).toBe(optimizedOffer.mealType);
      expect(regularOffer.oceanView).toBe(optimizedOffer.oceanView);
      expect(regularOffer.roomType).toBe(optimizedOffer.roomType);
      expect(regularOffer.duration).toBe(optimizedOffer.duration);
    });
  });

  describe('memory optimization', () => {
    it('should intern strings to reduce memory usage', () => {
      // Create offers with duplicate strings
      const duplicateOffers: Offer[] = [
        { ...testOffers[0]!, mealType: 'All Inclusive', roomType: 'Double Room' },
        { ...testOffers[1]!, mealType: 'All Inclusive', roomType: 'Double Room' },
        { ...testOffers[2]!, mealType: 'All Inclusive', roomType: 'Double Room' }
      ];

      searchIndexes.buildIndexes(testHotels, duplicateOffers);
      const stats = searchIndexes.getStats();

      // Should have fewer interned strings than total string occurrences
      expect(stats!.internedStringsCount).toBeLessThan(duplicateOffers.length * 6); // 6 strings per offer
    });

    it('should provide memory usage statistics', () => {
      const stats = searchIndexes.buildIndexes(testHotels, testOffers);
      
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
      expect(stats.buildTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearIndexes', () => {
    it('should clear all indexes and free memory', () => {
      searchIndexes.buildIndexes(testHotels, testOffers);
      
      // Verify indexes are built
      expect(searchIndexes.getOffersByHotel(1)).toHaveLength(2);
      expect(searchIndexes.getHotel(1)).toBeDefined();
      expect(searchIndexes.getStats()).not.toBeNull();

      // Clear indexes
      searchIndexes.clearIndexes();

      // Verify indexes are cleared
      expect(searchIndexes.getOffersByHotel(1)).toHaveLength(0);
      expect(searchIndexes.getHotel(1)).toBeUndefined();
      expect(searchIndexes.getStats()).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle offers with same timestamps', () => {
      const sameTimeOffers: Offer[] = [
        { ...testOffers[0]! },
        { ...testOffers[0]!, price: 1000 } // Same everything except price
      ];

      const stats = searchIndexes.buildIndexes(testHotels, sameTimeOffers);
      expect(stats.totalOffers).toBe(2);

      const hotelOffers = searchIndexes.getOffersByHotel(1);
      expect(hotelOffers).toHaveLength(2);
      // Should be sorted by price
      expect(hotelOffers[0]!.price).toBeLessThan(hotelOffers[1]!.price);
    });

    it('should handle offers spanning multiple months', () => {
      const longStayOffer: Offer = {
        ...testOffers[0]!,
        outboundDepartureDateTime: new Date('2024-06-25T10:00:00Z'),
        inboundDepartureDateTime: new Date('2024-07-05T14:00:00Z')
      };

      searchIndexes.buildIndexes(testHotels, [longStayOffer]);

      // Should be found when searching June (departure month)
      const juneOffers = searchIndexes.getOffersByDateRange(
        new Date('2024-06-01'), 
        new Date('2024-06-30')
      );
      expect(juneOffers).toHaveLength(1);

      // Should NOT be found when searching July (return month, but departure is in June)
      const julyOffers = searchIndexes.getOffersByDateRange(
        new Date('2024-07-01'), 
        new Date('2024-07-31')
      );
      expect(julyOffers).toHaveLength(0);

      // Should be found when searching across both months
      const crossMonthOffers = searchIndexes.getOffersByDateRange(
        new Date('2024-06-01'), 
        new Date('2024-07-31')
      );
      expect(crossMonthOffers).toHaveLength(1);
    });
  });
});