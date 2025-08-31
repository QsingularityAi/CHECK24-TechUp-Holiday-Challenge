#!/bin/bash

# Enable streaming index building optimizations for massive datasets
# This script sets environment variables to optimize memory usage during startup

echo "🚀 Enabling streaming index building optimizations..."

# Enable streaming index building (default: true)
export ENABLE_STREAMING_INDEX_BUILDING=true

# Streaming configuration
export STREAMING_CHUNK_SIZE=10000          # Process 10K offers per chunk
export ENABLE_MEMORY_MONITORING=true       # Monitor memory usage
export MEMORY_THRESHOLD_MB=12000           # 12GB memory threshold
export GC_INTERVAL=50                      # Trigger GC every 50 chunks

# Advanced optimizations
export ENABLE_ADVANCED_OPTIMIZATIONS=true
export USE_MEMORY_MAPPED_STORAGE=true
export USE_BLOOM_FILTERS=true
export USE_COMPRESSED_STORAGE=true
export USE_MULTI_THREADING=true
export USE_ADVANCED_INDEXING=true

# Node.js memory and GC flags
export NODE_OPTIONS="--expose-gc --max-old-space-size=16384 --optimize-for-size"

echo "✅ Streaming optimizations enabled:"
echo "   - Chunk size: ${STREAMING_CHUNK_SIZE}"
echo "   - Memory monitoring: ${ENABLE_MEMORY_MONITORING}"
echo "   - Memory threshold: ${MEMORY_THRESHOLD_MB}MB"
echo "   - GC interval: ${GC_INTERVAL} chunks"
echo "   - Node.js heap: 16GB with GC enabled"
echo ""
echo "Now run: npm run start:full"
