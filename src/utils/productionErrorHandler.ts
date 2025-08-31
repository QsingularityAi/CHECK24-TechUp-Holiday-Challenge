/**
 * Production-Ready Error Handling and Resource Management
 * 
 * This module provides comprehensive error handling, recovery mechanisms,
 * and resource management for production environments handling large datasets.
 */

import { EventEmitter } from 'events';
import { ProductionConfig } from '../config/production';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better classification
 */
export enum ErrorCategory {
  DATA_PROCESSING = 'data_processing',
  MEMORY = 'memory',
  IO = 'io',
  NETWORK = 'network',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

/**
 * Structured error information
 */
export interface ErrorInfo {
  id: string;
  timestamp: Date;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  stack?: string;
  context?: Record<string, any>;
  retryCount?: number;
  resolved?: boolean;
  resolvedAt?: Date;
}

/**
 * Resource usage metrics
 */
export interface ResourceMetrics {
  timestamp: Date;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    percentUsed: number;
  };
  cpuUsage: {
    user: number;
    system: number;
    percentUsed: number;
  };
  fileHandles: number;
  activeConnections: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  timestamp: Date;
  operationName: string;
  duration: number;
  recordsProcessed: number;
  throughput: number;
  memoryDelta: number;
  success: boolean;
}

/**
 * Production-ready error handler with recovery mechanisms
 */
export class ProductionErrorHandler extends EventEmitter {
  private config: ProductionConfig;
  private errors: Map<string, ErrorInfo> = new Map();
  private metrics: ResourceMetrics[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private startTime = Date.now();
  private lastGC = Date.now();

  constructor(config: ProductionConfig) {
    super();
    this.config = config;
    this.setupMonitoring();
    this.setupCleanup();
    this.setupProcessHandlers();
  }

  /**
   * Handle an error with automatic classification and recovery
   */
  async handleError(
    error: Error | string,
    context?: Record<string, any>,
    category?: ErrorCategory
  ): Promise<ErrorInfo> {
    const errorInfo: ErrorInfo = <ErrorInfo>{
      id: this.generateErrorId(),
      timestamp: new Date(),
      message: typeof error === 'string' ? error : error.message,
      category: category || this.classifyError(error),
      severity: this.determineSeverity(error, category),
      stack: typeof error === 'object' && error instanceof Error ? error.stack : undefined,
      context,
      retryCount: 0,
      resolved: false
    };

    this.errors.set(errorInfo.id, errorInfo);
    this.logError(errorInfo);
    this.emit('error', errorInfo);

    // Attempt automatic recovery for certain error types
    if (this.config.errorHandling.enableErrorRecovery) {
      await this.attemptRecovery(errorInfo);
    }

    // Check if we need to trigger alerts
    this.checkAlertThresholds();

    return errorInfo;
  }

  /**
   * Retry a failed operation with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries || this.config.errorHandling.maxRetries;
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retries) {
          await this.handleError(lastError, { ...context, finalAttempt: true });
          throw lastError;
        }

        const delay = this.calculateBackoffDelay(attempt);
        await this.handleError(lastError, { ...context, attempt, retryIn: delay });
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Record performance metrics
   */
  recordPerformance(
    operationName: string,
    startTime: number,
    recordsProcessed: number = 0,
    success: boolean = true
  ): void {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const memoryUsage = process.memoryUsage();
    
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      operationName,
      duration,
      recordsProcessed,
      throughput: recordsProcessed > 0 ? recordsProcessed / (duration / 1000) : 0,
      memoryDelta: memoryUsage.heapUsed,
      success
    };

    this.performanceMetrics.push(metrics);
    this.emit('performance', metrics);

    // Keep only recent metrics to prevent memory leaks
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-500);
    }
  }

  /**
   * Get current resource usage
   */
  getCurrentResourceUsage(): ResourceMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date(),
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        percentUsed: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percentUsed: ((cpuUsage.user + cpuUsage.system) / 1000000) * 100 // Convert to percentage
      },
      fileHandles: 0, // Would need platform-specific implementation
      activeConnections: 0 // Would need to track actual connections
    };
  }

  /**
   * Force garbage collection if enabled
   */
  forceGarbageCollection(): void {
    if (this.config.resourceManagement.enableGarbageCollection && global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;
      
      this.lastGC = Date.now();
      
      if (this.config.errorHandling.logLevel === 'debug') {
        console.log(`Garbage collection freed ${(freed / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    resolved: number;
    unresolved: number;
    errorRate: number;
  } {
    const errors = Array.from(this.errors.values());
    const total = errors.length;
    const resolved = errors.filter(e => e.resolved).length;
    const unresolved = total - resolved;
    
    const bySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = errors.filter(e => e.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);
    
    const byCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = errors.filter(e => e.category === category).length;
      return acc;
    }, {} as Record<ErrorCategory, number>);
    
    const totalOperations = this.performanceMetrics.length;
    const errorRate = totalOperations > 0 ? total / totalOperations : 0;
    
    return {
      total,
      bySeverity,
      byCategory,
      resolved,
      unresolved,
      errorRate
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStatistics(): {
    averageThroughput: number;
    averageDuration: number;
    successRate: number;
    totalRecordsProcessed: number;
    uptime: number;
  } {
    const metrics = this.performanceMetrics;
    const successful = metrics.filter(m => m.success);
    
    return {
      averageThroughput: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length : 0,
      averageDuration: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length : 0,
      successRate: metrics.length > 0 ? successful.length / metrics.length : 1,
      totalRecordsProcessed: metrics.reduce((sum, m) => sum + m.recordsProcessed, 0),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Cleanup resources and stop monitoring
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.removeAllListeners();
  }

  // Private methods

  private setupMonitoring(): void {
    if (!this.config.monitoring.enableMetrics) return;

    this.monitoringInterval = setInterval(() => {
      const metrics = this.getCurrentResourceUsage();
      this.metrics.push(metrics);
      this.emit('metrics', metrics);

      // Keep only recent metrics
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-500);
      }

      // Check for memory threshold
      const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
      if (memoryMB > this.config.resourceManagement.memoryThresholdForCleanup) {
        this.forceGarbageCollection();
      }
    }, this.config.monitoring.metricsIntervalMs);
  }

  private setupCleanup(): void {
    if (!this.config.resourceManagement.enableResourceCleanup) return;

    this.cleanupInterval = setInterval(() => {
      // Clean up old errors (keep only last 24 hours)
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const [id, error] of this.errors.entries()) {
        if (error.timestamp.getTime() < cutoff) {
          this.errors.delete(id);
        }
      }

      // Force GC if interval has passed
      if (this.config.resourceManagement.enableGarbageCollection &&
          Date.now() - this.lastGC > this.config.resourceManagement.gcIntervalMs) {
        this.forceGarbageCollection();
      }
    }, this.config.resourceManagement.gcIntervalMs);
  }

  private setupProcessHandlers(): void {
    process.on('uncaughtException', (error) => {
      this.handleError(error, { type: 'uncaughtException' }, ErrorCategory.SYSTEM);
    });

    process.on('unhandledRejection', (reason) => {
      this.handleError(reason as Error, { type: 'unhandledRejection' }, ErrorCategory.SYSTEM);
    });

    process.on('warning', (warning) => {
      if (this.config.errorHandling.logLevel === 'debug') {
        console.warn('Process warning:', warning);
      }
    });
  }

  private classifyError(error: Error | string): ErrorCategory {
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('memory') || lowerMessage.includes('heap')) {
      return ErrorCategory.MEMORY;
    }
    if (lowerMessage.includes('file') || lowerMessage.includes('enoent') || lowerMessage.includes('eacces')) {
      return ErrorCategory.IO;
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
      return ErrorCategory.NETWORK;
    }
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('parse')) {
      return ErrorCategory.VALIDATION;
    }
    if (lowerMessage.includes('csv') || lowerMessage.includes('data') || lowerMessage.includes('processing')) {
      return ErrorCategory.DATA_PROCESSING;
    }

    return ErrorCategory.UNKNOWN;
  }

  private determineSeverity(error: Error | string, category?: ErrorCategory): ErrorSeverity {
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    // Critical errors
    if (lowerMessage.includes('out of memory') || lowerMessage.includes('fatal') || 
        lowerMessage.includes('segmentation fault')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (category === ErrorCategory.SYSTEM || lowerMessage.includes('corruption') ||
        lowerMessage.includes('deadlock')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (category === ErrorCategory.DATA_PROCESSING || category === ErrorCategory.MEMORY) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private async attemptRecovery(errorInfo: ErrorInfo): Promise<void> {
    switch (errorInfo.category) {
      case ErrorCategory.MEMORY:
        this.forceGarbageCollection();
        break;
      case ErrorCategory.IO:
        // Could implement file handle cleanup or retry logic
        break;
      case ErrorCategory.DATA_PROCESSING:
        // Could implement data validation or cleanup
        break;
    }
  }

  private checkAlertThresholds(): void {
    if (!this.config.monitoring.enableAlerts) return;

    const stats = this.getErrorStatistics();
    const thresholds = this.config.monitoring.alertThresholds;

    if (stats.errorRate > thresholds.errorRate) {
      this.emit('alert', {
        type: 'high_error_rate',
        message: `Error rate ${(stats.errorRate * 100).toFixed(2)}% exceeds threshold ${(thresholds.errorRate * 100).toFixed(2)}%`,
        severity: ErrorSeverity.HIGH
      });
    }

    const currentMemory = this.getCurrentResourceUsage();
    if (currentMemory.memoryUsage.percentUsed > thresholds.memoryUsagePercent) {
      this.emit('alert', {
        type: 'high_memory_usage',
        message: `Memory usage ${currentMemory.memoryUsage.percentUsed.toFixed(2)}% exceeds threshold ${thresholds.memoryUsagePercent}%`,
        severity: ErrorSeverity.MEDIUM
      });
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = this.config.errorHandling.retryDelayMs;
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logError(errorInfo: ErrorInfo): void {
    const level = this.config.errorHandling.logLevel;
    const shouldLog = (
      level === 'debug' ||
      (level === 'info' && errorInfo.severity !== ErrorSeverity.LOW) ||
      (level === 'warn' && [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(errorInfo.severity)) ||
      (level === 'error' && [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(errorInfo.severity))
    );

    if (shouldLog) {
      const logMessage = `[${errorInfo.severity.toUpperCase()}] ${errorInfo.category}: ${errorInfo.message}`;
      
      switch (errorInfo.severity) {
        case ErrorSeverity.CRITICAL:
        case ErrorSeverity.HIGH:
          console.error(logMessage, errorInfo.context);
          break;
        case ErrorSeverity.MEDIUM:
          console.warn(logMessage, errorInfo.context);
          break;
        default:
          console.log(logMessage, errorInfo.context);
      }
    }
  }
}

export default ProductionErrorHandler;