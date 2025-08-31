/**
 * Express middleware functions
 */

import { Request, Response, NextFunction } from "express";
import onHeaders from "on-headers";
import {
  ErrorResponse,
  SearchCriteria,
  DataValidator,
  DateUtils,
} from "../types";

// Performance metrics storage
interface PerformanceMetrics {
  totalRequests: number;
  totalResponseTime: number;
  slowRequests: number;
  requestsByEndpoint: Map<
    string,
    {
      count: number;
      totalTime: number;
      slowCount: number;
      maxTime: number;
      minTime: number;
    }
  >;
  recentRequests: Array<{
    timestamp: number;
    duration: number;
    endpoint: string;
    method: string;
  }>;
}

const performanceMetrics: PerformanceMetrics = {
  totalRequests: 0,
  totalResponseTime: 0,
  slowRequests: 0,
  requestsByEndpoint: new Map(),
  recentRequests: [],
};

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  WARNING: 1000, // 1 second - target response time
  CRITICAL: 5000, // 5 seconds - maximum acceptable response time
  ALERT_WINDOW: 60000, // 1 minute window for alerts
  MAX_RECENT_REQUESTS: 1000, // Keep last 1000 requests for analysis
};

export const performanceMonitoring = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = process.hrtime.bigint();
  const requestId = Math.random().toString(36).substring(7);
  const endpoint = `${req.method} ${req.route?.path || req.path}`;

  // Add request ID and start time to request object
  (req as Request & { requestId: string; startTime: bigint }).requestId =
    requestId;
  (req as Request & { requestId: string; startTime: bigint }).startTime = start;

  // Set headers just before they are sent
  onHeaders(res, function () {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    res.setHeader("x-response-time", `${Math.max(1, Math.round(duration))}ms`);
    res.setHeader("x-request-id", requestId);
    // Store duration for logging/metrics after response
    (res as any)._perfDuration = duration;
  });

  res.on("finish", () => {
    // Use stored duration from onHeaders
    const duration = (res as any)._perfDuration || 0;
    updatePerformanceMetrics(endpoint, duration, req.method);
    logRequest(req, res, duration, requestId);
    checkPerformanceAlerts(endpoint, duration);
  });
  next();
};

function updatePerformanceMetrics(
  endpoint: string,
  duration: number,
  method: string,
): void {
  performanceMetrics.totalRequests++;
  performanceMetrics.totalResponseTime += duration;

  if (duration > PERFORMANCE_THRESHOLDS.WARNING) {
    performanceMetrics.slowRequests++;
  }

  // Update endpoint-specific metrics
  if (!performanceMetrics.requestsByEndpoint.has(endpoint)) {
    performanceMetrics.requestsByEndpoint.set(endpoint, {
      count: 0,
      totalTime: 0,
      slowCount: 0,
      maxTime: 0,
      minTime: Infinity,
    });
  }

  const endpointMetrics = performanceMetrics.requestsByEndpoint.get(endpoint)!;
  endpointMetrics.count++;
  endpointMetrics.totalTime += duration;
  endpointMetrics.maxTime = Math.max(endpointMetrics.maxTime, duration);
  endpointMetrics.minTime = Math.min(endpointMetrics.minTime, duration);

  if (duration > PERFORMANCE_THRESHOLDS.WARNING) {
    endpointMetrics.slowCount++;
  }

  // Add to recent requests (keep only last N requests)
  performanceMetrics.recentRequests.push({
    timestamp: Date.now(),
    duration,
    endpoint,
    method,
  });
  // Bulk trim if exceeding max size
  if (
    performanceMetrics.recentRequests.length >
    PERFORMANCE_THRESHOLDS.MAX_RECENT_REQUESTS
  ) {
    performanceMetrics.recentRequests = performanceMetrics.recentRequests.slice(
      -PERFORMANCE_THRESHOLDS.MAX_RECENT_REQUESTS,
    );
  }
}

function logRequest(
  req: Request,
  res: Response,
  duration: number,
  requestId: string,
): void {
  const level =
    duration > PERFORMANCE_THRESHOLDS.CRITICAL
      ? "ERROR"
      : duration > PERFORMANCE_THRESHOLDS.WARNING
        ? "WARN"
        : "INFO";

  const logMessage = `${new Date().toISOString()} - [${level}] ${req.method} ${req.path} - ${res.statusCode} - ${duration.toFixed(2)}ms - ID: ${requestId}`;

  if (level === "ERROR") {
    console.error(logMessage);
  } else if (level === "WARN") {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}

function checkPerformanceAlerts(endpoint: string, duration: number): void {
  if (duration > PERFORMANCE_THRESHOLDS.CRITICAL) {
    console.error(
      `🚨 CRITICAL PERFORMANCE ALERT: ${endpoint} took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.CRITICAL}ms)`,
    );
  } else if (duration > PERFORMANCE_THRESHOLDS.WARNING) {
    console.warn(
      `⚠️  PERFORMANCE WARNING: ${endpoint} took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.WARNING}ms)`,
    );
  }

  // Check for sustained poor performance
  const recentSlowRequests = performanceMetrics.recentRequests.filter(
    (req) =>
      req.endpoint === endpoint &&
      req.duration > PERFORMANCE_THRESHOLDS.WARNING &&
      Date.now() - req.timestamp < PERFORMANCE_THRESHOLDS.ALERT_WINDOW,
  );

  if (recentSlowRequests.length >= 5) {
    console.error(
      `🚨 SUSTAINED PERFORMANCE ALERT: ${endpoint} has ${recentSlowRequests.length} slow requests in the last minute`,
    );
  }
}

// Export function to get current performance metrics
export function getPerformanceMetrics(): {
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    slowRequestPercentage: number;
  };
  byEndpoint: Array<{
    endpoint: string;
    count: number;
    averageTime: number;
    maxTime: number;
    minTime: number;
    slowRequestPercentage: number;
  }>;
  recentAlerts: Array<{
    timestamp: number;
    duration: number;
    endpoint: string;
    method: string;
  }>;
} {
  const summary = {
    totalRequests: performanceMetrics.totalRequests,
    averageResponseTime:
      performanceMetrics.totalRequests > 0
        ? performanceMetrics.totalResponseTime /
          performanceMetrics.totalRequests
        : 0,
    slowRequestPercentage:
      performanceMetrics.totalRequests > 0
        ? (performanceMetrics.slowRequests / performanceMetrics.totalRequests) *
          100
        : 0,
  };

  const byEndpoint = Array.from(
    performanceMetrics.requestsByEndpoint.entries(),
  ).map(([endpoint, metrics]) => ({
    endpoint,
    count: metrics.count,
    averageTime: metrics.totalTime / metrics.count,
    maxTime: metrics.maxTime,
    minTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
    slowRequestPercentage: (metrics.slowCount / metrics.count) * 100,
  }));

  const recentAlerts = performanceMetrics.recentRequests
    .filter((req) => req.duration > PERFORMANCE_THRESHOLDS.WARNING)
    .slice(-20); // Last 20 slow requests

  return { summary, byEndpoint, recentAlerts };
}

// Legacy function for backward compatibility
export const requestLogger = performanceMonitoring;

// Input validation middleware for API endpoints
export const validateSearchCriteria = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId =
    (req as Request & { requestId?: string }).requestId || "unknown";

  try {
    // Parse search criteria from query parameters
    const searchCriteria = parseSearchCriteria(req.query);

    // Validate the parsed criteria
    const validation = DataValidator.validateSearchCriteria(searchCriteria);

    if (!validation.isValid) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid search parameters",
          details: {
            errors: validation.errors,
            receivedParameters: Object.keys(req.query),
          },
        },
        timestamp: new Date().toISOString(),
        requestId,
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Attach validated criteria to request for use in controllers
    (req as any).validatedSearchCriteria = searchCriteria;
    next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown validation error";
    console.error(
      `[${new Date().toISOString()}] [ValidationMiddleware] Search criteria validation failed:`,
      error,
    );

    const errorResponse: ErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate search parameters",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(400).json(errorResponse);
  }
};

export const validateHotelId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId =
    (req as Request & { requestId?: string }).requestId || "unknown";
  try {
    const { hotelId } = req.params;
    if (!hotelId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Hotel ID is required",
          details: {
            parameter: "hotelId",
            location: "path",
          },
        },
        timestamp: new Date().toISOString(),
        requestId,
      };
      res.status(400).json(errorResponse);
      return;
    }
    // Reject decimal, negative, zero, or non-integer hotel IDs before parsing
    if (!/^[1-9]\d*$/.test(hotelId)) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid hotel ID",
          details: {
            errors: ["hotelId must be a positive integer"],
            receivedValue: hotelId,
          },
        },
        timestamp: new Date().toISOString(),
        requestId,
      };
      res.status(400).json(errorResponse);
      return;
    }
    const hotelIdNum = parseInt(hotelId, 10);
    // Check hotel existence using global searchEngine (attached to req.app.locals)
    const searchEngine = req.app.locals.searchEngine;
    if (typeof searchEngine?.getHotel === "function") {
      const hotel = searchEngine.getHotel(hotelIdNum);
      if (!hotel) {
        const errorResponse: ErrorResponse = {
          error: {
            code: "HOTEL_NOT_FOUND",
            message: `Hotel with ID ${hotelIdNum} not found`,
            details: {
              parameter: "hotelId",
              receivedValue: hotelIdNum,
            },
          },
          timestamp: new Date().toISOString(),
          requestId,
        };
        res.status(404).json(errorResponse);
        return;
      }
    }
    // Attach validated hotel ID to request
    (req as any).validatedHotelId = hotelIdNum;
    next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown validation error";
    console.error(
      `[${new Date().toISOString()}] [ValidationMiddleware] Hotel ID validation failed:`,
      error,
    );
    const errorResponse: ErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate hotel ID",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
    res.status(400).json(errorResponse);
  }
};

// Helper function to parse search criteria from query parameters
function parseSearchCriteria(query: any): Partial<SearchCriteria> {
  const criteria: Partial<SearchCriteria> = {};

  // Parse departure airports
  if (query.departureAirports) {
    if (Array.isArray(query.departureAirports)) {
      criteria.departureAirports = query.departureAirports.map(
        (airport: any) =>
          typeof airport === "string" ? airport : String(airport),
      );
    } else if (typeof query.departureAirports === "string") {
      // Handle single airport or comma-separated airports
      const airports = query.departureAirports
        .split(",")
        .map((s: string) => s.trim());
      criteria.departureAirports = airports;
    }
  }

  // Parse dates
  if (query.earliestDepartureDate) {
    const date = DateUtils.parseDate(query.earliestDepartureDate);
    if (date) {
      criteria.earliestDepartureDate = date;
    }
  }

  if (query.latestReturnDate) {
    const date = DateUtils.parseDate(query.latestReturnDate);
    if (date) {
      criteria.latestReturnDate = date;
    }
  }

  // Parse numeric parameters
  if (query.duration) {
    const duration = parseInt(query.duration, 10);
    if (!isNaN(duration)) {
      criteria.duration = duration;
    }
  }

  if (query.countAdults !== undefined) {
    const countAdults = Number(query.countAdults);
    if (!isNaN(countAdults)) {
      criteria.countAdults = countAdults;
    }
  }

  if (query.countChildren !== undefined) {
    const countChildren = Number(query.countChildren);
    if (!isNaN(countChildren)) {
      criteria.countChildren = countChildren;
    }
  }

  return criteria;
}

// System error types for better error categorization
export enum SystemErrorType {
  DATA_LOADING_ERROR = "DATA_LOADING_ERROR",
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  MEMORY_ERROR = "MEMORY_ERROR",
  SEARCH_ENGINE_ERROR = "SEARCH_ENGINE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

// Enhanced error class for system errors
export class SystemError extends Error {
  public readonly type: SystemErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    type: SystemErrorType,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = "SystemError";
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context || {};

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, SystemError);
  }
}

// Error logging utility
export class ErrorLogger {
  private static logError(
    error: Error | SystemError,
    context?: Record<string, any>,
  ): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof SystemError && {
        type: error.type,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        context: error.context,
      }),
      ...context,
    };

    // Log to console (in production, this would go to a proper logging service)
    console.error(
      `[${timestamp}] [SystemError]`,
      JSON.stringify(errorInfo, null, 2),
    );

    // In production, you might want to send critical errors to monitoring services
    if (error instanceof SystemError && !error.isOperational) {
      console.error(
        `[${timestamp}] [CRITICAL] Non-operational error detected:`,
        error.message,
      );
    }
  }

  public static logDataLoadingError(
    error: Error,
    filePath?: string,
    recordCount?: number,
  ): void {
    this.logError(error, {
      category: "DATA_LOADING",
      filePath,
      recordCount,
      severity: "HIGH",
    });
  }

  public static logSearchError(
    error: Error,
    searchCriteria?: any,
    executionTime?: number,
  ): void {
    this.logError(error, {
      category: "SEARCH_ENGINE",
      searchCriteria,
      executionTime,
      severity: "MEDIUM",
    });
  }

  public static logValidationError(error: Error, requestData?: any): void {
    this.logError(error, {
      category: "VALIDATION",
      requestData,
      severity: "LOW",
    });
  }

  public static logSystemError(
    error: Error,
    systemInfo?: Record<string, any>,
  ): void {
    this.logError(error, {
      category: "SYSTEM",
      systemInfo,
      severity: "HIGH",
    });
  }
}

// Graceful degradation handler
export class GracefulDegradationHandler {
  private static fallbackResponses = {
    searchUnavailable: {
      error: {
        code: "SEARCH_TEMPORARILY_UNAVAILABLE",
        message:
          "Search service is temporarily unavailable. Please try again later.",
        details: {
          suggestedRetryAfter: "30 seconds",
          alternativeEndpoints: ["/health", "/status"],
        },
      },
    },
    partialDataAvailable: {
      error: {
        code: "PARTIAL_DATA_AVAILABLE",
        message: "Some data is unavailable, results may be incomplete.",
        details: {
          dataStatus: "partial",
          affectedFeatures: ["hotel search", "offer filtering"],
        },
      },
    },
  };

  public static handleDataLoadingFailure(
    res: Response,
    requestId: string,
    error: Error,
    partialData?: { hotels?: number; offers?: number },
  ): void {
    ErrorLogger.logDataLoadingError(error, undefined, partialData?.offers);

    if (partialData && (partialData.hotels || partialData.offers)) {
      // Partial data available - allow degraded service
      const errorResponse: ErrorResponse = {
        ...this.fallbackResponses.partialDataAvailable,
        timestamp: new Date().toISOString(),
        requestId,
      };

      errorResponse.error.details = {
        ...((errorResponse.error.details as Record<string, any>) || {}),
        availableData: partialData,
      };

      res.status(206).json(errorResponse); // 206 Partial Content
    } else {
      // No data available - service unavailable
      const errorResponse: ErrorResponse = {
        ...this.fallbackResponses.searchUnavailable,
        timestamp: new Date().toISOString(),
        requestId,
      };

      res.status(503).json(errorResponse);
    }
  }

  public static handleSearchEngineFailure(
    res: Response,
    requestId: string,
    error: Error,
    fallbackData?: any,
  ): void {
    ErrorLogger.logSearchError(error);

    if (fallbackData) {
      // Return cached or fallback data with warning
      res.status(200).json({
        ...fallbackData,
        warning: {
          code: "USING_CACHED_DATA",
          message: "Current search results may not reflect the latest data",
        },
        timestamp: new Date().toISOString(),
        requestId,
      });
    } else {
      const errorResponse: ErrorResponse = {
        ...this.fallbackResponses.searchUnavailable,
        timestamp: new Date().toISOString(),
        requestId,
      };

      res.status(503).json(errorResponse);
    }
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  let requestId = (req as Request & { requestId?: string }).requestId;
  if (!requestId) {
    requestId = Math.random().toString(36).substring(7);
    res.setHeader("x-request-id", requestId);
  }

  // Skip logging PayloadTooLargeError for POST requests to GET-only endpoints
  // as these will be converted to 404 responses
  const shouldSkipLogging =
    error.name === "PayloadTooLargeError" &&
    req.method === "POST" &&
    req.path === "/api/bestOffersByHotel";

  if (!shouldSkipLogging) {
    // Enhanced error logging
    ErrorLogger.logSystemError(error, {
      requestId,
      method: req.method,
      path: req.path,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    });
  }

  // Handle SystemError instances
  if (error instanceof SystemError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: error.type,
        message: error.message,
        details:
          process.env.NODE_ENV === "development"
            ? {
                context: error.context,
                stack: error.stack,
              }
            : undefined,
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Special case: PayloadTooLargeError for POST /api/bestOffersByHotel should return 404
  if (
    error.name === "PayloadTooLargeError" &&
    req.method === "POST" &&
    req.path === "/api/bestOffersByHotel"
  ) {
    const errorResponse: ErrorResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Endpoint ${req.method} ${req.path} not found`,
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
    res.status(404).json(errorResponse);
    return;
  }

  // Determine error type and appropriate response for standard errors
  let statusCode = 500;
  let errorCode = SystemErrorType.INTERNAL_SERVER_ERROR;
  let message = "An internal server error occurred";

  // Handle specific error types
  if (error.name === "ValidationError") {
    statusCode = 400;
    errorCode = SystemErrorType.VALIDATION_ERROR;
    message = "Request validation failed";
  } else if (
    error.name === "TypeError" &&
    error.message.includes("Cannot read property")
  ) {
    statusCode = 400;
    errorCode = SystemErrorType.VALIDATION_ERROR;
    message = "Invalid request format";
  } else if (error.message.includes("timeout")) {
    statusCode = 504;
    errorCode = SystemErrorType.TIMEOUT_ERROR;
    message = "Request timed out";
  } else if (
    error.message.includes("ENOENT") ||
    error.message.includes("file not found")
  ) {
    statusCode = 503;
    errorCode = SystemErrorType.FILE_SYSTEM_ERROR;
    message = "Required data files are not available";
  } else if (
    error.message.includes("ENOMEM") ||
    error.message.includes("out of memory")
  ) {
    statusCode = 503;
    errorCode = SystemErrorType.MEMORY_ERROR;
    message = "Insufficient memory to process request";
  } else if (
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("network")
  ) {
    statusCode = 503;
    errorCode = SystemErrorType.NETWORK_ERROR;
    message = "Network connectivity issue";
  }

  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message,
      details:
        process.env.NODE_ENV === "development"
          ? {
              originalError: error.message,
              stack: error.stack,
            }
          : undefined,
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  let requestId = (req as Request & { requestId?: string }).requestId;
  if (!requestId) {
    requestId = Math.random().toString(36).substring(7);
    res.setHeader("x-request-id", requestId);
  }

  const errorResponse: ErrorResponse = {
    error: {
      code: "NOT_FOUND",
      message: `Endpoint ${req.method} ${req.path} not found`,
      details: {
        method: req.method,
        path: req.path,
      },
    },
    timestamp: new Date().toISOString(),
    requestId,
  };
  res.status(404).json(errorResponse);
};
