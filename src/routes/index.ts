/**
 * API Routes for the Mallorca Travel Backend
 */

import { Router } from 'express';
import { ApiController } from '../controllers';
import { validateSearchCriteria, validateHotelId } from '../middleware';

export function createRoutes(apiController: ApiController): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', apiController.getHealth);

  // System status endpoint
  router.get('/status', apiController.getSystemStatus);

  // Performance metrics endpoint
  router.get('/metrics', apiController.getPerformanceMetrics);

  // Best offers by hotel endpoint
  router.get('/bestOffersByHotel', validateSearchCriteria, apiController.getBestOffersByHotel);

  // Hotel-specific offers endpoint
  router.get('/hotels/:hotelId/offers', validateHotelId, validateSearchCriteria, apiController.getHotelOffers);

  // NEW ENHANCED ENDPOINTS
  
  // Shortlist management
  router.post('/shortlists', apiController.createShortlist);
  router.get('/shortlists/:userId', apiController.getUserShortlists);
  router.post('/shortlists/:shortlistId/items', apiController.addToShortlist);
  router.delete('/shortlists/:shortlistId/items/:hotelId', apiController.removeFromShortlist);
  router.delete('/shortlists/:shortlistId', apiController.deleteShortlist);

  // Price alerts
  router.post('/price-alerts', apiController.createPriceAlert);
  router.get('/price-alerts/:userId', apiController.getUserPriceAlerts);
  router.patch('/price-alerts/:alertId', apiController.updatePriceAlert);
  router.delete('/price-alerts/:alertId', apiController.deletePriceAlert);

  // Smart recommendations
  router.get('/recommendations/:userId', validateSearchCriteria, apiController.getRecommendations);
  router.get('/recommendations/:userId/similar/:hotelId', validateSearchCriteria, apiController.getSimilarHotels);
  router.get('/recommendations/trending', validateSearchCriteria, apiController.getTrendingHotels);
  router.get('/recommendations/value-deals', validateSearchCriteria, apiController.getValueDeals);

  // Filter options (for frontend dropdowns)
  router.get('/filters/meal-types', apiController.getMealTypes);
  router.get('/filters/room-types', apiController.getRoomTypes);
  router.get('/filters/airports', apiController.getAirports);

  // Cache management
  router.get('/cache/stats', apiController.getCacheStats);
  router.delete('/cache', apiController.clearCache);

  return router;
}