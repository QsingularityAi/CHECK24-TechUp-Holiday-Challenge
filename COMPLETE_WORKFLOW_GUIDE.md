# Complete Workflow Guide

## Overview

This guide provides step-by-step instructions for running the complete Mallorca Travel Backend workflow, including both backend and frontend components.

## Table of Contents

- [Quick Start](#quick-start)
- [Automated Setup](#automated-setup)
- [Manual Setup](#manual-setup)
- [Frontend Integration](#frontend-integration)
- [Testing the Complete Workflow](#testing-the-complete-workflow)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 8+ or yarn 1.22+
- Docker 20+ (optional)
- 8GB+ RAM recommended
- 50GB+ available disk space

### One-Command Setup

```bash
# Clone and setup everything
git clone <repository-url>
cd CHECK24-TechUp-Holiday-Challenge
./start-complete-workflow.sh
```

This script will:
1. Install all dependencies
2. Setup environment files
3. Prepare data directories
4. Start backend services
5. Start frontend application
6. Open browser to the application

## Automated Setup

### Using the Setup Script

The `start-complete-workflow.sh` script provides automated setup:

```bash
#!/bin/bash
# start-complete-workflow.sh

set -e

echo "🚀 Starting Mallorca Travel Complete Workflow Setup"

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required"; exit 1; }

echo "✅ Prerequisites check passed"

# Setup backend
echo "🔧 Setting up backend..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created .env file from example"
fi

# Install backend dependencies
npm install
echo "📦 Backend dependencies installed"

# Setup data directory
mkdir -p data logs
echo "📁 Created data and logs directories"

# Check for data files
if [ ! -f "data/offers.csv" ] || [ ! -f "data/hotels.csv" ]; then
    echo "⚠️  Data files not found in data/ directory"
    echo "Please copy your offers.csv and hotels.csv files to the data/ directory"
    echo "Then run this script again"
    exit 1
fi

# Run backend setup
npm run setup
echo "🔧 Backend setup completed"

# Start backend
echo "🚀 Starting backend server..."
npm run start:full &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 2
done

# Setup frontend
echo "🎨 Setting up frontend..."
cd default-frontend

if [ ! -f ".env.local" ]; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
    echo "📝 Created frontend .env.local file"
fi

# Install frontend dependencies
npm install
echo "📦 Frontend dependencies installed"

# Build and start frontend
echo "🏗️  Building frontend..."
npm run build

echo "🚀 Starting frontend server..."
npm run start &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001 > /dev/null; then
        echo "✅ Frontend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Frontend failed to start"
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        exit 1
    fi
    sleep 2
done

cd ..

echo "🎉 Complete workflow is now running!"
echo "📊 Backend API: http://localhost:3000"
echo "🌐 Frontend UI: http://localhost:3001"
echo "📋 Health Check: http://localhost:3000/api/health"
echo ""
echo "To stop the services:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  or run: ./stop-complete-workflow.sh"

# Open browser (optional)
if command -v open >/dev/null 2>&1; then
    open http://localhost:3001
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3001
fi

echo "Press Ctrl+C to stop all services"
wait
```

### Docker Compose Setup

For containerized deployment:

```yaml
# docker-compose.complete.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - ENABLE_ULTRA_PERFORMANCE=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  frontend:
    build: ./default-frontend
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

```bash
# Start complete workflow with Docker
docker-compose -f docker-compose.complete.yml up -d

# Check status
docker-compose -f docker-compose.complete.yml ps

# View logs
docker-compose -f docker-compose.complete.yml logs -f
```

## Manual Setup

### Step 1: Backend Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd CHECK24-TechUp-Holiday-Challenge

# 2. Install backend dependencies
npm install

# 3. Setup environment
cp .env.example .env

# 4. Edit .env file with your configuration
nano .env
```

**Required .env Configuration:**
```env
# Server Configuration
PORT=3000
LOG_LEVEL=info

# Data Paths
DATA_PATH=./data
OFFERS_DATA_PATH=./data/offers.csv
HOTELS_DATA_PATH=./data/hotels.csv

# Ultra-Performance Configuration
ENABLE_ULTRA_PERFORMANCE=true
ULTRA_MAX_OFFERS=100000000
ULTRA_USE_COLUMNAR_STORAGE=true
ULTRA_USE_PARALLEL_PROCESSING=true

# Streaming Configuration
STREAMING_CHUNK_SIZE=10000
ENABLE_MEMORY_MONITORING=true
```

```bash
# 5. Prepare data directory
mkdir -p data logs

# 6. Copy your data files
# Copy offers.csv and hotels.csv to data/ directory
cp /path/to/your/offers.csv data/
cp /path/to/your/hotels.csv data/

# 7. Validate data files
wc -l data/*.csv
head -5 data/offers.csv
head -5 data/hotels.csv

# 8. Run setup
npm run setup

# 9. Start backend
npm run start:full
```

### Step 2: Frontend Setup

```bash
# 1. Navigate to frontend directory
cd default-frontend

# 2. Install frontend dependencies
npm install

# 3. Setup frontend environment
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local

# 4. Build frontend
npm run build

# 5. Start frontend
npm run start
```

### Step 3: Verify Setup

```bash
# Check backend health
curl http://localhost:3000/api/health

# Check frontend
curl http://localhost:3001

# Test API endpoint
curl "http://localhost:3000/api/bestOffersByHotel?destination=Mallorca&departureDate=2024-07-15&returnDate=2024-07-22&countAdults=2&limit=5"
```

## Frontend Integration

### Frontend Features

The default frontend provides:

1. **Search Interface**
   - Destination selection
   - Date picker for departure/return
   - Adult/children count
   - Advanced filters

2. **Results Display**
   - Hotel cards with images
   - Price comparison
   - Sorting options
   - Pagination

3. **Hotel Details**
   - Detailed hotel information
   - All available offers
   - Photo gallery
   - Reviews and ratings

4. **Performance Monitoring**
   - Real-time performance metrics
   - Response time display
   - System status indicators

### Frontend Configuration

```typescript
// default-frontend/next.config.js
module.exports = {
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
};
```

```typescript
// default-frontend/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class MallorcaAPI {
  private baseURL: string;

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async getBestOffers(params: SearchParams): Promise<OffersResponse> {
    const url = new URL(`${this.baseURL}/api/bestOffersByHotel`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getHotelOffers(hotelId: string, params?: any): Promise<OffersResponse> {
    const url = new URL(`${this.baseURL}/api/hotels/${hotelId}/offers`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseURL}/api/health`);
    return response.json();
  }
}
```

### Custom Frontend Development

To create your own frontend:

```bash
# Create new Next.js app
npx create-next-app@latest my-mallorca-frontend
cd my-mallorca-frontend

# Install additional dependencies
npm install axios date-fns

# Setup API integration
mkdir lib
touch lib/api.ts
```

```typescript
// lib/api.ts - Basic API client
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 30000,
});

export const searchOffers = async (params: any) => {
  const response = await api.get('/api/bestOffersByHotel', { params });
  return response.data;
};

export const getHotelOffers = async (hotelId: string, params?: any) => {
  const response = await api.get(`/api/hotels/${hotelId}/offers`, { params });
  return response.data;
};
```

## Testing the Complete Workflow

### Automated Testing

```bash
# Run complete workflow tests
./test-complete-workflow.sh
```

```bash
#!/bin/bash
# test-complete-workflow.sh

set -e

echo "🧪 Testing Complete Workflow"

# Test backend health
echo "Testing backend health..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Test API endpoints
echo "Testing API endpoints..."

# Test best offers endpoint
OFFERS_RESPONSE=$(curl -s "http://localhost:3000/api/bestOffersByHotel?destination=Mallorca&departureDate=2024-07-15&returnDate=2024-07-22&countAdults=2&limit=5")
if echo "$OFFERS_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Best offers API test passed"
else
    echo "❌ Best offers API test failed"
    exit 1
fi

# Test frontend
echo "Testing frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✅ Frontend test passed"
else
    echo "❌ Frontend test failed (HTTP $FRONTEND_RESPONSE)"
    exit 1
fi

# Performance test
echo "Running performance test..."
START_TIME=$(date +%s%N)
curl -s "http://localhost:3000/api/bestOffersByHotel?destination=Mallorca&departureDate=2024-07-15&returnDate=2024-07-22&countAdults=2&limit=10" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 1000 ]; then
    echo "✅ Performance test passed (${RESPONSE_TIME}ms)"
else
    echo "⚠️  Performance test warning (${RESPONSE_TIME}ms > 1000ms)"
fi

echo "🎉 All tests passed!"
```

### Manual Testing

#### 1. Backend API Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Search offers
curl "http://localhost:3000/api/bestOffersByHotel?destination=Mallorca&departureDate=2024-07-15&returnDate=2024-07-22&countAdults=2&limit=5"

# Get hotel offers
curl "http://localhost:3000/api/hotels/12345/offers?limit=10"

# System status
curl http://localhost:3000/api/status

# Performance metrics
curl http://localhost:3000/api/metrics
```

#### 2. Frontend UI Testing

1. **Open Frontend**: Navigate to http://localhost:3001
2. **Search Form**: Fill in search criteria and submit
3. **Results Page**: Verify offers are displayed correctly
4. **Hotel Details**: Click on a hotel to view details
5. **Filters**: Test various filter options
6. **Pagination**: Navigate through result pages
7. **Performance**: Check response times in browser dev tools

#### 3. Integration Testing

```javascript
// Browser console testing
// Test API integration
fetch('/api/health')
  .then(r => r.json())
  .then(console.log);

// Test search functionality
fetch('/api/bestOffersByHotel?destination=Mallorca&departureDate=2024-07-15&returnDate=2024-07-22&countAdults=2&limit=5')
  .then(r => r.json())
  .then(console.log);
```

### Load Testing

```bash
# Install Artillery for load testing
npm install -g artillery

# Create load test configuration
cat > load-test.yml << 'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
  payload:
    path: 'test-data.csv'
    fields:
      - 'destination'
      - 'departureDate'
      - 'returnDate'
      - 'countAdults'

scenarios:
  - name: 'Search offers'
    weight: 80
    flow:
      - get:
          url: '/api/bestOffersByHotel'
          qs:
            destination: '{{ destination }}'
            departureDate: '{{ departureDate }}'
            returnDate: '{{ returnDate }}'
            countAdults: '{{ countAdults }}'
            limit: 10
  - name: 'Health check'
    weight: 20
    flow:
      - get:
          url: '/api/health'
EOF

# Create test data
cat > test-data.csv << 'EOF'
destination,departureDate,returnDate,countAdults
Mallorca,2024-07-15,2024-07-22,2
Mallorca,2024-08-01,2024-08-08,4
Mallorca,2024-09-15,2024-09-22,2
EOF

# Run load test
artillery run load-test.yml
```

## Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check port availability
lsof -i :3000

# Check data files
ls -la data/

# Check environment
cat .env

# Check logs
tail -f logs/application.log
```

#### Frontend Won't Connect
```bash
# Check backend is running
curl http://localhost:3000/api/health

# Check frontend configuration
cat default-frontend/.env.local

# Check frontend logs
cd default-frontend
npm run dev  # Run in development mode for better error messages
```

#### Performance Issues
```bash
# Check system resources
free -h
top

# Enable performance mode
echo "ENABLE_ULTRA_PERFORMANCE=true" >> .env

# Restart services
pkill -f "node.*server"
npm run start:full
```

### Debug Mode

```bash
# Enable debug logging
echo "LOG_LEVEL=debug" >> .env

# Start with debugging
DEBUG=* npm run start:full

# Frontend debug mode
cd default-frontend
npm run dev  # Development mode with hot reload
```

## Advanced Configuration

### Production Deployment

```bash
# Production environment setup
cp .env.example .env.production

# Edit production settings
cat >> .env.production << 'EOF'
NODE_ENV=production
ENABLE_ULTRA_PERFORMANCE=true
ULTRA_MAX_OFFERS=100000000
STREAMING_CHUNK_SIZE=10000
LOG_LEVEL=info
EOF

# Build and start production
npm run build
NODE_ENV=production npm start
```

### Monitoring Setup

```bash
# Install PM2 for process management
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mallorca-backend',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'mallorca-frontend',
    script: 'npm',
    args: 'start',
    cwd: './default-frontend',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### SSL/HTTPS Setup

```nginx
# nginx.conf for HTTPS
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Support

For additional help:
- **Main Documentation**: [README.md](./README.md)
- **API Documentation**: [API.md](./API.md)
- **Performance Guide**: [PERFORMANCE.md](./PERFORMANCE.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Issues**: GitHub Issues

---

**Next Steps**: After completing the workflow setup, explore the [Performance Guide](./PERFORMANCE.md) for optimization tips and the [API Documentation](./API.md) for advanced usage.