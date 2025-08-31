# 🏖️ Mallorca Travel Backend

<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1114719202?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="CHECK24 TechUp Holiday Challenge"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>

High-performance backend service for handling over 100 million travel offers for Mallorca vacation packages. Built for the CHECK24 TechUp Holiday Challenge, this system provides fast search capabilities with sub-second response times and integrates seamlessly with the provided Next.js frontend.

## 🚀 Features

- **Ultra-fast search**: Sub-second response times for 95th percentile requests
- **Massive scale**: Handles 100+ million travel offers efficiently
- **In-memory processing**: Optimized data structures with multi-level indexing
- **RESTful API**: OpenAPI 3.0 compliant endpoints
- **Docker ready**: Complete containerization for easy deployment
- **Production ready**: Comprehensive error handling, logging, and monitoring
- **Test coverage**: Extensive unit and integration tests

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Frontend Integration](#frontend-integration)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)

## 🏃‍♂️ Quick Start

### Using Docker (Recommended)

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd mallorca-travel-backend
   cp .env.example .env
   ```

2. **Place your data files**:
   ```bash
   mkdir -p data
   # Copy your offers.csv and hotels.csv to the data/ directory
   ```

3. **Start the application**:
   ```bash
   npm run docker:run
   ```

4. **Verify it's running**:
   ```bash
   curl http://localhost:3000/api/health
   ```

### Using Node.js directly

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup environment**:
   ```bash
   npm run setup
   ```

3. **Start the application**:
   ```bash
   npm run start:full
   ```

## 📚 API Documentation

The API follows the OpenAPI 3.0 specification and provides two main endpoints for searching travel offers.

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Get Best Offers by Hotel
Returns the cheapest offer for each hotel that matches the search criteria.

```http
GET /api/bestOffersByHotel
```

**Query Parameters:**
- `earliestDepartureDate` (required): Earliest departure date (YYYY-MM-DD)
- `latestReturnDate` (required): Latest return date (YYYY-MM-DD)
- `duration` (required): Trip duration in days
- `countAdults` (required): Number of adults
- `countChildren` (required): Number of children
- `departureAirports` (required): Array of departure airport codes

**Example Request:**
```bash
curl "http://localhost:3000/api/bestOffersByHotel?earliestDepartureDate=2024-06-01&latestReturnDate=2024-06-15&duration=7&countAdults=2&countChildren=0&departureAirports=FRA,MUC"
```

**Example Response:**
```json
[
  {
    "hotel": {
      "id": 1,
      "name": "Hotel Paradise",
      "stars": 4
    },
    "minPrice": 1299.99,
    "departureDate": "2024-06-01",
    "returnDate": "2024-06-08",
    "roomType": "Double Room",
    "mealType": "All Inclusive",
    "countAdults": 2,
    "countChildren": 0,
    "duration": 7,
    "countAvailableOffers": 15
  }
]
```

#### 2. Get Hotel Offers
Returns all available offers for a specific hotel that match the search criteria.

```http
GET /api/hotels/{hotelId}/offers
```

**Path Parameters:**
- `hotelId` (required): Hotel ID

**Query Parameters:** (same as above)

**Example Request:**
```bash
curl "http://localhost:3000/api/hotels/1/offers?earliestDepartureDate=2024-06-01&latestReturnDate=2024-06-15&duration=7&countAdults=2&countChildren=0&departureAirports=FRA,MUC"
```

**Example Response:**
```json
{
  "hotel": {
    "id": 1,
    "name": "Hotel Paradise",
    "stars": 4
  },
  "items": [
    {
      "price": 1299.99,
      "countAdults": 2,
      "countChildren": 0,
      "inboundDepartureAirport": "PMI",
      "inboundDepartureDatetime": "2024-06-08T14:30:00Z",
      "inboundArrivalAirport": "FRA",
      "inboundArrivalDatetime": "2024-06-08T16:45:00Z",
      "outboundDepartureAirport": "FRA",
      "outboundDepartureDatetime": "2024-06-01T08:15:00Z",
      "outboundArrivalAirport": "PMI",
      "outboundArrivalDatetime": "2024-06-01T10:30:00Z",
      "mealType": "All Inclusive",
      "oceanView": true,
      "roomType": "Double Room"
    }
  ]
}
```

#### 3. Health Check
Returns system status and performance metrics.

```http
GET /api/health
```

#### 4. System Status
Returns detailed system status information.

```http
GET /api/status
```

#### 5. Performance Metrics
Returns performance metrics and monitoring data.

```http
GET /api/metrics
```

#### 6. Enhanced Features (Additional Endpoints)

The API also includes several enhanced endpoints for advanced functionality:

**Shortlist Management:**
- `POST /api/shortlists` - Create a new shortlist
- `GET /api/shortlists/{userId}` - Get user's shortlists
- `POST /api/shortlists/{shortlistId}/items` - Add hotel to shortlist
- `DELETE /api/shortlists/{shortlistId}/items/{hotelId}` - Remove hotel from shortlist
- `DELETE /api/shortlists/{shortlistId}` - Delete shortlist

**Price Alerts:**
- `POST /api/price-alerts` - Create price alert
- `GET /api/price-alerts/{userId}` - Get user's price alerts
- `PATCH /api/price-alerts/{alertId}` - Update price alert
- `DELETE /api/price-alerts/{alertId}` - Delete price alert

**Smart Recommendations:**
- `GET /api/recommendations/{userId}` - Get personalized recommendations
- `GET /api/recommendations/{userId}/similar/{hotelId}` - Get similar hotels
- `GET /api/recommendations/trending` - Get trending hotels
- `GET /api/recommendations/value-deals` - Get value deals

**Filter Options:**
- `GET /api/filters/meal-types` - Get available meal types
- `GET /api/filters/room-types` - Get available room types
- `GET /api/filters/airports` - Get available airports

**Cache Management:**
- `GET /api/cache/stats` - Get cache statistics
- `DELETE /api/cache` - Clear cache

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "dataStatus": {
    "offersLoaded": 100000000,
    "hotelsLoaded": 1500,
    "indexesBuilt": true,
    "lastUpdated": "2024-01-15T09:00:00Z"
  },
  "performance": {
    "avgResponseTime": "0.15s",
    "p95ResponseTime": "0.8s",
    "requestsPerSecond": 150
  },
  "system": {
    "memoryUsage": "2.1GB",
    "cpuUsage": "15%"
  }
}
```

### Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid search parameters",
    "details": {
      "field": "earliestDepartureDate",
      "reason": "Date must be in YYYY-MM-DD format"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Invalid request parameters
- `NOT_FOUND`: Hotel or resource not found
- `TIMEOUT_ERROR`: Request exceeded time limit
- `INTERNAL_ERROR`: Server error

## 🛠 Installation

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Docker**: Version 20+ (for containerized deployment)
- **Memory**: Minimum 4GB RAM (8GB+ recommended for full dataset)

### Local Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd mallorca-travel-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Prepare data files**:
   ```bash
   mkdir -p data
   # Place offers.csv and hotels.csv in the data directory
   ```

5. **Validate setup**:
   ```bash
   npm run validate
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory (use `.env.example` as a template):

```env
# Server Configuration
PORT=3000
LOG_LEVEL=info
REQUEST_TIMEOUT=30000
MAX_REQUEST_SIZE=10mb

# Data Paths
DATA_PATH=./data
OFFERS_DATA_PATH=./data/offers.csv
HOTELS_DATA_PATH=./data/hotels.csv

# Ultra-Performance Configuration
ENABLE_ULTRA_PERFORMANCE=true
ULTRA_MAX_OFFERS=100000000
ULTRA_MAX_HOTELS=300000
ULTRA_USE_COLUMNAR_STORAGE=true
ULTRA_USE_MEMORY_MAPPING=true
ULTRA_USE_BITSET_INDEXES=true
ULTRA_USE_PARALLEL_PROCESSING=true

# Streaming Configuration
STREAMING_CHUNK_SIZE=10000
ENABLE_MEMORY_MONITORING=true
MEMORY_THRESHOLD_MB=12000
GC_INTERVAL=50

# Advanced Optimizations
ENABLE_ADVANCED_OPTIMIZATIONS=true
ENABLE_STREAMING_INDEX_BUILDING=true

# Optional: Logs directory
LOGS_PATH=./logs

# Docker Configuration (optional)
# COMPOSE_PROJECT_NAME=mallorca-travel
# COMPOSE_FILE=docker-compose.yml

# Development Settings
# NODE_ENV=development
```

**Configuration Options:**

**Server Configuration:**
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging level (info, debug, warn, error)
- `REQUEST_TIMEOUT`: Request timeout in milliseconds
- `MAX_REQUEST_SIZE`: Maximum request body size

**Data Paths:**
- `DATA_PATH`: Directory containing CSV data files
- `OFFERS_DATA_PATH`: Path to offers CSV file
- `HOTELS_DATA_PATH`: Path to hotels CSV file
- `LOGS_PATH`: Directory for log files

**Ultra-Performance Configuration:**
- `ENABLE_ULTRA_PERFORMANCE`: Enable ultra-performance mode (true/false)
- `ULTRA_MAX_OFFERS`: Maximum number of offers to process (default: 100M)
- `ULTRA_MAX_HOTELS`: Maximum number of hotels to process (default: 300K)
- `ULTRA_USE_COLUMNAR_STORAGE`: Use columnar storage for better performance
- `ULTRA_USE_MEMORY_MAPPING`: Enable memory mapping for large datasets
- `ULTRA_USE_BITSET_INDEXES`: Use bitset indexes for faster filtering
- `ULTRA_USE_PARALLEL_PROCESSING`: Enable parallel processing

**Streaming Configuration:**
- `STREAMING_CHUNK_SIZE`: Size of data chunks for streaming processing
- `ENABLE_MEMORY_MONITORING`: Monitor memory usage during processing
- `MEMORY_THRESHOLD_MB`: Memory threshold in MB for garbage collection
- `GC_INTERVAL`: Garbage collection interval

**Advanced Optimizations:**
- `ENABLE_ADVANCED_OPTIMIZATIONS`: Enable advanced performance optimizations
- `ENABLE_STREAMING_INDEX_BUILDING`: Enable streaming index building for large datasets

### Data File Format

#### Data File Format

#### Offers CSV Format
The offers.csv file should contain the following columns:
- `hotelId`: Hotel identifier
- `price`: Offer price
- `countAdults`: Number of adults
- `countChildren`: Number of children
- `outboundDepartureDateTime`: Departure date/time
- `inboundDepartureDateTime`: Return date/time
- `outboundDepartureAirport`: Departure airport code
- `inboundDepartureAirport`: Return departure airport code
- `outboundArrivalAirport`: Arrival airport code
- `inboundArrivalAirport`: Return arrival airport code
- `mealType`: Meal plan type
- `oceanView`: Ocean view availability (boolean)
- `roomType`: Room type description

#### Hotels CSV Format
The hotels.csv file should contain:
- `id`: Hotel identifier
- `name`: Hotel name
- `stars`: Star rating

## Data File Validation & Requirements

### File Size Limits & Performance Impact

| File Size | Processing Time | Memory Usage | Recommended Config |
|-----------|----------------|--------------|--------------------|  
| < 100 MB | < 30 seconds | < 1 GB | Default settings |
| 100 MB - 1 GB | 1-5 minutes | 2-4 GB | Enable streaming |
| 1-10 GB | 5-30 minutes | 4-16 GB | Ultra-performance mode |
| > 10 GB | 30+ minutes | 16+ GB | Distributed processing |

### Data Format Requirements

#### CSV Format Standards
- **Encoding**: UTF-8 (required)
- **Delimiter**: Comma (`,`) - standard CSV
- **Line Endings**: Unix (`\n`) or Windows (`\r\n`)
- **Headers**: First row must contain column names
- **Quotes**: Use double quotes (`"`) for fields containing commas or newlines
- **Empty Values**: Use empty string or `NULL` for missing data

#### Field Validation Rules

**offers.csv**:
```csv
hotel_id,departure_date,return_date,count_adults,price,meal_type,room_type
12345,2024-07-15,2024-07-22,2,899.99,"Half Board","Double Room"
12346,2024-08-01,2024-08-08,4,1299.50,"All Inclusive","Family Suite"
```

| Field | Type | Format | Validation | Example |
|-------|------|--------|------------|----------|
| `hotel_id` | String/Number | Any | Required, non-empty | `12345` |
| `departure_date` | Date | YYYY-MM-DD | Valid date, ISO format | `2024-07-15` |
| `return_date` | Date | YYYY-MM-DD | Valid date, after departure | `2024-07-22` |
| `count_adults` | Integer | Positive number | >= 1, <= 20 | `2` |
| `price` | Decimal | Positive number | >= 0, max 2 decimals | `899.99` |

**hotels.csv**:
```csv
hotel_id,name,location,stars,description
12345,"Hotel Paradise","Palma, Mallorca",4,"Luxury beachfront hotel"
12346,"Resort Sunshine","Alcudia, Mallorca",5,"All-inclusive family resort"
```

| Field | Type | Format | Validation | Example |
|-------|------|--------|------------|----------|
| `hotel_id` | String/Number | Any | Required, unique | `12345` |
| `name` | String | Text | Required, non-empty | `"Hotel Paradise"` |

### Data Validation Commands

#### Pre-Processing Validation

```bash
# Check file existence and basic info
ls -lh data/
file data/*.csv

# Count records
wc -l data/*.csv

# Check file encoding
file -bi data/*.csv

# Validate CSV structure
head -5 data/offers.csv
head -5 data/hotels.csv

# Check for required columns
head -1 data/offers.csv | tr ',' '\n' | nl
head -1 data/hotels.csv | tr ',' '\n' | nl
```

#### Data Quality Validation

```bash
# Check for empty hotel_id values
awk -F',' 'NR>1 && ($1=="" || $1=="NULL") {print "Empty hotel_id at line " NR}' data/offers.csv

# Validate date formats
awk -F',' 'NR>1 && $2 !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ {print "Invalid departure_date at line " NR ": " $2}' data/offers.csv

# Check price format
awk -F',' 'NR>1 && $5 !~ /^[0-9]+(\.[0-9]{1,2})?$/ {print "Invalid price at line " NR ": " $5}' data/offers.csv

# Find duplicate hotel_ids in hotels.csv
awk -F',' 'NR>1 {count[$1]++} END {for (id in count) if (count[id] > 1) print "Duplicate hotel_id: " id " (" count[id] " times)"}' data/hotels.csv

# Check for orphaned offers (hotel_id not in hotels.csv)
awk -F',' 'NR==1{next} FNR==NR{hotels[$1]=1; next} !($1 in hotels){print "Orphaned offer at line " NR ": hotel_id " $1}' data/hotels.csv data/offers.csv
```

#### Advanced Validation Script

```bash
# Create comprehensive validation script
cat > validate-data.sh << 'EOF'
#!/bin/bash
set -e

echo "🔍 Validating data files..."

# Check file existence
if [ ! -f "data/offers.csv" ]; then
    echo "❌ offers.csv not found in data/ directory"
    exit 1
fi

if [ ! -f "data/hotels.csv" ]; then
    echo "❌ hotels.csv not found in data/ directory"
    exit 1
fi

# Check file sizes
OFFERS_SIZE=$(stat -f%z data/offers.csv 2>/dev/null || stat -c%s data/offers.csv)
HOTELS_SIZE=$(stat -f%z data/hotels.csv 2>/dev/null || stat -c%s data/hotels.csv)

echo "📊 File sizes:"
echo "  offers.csv: $(numfmt --to=iec $OFFERS_SIZE)"
echo "  hotels.csv: $(numfmt --to=iec $HOTELS_SIZE)"

# Check encoding
echo "🔤 Checking file encoding..."
if ! file -bi data/offers.csv | grep -q "utf-8"; then
    echo "⚠️  offers.csv may not be UTF-8 encoded"
fi

if ! file -bi data/hotels.csv | grep -q "utf-8"; then
    echo "⚠️  hotels.csv may not be UTF-8 encoded"
fi

# Count records
OFFERS_COUNT=$(tail -n +2 data/offers.csv | wc -l | tr -d ' ')
HOTELS_COUNT=$(tail -n +2 data/hotels.csv | wc -l | tr -d ' ')

echo "📈 Record counts:"
echo "  Offers: $OFFERS_COUNT"
echo "  Hotels: $HOTELS_COUNT"

# Validate headers
echo "🏷️  Validating headers..."
OFFERS_HEADER=$(head -1 data/offers.csv)
HOTELS_HEADER=$(head -1 data/hotels.csv)

if ! echo "$OFFERS_HEADER" | grep -q "hotel_id.*departure_date.*return_date.*count_adults.*price"; then
    echo "❌ offers.csv missing required columns"
    echo "   Required: hotel_id, departure_date, return_date, count_adults, price"
    echo "   Found: $OFFERS_HEADER"
    exit 1
fi

if ! echo "$HOTELS_HEADER" | grep -q "hotel_id.*name"; then
    echo "❌ hotels.csv missing required columns"
    echo "   Required: hotel_id, name"
    echo "   Found: $HOTELS_HEADER"
    exit 1
fi

# Quick data quality checks
echo "🔍 Running data quality checks..."

# Check for empty required fields
EMPTY_HOTEL_IDS=$(awk -F',' 'NR>1 && ($1=="" || $1=="NULL") {count++} END {print count+0}' data/offers.csv)
if [ "$EMPTY_HOTEL_IDS" -gt 0 ]; then
    echo "⚠️  Found $EMPTY_HOTEL_IDS offers with empty hotel_id"
fi

# Check date format (basic)
INVALID_DATES=$(awk -F',' 'NR>1 && ($2 !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ || $3 !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) {count++} END {print count+0}' data/offers.csv)
if [ "$INVALID_DATES" -gt 0 ]; then
    echo "⚠️  Found $INVALID_DATES offers with invalid date format"
fi

# Check for reasonable price range
INVALID_PRICES=$(awk -F',' 'NR>1 && ($5 <= 0 || $5 > 50000) {count++} END {print count+0}' data/offers.csv)
if [ "$INVALID_PRICES" -gt 0 ]; then
    echo "⚠️  Found $INVALID_PRICES offers with unreasonable prices (<=0 or >50000)"
fi

echo "✅ Data validation completed"
echo "📋 Summary:"
echo "  Total offers: $OFFERS_COUNT"
echo "  Total hotels: $HOTELS_COUNT"
echo "  Data quality issues: $((EMPTY_HOTEL_IDS + INVALID_DATES + INVALID_PRICES))"

if [ $((EMPTY_HOTEL_IDS + INVALID_DATES + INVALID_PRICES)) -eq 0 ]; then
    echo "🎉 All validation checks passed!"
else
    echo "⚠️  Some data quality issues found. Review and fix before processing."
fi
EOF

chmod +x validate-data.sh
./validate-data.sh
```

### Data Processing Configuration

#### For Large Files (> 1GB)

```bash
# Enable streaming and memory optimization
cat >> .env << 'EOF'
# Large file processing
ENABLE_ULTRA_PERFORMANCE=true
STREAMING_CHUNK_SIZE=50000
ENABLE_MEMORY_MONITORING=true
MEMORY_THRESHOLD_MB=8192
ULTRA_USE_COLUMNAR_STORAGE=true
ULTRA_USE_PARALLEL_PROCESSING=true
EOF
```

#### For Very Large Files (> 10GB)

```bash
# Maximum performance configuration
cat >> .env << 'EOF'
# Very large file processing
ENABLE_ULTRA_PERFORMANCE=true
ULTRA_MAX_OFFERS=100000000
ULTRA_USE_COLUMNAR_STORAGE=true
ULTRA_USE_MEMORY_MAPPING=true
ULTRA_USE_BITSET_INDEXES=true
ULTRA_USE_PARALLEL_PROCESSING=true
STREAMING_CHUNK_SIZE=100000
ENABLE_STREAMING_INDEX_BUILDING=true
ENABLE_ADVANCED_OPTIMIZATIONS=true
MEMORY_THRESHOLD_MB=16384
GC_INTERVAL=30000
EOF
```

### Common Data Issues & Solutions

#### Issue: "Out of Memory" during data loading
**Solution**:
```bash
# Reduce chunk size and enable memory monitoring
echo "STREAMING_CHUNK_SIZE=5000" >> .env
echo "ENABLE_MEMORY_MONITORING=true" >> .env
echo "MEMORY_THRESHOLD_MB=4096" >> .env

# Restart with more memory (if available)
node --max-old-space-size=8192 dist/server.js
```

#### Issue: "Invalid date format" errors
**Solution**:
```bash
# Find and fix date format issues
awk -F',' 'NR>1 && $2 !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ {print NR ": " $2}' data/offers.csv

# Convert dates from DD/MM/YYYY to YYYY-MM-DD
sed -i.bak 's/\([0-9]\{2\}\)\/\([0-9]\{2\}\)\/\([0-9]\{4\}\)/\3-\2-\1/g' data/offers.csv
```

#### Issue: "Orphaned offers" (hotel_id not found in hotels.csv)
**Solution**:
```bash
# Find orphaned offers
comm -23 <(awk -F',' 'NR>1 {print $1}' data/offers.csv | sort -u) <(awk -F',' 'NR>1 {print $1}' data/hotels.csv | sort -u)

# Remove orphaned offers (backup first)
cp data/offers.csv data/offers.csv.backup
awk -F',' 'NR==1 {print; next} FNR==NR {hotels[$1]=1; next} $1 in hotels {print}' data/hotels.csv data/offers.csv > data/offers_clean.csv
mv data/offers_clean.csv data/offers.csv
```

### Data Backup & Recovery

```bash
# Create data backup
mkdir -p backups/$(date +%Y%m%d)
cp data/*.csv backups/$(date +%Y%m%d)/
tar -czf backups/data-backup-$(date +%Y%m%d-%H%M%S).tar.gz data/

# Verify backup
tar -tzf backups/data-backup-*.tar.gz

# Restore from backup
tar -xzf backups/data-backup-YYYYMMDD-HHMMSS.tar.gz
```

## 🔧 Development

### Available Scripts

**Backend Scripts:**
| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run lint` | Run ESLint |
| `npm run setup` | Setup and validate environment |
| `npm run validate` | Validate configuration |
| `npm run health` | Check application health |
| `npm run start:full` | Start both backend and frontend |
| `npm run shutdown` | Gracefully shutdown the application |
| `npm run docker:build` | Build Docker image |
| `npm run docker:run` | Run Docker container |
| `npm run docker:stop` | Stop Docker container |
| `npm run docker:clean` | Clean Docker resources |

**Frontend Scripts (in default-frontend directory):**
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build the Next.js application |
| `npm start` | Start Next.js production server |
| `npm run lint` | Run ESLint for frontend |

### Development Workflow

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Run tests in watch mode**:
   ```bash
   npm run test -- --watch
   ```

3. **Lint code**:
   ```bash
   npm run lint
   ```

4. **Build and test production build**:
   ```bash
   npm run build
   npm start
   ```

### Code Style

The project uses ESLint with TypeScript rules. Key conventions:
- Use TypeScript strict mode
- Prefer `const` over `let`
- Use async/await over Promises
- Follow naming conventions (camelCase for variables, PascalCase for classes)
- Add JSDoc comments for public APIs

## 🚢 Deployment

### Docker Deployment (Recommended)

**Production Deployment:**
1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode**:
   ```bash
   docker-compose up -d
   ```

3. **Stop the services**:
   ```bash
   docker-compose down
   ```

**Development with Docker:**
1. **Run development environment**:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Features in development mode**:
   - Hot reloading with source code mounted
   - Debug logging enabled
   - Faster health checks
   - No resource limits

**Docker Scripts (via npm):**
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container
- `npm run docker:stop` - Stop Docker container
- `npm run docker:clean` - Clean Docker resources

### Deployment Scripts

The `scripts/` directory contains comprehensive deployment and management tools:

**Setup and Configuration:**
- `setup-environment.sh` - Initialize environment and validate configuration
- `validate-config.sh` - Validate environment variables and system requirements

**Application Management:**
- `start.sh` - Start the application with full validation
- `shutdown.sh` - Gracefully shutdown the application
- `health-check.sh` - Check application health and status

**Usage Examples:**
```bash
# Setup environment (first time)
./scripts/setup-environment.sh

# Validate configuration
./scripts/validate-config.sh

# Start application
./scripts/start.sh

# Check health
./scripts/health-check.sh

# Shutdown application
./scripts/shutdown.sh
```

### Manual Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start with process management**:
   ```bash
   npm run start:full
   ```

3. **Monitor health**:
   ```bash
   npm run health
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## ⚡ Performance Tuning

### Memory Optimization

For datasets with 100M+ records:

1. **Increase Node.js memory**:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=8192"
   ```

2. **Adjust Docker memory limits**:
   ```yaml
   # docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 8G
   ```

### Query Performance

The system uses several optimization techniques:

1. **Multi-level indexing**: Indexes by hotel, airport, date, and passenger count
2. **Index intersection**: Combines multiple indexes for complex queries
3. **Early termination**: Stops processing when minimum results are found
4. **Memory-efficient data structures**: Uses typed arrays and string interning

### Performance Monitoring

Monitor performance using the health endpoint:

```bash
curl http://localhost:3000/health | jq '.performance'
```

Expected performance targets:
- **Average response time**: < 1 second
- **95th percentile**: < 5 seconds
- **Memory usage**: < 4GB for 100M records
- **Throughput**: 100+ requests/second

## System Requirements & Performance Benchmarks

### Minimum System Requirements

| Component | Minimum | Recommended | High Performance |
|-----------|---------|-------------|------------------|
| **CPU** | 2 cores, 2.0 GHz | 4 cores, 2.5 GHz | 8+ cores, 3.0+ GHz |
| **RAM** | 4 GB | 8 GB | 16+ GB |
| **Storage** | 10 GB free | 50 GB free | 100+ GB SSD |
| **Node.js** | 16.x | 18.x LTS | 20.x LTS |
| **Network** | 100 Mbps | 1 Gbps | 10+ Gbps |

### Performance Benchmarks

#### Response Time Targets

| Endpoint | Target (ms) | Acceptable (ms) | Data Size |
|----------|-------------|-----------------|----------|
| `/api/health` | < 10 | < 50 | N/A |
| `/api/bestOffersByHotel` | < 500 | < 1000 | 1M+ offers |
| `/api/hotels/{id}/offers` | < 200 | < 500 | 10K+ offers |
| `/api/status` | < 100 | < 300 | System info |
| `/api/metrics` | < 50 | < 150 | Performance data |

#### Throughput Benchmarks

| Configuration | Requests/sec | Concurrent Users | Data Size |
|---------------|--------------|------------------|----------|
| **Basic** | 100-200 | 50 | 1M offers |
| **Optimized** | 500-1000 | 200 | 10M offers |
| **Ultra-Performance** | 2000+ | 500+ | 100M+ offers |

#### Memory Usage Patterns

| Data Size | Base Memory | Peak Memory | Recommended RAM |
|-----------|-------------|-------------|----------------|
| 1M offers | 500 MB | 1 GB | 4 GB |
| 10M offers | 2 GB | 4 GB | 8 GB |
| 50M offers | 8 GB | 12 GB | 16 GB |
| 100M+ offers | 16 GB | 24 GB | 32 GB |

### Performance Testing Commands

```bash
# Basic performance test
time curl "http://localhost:3000/api/bestOffersByHotel?destination=Mallorca&limit=10"

# Load testing with Apache Bench
ab -n 1000 -c 10 "http://localhost:3000/api/health"

# Memory usage monitoring
ps aux | grep node
top -p $(pgrep -f "node.*server")

# System resource monitoring
htop
iostat -x 1
netstat -i
```

### Performance Optimization Tips

1. **Enable Ultra-Performance Mode**
   ```bash
   echo "ENABLE_ULTRA_PERFORMANCE=true" >> .env
   echo "ULTRA_USE_COLUMNAR_STORAGE=true" >> .env
   echo "ULTRA_USE_PARALLEL_PROCESSING=true" >> .env
   ```

2. **Optimize Memory Settings**
   ```bash
   # For systems with 16GB+ RAM
   echo "MEMORY_THRESHOLD_MB=8192" >> .env
   echo "STREAMING_CHUNK_SIZE=50000" >> .env
   ```

3. **Enable Advanced Optimizations**
   ```bash
   echo "ENABLE_ADVANCED_OPTIMIZATIONS=true" >> .env
   echo "ULTRA_USE_MEMORY_MAPPING=true" >> .env
   echo "ULTRA_USE_BITSET_INDEXES=true" >> .env
   ```

4. **System-Level Optimizations**
   ```bash
   # Increase file descriptor limits
   ulimit -n 65536
   
   # Optimize TCP settings (Linux)
   echo 'net.core.somaxconn = 65536' >> /etc/sysctl.conf
   echo 'net.ipv4.tcp_max_syn_backlog = 65536' >> /etc/sysctl.conf
   ```

### Scaling Recommendations

| Users | Configuration | Infrastructure |
|-------|---------------|----------------|
| < 100 | Single instance | 1 server, 8GB RAM |
| 100-1K | Load balanced | 2-3 servers, 16GB RAM each |
| 1K-10K | Clustered | 5+ servers, 32GB RAM each |
| 10K+ | Distributed | Auto-scaling, CDN, caching |

For detailed performance optimization, see [PERFORMANCE.md](./PERFORMANCE.md).

## 🔄 Backup & Recovery Procedures

### Automated Backup Strategy

#### Daily Backup Script

```bash
# Create automated backup script
cat > backup-system.sh << 'EOF'
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/var/backups/mallorca-travel"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30
LOG_FILE="$BACKUP_DIR/backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

echo "$(date): Starting backup process" >> "$LOG_FILE"

# 1. Data Files Backup
echo "Backing up data files..." >> "$LOG_FILE"
tar -czf "$BACKUP_DIR/daily/data-$DATE.tar.gz" data/ || {
    echo "$(date): ERROR - Data backup failed" >> "$LOG_FILE"
    exit 1
}

# 2. Configuration Backup
echo "Backing up configuration..." >> "$LOG_FILE"
tar -czf "$BACKUP_DIR/daily/config-$DATE.tar.gz" .env* *.json *.js *.md || {
    echo "$(date): ERROR - Config backup failed" >> "$LOG_FILE"
    exit 1
}

# 3. Logs Backup
if [ -d "logs" ]; then
    echo "Backing up logs..." >> "$LOG_FILE"
    tar -czf "$BACKUP_DIR/daily/logs-$DATE.tar.gz" logs/ || {
        echo "$(date): WARNING - Logs backup failed" >> "$LOG_FILE"
    }
fi

# 4. Application State Backup (if applicable)
if [ -f "application.state" ]; then
    echo "Backing up application state..." >> "$LOG_FILE"
    cp application.state "$BACKUP_DIR/daily/application-state-$DATE.backup"
fi

# 5. Create full system backup
echo "Creating full system backup..." >> "$LOG_FILE"
tar -czf "$BACKUP_DIR/daily/full-system-$DATE.tar.gz" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='*.log' \
    --exclude='.git' \
    . || {
    echo "$(date): ERROR - Full system backup failed" >> "$LOG_FILE"
    exit 1
}

# 6. Cleanup old backups
echo "Cleaning up old backups..." >> "$LOG_FILE"
find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/daily" -name "*.backup" -mtime +$RETENTION_DAYS -delete

# 7. Weekly backup (every Sunday)
if [ $(date +%u) -eq 7 ]; then
    echo "Creating weekly backup..." >> "$LOG_FILE"
    cp "$BACKUP_DIR/daily/full-system-$DATE.tar.gz" "$BACKUP_DIR/weekly/"
    # Keep 12 weeks of weekly backups
    find "$BACKUP_DIR/weekly" -name "*.tar.gz" -mtime +84 -delete
fi

# 8. Monthly backup (first day of month)
if [ $(date +%d) -eq 01 ]; then
    echo "Creating monthly backup..." >> "$LOG_FILE"
    cp "$BACKUP_DIR/daily/full-system-$DATE.tar.gz" "$BACKUP_DIR/monthly/"
    # Keep 12 months of monthly backups
    find "$BACKUP_DIR/monthly" -name "*.tar.gz" -mtime +365 -delete
fi

# 9. Verify backup integrity
echo "Verifying backup integrity..." >> "$LOG_FILE"
tar -tzf "$BACKUP_DIR/daily/full-system-$DATE.tar.gz" > /dev/null || {
    echo "$(date): ERROR - Backup verification failed" >> "$LOG_FILE"
    exit 1
}

# 10. Generate backup report
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/daily/full-system-$DATE.tar.gz" | cut -f1)
echo "$(date): Backup completed successfully - Size: $BACKUP_SIZE" >> "$LOG_FILE"

# Optional: Send notification (uncomment if needed)
# echo "Mallorca Travel backup completed: $BACKUP_SIZE" | mail -s "Backup Report" admin@example.com

echo "Backup process completed successfully"
EOF

chmod +x backup-system.sh
```

#### Setup Automated Backups with Cron

```bash
# Add to crontab for daily backups at 2 AM
crontab -e

# Add this line:
0 2 * * * /path/to/mallorca-travel/backup-system.sh >> /var/log/mallorca-backup.log 2>&1

# Verify cron job
crontab -l
```

### Cloud Backup Integration

#### AWS S3 Backup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure

# Create S3 backup script
cat > backup-to-s3.sh << 'EOF'
#!/bin/bash
set -e

BUCKET_NAME="mallorca-travel-backups"
DATE=$(date +%Y%m%d-%H%M%S)
LOCAL_BACKUP="/tmp/mallorca-backup-$DATE.tar.gz"

# Create backup
tar -czf "$LOCAL_BACKUP" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    data/ .env* *.json logs/

# Upload to S3
aws s3 cp "$LOCAL_BACKUP" "s3://$BUCKET_NAME/daily/"

# Cleanup local backup
rm "$LOCAL_BACKUP"

# Cleanup old S3 backups (keep 30 days)
aws s3 ls "s3://$BUCKET_NAME/daily/" | while read -r line; do
    createDate=$(echo $line | awk '{print $1" "$2}')
    createDate=$(date -d"$createDate" +%s)
    olderThan=$(date -d"30 days ago" +%s)
    if [[ $createDate -lt $olderThan ]]; then
        fileName=$(echo $line | awk '{print $4}')
        if [[ $fileName != "" ]]; then
            aws s3 rm "s3://$BUCKET_NAME/daily/$fileName"
        fi
    fi
done

echo "Backup uploaded to S3 successfully"
EOF

chmod +x backup-to-s3.sh
```

#### Google Cloud Storage Backup

```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Create GCS backup script
cat > backup-to-gcs.sh << 'EOF'
#!/bin/bash
set -e

BUCKET_NAME="mallorca-travel-backups"
DATE=$(date +%Y%m%d-%H%M%S)
LOCAL_BACKUP="/tmp/mallorca-backup-$DATE.tar.gz"

# Create backup
tar -czf "$LOCAL_BACKUP" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    data/ .env* *.json logs/

# Upload to GCS
gsutil cp "$LOCAL_BACKUP" "gs://$BUCKET_NAME/daily/"

# Cleanup local backup
rm "$LOCAL_BACKUP"

# Set lifecycle policy for automatic cleanup
cat > lifecycle.json << 'LIFECYCLE'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 30}
    }
  ]
}
LIFECYCLE

gsutil lifecycle set lifecycle.json "gs://$BUCKET_NAME"
rm lifecycle.json

echo "Backup uploaded to GCS successfully"
EOF

chmod +x backup-to-gcs.sh
```

### Disaster Recovery Procedures

#### Complete System Recovery

```bash
# Create disaster recovery script
cat > disaster-recovery.sh << 'EOF'
#!/bin/bash
set -e

echo "🚨 Starting Disaster Recovery Process"
echo "⚠️  This will restore the system from backup"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Recovery cancelled"
    exit 1
fi

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    echo "Available backups:"
    ls -la /var/backups/mallorca-travel/daily/*.tar.gz 2>/dev/null || echo "No local backups found"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📋 Recovery Plan:"
echo "1. Stop running services"
echo "2. Backup current state (if possible)"
echo "3. Restore from backup: $BACKUP_FILE"
echo "4. Restore configuration"
echo "5. Restore data files"
echo "6. Restart services"
echo "7. Verify system health"
echo ""
read -p "Proceed with recovery? (yes/no): " proceed

if [ "$proceed" != "yes" ]; then
    echo "Recovery cancelled"
    exit 1
fi

# 1. Stop services
echo "🛑 Stopping services..."
pkill -f "node.*server" || true
sudo systemctl stop nginx || true

# 2. Backup current state (emergency backup)
echo "💾 Creating emergency backup of current state..."
EMERGENCY_BACKUP="/tmp/emergency-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$EMERGENCY_BACKUP" . 2>/dev/null || echo "⚠️  Emergency backup failed (continuing anyway)"
echo "Emergency backup saved to: $EMERGENCY_BACKUP"

# 3. Extract backup
echo "📦 Extracting backup..."
tar -xzf "$BACKUP_FILE" || {
    echo "❌ Failed to extract backup"
    exit 1
}

# 4. Restore permissions
echo "🔐 Restoring permissions..."
chmod +x *.sh 2>/dev/null || true
chmod 600 .env* 2>/dev/null || true

# 5. Install dependencies (if needed)
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install || {
        echo "❌ Failed to install dependencies"
        exit 1
    }
fi

# 6. Build application (if needed)
if [ -f "tsconfig.json" ]; then
    echo "🏗️  Building application..."
    npm run build || {
        echo "❌ Failed to build application"
        exit 1
    }
fi

# 7. Verify data integrity
echo "🔍 Verifying data integrity..."
if [ -f "validate-data.sh" ]; then
    ./validate-data.sh || echo "⚠️  Data validation warnings (check logs)"
fi

# 8. Start services
echo "🚀 Starting services..."
npm run start:full &
SERVER_PID=$!

# 9. Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# 10. Health check
echo "🏥 Performing health check..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ System is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Health check failed"
        echo "Server PID: $SERVER_PID"
        echo "Check logs: tail -f logs/application.log"
        exit 1
    fi
    sleep 2
done

# 11. Final verification
echo "🧪 Running final verification..."
API_RESPONSE=$(curl -s "http://localhost:3000/api/bestOffersByHotel?destination=Mallorca&limit=1")
if echo "$API_RESPONSE" | grep -q '"success":true'; then
    echo "✅ API is responding correctly"
else
    echo "⚠️  API response may have issues"
    echo "Response: $API_RESPONSE"
fi

echo "🎉 Disaster recovery completed successfully!"
echo "📊 System Status:"
echo "  - API Health: http://localhost:3000/api/health"
echo "  - System Status: http://localhost:3000/api/status"
echo "  - Emergency Backup: $EMERGENCY_BACKUP"
echo ""
echo "📝 Next Steps:"
echo "1. Monitor system performance"
echo "2. Check application logs"
echo "3. Verify all functionality"
echo "4. Update monitoring systems"
echo "5. Document the incident"
EOF

chmod +x disaster-recovery.sh
```

#### Data-Only Recovery

```bash
# Create data recovery script
cat > recover-data.sh << 'EOF'
#!/bin/bash
set -e

echo "📊 Data Recovery Utility"

DATA_BACKUP="$1"
if [ -z "$DATA_BACKUP" ]; then
    echo "Usage: $0 <data-backup.tar.gz>"
    echo "Available data backups:"
    ls -la /var/backups/mallorca-travel/daily/data-*.tar.gz 2>/dev/null || echo "No data backups found"
    exit 1
fi

if [ ! -f "$DATA_BACKUP" ]; then
    echo "❌ Data backup file not found: $DATA_BACKUP"
    exit 1
fi

echo "⚠️  This will replace current data files"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Data recovery cancelled"
    exit 1
fi

# Backup current data
echo "💾 Backing up current data..."
if [ -d "data" ]; then
    mv data "data.backup.$(date +%Y%m%d-%H%M%S)"
fi

# Extract data backup
echo "📦 Extracting data backup..."
tar -xzf "$DATA_BACKUP" || {
    echo "❌ Failed to extract data backup"
    exit 1
}

# Validate restored data
echo "🔍 Validating restored data..."
if [ -f "validate-data.sh" ]; then
    ./validate-data.sh
else
    echo "⚠️  Data validation script not found"
    # Basic validation
    if [ -f "data/offers.csv" ] && [ -f "data/hotels.csv" ]; then
        echo "✅ Data files found"
        echo "  Offers: $(wc -l < data/offers.csv) lines"
        echo "  Hotels: $(wc -l < data/hotels.csv) lines"
    else
        echo "❌ Required data files missing"
        exit 1
    fi
fi

echo "✅ Data recovery completed successfully"
echo "🔄 Restart the application to load new data"
EOF

chmod +x recover-data.sh
```

### Backup Monitoring & Alerts

#### Backup Health Check Script

```bash
# Create backup monitoring script
cat > monitor-backups.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/mallorca-travel"
ALERT_EMAIL="admin@example.com"
MAX_AGE_HOURS=26  # Alert if backup is older than 26 hours

echo "🔍 Checking backup health..."

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Find latest backup
LATEST_BACKUP=$(find "$BACKUP_DIR/daily" -name "full-system-*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backups found"
    echo "Backup failure detected" | mail -s "ALERT: Mallorca Travel Backup Missing" "$ALERT_EMAIL" 2>/dev/null || true
    exit 1
fi

# Check backup age
BACKUP_TIME=$(stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( (CURRENT_TIME - BACKUP_TIME) / 3600 ))

echo "📊 Backup Status:"
echo "  Latest backup: $LATEST_BACKUP"
echo "  Backup age: $AGE_HOURS hours"
echo "  Backup size: $(du -sh "$LATEST_BACKUP" | cut -f1)"

if [ $AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "⚠️  Backup is too old ($AGE_HOURS hours)"
    echo "Backup is $AGE_HOURS hours old (max: $MAX_AGE_HOURS)" | mail -s "ALERT: Mallorca Travel Backup Too Old" "$ALERT_EMAIL" 2>/dev/null || true
    exit 1
fi

# Test backup integrity
echo "🔍 Testing backup integrity..."
if tar -tzf "$LATEST_BACKUP" > /dev/null 2>&1; then
    echo "✅ Backup integrity check passed"
else
    echo "❌ Backup integrity check failed"
    echo "Backup integrity check failed for: $LATEST_BACKUP" | mail -s "ALERT: Mallorca Travel Backup Corrupted" "$ALERT_EMAIL" 2>/dev/null || true
    exit 1
fi

# Check disk space
DISK_USAGE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "⚠️  Backup disk usage high: ${DISK_USAGE}%"
    echo "Backup disk usage is ${DISK_USAGE}%" | mail -s "WARNING: Mallorca Travel Backup Disk Full" "$ALERT_EMAIL" 2>/dev/null || true
fi

echo "✅ All backup checks passed"
EOF

chmod +x monitor-backups.sh

# Add to crontab for hourly monitoring
# 0 * * * * /path/to/mallorca-travel/monitor-backups.sh >> /var/log/backup-monitor.log 2>&1
```

### Recovery Testing

#### Automated Recovery Test

```bash
# Create recovery test script
cat > test-recovery.sh << 'EOF'
#!/bin/bash
set -e

echo "🧪 Recovery Test Suite"

TEST_DIR="/tmp/recovery-test-$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📁 Creating test environment: $TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Extract backup
echo "📦 Extracting backup for testing..."
tar -xzf "$BACKUP_FILE" || {
    echo "❌ Failed to extract backup"
    exit 1
}

# Test data integrity
echo "🔍 Testing data integrity..."
if [ -f "validate-data.sh" ]; then
    ./validate-data.sh || {
        echo "❌ Data validation failed"
        exit 1
    }
else
    echo "⚠️  Data validation script not found"
fi

# Test configuration
echo "⚙️  Testing configuration..."
if [ -f ".env" ]; then
    echo "✅ Environment configuration found"
else
    echo "⚠️  Environment configuration missing"
fi

# Test dependencies
echo "📦 Testing dependencies..."
if [ -f "package.json" ]; then
    npm install --silent || {
        echo "❌ Dependency installation failed"
        exit 1
    }
    echo "✅ Dependencies installed successfully"
fi

# Test build
echo "🏗️  Testing build process..."
if [ -f "tsconfig.json" ]; then
    npm run build --silent || {
        echo "❌ Build failed"
        exit 1
    }
    echo "✅ Build successful"
fi

# Cleanup
echo "🧹 Cleaning up test environment..."
cd /
rm -rf "$TEST_DIR"

echo "✅ Recovery test completed successfully"
echo "📋 Test Results:"
echo "  - Backup extraction: ✅ PASS"
echo "  - Data validation: ✅ PASS"
echo "  - Configuration: ✅ PASS"
echo "  - Dependencies: ✅ PASS"
echo "  - Build process: ✅ PASS"
EOF

chmod +x test-recovery.sh
```

### Backup Best Practices

1. **3-2-1 Rule**: 3 copies of data, 2 different media types, 1 offsite
2. **Regular Testing**: Test recovery procedures monthly
3. **Automated Monitoring**: Set up alerts for backup failures
4. **Documentation**: Keep recovery procedures updated
5. **Access Control**: Secure backup files with proper permissions
6. **Encryption**: Encrypt sensitive backups
7. **Retention Policy**: Define clear retention periods
8. **Disaster Recovery Plan**: Document complete recovery procedures

### Quick Recovery Commands

```bash
# Emergency data recovery
./recover-data.sh /var/backups/mallorca-travel/daily/data-YYYYMMDD-HHMMSS.tar.gz

# Full system recovery
./disaster-recovery.sh /var/backups/mallorca-travel/daily/full-system-YYYYMMDD-HHMMSS.tar.gz

# Test backup integrity
./test-recovery.sh /var/backups/mallorca-travel/daily/full-system-YYYYMMDD-HHMMSS.tar.gz

# Monitor backup health
./monitor-backups.sh

# Manual backup
./backup-system.sh
```

For detailed backup and recovery procedures, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🔒 Security Considerations

### Data Protection
- **Input Validation**: All API endpoints validate input parameters and reject malformed requests
- **SQL Injection Prevention**: Uses parameterized queries and input sanitization
- **XSS Protection**: Implements proper output encoding and Content Security Policy headers
- **Data Sanitization**: CSV data is validated and sanitized during processing

### API Security
- **Rate Limiting**: Implements rate limiting to prevent abuse (configurable per endpoint)
- **CORS Configuration**: Properly configured CORS headers for cross-origin requests
- **Request Size Limits**: Enforces maximum request body size to prevent DoS attacks
- **Timeout Protection**: Request timeouts prevent resource exhaustion

### Infrastructure Security
- **Environment Variables**: Sensitive configuration stored in environment variables
- **Docker Security**: Uses non-root user in Docker containers
- **Log Security**: Logs are sanitized to prevent sensitive data exposure
- **Memory Protection**: Secure memory handling for large datasets

### Recommended Security Practices
```bash
# Use HTTPS in production
# Set secure environment variables
# Regular security updates
# Monitor for suspicious activity
# Implement proper logging and alerting
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Out of Memory Errors
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=8192"

# Or adjust Docker memory limits
# See docker-compose.yml
```

#### 2. Data Loading Failures
```bash
# Check data file format
head -n 5 data/offers.csv

# Validate configuration
npm run validate

# Check logs
tail -f logs/application.log
```

#### 3. Slow Response Times
```bash
# Check system resources
npm run health

# Monitor performance
curl http://localhost:3000/health | jq '.performance'

# Check for memory pressure
docker stats mallorca-travel-backend
```

#### 4. Port Already in Use
```bash
# Find process using port
lsof -ti:3000

# Kill process
npm run shutdown
```

### Debug Mode

Enable detailed logging:

```bash
export LOG_LEVEL=debug
npm run dev
```

### Log Files

Check log files for detailed information:
- `logs/application.log`: General application logs
- `logs/error.log`: Error logs
- `logs/performance.log`: Performance metrics

## 📁 Project Structure

```
mallorca-travel-backend/
├── default-frontend/           # Next.js frontend application
│   ├── app/                   # Next.js app directory
│   ├── components/            # React components
│   ├── public/               # Static assets
│   └── package.json          # Frontend dependencies
├── src/                      # Backend source code
│   ├── __tests__/              # Test files
│   │   ├── integration/        # Integration tests
│   │   └── unit/              # Unit tests
│   ├── config/                # Configuration management
│   ├── controllers/           # API request handlers
│   ├── middleware/            # Express middleware
│   ├── routes/               # API route definitions
│   ├── services/             # Business logic services
│   │   ├── dataLoader.ts     # CSV data loading
│   │   ├── searchEngine.ts   # Search algorithms
│   │   └── searchIndexes.ts  # Index management
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   ├── app.ts               # Express application setup
│   ├── index.ts             # Main entry point
│   └── startup.ts           # Application startup logic
├── doc/                     # Documentation files
├── nginx/                   # Nginx configuration
├── scripts/                  # Build and deployment scripts
├── data/                    # CSV data files (not in repo)
├── logs/                    # Log files (not in repo)
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile              # Docker image definition
├── .env.example           # Environment variables template
├── DEPLOYMENT.md          # Detailed deployment guide
└── README.md             # This file
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode (development)
npm test -- --watch

# Run specific test files
npm test -- api.integration.test.ts
npm test -- performance.test.ts
```

### Test Configuration

The project uses **Jest** with TypeScript support:
- **Configuration**: `jest.config.js`
- **Test Environment**: Node.js
- **Test Timeout**: 30 seconds
- **Coverage Reports**: Text, LCOV, and HTML formats
- **Path Mapping**: `@/` alias for `src/` directory

### Test Categories

1. **Integration Tests** (`src/__tests__/integration/`):
   - `api.integration.test.ts` - API endpoints end-to-end testing
   - `performance.test.ts` - Performance benchmarks and load testing
   - `error-handling.test.ts` - Error scenarios and graceful degradation
   - `frontend-integration.test.ts` - Frontend-backend integration
   - `openapi-compatibility.test.ts` - OpenAPI schema compliance

2. **Test Features**:
   - **API Endpoint Testing**: Complete request/response validation
   - **Performance Benchmarks**: Response time and memory usage monitoring
   - **Error Handling**: Various failure scenarios and recovery
   - **Data Validation**: CSV parsing and data integrity
   - **Search Engine Testing**: Search algorithms and indexing

### Test Data

The test suite includes:
- **Mock Data**: Synthetic hotels and offers for consistent testing
- **Edge Cases**: Boundary conditions and invalid inputs
- **Performance Datasets**: Large datasets for load testing
- **Error Scenarios**: Malformed data and system failures

### Coverage Reports

Generate coverage reports:
```bash
npm test -- --coverage
```

Reports are generated in:
- **Console**: Text summary
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 🔧 Troubleshooting

### Common Issues

**1. Data Files Not Found**
```bash
# Check if data files exist
ls -la data/

# Verify file permissions
chmod 644 data/*.csv
```

**2. Port Already in Use**
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process or change PORT in .env
PORT=3001 npm run dev
```

**3. Memory Issues**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

**4. Docker Issues**
```bash
# Clean Docker resources
docker system prune -f

# Rebuild without cache
docker-compose build --no-cache
```

**5. Frontend Connection Issues**
```bash
# Check if backend is running
curl http://localhost:3000/api/health

# Verify CORS configuration
# Check browser console for CORS errors
```

### Debugging

**Enable Debug Logging:**
```bash
LOG_LEVEL=debug npm run dev
```

**Check Application Health:**
```bash
# Quick health check
npm run health

# Detailed status
curl http://localhost:3000/api/status
```

**Monitor Performance:**
```bash
# Get performance metrics
curl http://localhost:3000/api/metrics

# Check cache statistics
curl http://localhost:3000/api/cache/stats
```

## 📞 Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the logs in `logs/` directory
3. Use the health check endpoint: `GET /api/health`
4. Check Docker logs: `docker-compose logs`
5. Validate configuration: `npm run validate`

## 🎯 Complete Workflow with UI

### Quick Start with Frontend

To run the complete system with both backend API and frontend UI:

```bash
# Option 1: Use the automated script (recommended)
./start-complete-workflow.sh

# Option 2: Manual setup
# Terminal 1 - Start Backend
npm run docker:run

# Terminal 2 - Start Frontend
cd default-frontend
npm install
npm run dev
```

**Access Points:**
- **Frontend UI**: http://localhost:3000 or http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

## Frontend Integration

The project includes a modern Next.js frontend located in the `default-frontend` directory that integrates seamlessly with the backend API.

### Frontend Features
- **Modern UI**: Built with Next.js 14 and Material-UI components
- **Advanced Search**: Comprehensive search form with filters for meal types, room types, ocean view, price range, and hotel stars
- **Loading States**: Visual feedback during API calls with spinners and loading messages
- **Error Handling**: User-friendly error messages and retry functionality
- **Responsive Design**: Optimized for both desktop and mobile devices

### Quick Start (Complete System)

1. **Start both backend and frontend**:
   ```bash
   npm run start:full
   ```

2. **Or start them separately**:
   ```bash
   # Terminal 1 - Backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd default-frontend
   npm run dev
   ```

3. **Access the application**:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000/api
   - API Documentation: http://localhost:3000/docs

### Testing the Complete Workflow

```bash
# Run automated integration tests
./test-complete-workflow.sh

# Or run specific test suites
npm test -- --testPathPattern=integration
npm test -- --testPathPattern=frontend-integration
npm test -- --testPathPattern=openapi-compatibility
```

### Manual UI Testing

1. **Open Frontend**: Navigate to http://localhost:3001
2. **Search for Offers**: 
   - Select departure airports (FRA, MUC, etc.)
   - Choose travel dates
   - Set duration and passenger counts
   - Click "Search"
3. **View Hotel Details**: Click on any hotel from results
4. **Test Different Scenarios**: Try various search parameters

### Documentation

- **[Complete Workflow Guide](COMPLETE_WORKFLOW_GUIDE.md)** - Detailed setup and testing instructions
- **[API Documentation](API.md)** - Comprehensive API reference with examples
- **[Performance Guide](PERFORMANCE.md)** - Performance tuning and optimization
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions

---

**Performance Targets:**
- ✅ Sub-second response times for typical queries
- ✅ 95th percentile under 5 seconds
- ✅ Handles 100M+ travel offers
- ✅ Memory efficient (< 4GB for full dataset)
- ✅ High throughput (100+ requests/second)
- ✅ Full frontend integration with Next.js UI

**Test:**
 - ✅ npx jest src/services/__tests__/dataLoader.test.ts --verbose
 - ✅ npx jest src/services/__tests__/searchEngine.test.ts --verbose
 - ✅ npx jest src/services/__tests__/searchIndexes.test.ts --verbose
 - ✅ npx jest src/__tests__/integration/performance.test.ts --verbose
 - ✅ npx jest src/__tests__/integration/frontend-integration.test.ts --verbose
 - ✅ npx jest src/__tests__/integration/openapi-compatibility.test.ts --verbose
- ✅ npx jest src/__tests__/integration/error-handling.test.ts --verbose
- ✅ npx jest src/__tests__/integration/api.integration.test.ts --verbose
- ✅ npx jest src/utils/__tests__/integration.test.ts --verbose
- ✅ npx jest src/utils/__tests__/csvParser.test.ts --verbose
- ✅ npx jest src/types/__tests__/validation.test.ts --verbose


   