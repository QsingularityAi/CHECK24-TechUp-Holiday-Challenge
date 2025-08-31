/**
 * User Services
 * 
 * This module contains services related to user interactions,
 * recommendations, and personalized features.
 */

// Recommendation service
export { RecommendationService } from './recommendationService';
export { default as DefaultRecommendationService } from './recommendationService';

// Shortlist and price alert service
export { ShortlistService, shortlistService } from './shortlistService';

// Re-export types from the main types file
export type { SmartRecommendation } from '../../types';
export type { UserShortlist, ShortlistItem, PriceAlert } from '../../types';