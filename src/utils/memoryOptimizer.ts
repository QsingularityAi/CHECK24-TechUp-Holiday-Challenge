/**
 * Memory Optimization Utilities for Large-Scale Processing
 * 
 * This module provides comprehensive memory management tools to prevent
 * memory leaks, optimize garbage collection, and handle large datasets efficiently.
 */

import * as os from 'os';
import { EventEmitter } from 'events';

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  systemFree: number;
  systemTotal: number;
  usagePercentage: number;
}

/**
 * Memory optimization configuration
 */
export interface MemoryOptimizerConfig {
  maxHeapUsagePercent: number; // Maximum heap usage percentage (default: 75)
  gcThresholdMB: number; // Trigger GC when heap exceeds this (default: 1024)
  monitoringIntervalMs: number; // Memory monitoring interval (default: 5000)
  enableAutoGC: boolean; // Enable automatic garbage collection (default: true)
  enableMemoryPressureHandling: boolean; // Handle memory pressure events (default: true)
  maxArrayBufferSizeMB: number; // Maximum ArrayBuffer size (default: 512)
  stringInterningThreshold: number; // String interning threshold (default: 100)
}

/**
 * Memory pressure levels
 */
export enum MemoryPressureLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Object pool for reusing objects and reducing GC pressure
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize: number = 1000
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  size(): number {
    return this.pool.length;
  }
}

/**
 * String interning system to reduce memory usage
 */
export class StringInterner {
  private internMap = new Map<string, string>();
  private usageCount = new Map<string, number>();
  private threshold: number;

  constructor(threshold: number = 100) {
    this.threshold = threshold;
  }

  intern(str: string): string {
    if (str.length < 3) return str; // Don't intern very short strings

    const existing = this.internMap.get(str);
    if (existing) {
      this.usageCount.set(str, (this.usageCount.get(str) || 0) + 1);
      return existing;
    }

    const count = (this.usageCount.get(str) || 0) + 1;
    this.usageCount.set(str, count);

    if (count >= this.threshold) {
      this.internMap.set(str, str);
      return str;
    }

    return str;
  }

  getStats(): { interned: number; totalUsage: number } {
    return {
      interned: this.internMap.size,
      totalUsage: Array.from(this.usageCount.values()).reduce((a, b) => a + b, 0)
    };
  }

  clear(): void {
    this.internMap.clear();
    this.usageCount.clear();
  }
}

/**
 * Memory-efficient array utilities
 */
export class MemoryEfficientArrays {
  /**
   * Create a typed array based on the expected value range
   */
  static createOptimalArray(maxValue: number, length: number): 
    Uint8Array | Uint16Array | Uint32Array | Float32Array {
    if (maxValue <= 255) {
      return new Uint8Array(length);
    } else if (maxValue <= 65535) {
      return new Uint16Array(length);
    } else if (maxValue <= 4294967295) {
      return new Uint32Array(length);
    } else {
      return new Float32Array(length);
    }
  }

  /**
   * Batch process array to prevent memory spikes
   */
  static async batchProcess<T, R>(
    array: T[],
    processor: (item: T, index: number) => R | Promise<R>,
    batchSize: number = 1000,
    delayMs: number = 0
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < array.length; i += batchSize) {
      const batch = array.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item, idx) => processor(item, i + idx))
      );
      results.push(...batchResults);
      
      // Add delay to prevent memory pressure
      if (delayMs > 0 && i + batchSize < array.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      // Force GC periodically for large batches
      if (i % (batchSize * 10) === 0 && global.gc) {
        global.gc();
      }
    }
    
    return results;
  }

  /**
   * Create a memory-mapped-like array for very large datasets
   */
  static createVirtualArray<T>(length: number, generator: (index: number) => T): {
    get: (index: number) => T;
    length: number;
    slice: (start: number, end?: number) => T[];
  } {
    return {
      length,
      get: (index: number) => {
        if (index < 0 || index >= length) {
          throw new Error(`Index ${index} out of bounds`);
        }
        return generator(index);
      },
      slice: (start: number, end?: number) => {
        const actualEnd = end ?? length;
        const result: T[] = [];
        for (let i = start; i < actualEnd && i < length; i++) {
          result.push(generator(i));
        }
        return result;
      }
    };
  }
}

/**
 * Main memory optimizer class
 */
export class MemoryOptimizer extends EventEmitter {
  private config: MemoryOptimizerConfig;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private memoryPressureTimer: NodeJS.Timeout | null = null;
  private lastGCTime = 0;
  private stringInterner: StringInterner;
  private objectPools = new Map<string, ObjectPool<any>>();

  constructor(config: Partial<MemoryOptimizerConfig> = {}) {
    super();
    this.config = {
      maxHeapUsagePercent: 75,
      gcThresholdMB: 1024,
      monitoringIntervalMs: 5000,
      enableAutoGC: true,
      // Disable memory pressure handling in test environments to prevent timer leaks
      enableMemoryPressureHandling: process.env.NODE_ENV !== 'test',
      maxArrayBufferSizeMB: 512,
      stringInterningThreshold: 100,
      ...config
    };
    
    this.stringInterner = new StringInterner(this.config.stringInterningThreshold);
    
    if (this.config.enableMemoryPressureHandling) {
      this.setupMemoryPressureHandling();
    }
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.monitoringTimer) {
      return;
    }

    this.monitoringTimer = setInterval(() => {
      const stats = this.getMemoryStats();
      this.emit('memoryStats', stats);
      
      const pressureLevel = this.calculateMemoryPressure(stats);
      if (pressureLevel !== MemoryPressureLevel.LOW) {
        this.emit('memoryPressure', pressureLevel, stats);
        this.handleMemoryPressure(pressureLevel);
      }
    }, this.config.monitoringIntervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    if (this.memoryPressureTimer) {
      clearInterval(this.memoryPressureTimer);
      this.memoryPressureTimer = null;
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const systemMem = {
      free: os.freemem(),
      total: os.totalmem()
    };

    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      systemFree: Math.round(systemMem.free / 1024 / 1024),
      systemTotal: Math.round(systemMem.total / 1024 / 1024),
      usagePercentage: Math.round((memUsage.heapUsed / systemMem.total) * 100)
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): boolean {
    const now = Date.now();
    // Prevent too frequent GC calls (minimum 1 second apart)
    if (now - this.lastGCTime < 1000) {
      return false;
    }

    if (global.gc) {
      global.gc();
      this.lastGCTime = now;
      return true;
    }
    return false;
  }

  /**
   * Alias for forceGC for backward compatibility
   */
  forceGarbageCollection(): boolean {
    return this.forceGC();
  }

  /**
   * Create or get an object pool
   */
  getObjectPool<T>(name: string, createFn: () => T, resetFn: (obj: T) => void): ObjectPool<T> {
    if (!this.objectPools.has(name)) {
      this.objectPools.set(name, new ObjectPool(createFn, resetFn));
    }
    return this.objectPools.get(name)!;
  }

  /**
   * Get string interner
   */
  getStringInterner(): StringInterner {
    return this.stringInterner;
  }

  /**
   * Optimize array allocation
   */
  createOptimalArray(maxValue: number, length: number) {
    return MemoryEfficientArrays.createOptimalArray(maxValue, length);
  }

  /**
   * Batch process with memory management
   */
  async batchProcess<T, R>(
    array: T[],
    processor: (item: T, index: number) => R | Promise<R>,
    batchSize?: number
  ): Promise<R[]> {
    const optimalBatchSize = batchSize || Math.max(100, Math.min(10000, 
      Math.floor(this.config.gcThresholdMB * 1024 * 1024 / (array.length * 100))
    ));
    
    return MemoryEfficientArrays.batchProcess(array, processor, optimalBatchSize, 1);
  }

  /**
   * Get current memory pressure level
   */
  getMemoryPressureLevel(): MemoryPressureLevel {
    const stats = this.getMemoryStats();
    return this.calculateMemoryPressure(stats);
  }

  /**
   * Calculate memory pressure level
   */
  private calculateMemoryPressure(stats: MemoryStats): MemoryPressureLevel {
    const heapPercent = (stats.heapUsed / stats.heapTotal) * 100;
    const systemPercent = ((stats.systemTotal - stats.systemFree) / stats.systemTotal) * 100;
    
    if (heapPercent > 90 || systemPercent > 95) {
      return MemoryPressureLevel.CRITICAL;
    } else if (heapPercent > 80 || systemPercent > 85) {
      return MemoryPressureLevel.HIGH;
    } else if (heapPercent > 70 || systemPercent > 75) {
      return MemoryPressureLevel.MEDIUM;
    }
    
    return MemoryPressureLevel.LOW;
  }

  /**
   * Handle memory pressure
   */
  private handleMemoryPressure(level: MemoryPressureLevel): void {
    switch (level) {
      case MemoryPressureLevel.CRITICAL:
        // Clear all object pools
        this.objectPools.forEach(pool => pool.clear());
        // Clear string interner
        this.stringInterner.clear();
        // Force GC
        this.forceGC();
        break;
        
      case MemoryPressureLevel.HIGH:
        // Clear half of object pools
        let cleared = 0;
        for (const pool of this.objectPools.values()) {
          if (cleared % 2 === 0) {
            pool.clear();
          }
          cleared++;
        }
        this.forceGC();
        break;
        
      case MemoryPressureLevel.MEDIUM:
        // Just trigger GC
        this.forceGC();
        break;
    }
  }

  /**
   * Setup memory pressure event handling
   */
  private setupMemoryPressureHandling(): void {
    // Handle Node.js memory pressure events if available
    if (process.memoryUsage && typeof process.memoryUsage === 'function') {
      // Monitor for rapid memory growth
      let lastHeapUsed = 0;
      this.memoryPressureTimer = setInterval(() => {
        const current = process.memoryUsage().heapUsed;
        const growth = current - lastHeapUsed;
        
        // If memory grew by more than 100MB in monitoring interval
        if (growth > 100 * 1024 * 1024) {
          this.emit('rapidMemoryGrowth', {
            growth: Math.round(growth / 1024 / 1024),
            current: Math.round(current / 1024 / 1024)
          });
        }
        
        lastHeapUsed = current;
      }, this.config.monitoringIntervalMs);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    if (this.memoryPressureTimer) {
      clearInterval(this.memoryPressureTimer);
      this.memoryPressureTimer = null;
    }
    this.objectPools.forEach(pool => pool.clear());
    this.objectPools.clear();
    this.stringInterner.clear();
    this.removeAllListeners();
  }
}

// Global memory optimizer instance
let globalMemoryOptimizer: MemoryOptimizer | null = null;

/**
 * Get or create global memory optimizer
 */
export function getMemoryOptimizer(config?: Partial<MemoryOptimizerConfig>): MemoryOptimizer {
  if (!globalMemoryOptimizer) {
    globalMemoryOptimizer = new MemoryOptimizer(config);
    
    // Auto-start monitoring in production
    if (process.env.NODE_ENV === 'production') {
      globalMemoryOptimizer.startMonitoring();
    }
    
    // Cleanup on process exit
    process.on('exit', () => {
      if (globalMemoryOptimizer) {
        globalMemoryOptimizer.cleanup();
        globalMemoryOptimizer = null;
      }
    });
    

  }
  
  return globalMemoryOptimizer;
}

/**
 * Reset global memory optimizer (for testing)
 */
export function resetMemoryOptimizer(): void {
  if (globalMemoryOptimizer) {
    globalMemoryOptimizer.cleanup();
    globalMemoryOptimizer = null;
  }
}

/**
 * Cleanup global memory optimizer (for proper shutdown)
 */
export function cleanupMemoryOptimizer(): void {
  if (globalMemoryOptimizer) {
    globalMemoryOptimizer.cleanup();
    globalMemoryOptimizer = null;
  }
}
/**
 * Memory optimization decorators and utilities
 */
export const MemoryUtils = {
  /**
   * Decorator to automatically manage object pools
   */
  withObjectPool<T>(poolName: string, createFn: () => T, resetFn: (obj: T) => void) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = function(...args: any[]) {
        const optimizer = getMemoryOptimizer();
        const pool = optimizer.getObjectPool(poolName, createFn, resetFn);
        const obj = pool.acquire();
        
        try {
          return originalMethod.apply(this, [obj, ...args]);
        } finally {
          pool.release(obj);
        }
      };
      
      return descriptor;
    };
  },
  
  /**
   * Decorator to automatically trigger GC after method execution
   */
  withGC(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      const result = originalMethod.apply(this, args);
      
      // Trigger GC after method completion
      setTimeout(() => {
        const optimizer = getMemoryOptimizer();
        optimizer.forceGC();
      }, 0);
      
      return result;
    };
    
    return descriptor;
  },
  
  /**
   * Create a memory-efficient iterator
   */
  createMemoryEfficientIterator<T>(array: T[], batchSize: number = 1000) {
    return {
      *[Symbol.iterator]() {
        for (let i = 0; i < array.length; i += batchSize) {
          const batch = array.slice(i, i + batchSize);
          yield* batch;
          
          // Yield control periodically
          if (i % (batchSize * 10) === 0) {
            setTimeout(() => {}, 0);
          }
        }
      }
    };
  }
};