#!/bin/bash

# Health Check Script for Mallorca Travel Backend
# This script performs comprehensive health checks on the running application

set -e

# Configuration
HOST=${HOST:-localhost}
PORT=${PORT:-3000}
TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}
MAX_RETRIES=${HEALTH_CHECK_RETRIES:-3}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${BLUE}[HEALTH] $1${NC}"
}

success() {
    echo -e "${GREEN}[HEALTH] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[HEALTH] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[HEALTH] ❌ $1${NC}"
}

# Function to make HTTP request with timeout
http_request() {
    local url="$1"
    local expected_status="$2"
    local timeout="$3"
    
    if command -v curl >/dev/null 2>&1; then
        local response=$(curl -s -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
        local status_code="${response: -3}"
        local body="${response%???}"
        
        if [ "$status_code" = "$expected_status" ]; then
            return 0
        else
            error "HTTP request to $url failed. Expected: $expected_status, Got: $status_code"
            if [ -n "$body" ] && [ "$body" != "000" ]; then
                log "Response body: $body"
            fi
            return 1
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget --timeout="$timeout" --tries=1 -q -O /dev/null "$url" 2>/dev/null; then
            return 0
        else
            error "HTTP request to $url failed (using wget)"
            return 1
        fi
    else
        error "Neither curl nor wget is available for HTTP requests"
        return 1
    fi
}

# Function to check if port is open
check_port() {
    local host="$1"
    local port="$2"
    local timeout="$3"
    
    if command -v nc >/dev/null 2>&1; then
        if nc -z -w "$timeout" "$host" "$port" 2>/dev/null; then
            return 0
        else
            return 1
        fi
    elif command -v telnet >/dev/null 2>&1; then
        if timeout "$timeout" telnet "$host" "$port" </dev/null >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    else
        # Fallback: try to connect using bash
        if timeout "$timeout" bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
            return 0
        else
            return 1
        fi
    fi
}

# Function to perform basic health check
basic_health_check() {
    log "Performing basic health check..."
    
    # Check if port is open
    if check_port "$HOST" "$PORT" "$TIMEOUT"; then
        success "Port $PORT is open on $HOST"
    else
        error "Port $PORT is not accessible on $HOST"
        return 1
    fi
    
    # Check health endpoint
    local health_url="http://$HOST:$PORT/health"
    log "Checking health endpoint: $health_url"
    
    if http_request "$health_url" "200" "$TIMEOUT"; then
        success "Health endpoint is responding"
        return 0
    else
        error "Health endpoint is not responding"
        return 1
    fi
}

# Function to perform detailed health check
detailed_health_check() {
    log "Performing detailed health check..."
    
    # Check health endpoint with detailed response
    local health_url="http://$HOST:$PORT/health"
    
    if command -v curl >/dev/null 2>&1; then
        local response=$(curl -s --max-time "$TIMEOUT" "$health_url" 2>/dev/null || echo "")
        
        if [ -n "$response" ]; then
            log "Health endpoint response:"
            echo "$response" | head -20  # Limit output
            
            # Try to parse JSON response if it looks like JSON
            if echo "$response" | grep -q "^{.*}$"; then
                # Check for specific health indicators
                if echo "$response" | grep -q '"status":"healthy"'; then
                    success "Application reports healthy status"
                elif echo "$response" | grep -q '"status":"degraded"'; then
                    warn "Application reports degraded status"
                elif echo "$response" | grep -q '"status":"unhealthy"'; then
                    error "Application reports unhealthy status"
                    return 1
                fi
                
                # Check data loading status
                if echo "$response" | grep -q '"dataLoaded":true'; then
                    success "Data is loaded"
                elif echo "$response" | grep -q '"dataLoaded":false'; then
                    warn "Data is not loaded"
                fi
            fi
        else
            error "No response from health endpoint"
            return 1
        fi
    fi
    
    return 0
}

# Function to check API endpoints
check_api_endpoints() {
    log "Checking API endpoints..."
    
    # Check bestOffersByHotel endpoint (should return 400 without parameters)
    local best_offers_url="http://$HOST:$PORT/bestOffersByHotel"
    log "Checking bestOffersByHotel endpoint: $best_offers_url"
    
    if http_request "$best_offers_url" "400" "$TIMEOUT"; then
        success "bestOffersByHotel endpoint is responding (validation working)"
    else
        warn "bestOffersByHotel endpoint may not be working correctly"
    fi
    
    # Check hotels endpoint (should return 404 for non-existent hotel)
    local hotels_url="http://$HOST:$PORT/hotels/999999/offers"
    log "Checking hotels endpoint: $hotels_url"
    
    if http_request "$hotels_url" "404" "$TIMEOUT"; then
        success "hotels endpoint is responding (validation working)"
    else
        warn "hotels endpoint may not be working correctly"
    fi
}

# Function to check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # Check memory usage
    if command -v free >/dev/null 2>&1; then
        local memory_info=$(free -m)
        local used_memory=$(echo "$memory_info" | awk 'NR==2{print $3}')
        local available_memory=$(echo "$memory_info" | awk 'NR==2{print $7}')
        
        log "Memory usage: ${used_memory}MB used, ${available_memory}MB available"
        
        if [ "$available_memory" -lt 100 ]; then
            error "Critical: Very low available memory (${available_memory}MB)"
            return 1
        elif [ "$available_memory" -lt 256 ]; then
            warn "Low available memory (${available_memory}MB)"
        else
            success "Memory usage is acceptable"
        fi
    fi
    
    # Check disk space
    local disk_usage=$(df . | tail -1)
    local available_space_kb=$(echo "$disk_usage" | awk '{print $4}')
    local available_space_mb=$((available_space_kb / 1024))
    local usage_percent=$(echo "$disk_usage" | awk '{print $5}' | sed 's/%//')
    
    log "Disk usage: ${usage_percent}% used, ${available_space_mb}MB available"
    
    if [ "$available_space_mb" -lt 50 ]; then
        error "Critical: Very low disk space (${available_space_mb}MB)"
        return 1
    elif [ "$available_space_mb" -lt 200 ]; then
        warn "Low disk space (${available_space_mb}MB)"
    elif [ "$usage_percent" -gt 90 ]; then
        warn "High disk usage (${usage_percent}%)"
    else
        success "Disk usage is acceptable"
    fi
    
    return 0
}

# Function to perform comprehensive health check with retries
comprehensive_health_check() {
    local attempt=1
    local max_attempts="$MAX_RETRIES"
    
    while [ $attempt -le $max_attempts ]; do
        log "Health check attempt $attempt of $max_attempts"
        
        # Basic connectivity check
        if ! basic_health_check; then
            if [ $attempt -eq $max_attempts ]; then
                error "Basic health check failed after $max_attempts attempts"
                return 1
            else
                warn "Basic health check failed, retrying in 5 seconds..."
                sleep 5
                attempt=$((attempt + 1))
                continue
            fi
        fi
        
        # Detailed health check
        if ! detailed_health_check; then
            warn "Detailed health check failed, but basic connectivity is working"
        fi
        
        # API endpoints check
        check_api_endpoints
        
        # System resources check
        if ! check_system_resources; then
            warn "System resources check failed"
        fi
        
        success "Health check completed successfully"
        return 0
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Main function
main() {
    log "Starting health check for Mallorca Travel Backend"
    log "Target: http://$HOST:$PORT"
    log "Timeout: ${TIMEOUT}s, Max retries: $MAX_RETRIES"
    echo
    
    if comprehensive_health_check; then
        echo
        success "🎉 Application is healthy and ready to serve requests!"
        exit 0
    else
        echo
        error "💥 Application health check failed!"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --basic)
        log "Running basic health check only"
        basic_health_check
        exit $?
        ;;
    --detailed)
        log "Running detailed health check only"
        detailed_health_check
        exit $?
        ;;
    --api)
        log "Running API endpoints check only"
        check_api_endpoints
        exit $?
        ;;
    --resources)
        log "Running system resources check only"
        check_system_resources
        exit $?
        ;;
    --help)
        echo "Usage: $0 [--basic|--detailed|--api|--resources|--help]"
        echo "  --basic     Run basic connectivity check only"
        echo "  --detailed  Run detailed health check only"
        echo "  --api       Run API endpoints check only"
        echo "  --resources Run system resources check only"
        echo "  --help      Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  HOST                    Target host (default: localhost)"
        echo "  PORT                    Target port (default: 3000)"
        echo "  HEALTH_CHECK_TIMEOUT    Request timeout in seconds (default: 10)"
        echo "  HEALTH_CHECK_RETRIES    Maximum retry attempts (default: 3)"
        exit 0
        ;;
    "")
        # Run comprehensive check
        main
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac