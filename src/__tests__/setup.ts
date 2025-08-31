import { cleanupMemoryOptimizer } from '../utils/memoryOptimizer';

// Global cleanup after all tests
afterAll(async () => {
  // Clean up memory optimizer to prevent open handles
  cleanupMemoryOptimizer();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Small delay to allow cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Handle process cleanup
process.on('exit', () => {
  cleanupMemoryOptimizer();
});

process.on('SIGTERM', () => {
  cleanupMemoryOptimizer();
  process.exit(0);
});

process.on('SIGINT', () => {
  cleanupMemoryOptimizer();
  process.exit(0);
});