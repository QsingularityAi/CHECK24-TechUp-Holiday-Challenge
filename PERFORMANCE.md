# Performance Guide

## Overview

This guide covers performance optimization, benchmarking, and monitoring for the Mallorca Travel Backend, designed to handle over 100 million offers with sub-second response times.

## Table of Contents

- [Performance Targets](#performance-targets)
- [Architecture Overview](#architecture-overview)
- [Optimization Strategies](#optimization-strategies)
- [Benchmarking](#benchmarking)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Scaling](#scaling)

## Performance Targets

### Response Time Targets

| Operation | Target | Acceptable | Critical |
|-----------|--------|------------|----------|
| Health Check | < 10ms | < 50ms | > 100ms |
| Best Offers Query | < 100ms | < 500ms | > 1000ms |
| Hotel Offers | < 50ms | < 200ms | > 500ms |
| Data Loading | < 30s | < 60s | > 120s |
| Cache Refresh | < 5s | < 15s | > 30s |

### Throughput Targets

- **Concurrent Users**: 10,000+
- **Requests per Second**: 1,000+
- **Peak Load**: 5,000 RPS
- **Data Processing**: 100M+ offers in memory

### Resource Utilization

- **CPU Usage**: < 70% average, < 90% peak
- **Memory Usage**: < 80% of available RAM
- **Disk I/O**: < 80% utilization
- **Network**: < 70% bandwidth utilization

## Architecture Overview

### Ultra-Performance Engine

The system uses a custom ultra-performance engine with:

```typescript
// Core performance components
interface UltraPerformanceConfig {
  maxOffers: number;           // 100M+ offers
  maxHotels: number;           // 300K+ hotels
  useColumnarStorage: boolean; // Column-oriented data
  useMemoryMapping: boolean;   // Memory-mapped files
  useBitsetIndexes: boolean;   // Bitset filtering
  useParallelProcessing: boolean; // Multi-threading
}
```

### Data Storage Strategy

1. **Columnar Storage**: Optimized for analytical queries
2. **Memory Mapping**: Direct memory access to data files
3. **Bitset Indexes**: Ultra-fast filtering operations
4. **Parallel Processing**: Multi-core utilization

### Caching Layers

```
┌─────────────────┐
│   Application   │
├─────────────────┤
│  Query Cache    │ ← 5-minute TTL
├─────────────────┤
│  Index Cache    │ ← Hot indexes
├─────────────────┤
│  Data Cache     │ ← Frequently accessed data
├─────────────────┤
│  File System    │ ← OS-level caching
└─────────────────┘
```

## Optimization Strategies

### 1. Memory Optimization

#### Configuration

```env
# Ultra-performance settings
ENABLE_ULTRA_PERFORMANCE=true
ULTRA_USE_MEMORY_MAPPING=true
ULTRA_USE_COLUMNAR_STORAGE=true

# Memory management
MEMORY_THRESHOLD_MB=12000
ENABLE_MEMORY_MONITORING=true
GC_INTERVAL=50
```

#### Node.js Memory Tuning

```bash
# Increase heap size
export NODE_OPTIONS="--max-old-space-size=8192"

# Optimize garbage collection
export NODE_OPTIONS="$NODE_OPTIONS --gc-interval=100"
export NODE_OPTIONS="$NODE_OPTIONS --optimize-for-size"

# Enable memory profiling (development only)
export NODE_OPTIONS="$NODE_OPTIONS --inspect --heap-prof"
```

#### Memory Usage Monitoring

```typescript
// Memory monitoring implementation
class MemoryMonitor {
  private threshold: number;
  private interval: NodeJS.Timeout;

  constructor(thresholdMB: number) {
    this.threshold = thresholdMB * 1024 * 1024;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage();
      if (usage.heapUsed > this.threshold) {
        this.triggerGarbageCollection();
      }
    }, 5000);
  }

  private triggerGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }
}
```

### 2. Query Optimization

#### Indexing Strategy

```typescript
// Bitset index implementation
class BitsetIndex {
  private indexes: Map<string, Uint32Array>;
  
  constructor() {
    this.indexes = new Map();
  }

  // Create index for fast filtering
  createIndex(field: string, values: any[]): void {
    const bitset = new Uint32Array(Math.ceil(values.length / 32));
    
    values.forEach((value, index) => {
      if (this.shouldIndex(value)) {
        const wordIndex = Math.floor(index / 32);
        const bitIndex = index % 32;
        bitset[wordIndex] |= (1 << bitIndex);
      }
    });
    
    this.indexes.set(field, bitset);
  }

  // Ultra-fast filtering using bitwise operations
  filter(field: string, predicate: (value: any) => boolean): number[] {
    const bitset = this.indexes.get(field);
    if (!bitset) return [];

    const results: number[] = [];
    for (let i = 0; i < bitset.length; i++) {
      let word = bitset[i];
      let bitIndex = 0;
      
      while (word !== 0) {
        if (word & 1) {
          results.push(i * 32 + bitIndex);
        }
        word >>>= 1;
        bitIndex++;
      }
    }
    
    return results;
  }
}
```

#### Parallel Processing

```typescript
// Worker pool for parallel processing
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import os from 'os';

class ParallelProcessor {
  private workers: Worker[];
  private numWorkers: number;

  constructor() {
    this.numWorkers = os.cpus().length;
    this.workers = [];
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new Worker(__filename, {
        workerData: { workerId: i }
      });
      this.workers.push(worker);
    }
  }

  async processInParallel<T>(data: T[], processor: (chunk: T[]) => Promise<any>): Promise<any[]> {
    const chunkSize = Math.ceil(data.length / this.numWorkers);
    const chunks = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    const promises = chunks.map((chunk, index) => {
      return new Promise((resolve, reject) => {
        const worker = this.workers[index % this.numWorkers];
        worker.postMessage({ chunk, processor: processor.toString() });
        worker.once('message', resolve);
        worker.once('error', reject);
      });
    });

    return Promise.all(promises);
  }
}
```

### 3. I/O Optimization

#### Streaming CSV Processing

```typescript
import { createReadStream } from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

class StreamingCSVProcessor {
  private chunkSize: number;
  private memoryThreshold: number;

  constructor(chunkSize = 10000, memoryThresholdMB = 12000) {
    this.chunkSize = chunkSize;
    this.memoryThreshold = memoryThresholdMB * 1024 * 1024;
  }

  async processFile(filePath: string): Promise<void> {
    const parseTransform = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const lines = chunk.toString().split('\n');
          const parsed = lines.map(line => this.parseLine(line));
          callback(null, parsed);
        } catch (error) {
          callback(error);
        }
      }
    });

    const batchTransform = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        // Process in batches to manage memory
        this.processBatch(chunk);
        callback();
      }
    });

    await pipeline(
      createReadStream(filePath, { highWaterMark: 64 * 1024 }),
      parseTransform,
      batchTransform
    );
  }

  private processBatch(batch: any[]): void {
    // Check memory usage
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > this.memoryThreshold) {
      if (global.gc) global.gc();
    }

    // Process batch
    this.indexBatch(batch);
  }
}
```

### 4. Network Optimization

#### Response Compression

```typescript
import compression from 'compression';
import express from 'express';

const app = express();

// Enable compression with optimal settings
app.use(compression({
  level: 6,           // Balanced compression
  threshold: 1024,    // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress already compressed responses
    if (res.getHeader('Content-Encoding')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

#### HTTP/2 Support

```typescript
import http2 from 'http2';
import fs from 'fs';

const server = http2.createSecureServer({
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
});

server.on('stream', (stream, headers) => {
  // Handle HTTP/2 streams for better performance
  stream.respond({
    'content-type': 'application/json',
    ':status': 200
  });
});
```

## Benchmarking

### Load Testing Setup

#### Artillery Configuration

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
    - duration: 60
      arrivalRate: 200
      name: "Peak load"
  payload:
    path: "test-data.csv"
    fields:
      - "destination"
      - "departureDate"
      - "returnDate"
      - "countAdults"

scenarios:
  - name: "Best Offers Query"
    weight: 70
    flow:
      - get:
          url: "/api/bestOffersByHotel"
          qs:
            destination: "{{ destination }}"
            departureDate: "{{ departureDate }}"
            returnDate: "{{ returnDate }}"
            countAdults: "{{ countAdults }}"
            limit: 10
      - think: 1

  - name: "Hotel Offers Query"
    weight: 20
    flow:
      - get:
          url: "/api/hotels/12345/offers"
          qs:
            limit: 20
      - think: 2

  - name: "Health Check"
    weight: 10
    flow:
      - get:
          url: "/api/health"
```

#### Running Benchmarks

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run artillery-config.yml

# Generate detailed report
artillery run --output report.json artillery-config.yml
artillery report report.json

# Custom performance test
npm run test:performance
```

### Performance Metrics Collection

```typescript
// Performance metrics middleware
import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: number;
}

class MetricsCollector {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 10000;

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const startCpu = process.cpuUsage();

      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to ms
        
        const metrics: PerformanceMetrics = {
          responseTime,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(startCpu),
          timestamp: Date.now()
        };

        this.addMetric(metrics);
        
        // Add performance headers
        res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
        res.setHeader('X-Memory-Usage', `${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      });

      next();
    };
  }

  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getStats() {
    if (this.metrics.length === 0) return null;

    const responseTimes = this.metrics.map(m => m.responseTime);
    const memoryUsages = this.metrics.map(m => m.memoryUsage.heapUsed);

    return {
      responseTime: {
        avg: responseTimes.reduce((a, b) => a + b) / responseTimes.length,
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        p95: this.percentile(responseTimes, 0.95),
        p99: this.percentile(responseTimes, 0.99)
      },
      memory: {
        avg: memoryUsages.reduce((a, b) => a + b) / memoryUsages.length,
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages)
      },
      totalRequests: this.metrics.length
    };
  }

  private percentile(arr: number[], p: number): number {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}
```

### Benchmark Results

#### Expected Performance Baseline

```
┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Metric          │ Target   │ Good     │ Warning  │ Critical │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Response Time   │ < 100ms  │ < 200ms  │ < 500ms  │ > 500ms  │
│ Throughput      │ 1000 RPS │ 500 RPS  │ 100 RPS  │ < 100 RPS│
│ Memory Usage    │ < 4GB    │ < 6GB    │ < 8GB    │ > 8GB    │
│ CPU Usage       │ < 50%    │ < 70%    │ < 90%    │ > 90%    │
│ Error Rate      │ < 0.1%   │ < 1%     │ < 5%     │ > 5%     │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘
```

## Monitoring

### Real-time Monitoring

```typescript
// Real-time performance dashboard
import WebSocket from 'ws';

class PerformanceDashboard {
  private wss: WebSocket.Server;
  private metricsCollector: MetricsCollector;

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    this.metricsCollector = new MetricsCollector();
    this.startBroadcasting();
  }

  private startBroadcasting(): void {
    setInterval(() => {
      const stats = this.metricsCollector.getStats();
      const systemStats = this.getSystemStats();
      
      const data = {
        timestamp: Date.now(),
        performance: stats,
        system: systemStats
      };

      this.broadcast(JSON.stringify(data));
    }, 1000);
  }

  private getSystemStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime()
    };
  }

  private broadcast(data: string): void {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}
```

### Alerting System

```typescript
// Performance alerting
class PerformanceAlerting {
  private thresholds = {
    responseTime: 500,      // ms
    memoryUsage: 0.8,       // 80% of available
    cpuUsage: 0.9,          // 90%
    errorRate: 0.05         // 5%
  };

  checkThresholds(metrics: any): void {
    const alerts = [];

    if (metrics.responseTime.avg > this.thresholds.responseTime) {
      alerts.push({
        type: 'HIGH_RESPONSE_TIME',
        value: metrics.responseTime.avg,
        threshold: this.thresholds.responseTime
      });
    }

    if (metrics.memory.usage > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        value: metrics.memory.usage,
        threshold: this.thresholds.memoryUsage
      });
    }

    if (alerts.length > 0) {
      this.sendAlerts(alerts);
    }
  }

  private async sendAlerts(alerts: any[]): Promise<void> {
    // Send to monitoring system (e.g., Slack, email, PagerDuty)
    console.error('Performance alerts:', alerts);
    
    // Example: Send to webhook
    // await fetch('https://hooks.slack.com/webhook', {
    //   method: 'POST',
    //   body: JSON.stringify({ alerts })
    // });
  }
}
```

## Troubleshooting

### Performance Issues Diagnosis

#### Memory Leaks

```bash
# Generate heap snapshot
node --inspect server.js
# Connect Chrome DevTools to inspect memory

# Use clinic.js for detailed analysis
npm install -g clinic
clinic doctor -- node server.js
clinic flame -- node server.js
```

#### CPU Profiling

```bash
# Generate CPU profile
node --prof server.js
# Process profile
node --prof-process isolate-*.log > profile.txt

# Use 0x for flame graphs
npm install -g 0x
0x server.js
```

#### Query Performance

```typescript
// Query performance analyzer
class QueryAnalyzer {
  private slowQueries: Map<string, number[]> = new Map();

  analyzeQuery(query: string, duration: number): void {
    if (!this.slowQueries.has(query)) {
      this.slowQueries.set(query, []);
    }
    
    this.slowQueries.get(query)!.push(duration);
    
    // Alert on slow queries
    if (duration > 1000) { // 1 second
      console.warn(`Slow query detected: ${query} (${duration}ms)`);
    }
  }

  getSlowQueries(): any[] {
    const results = [];
    
    for (const [query, durations] of this.slowQueries) {
      const avg = durations.reduce((a, b) => a + b) / durations.length;
      if (avg > 500) {
        results.push({
          query,
          avgDuration: avg,
          count: durations.length,
          maxDuration: Math.max(...durations)
        });
      }
    }
    
    return results.sort((a, b) => b.avgDuration - a.avgDuration);
  }
}
```

### Common Performance Problems

#### Problem: High Memory Usage

**Symptoms:**
- Memory usage continuously increasing
- Frequent garbage collection
- Out of memory errors

**Solutions:**
```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=8192"

# Enable memory monitoring
ENABLE_MEMORY_MONITORING=true
MEMORY_THRESHOLD_MB=6000

# Optimize garbage collection
export NODE_OPTIONS="$NODE_OPTIONS --gc-interval=100"
```

#### Problem: Slow Query Performance

**Symptoms:**
- Response times > 500ms
- High CPU usage during queries
- Database timeouts

**Solutions:**
```typescript
// Enable query optimization
ENABLE_ULTRA_PERFORMANCE=true
ULTRA_USE_BITSET_INDEXES=true
ULTRA_USE_PARALLEL_PROCESSING=true

// Optimize chunk size
STREAMING_CHUNK_SIZE=5000
```

#### Problem: High CPU Usage

**Symptoms:**
- CPU usage > 90%
- Slow response times
- Request timeouts

**Solutions:**
```bash
# Enable clustering
instances: 'max'  # in PM2 config

# Optimize processing
ULTRA_USE_PARALLEL_PROCESSING=true
UV_THREADPOOL_SIZE=128
```

## Scaling

### Horizontal Scaling

#### Load Balancer Configuration

```nginx
# nginx.conf
upstream backend {
    least_conn;
    server 127.0.0.1:3000 weight=3;
    server 127.0.0.1:3001 weight=3;
    server 127.0.0.1:3002 weight=3;
    server 127.0.0.1:3003 weight=2;  # Backup server
    
    # Health checks
    health_check interval=30s fails=3 passes=2;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Connection pooling
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

#### Auto-scaling with Docker Swarm

```yaml
# docker-compose.swarm.yml
version: '3.8'

services:
  backend:
    image: mallorca-backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    networks:
      - backend-network
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    deploy:
      replicas: 2
    networks:
      - backend-network

networks:
  backend-network:
    driver: overlay
```

### Vertical Scaling

#### Resource Optimization

```bash
# Optimize for high-memory instances
export NODE_OPTIONS="--max-old-space-size=16384"  # 16GB
ULTRA_MAX_OFFERS=200000000  # 200M offers
MEMORY_THRESHOLD_MB=14000   # 14GB threshold

# Optimize for high-CPU instances
UV_THREADPOOL_SIZE=256
ULTRA_USE_PARALLEL_PROCESSING=true
instances: 'max'  # Use all CPU cores
```

### Database Scaling

#### Sharding Strategy

```typescript
// Data sharding by destination
class DataShard {
  private shards: Map<string, OfferData[]> = new Map();

  addOffer(offer: Offer): void {
    const shardKey = this.getShardKey(offer.destination);
    if (!this.shards.has(shardKey)) {
      this.shards.set(shardKey, []);
    }
    this.shards.get(shardKey)!.push(offer);
  }

  private getShardKey(destination: string): string {
    // Simple hash-based sharding
    const hash = this.hashString(destination);
    return `shard_${hash % 4}`; // 4 shards
  }

  query(destination: string, filters: any): Offer[] {
    const shardKey = this.getShardKey(destination);
    const shard = this.shards.get(shardKey) || [];
    return this.filterOffers(shard, filters);
  }
}
```

## Best Practices

### Development

1. **Profile Early**: Use profiling tools during development
2. **Benchmark Regularly**: Run performance tests with each change
3. **Monitor Memory**: Watch for memory leaks and excessive usage
4. **Optimize Queries**: Use indexes and efficient algorithms
5. **Cache Strategically**: Cache frequently accessed data

### Production

1. **Monitor Continuously**: Real-time performance monitoring
2. **Set Alerts**: Alert on performance degradation
3. **Scale Proactively**: Scale before hitting limits
4. **Optimize Resources**: Right-size instances for workload
5. **Plan Capacity**: Forecast growth and plan accordingly

### Code Optimization

```typescript
// Example: Optimized offer filtering
class OptimizedOfferFilter {
  private bitsetIndexes: Map<string, Uint32Array> = new Map();
  
  // Pre-compute indexes for fast filtering
  buildIndexes(offers: Offer[]): void {
    const destinationIndex = new Uint32Array(Math.ceil(offers.length / 32));
    const priceIndex = new Uint32Array(Math.ceil(offers.length / 32));
    
    offers.forEach((offer, index) => {
      // Destination index
      if (offer.destination === 'Mallorca') {
        const wordIndex = Math.floor(index / 32);
        const bitIndex = index % 32;
        destinationIndex[wordIndex] |= (1 << bitIndex);
      }
      
      // Price range index
      if (offer.price < 1000) {
        const wordIndex = Math.floor(index / 32);
        const bitIndex = index % 32;
        priceIndex[wordIndex] |= (1 << bitIndex);
      }
    });
    
    this.bitsetIndexes.set('destination_mallorca', destinationIndex);
    this.bitsetIndexes.set('price_under_1000', priceIndex);
  }
  
  // Ultra-fast filtering using bitwise operations
  filterOffers(criteria: FilterCriteria): number[] {
    let resultBitset = this.bitsetIndexes.get('destination_mallorca');
    
    if (criteria.maxPrice && criteria.maxPrice < 1000) {
      const priceBitset = this.bitsetIndexes.get('price_under_1000');
      resultBitset = this.bitwiseAnd(resultBitset!, priceBitset!);
    }
    
    return this.bitsetToIndexes(resultBitset!);
  }
}
```

## Support

For performance optimization support:
- **Main Documentation**: [README](./README.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **API Documentation**: [API.md](./API.md)
- **Issues**: GitHub Issues