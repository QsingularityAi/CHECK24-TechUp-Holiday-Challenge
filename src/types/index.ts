/**
 * Core data model interfaces and types for the Mallorca Travel Backend
 */

export interface Offer {
  hotelId: number;
  price: number;
  countAdults: number;
  countChildren: number;
  outboundDepartureDateTime: Date;
  inboundDepartureDateTime: Date;
  outboundArrivalDateTime: Date;
  inboundArrivalDateTime: Date;
  outboundDepartureAirport: string;
  inboundDepartureAirport: string;
  outboundArrivalAirport: string;
  inboundArrivalAirport: string;
  mealType: string;
  oceanView: boolean;
  roomType: string;
  duration: number;
}

export interface Hotel {
  id: number;
  name: string;
  stars: number;
}

export interface SearchCriteria {
  departureAirports: string[];
  earliestDepartureDate: Date;
  latestReturnDate: Date;
  duration: number;
  countAdults: number;
  countChildren: number;
  // New advanced filters
  mealTypes?: string[];
  roomTypes?: string[];
  oceanView?: boolean;
  minPrice?: number;
  maxPrice?: number;
  hotelStars?: number[];
}

export interface BestHotelOffer {
  hotelId: number;
  hotelName: string;
  hotelStars: number;
  minPrice: number;
  departureDate: Date;
  returnDate: Date;
  roomType: string;
  mealType: string;
  countAdults: number;
  countChildren: number;
  duration: number;
  availableOffers: number;
}

export interface SearchIndexes {
  byHotel: Map<number, any[]>;
  byAirport: Map<string, any[]>;
  byDateRange: Map<string, any[]>;
  byPassengerCount: Map<string, any[]>;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  requestId: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'loading';
  timestamp: string;
  dataLoaded: boolean;
  offersCount?: number;
  hotelsCount?: number;
  uptime: number;
}

// New interfaces for user shortlisting
export interface UserShortlist {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  items: ShortlistItem[];
}

export interface ShortlistItem {
  id: string;
  hotelId: number;
  offerId?: string; // Optional specific offer ID
  addedAt: Date;
  notes?: string;
  priceWhenAdded: number;
}

// Smart recommendations interface
export interface SmartRecommendation {
  hotelId: number;
  hotelName: string;
  score: number;
  reasons: string[];
  offer: BestHotelOffer;
}

// Price alert interface
export interface PriceAlert {
  id: string;
  userId: string;
  hotelId: number;
  targetPrice: number;
  isActive: boolean;
  createdAt: Date;
  lastChecked: Date;
  triggered?: Date;
}

// Cache interface for performance optimization
export interface SearchCache {
  key: string;
  result: any;
  timestamp: Date;
  ttl: number;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Validation functions for input parameters
export class DataValidator {
  /**
   * Validates search criteria parameters
   */
  static validateSearchCriteria(criteria: Partial<SearchCriteria>): ValidationResult {
    const errors: string[] = [];

    // Validate departure airports
    if (!criteria.departureAirports || !Array.isArray(criteria.departureAirports) || criteria.departureAirports.length === 0) {
      errors.push('departureAirports must be a non-empty array');
    } else {
      criteria.departureAirports.forEach((airport, index) => {
        if (typeof airport !== 'string' || airport.length !== 3) {
          errors.push(`departureAirports[${index}] must be a 3-character airport code`);
        }
      });
    }

    // Validate dates
    if (!criteria.earliestDepartureDate || !(criteria.earliestDepartureDate instanceof Date)) {
      errors.push('earliestDepartureDate must be a valid Date');
    }

    if (!criteria.latestReturnDate || !(criteria.latestReturnDate instanceof Date)) {
      errors.push('latestReturnDate must be a valid Date');
    }

    if (criteria.earliestDepartureDate && criteria.latestReturnDate && 
        criteria.earliestDepartureDate >= criteria.latestReturnDate) {
      errors.push('earliestDepartureDate must be before latestReturnDate');
    }

    // Validate duration
    if (typeof criteria.duration !== 'number' || criteria.duration < 1 || criteria.duration > 365) {
      errors.push('duration must be a number between 1 and 365 days');
    }

    // Validate passenger counts
    if (typeof criteria.countAdults !== 'number' || criteria.countAdults < 1 || criteria.countAdults > 10) {
      errors.push('countAdults must be a number between 1 and 10');
    }

    if (typeof criteria.countChildren !== 'number' || criteria.countChildren < 0 || criteria.countChildren > 10) {
      errors.push('countChildren must be a number between 0 and 10');
    }

    // Validate optional filters
    if (criteria.mealTypes && (!Array.isArray(criteria.mealTypes) || criteria.mealTypes.some(m => typeof m !== 'string'))) {
      errors.push('mealTypes must be an array of strings');
    }

    if (criteria.roomTypes && (!Array.isArray(criteria.roomTypes) || criteria.roomTypes.some(r => typeof r !== 'string'))) {
      errors.push('roomTypes must be an array of strings');
    }

    if (criteria.oceanView !== undefined && typeof criteria.oceanView !== 'boolean') {
      errors.push('oceanView must be a boolean');
    }

    if (criteria.minPrice !== undefined && (typeof criteria.minPrice !== 'number' || criteria.minPrice < 0)) {
      errors.push('minPrice must be a non-negative number');
    }

    if (criteria.maxPrice !== undefined && (typeof criteria.maxPrice !== 'number' || criteria.maxPrice < 0)) {
      errors.push('maxPrice must be a non-negative number');
    }

    if (criteria.minPrice !== undefined && criteria.maxPrice !== undefined && criteria.minPrice > criteria.maxPrice) {
      errors.push('minPrice must be less than or equal to maxPrice');
    }

    if (criteria.hotelStars && (!Array.isArray(criteria.hotelStars) || 
        criteria.hotelStars.some(s => typeof s !== 'number' || s < 0 || s > 5))) {
      errors.push('hotelStars must be an array of numbers between 0 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates hotel ID parameter
   */
  static validateHotelId(hotelId: unknown): ValidationResult {
    const errors: string[] = [];

    if (typeof hotelId !== 'number' || !Number.isInteger(hotelId) || hotelId <= 0) {
      errors.push('hotelId must be a positive integer');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates offer data structure
   */
  static validateOffer(offer: Partial<Offer>): ValidationResult {
    const errors: string[] = [];

    // Required numeric fields
    const numericFields: (keyof Offer)[] = ['hotelId', 'price', 'countAdults', 'countChildren', 'duration'];
    numericFields.forEach(field => {
      const value = offer[field];
      if (typeof value !== 'number' || value < 0) {
        errors.push(`${field} must be a non-negative number`);
      }
    });

    // Required string fields
    const stringFields: (keyof Offer)[] = ['outboundDepartureAirport', 'inboundDepartureAirport', 'outboundArrivalAirport', 'inboundArrivalAirport', 'mealType', 'roomType'];
    stringFields.forEach(field => {
      const value = offer[field];
      if (typeof value !== 'string' || !value) {
        errors.push(`${field} must be a non-empty string`);
      }
    });

    // Date fields
    if (!offer.outboundDepartureDateTime || !(offer.outboundDepartureDateTime instanceof Date)) {
      errors.push('outboundDepartureDateTime must be a valid Date');
    }

    if (!offer.inboundDepartureDateTime || !(offer.inboundDepartureDateTime instanceof Date)) {
      errors.push('inboundDepartureDateTime must be a valid Date');
    }

    if (!offer.outboundArrivalDateTime || !(offer.outboundArrivalDateTime instanceof Date)) {
      errors.push('outboundArrivalDateTime must be a valid Date');
    }

    if (!offer.inboundArrivalDateTime || !(offer.inboundArrivalDateTime instanceof Date)) {
      errors.push('inboundArrivalDateTime must be a valid Date');
    }

    // Boolean field
    if (typeof offer.oceanView !== 'boolean') {
      errors.push('oceanView must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates hotel data structure
   */
  static validateHotel(hotel: Partial<Hotel>): ValidationResult {
    const errors: string[] = [];

    if (typeof hotel.id !== 'number' || !Number.isInteger(hotel.id) || hotel.id <= 0) {
      errors.push('id must be a positive integer');
    }

    if (typeof hotel.name !== 'string' || !hotel.name.trim()) {
      errors.push('name must be a non-empty string');
    }

    if (typeof hotel.stars !== 'number' || hotel.stars < 0 || hotel.stars > 5) {
      errors.push('stars must be a number between 0 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Utility functions for date and duration calculations
export class DateUtils {
  /**
   * Calculates duration in days between two dates
   */
  static calculateDuration(departureDate: Date, returnDate: Date): number {
      // Challenge/UI use duration as NIGHTS. Compute nights (no +1).
      const msPerDay = 1000 * 60 * 60 * 24;
      const start = new Date(
        departureDate.getFullYear(),
        departureDate.getMonth(),
        departureDate.getDate(),
      );
      const end = new Date(
        returnDate.getFullYear(),
        returnDate.getMonth(),
        returnDate.getDate(),
      );
      const nights = Math.max(0, Math.floor((end.getTime() - start.getTime()) / msPerDay));
      return nights;
  }

  /**
   * Checks if a date falls within a given range
   */
  static isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }

  /**
   * Parses date string in various formats to Date object
   */
  static parseDate(dateString: string): Date | null {
    // Try custom formats first to avoid ambiguity with native Date constructor
    // Support YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, DD/MM/YYYY, DD/MM/YYYY HH:mm:ss, DD-MM-YYYY, DD-MM-YYYY HH:mm:ss
    // Also support ISO 8601 with timezone offsets
    const isoFormat = /^(\d{4})-(\d{2})-(\d{2})$/;
    const isoDateTime = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
    const isoDateTimeWithTz = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})[+-]\d{2}:\d{2}$/;
    const ddmmyyyySlash = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const ddmmyyyySlashTime = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/;
    const ddmmyyyyDash = /^(\d{2})-(\d{2})-(\d{4})$/;
    const ddmmyyyyDashTime = /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/;

    // First try ISO format with timezone (most common in our CSV)
    let match = dateString.match(isoDateTimeWithTz);
    if (match && match.length >= 7) {
      // Use native Date constructor for timezone-aware parsing
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) return date;
    }
    
    match = dateString.match(isoDateTime);
    if (match && match.length >= 7) {
      const [, year, month, day, hour, minute, second] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
      if (!isNaN(date.getTime())) return date;
    }
    match = dateString.match(isoFormat);
    if (match && match.length >= 4) {
      const [, year, month, day] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (!isNaN(date.getTime())) return date;
    }
    match = dateString.match(ddmmyyyySlashTime);
    if (match && match.length >= 7) {
      const [, day, month, year, hour, minute, second] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
      if (!isNaN(date.getTime())) return date;
    }
    match = dateString.match(ddmmyyyySlash);
    if (match && match.length >= 4) {
      const [, day, month, year] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (!isNaN(date.getTime())) return date;
    }
    match = dateString.match(ddmmyyyyDashTime);
    if (match && match.length >= 7) {
      const [, day, month, year, hour, minute, second] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
      if (!isNaN(date.getTime())) return date;
    }
    match = dateString.match(ddmmyyyyDash);
    if (match && match.length >= 4) {
      const [, day, month, year] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (!isNaN(date.getTime())) return date;
    }
    // Try native Date constructor as fallback
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;
    return null;
  }

  /**
   * Formats date to ISO string for consistent output
   */
  static formatDate(date: Date): string {
    const isoString = date.toISOString().split('T')[0];
    return isoString!;
  }

  /**
   * Gets the start of day for a given date
   */
  static getStartOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Gets the end of day for a given date
   */
  static getEndOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Adds days to a date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Checks if two dates are the same day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    // Compare UTC date parts to avoid timezone issues
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
  }
}