/**
 * API Controllers for the Mallorca Travel Backend
 */

import { Request, Response } from "express";
import {
  HealthStatus,
  ErrorResponse,
  SearchCriteria,
  DateUtils,
} from "../types";
import { UnifiedSearchEngine } from "../services/search/unifiedSearchEngine";
import { ISearchEngine } from "../services/search/searchEngineInterface";
import {
  getPerformanceMetrics,
  SystemError,
  SystemErrorType,
  ErrorLogger,
  GracefulDegradationHandler,
} from "../middleware";
import { shortlistService } from "../services/user/shortlistService";
import { cacheService } from "../services/optimization/cacheService";
import RecommendationService from "../services/user/recommendationService";

export class ApiController {
  private startTime: number;
  private dataLoaded: boolean = false;
  private offersCount: number = 0;
  private hotelsCount: number = 0;
  private searchEngine?: ISearchEngine;
  private recommendationService?: RecommendationService;
  private loadingProgress: number = 0;
  private loadingStatus: string = "idle";

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Set the search engine instance (called after data loading)
   */
  public setSearchEngine(searchEngine: ISearchEngine): void {
    this.searchEngine = searchEngine;
    // Only create RecommendationService if it's a UnifiedSearchEngine
    if (searchEngine instanceof UnifiedSearchEngine) {
      this.recommendationService = new RecommendationService(searchEngine);
    }
  }

  /**
   * Health check endpoint
   */
  public getHealth = (req: Request, res: Response): void => {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    
    const healthStatus: HealthStatus & {
      system?: {
        memoryUsage: {
          rss: number;
          heapUsed: number;
          heapTotal: number;
          external: number;
        };
        uptime: number;
        nodeVersion: string;
        platform: string;
      };
      searchEngine?: {
        performanceStats?: Record<string, unknown>;
        indexStats?: Record<string, unknown>;
      };
    } = {
      status: this.dataLoaded ? "healthy" : "loading",
      timestamp: new Date().toISOString(),
      dataLoaded: this.dataLoaded,
      uptime,
      ...(this.dataLoaded && {
        offersCount: this.offersCount,
        hotelsCount: this.hotelsCount,
      }),
      system: {
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        },
        uptime,
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    // Add search engine performance stats if available
    if (this.searchEngine && this.dataLoaded) {
      try {
        const performanceStats = this.searchEngine.getPerformanceStats();
        healthStatus.searchEngine = {
          performanceStats: {
            totalSearches: performanceStats.totalSearches,
            averageExecutionTime:
              Math.round(performanceStats.averageExecutionTime * 100) / 100,
            cacheHitRate: performanceStats.cacheHitRate,
            memoryUsage: performanceStats.memoryUsage,
            optimizationLevel: performanceStats.optimizationLevel,
          },
        };
      } catch (error) {
        // Ignore errors getting performance stats
        console.warn("Failed to get search engine performance stats:", error);
      }
    }

    // Set appropriate HTTP status based on health
    const httpStatus = this.dataLoaded ? 200 : 503;
    
    res.status(httpStatus).json(healthStatus);
  };

  /**
   * Performance metrics endpoint
   */
  public getPerformanceMetrics = (_req: Request, res: Response): void => {
    try {
      const metrics = getPerformanceMetrics();
      
      // Add additional system performance data
      const memoryUsage = process.memoryUsage();
      const uptime = Date.now() - this.startTime;
      
      const performanceData = {
        ...metrics,
        system: {
          uptime,
          memoryUsage: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          },
          nodeVersion: process.version,
          platform: process.platform,
        },
        searchEngine:
          this.searchEngine && this.dataLoaded
            ? this.searchEngine.getPerformanceStats()
            : null,
        timestamp: new Date().toISOString(),
      };
      
      res.json(performanceData);
    } catch (error) {
      console.error("Failed to get performance metrics:", error);
      res.status(500).json({
        error: {
          code: "METRICS_ERROR",
          message: "Failed to retrieve performance metrics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * System status endpoint with detailed information
   */
  public getSystemStatus = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    
    const systemStatus: Record<string, unknown> = {
      service: {
        name: "Mallorca Travel Backend",
        version: "1.0.0",
        status: this.dataLoaded ? "operational" : "starting",
        uptime,
        startTime: new Date(this.startTime).toISOString(),
      },
      data: {
        loaded: this.dataLoaded,
        offersCount: this.offersCount,
        hotelsCount: this.hotelsCount,
        loadingProgress: this.loadingProgress,
        loadingStatus: this.loadingStatus,
      },
      system: {
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      timestamp: new Date().toISOString(),
      requestId,
    };

    // Add search engine statistics if available
    if (this.searchEngine && this.dataLoaded) {
      try {
        const performanceStats = this.searchEngine.getPerformanceStats();
        (systemStatus as any).searchEngine = {
          performance: {
            totalSearches: performanceStats.totalSearches,
            averageExecutionTime:
              Math.round(performanceStats.averageExecutionTime * 100) / 100,
            cacheHitRate: performanceStats.cacheHitRate,
            memoryUsage: performanceStats.memoryUsage,
            optimizationLevel: performanceStats.optimizationLevel,
          },
          configuration: this.searchEngine.getConfig?.() || {},
        };
      } catch (error) {
        console.warn("Failed to get search engine stats:", error);
      }
    }

    res.json(systemStatus);
  };

  /**
   * Creates a standardized error response
   */
  public static createErrorResponse(
    code: string,
    message: string,
    requestId: string,
    details?: Record<string, unknown>,
  ): ErrorResponse {
    return {
      error: {
        code,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  /**
   * Sends a standardized error response
   */
  public static sendErrorResponse(
    res: Response,
    statusCode: number,
    errorCode: string,
    message: string,
    requestId: string,
    details?: Record<string, unknown>,
  ): void {
    const errorResponse = ApiController.createErrorResponse(
      errorCode,
      message,
      requestId,
      details,
    );
    res.status(statusCode).json(errorResponse);
  }

  /**
   * Get best offers by hotel endpoint
   */
  public getBestOffersByHotel = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    console.log('DEBUG: ApiController.getBestOffersByHotel called');
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";
    const startTime = Date.now();
    
    try {
      // Check if service is ready
      if (!this.dataLoaded || !this.searchEngine) {
        ApiController.sendErrorResponse(
          res,
          503,
          "SERVICE_UNAVAILABLE",
          "Data is still loading, please try again later",
          requestId,
        );
        return;
      }

      // Get validated search criteria from middleware
      const searchCriteria = (
        req as Request & { validatedSearchCriteria: SearchCriteria }
      ).validatedSearchCriteria;

      // Execute search
      console.log('DEBUG: About to call searchEngine.findBestOffersByHotel, searchEngine type:', this.searchEngine.constructor.name);
      console.log('DEBUG: Search criteria:', JSON.stringify(searchCriteria, null, 2));
      const bestOffers =
        await this.searchEngine.findBestOffersByHotel(searchCriteria);
      console.log('DEBUG: Search completed, got', bestOffers.length, 'results');
      
      // Convert to API response format
      const response = bestOffers.map((offer) => ({
        hotel: {
          id: offer.hotelId,
          name: offer.hotelName,
          stars: offer.hotelStars,
        },
        minPrice: offer.minPrice,
        departureDate: DateUtils.formatDate(offer.departureDate),
        returnDate: DateUtils.formatDate(offer.returnDate),
        roomType: offer.roomType,
        mealType: offer.mealType,
        countAdults: offer.countAdults,
        countChildren: offer.countChildren,
        duration: offer.duration,
        countAvailableOffers: offer.availableOffers,
      }));
      
      // Add performance headers
      res.set({
        "X-Request-ID": requestId,
        "X-Result-Count": response.length.toString(),
      });

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      
      // Enhanced error logging
      ErrorLogger.logSearchError(
        error as Error,
        (req as Request & { validatedSearchCriteria?: SearchCriteria })
          .validatedSearchCriteria,
        executionTime,
      );
      
      // Handle different types of search errors with graceful degradation
      if (errorMessage.includes("timeout") || executionTime > 10000) {
        throw new SystemError(
          SystemErrorType.TIMEOUT_ERROR,
          "Search request timed out",
          504,
          true,
          {
            executionTime,
            searchCriteria: (
              req as Request & { validatedSearchCriteria?: SearchCriteria }
            ).validatedSearchCriteria,
          },
        );
      } else if (
        errorMessage.includes("memory") ||
        errorMessage.includes("ENOMEM")
      ) {
        throw new SystemError(
          SystemErrorType.MEMORY_ERROR,
          "Insufficient memory to complete search",
          503,
          true,
          { executionTime, memoryUsage: process.memoryUsage() },
        );
      } else {
        // Try graceful degradation - could return cached results or partial data
        GracefulDegradationHandler.handleSearchEngineFailure(
          res,
          requestId,
          error as Error,
        );
      }
    }
  };

  /**
   * Get hotel offers endpoint
   */
  public getHotelOffers = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";
    const startTime = Date.now();
    
    try {
      // Check if service is ready
      if (!this.dataLoaded || !this.searchEngine) {
        ApiController.sendErrorResponse(
          res,
          503,
          "SERVICE_UNAVAILABLE",
          "Data is still loading, please try again later",
          requestId,
        );
        return;
      }

      // Get validated data from middleware
      const hotelIdNum = (req as Request & { validatedHotelId: number })
        .validatedHotelId;
      const searchCriteria = (
        req as Request & { validatedSearchCriteria: SearchCriteria }
      ).validatedSearchCriteria;

      // Execute search for hotel offers
      const offers = await this.searchEngine.findHotelOffers(
        hotelIdNum,
        searchCriteria,
      );
      
      // Get hotel information (we need to get it from the search engine)
      const hotel = this.getHotelInfo(hotelIdNum);
      
      if (!hotel) {
        ApiController.sendErrorResponse(
          res,
          404,
          "HOTEL_NOT_FOUND",
          `Hotel with ID ${hotelIdNum} not found`,
          requestId,
        );
        return;
      }

      // Convert offers to API response format
      const response = {
        hotel: {
          id: hotel.id,
          name: hotel.name,
          stars: hotel.stars,
        },
        items: offers.map((offer) => ({
          price: offer.price,
          countAdults: offer.countAdults,
          countChildren: offer.countChildren,
          inboundDepartureAirport: offer.inboundDepartureAirport,
          inboundDepartureDatetime:
            offer.inboundDepartureDateTime.toISOString(),
          inboundArrivalAirport: offer.inboundArrivalAirport,
          inboundArrivalDatetime: offer.inboundDepartureDateTime.toISOString(), // Note: using departure time as arrival time is not in our data model
          outboundDepartureAirport: offer.outboundDepartureAirport,
          outbundDepartureDatetime:
            offer.outboundDepartureDateTime.toISOString(), // Note: typo in API spec
          outboundArrivalAirport: offer.outboundArrivalAirport,
          outboundArrivalDatetime:
            offer.outboundDepartureDateTime.toISOString(), // Note: using departure time as arrival time is not in our data model
          mealType: offer.mealType,
          oceanView: offer.oceanView,
          roomType: offer.roomType,
        })),
      };
      
      // Add performance headers
      res.set({
        "X-Request-ID": requestId,
        "X-Result-Count": response.items.length.toString(),
      });

      res.json(response);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      
      // Enhanced error logging
      ErrorLogger.logSearchError(
        error as Error,
        {
          hotelId: (req as Request & { validatedHotelId?: number })
            .validatedHotelId,
          searchCriteria: (
            req as Request & { validatedSearchCriteria?: SearchCriteria }
          ).validatedSearchCriteria,
        },
        executionTime,
      );
      
      // Handle different types of search errors with graceful degradation
      if (errorMessage.includes("timeout") || executionTime > 10000) {
        throw new SystemError(
          SystemErrorType.TIMEOUT_ERROR,
          "Hotel search request timed out",
          504,
          true,
          {
            executionTime,
            hotelId: (req as Request & { validatedHotelId?: number })
              .validatedHotelId,
          },
        );
      } else if (
        errorMessage.includes("memory") ||
        errorMessage.includes("ENOMEM")
      ) {
        throw new SystemError(
          SystemErrorType.MEMORY_ERROR,
          "Insufficient memory to complete hotel search",
          503,
          true,
          { executionTime, memoryUsage: process.memoryUsage() },
        );
      } else {
        // Try graceful degradation
        GracefulDegradationHandler.handleSearchEngineFailure(
          res,
          requestId,
          error as Error,
        );
      }
    }
  };

  /**
   * Update data loading status (used by data loader)
   */
  public updateDataStatus(
    loaded: boolean,
    offersCount: number = 0,
    hotelsCount: number = 0,
  ): void {
    this.dataLoaded = loaded;
    this.offersCount = offersCount;
    this.hotelsCount = hotelsCount;
    this.loadingProgress = loaded ? 100 : this.loadingProgress;
    this.loadingStatus = loaded ? "completed" : "loading";
  }

  /**
   * Update loading progress (used by data loader during loading)
   */
  public updateLoadingProgress(progress: number, status: string): void {
    this.loadingProgress = Math.max(0, Math.min(100, progress));
    this.loadingStatus = status;
  }

  /**
   * Get hotel information by ID
   */
  private getHotelInfo(
    hotelId: number,
  ): { id: number; name: string; stars: number } | null {
    if (!this.searchEngine) {
      return null;
    }

    const hotel = this.searchEngine.getHotel(hotelId);
    return hotel || null;
  }

  // ===========================================
  // NEW ENHANCED ENDPOINTS
  // ===========================================

  /**
   * Creates a new shortlist
   */
  public createShortlist = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const { userId, name } = req.body;

      if (!userId || !name) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "userId and name are required",
          requestId,
        );
        return;
      }

      const shortlist = shortlistService.createShortlist(userId, name);
      res.status(201).json(shortlist);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "SHORTLIST_CREATION_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets all shortlists for a user
   */
  public getUserShortlists = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const { userId } = req.params;
      if (!userId) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "userId is required",
          requestId,
        );
        return;
      }
      const shortlists = shortlistService.getUserShortlists(userId);
      res.json(shortlists);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "SHORTLIST_FETCH_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Adds a hotel to a shortlist
   */
  public addToShortlist = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const { shortlistId } = req.params;
      const { hotelId, priceWhenAdded, offerId, notes } = req.body;

      if (!shortlistId || !hotelId || priceWhenAdded === undefined) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "shortlistId, hotelId and priceWhenAdded are required",
          requestId,
        );
        return;
      }

      const item = shortlistService.addToShortlist(
        shortlistId,
        hotelId,
        priceWhenAdded,
        offerId,
        notes,
      );

      if (!item) {
        ApiController.sendErrorResponse(
          res,
          404,
          "SHORTLIST_NOT_FOUND",
          "Shortlist not found",
          requestId,
        );
        return;
      }

      res.status(201).json(item);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "SHORTLIST_ADD_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Removes a hotel from a shortlist
   */
  public removeFromShortlist = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const { shortlistId, hotelId } = req.params;
      if (!shortlistId || !hotelId) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "shortlistId and hotelId are required",
          requestId,
        );
        return;
      }
      const success = shortlistService.removeFromShortlist(
        shortlistId,
        parseInt(hotelId),
      );

      if (!success) {
        ApiController.sendErrorResponse(
          res,
          404,
          "ITEM_NOT_FOUND",
          "Shortlist or hotel not found",
          requestId,
        );
        return;
      }

      res.status(204).send();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "SHORTLIST_REMOVE_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Deletes a shortlist
   */
  public deleteShortlist = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const { shortlistId } = req.params;
      if (!shortlistId) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "shortlistId is required",
          requestId,
        );
        return;
      }
      const success = shortlistService.deleteShortlist(shortlistId);

      if (!success) {
        ApiController.sendErrorResponse(
          res,
          404,
          "SHORTLIST_NOT_FOUND",
          "Shortlist not found",
          requestId,
        );
        return;
      }

      res.status(204).send();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "SHORTLIST_DELETE_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Creates a price alert
   */
  public createPriceAlert = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const { userId, hotelId, targetPrice } = req.body;

      if (!userId || !hotelId || targetPrice === undefined) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "userId, hotelId, and targetPrice are required",
          requestId,
        );
        return;
      }

      const alert = shortlistService.createPriceAlert(
        userId,
        hotelId,
        targetPrice,
      );
      res.status(201).json(alert);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "PRICE_ALERT_CREATION_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets all price alerts for a user
   */
  public getUserPriceAlerts = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const { userId } = req.params;
      if (!userId) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "userId is required",
          requestId,
        );
        return;
      }
      const alerts = shortlistService.getUserPriceAlerts(userId);
      res.json(alerts);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "PRICE_ALERT_FETCH_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Updates a price alert
   */
  public updatePriceAlert = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const { alertId } = req.params;
      const { isActive } = req.body;

      if (!alertId || isActive === undefined) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "alertId and isActive are required",
          requestId,
        );
        return;
      }

      const success = shortlistService.updatePriceAlert(alertId, isActive);

      if (!success) {
        ApiController.sendErrorResponse(
          res,
          404,
          "PRICE_ALERT_NOT_FOUND",
          "Price alert not found",
          requestId,
        );
        return;
      }

      res.status(204).send();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "PRICE_ALERT_UPDATE_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Deletes a price alert
   */
  public deletePriceAlert = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const { alertId } = req.params;
      if (!alertId) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "alertId is required",
          requestId,
        );
        return;
      }
      const success = shortlistService.deletePriceAlert(alertId);

      if (!success) {
        ApiController.sendErrorResponse(
          res,
          404,
          "PRICE_ALERT_NOT_FOUND",
          "Price alert not found",
          requestId,
        );
        return;
      }

      res.status(204).send();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "PRICE_ALERT_DELETE_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets personalized recommendations
   */
  public getRecommendations = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      if (!this.dataLoaded || !this.recommendationService) {
        ApiController.sendErrorResponse(
          res,
          503,
          "SERVICE_UNAVAILABLE",
          "Recommendation service is not available",
          requestId,
        );
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "userId is required",
          requestId,
        );
        return;
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const searchCriteria = (req as any)
        .validatedSearchCriteria as SearchCriteria;

      const recommendations =
        await this.recommendationService.generateRecommendations(
          userId,
          searchCriteria,
          limit,
        );

      res.json(recommendations);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "RECOMMENDATION_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets similar hotels
   */
  public getSimilarHotels = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      if (!this.dataLoaded || !this.recommendationService) {
        ApiController.sendErrorResponse(
          res,
          503,
          "SERVICE_UNAVAILABLE",
          "Recommendation service is not available",
          requestId,
        );
        return;
      }

      const { hotelId } = req.params;
      if (!hotelId) {
        ApiController.sendErrorResponse(
          res,
          400,
          "INVALID_REQUEST",
          "hotelId is required",
          requestId,
        );
        return;
      }
      const limit = parseInt(req.query.limit as string) || 5;
      const searchCriteria = (req as any)
        .validatedSearchCriteria as SearchCriteria;

      const recommendations = await this.recommendationService.getSimilarHotels(
        parseInt(hotelId),
        searchCriteria,
        limit,
      );

      res.json(recommendations);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "SIMILAR_HOTELS_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets trending hotels
   */
  public getTrendingHotels = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      if (!this.dataLoaded || !this.recommendationService) {
        ApiController.sendErrorResponse(
          res,
          503,
          "SERVICE_UNAVAILABLE",
          "Recommendation service is not available",
          requestId,
        );
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const searchCriteria = (req as any)
        .validatedSearchCriteria as SearchCriteria;

      const recommendations =
        await this.recommendationService.getTrendingHotels(
          searchCriteria,
          limit,
        );

      res.json(recommendations);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "TRENDING_HOTELS_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets value deals
   */
  public getValueDeals = async (req: Request, res: Response): Promise<void> => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      if (!this.dataLoaded || !this.recommendationService) {
        ApiController.sendErrorResponse(
          res,
          503,
          "SERVICE_UNAVAILABLE",
          "Recommendation service is not available",
          requestId,
        );
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const searchCriteria = (req as any)
        .validatedSearchCriteria as SearchCriteria;

      const recommendations = await this.recommendationService.getValueDeals(
        searchCriteria,
        limit,
      );

      res.json(recommendations);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "VALUE_DEALS_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets available meal types
   */
  public getMealTypes = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      if (!this.dataLoaded || !this.searchEngine) {
        ApiController.sendErrorResponse(
          res,
          503,
          "SERVICE_UNAVAILABLE",
          "Data is still loading",
          requestId,
        );
        return;
      }

      // Get unique meal types from the search index
      // This is a simplified version - in practice you'd iterate through actual offers

      // For now, return common meal types
      const commonMealTypes = [
        "Breakfast",
        "Half Board",
        "Full Board",
        "All Inclusive",
        "Room Only",
      ];

      res.json(commonMealTypes);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "MEAL_TYPES_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets available room types
   */
  public getRoomTypes = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      if (!this.dataLoaded || !this.searchEngine) {
        ApiController.sendErrorResponse(
          res,
          503,
          "SERVICE_UNAVAILABLE",
          "Data is still loading",
          requestId,
        );
        return;
      }

      // Return common room types
      const commonRoomTypes = [
        "Standard Room",
        "Superior Room",
        "Deluxe Room",
        "Junior Suite",
        "Suite",
        "Family Room",
        "Twin Room",
        "Double Room",
        "Ocean View Room",
        "Balcony Room",
      ];

      res.json(commonRoomTypes);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "ROOM_TYPES_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets available airports
   */
  public getAirports = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      if (!this.dataLoaded || !this.searchEngine) {
        ApiController.sendErrorResponse(
          res,
          503,
          "SERVICE_UNAVAILABLE",
          "Data is still loading",
          requestId,
        );
        return;
      }

      // Return common European airports
      const commonAirports = [
        { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt" },
        { code: "MUC", name: "Munich Airport", city: "Munich" },
        { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris" },
        { code: "LHR", name: "Heathrow Airport", city: "London" },
        { code: "MAD", name: "Madrid-Barajas Airport", city: "Madrid" },
        { code: "FCO", name: "Leonardo da Vinci Airport", city: "Rome" },
        { code: "AMS", name: "Amsterdam Airport Schiphol", city: "Amsterdam" },
        { code: "VIE", name: "Vienna International Airport", city: "Vienna" },
        { code: "ZUR", name: "Zurich Airport", city: "Zurich" },
        { code: "BRU", name: "Brussels Airport", city: "Brussels" },
      ];

      res.json(commonAirports);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "AIRPORTS_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Gets cache statistics
   */
  public getCacheStats = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      const stats = cacheService.getStats();
      res.json({
        cache: stats,
        shortlist: shortlistService.getStats(),
        timestamp: new Date().toISOString(),
        requestId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "CACHE_STATS_ERROR",
        errorMessage,
        requestId,
      );
    }
  };

  /**
   * Clears cache
   */
  public clearCache = (req: Request, res: Response): void => {
    const requestId =
      (req as Request & { requestId?: string }).requestId || "unknown";

    try {
      cacheService.clear();
      res.json({
        message: "Cache cleared successfully",
        timestamp: new Date().toISOString(),
        requestId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      ApiController.sendErrorResponse(
        res,
        500,
        "CACHE_CLEAR_ERROR",
        errorMessage,
        requestId,
      );
    }
  };
}
