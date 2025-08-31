# API Documentation

## Overview

The Mallorca Travel Backend provides a comprehensive RESTful API for searching and managing travel offers. This API is designed to handle over 100 million offers with sub-second response times.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Rate Limiting

- **Default Rate Limit**: 100 requests per minute per IP
- **Burst Limit**: 10 requests per second
- **Headers**: Rate limit information is included in response headers

## Core Endpoints

### 1. Best Offers by Hotel

**GET** `/api/bestOffersByHotel`

Retrieve the best offers for hotels based on search criteria.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `destination` | string | Yes | Destination name (e.g., "Mallorca") |
| `departureDate` | string | Yes | Departure date (YYYY-MM-DD) |
| `returnDate` | string | Yes | Return date (YYYY-MM-DD) |
| `countAdults` | number | Yes | Number of adults (1-10) |
| `countChildren` | number | No | Number of children (0-10) |
| `duration` | number | No | Trip duration in days |
| `limit` | number | No | Maximum results (default: 10, max: 100) |
| `offset` | number | No | Pagination offset (default: 0) |

#### Example Request

```bash
curl "http://localhost:3000/api/bestOffersByHotel?destination=Mallorca&departureDate=2024-07-15&returnDate=2024-07-22&countAdults=2&limit=5"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "hotelid": "12345",
      "hotelname": "Hotel Paradise",
      "price": 899.99,
      "inbounddeparturedatetime": "2024-07-15T10:00:00Z",
      "outbounddeparturedatetime": "2024-07-22T14:30:00Z",
      "countadults": 2,
      "countchildren": 0,
      "mealtype": "All Inclusive",
      "oceanview": true,
      "roomtype": "Double Room"
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 5,
    "offset": 0,
    "hasMore": true
  },
  "performance": {
    "queryTime": "0.045s",
    "totalOffers": 100000000
  }
}
```

### 2. Hotel Offers

**GET** `/api/hotels/{hotelId}/offers`

Retrieve all offers for a specific hotel.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hotelId` | string | Yes | Unique hotel identifier |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `departureDate` | string | No | Filter by departure date |
| `returnDate` | string | No | Filter by return date |
| `countAdults` | number | No | Filter by adult count |
| `limit` | number | No | Maximum results (default: 20) |
| `sortBy` | string | No | Sort field (price, date, duration) |
| `sortOrder` | string | No | Sort order (asc, desc) |

#### Example Request

```bash
curl "http://localhost:3000/api/hotels/12345/offers?limit=10&sortBy=price&sortOrder=asc"
```

## System Endpoints

### Health Check

**GET** `/api/health`

Check system health and status.

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": "2h 15m 30s",
  "memory": {
    "used": "2.1GB",
    "total": "8GB",
    "percentage": 26.25
  },
  "database": {
    "offers": 100000000,
    "hotels": 250000,
    "lastUpdate": "2024-01-15T08:00:00Z"
  }
}
```

### System Status

**GET** `/api/status`

Detailed system status and metrics.

### Performance Metrics

**GET** `/api/metrics`

System performance metrics and statistics.

## Advanced Features

### Price Alerts

**POST** `/api/price-alerts`

Create price alert for specific criteria.

**GET** `/api/price-alerts/{alertId}`

Retrieve price alert status.

### Smart Recommendations

**GET** `/api/recommendations`

Get personalized travel recommendations.

### Cache Management

**POST** `/api/cache/refresh`

Refresh system cache (admin only).

**GET** `/api/cache/stats`

Retrieve cache statistics.

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Invalid departure date format",
    "details": {
      "field": "departureDate",
      "expected": "YYYY-MM-DD",
      "received": "15-07-2024"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PARAMETERS` | 400 | Invalid or missing parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Response Headers

### Standard Headers

- `X-Response-Time`: Response time in milliseconds
- `X-Rate-Limit-Remaining`: Remaining requests in current window
- `X-Rate-Limit-Reset`: Rate limit reset timestamp
- `X-Total-Offers`: Total offers in database
- `X-Query-Performance`: Query execution time

## Performance Considerations

### Optimization Tips

1. **Use Pagination**: Always use `limit` and `offset` for large result sets
2. **Specific Filters**: Use specific date ranges and criteria to reduce query time
3. **Caching**: Results are cached for 5 minutes by default
4. **Batch Requests**: Combine multiple queries when possible

### Performance Targets

- **Response Time**: < 100ms for cached queries
- **Throughput**: 1000+ requests/second
- **Availability**: 99.9% uptime
- **Data Freshness**: Updated every 15 minutes

## SDK and Libraries

### JavaScript/TypeScript

```javascript
import { MallorcaAPI } from '@mallorca/api-client';

const api = new MallorcaAPI('http://localhost:3000');
const offers = await api.getBestOffers({
  destination: 'Mallorca',
  departureDate: '2024-07-15',
  returnDate: '2024-07-22',
  countAdults: 2
});
```

### Python

```python
from mallorca_api import MallorcaClient

client = MallorcaClient('http://localhost:3000')
offers = client.get_best_offers(
    destination='Mallorca',
    departure_date='2024-07-15',
    return_date='2024-07-22',
    count_adults=2
)
```

## Testing

### API Testing

```bash
# Run API tests
npm run test:api

# Run performance tests
npm run test:performance

# Run integration tests
npm run test:integration
```

### Postman Collection

A comprehensive Postman collection is available in the `/docs` directory.

## Support

For API support and questions:
- **Documentation**: [Complete API Guide](./README.md)
- **Issues**: GitHub Issues
- **Performance**: [Performance Guide](./PERFORMANCE.md)