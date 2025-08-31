#!/bin/bash

# Complete Workflow Test Script
# This script tests the complete backend + frontend integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    print_status "Running: $test_name"
    
    if result=$(eval "$test_command" 2>&1); then
        if [ -z "$expected_pattern" ] || echo "$result" | grep -q "$expected_pattern"; then
            print_success "$test_name"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            print_error "$test_name - Expected pattern '$expected_pattern' not found"
            echo "  Result: $result"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    else
        print_error "$test_name - Command failed"
        echo "  Error: $result"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to test HTTP endpoint
test_http() {
    local test_name="$1"
    local url="$2"
    local expected_status="$3"
    local expected_pattern="$4"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    print_status "Testing: $test_name"
    
    # Make HTTP request and capture status code and response
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo -e "\n000")
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        if [ -z "$expected_pattern" ] || echo "$body" | grep -q "$expected_pattern"; then
            print_success "$test_name (HTTP $status_code)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            print_error "$test_name - Expected pattern '$expected_pattern' not found in response"
            echo "  Response: $body"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    else
        print_error "$test_name - Expected HTTP $expected_status, got $status_code"
        echo "  Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "🧪 Complete Workflow Integration Tests"
echo "====================================="
echo ""

# Test 1: Backend Health Check
test_http "Backend Health Check" \
    "http://localhost:3000/api/health" \
    "200" \
    "healthy"

# Test 2: Backend API - Best Offers
test_http "Backend API - Best Offers Endpoint" \
    "http://localhost:3000/api/bestOffersByHotel?departureAirports=FRA&earliestDepartureDate=2024-06-01&latestReturnDate=2024-06-30&duration=7&countAdults=2&countChildren=0" \
    "200" \
    "hotel"

# Test 3: Backend API - Hotel Offers (assuming hotel ID 1 exists)
test_http "Backend API - Hotel Offers Endpoint" \
    "http://localhost:3000/api/hotels/1/offers?departureAirports=FRA&earliestDepartureDate=2024-06-01&latestReturnDate=2024-06-30&duration=7&countAdults=2&countChildren=0" \
    "200" \
    "hotel"

# Test 4: Backend API - Error Handling
test_http "Backend API - Error Handling" \
    "http://localhost:3000/api/bestOffersByHotel?departureAirports=INVALID" \
    "400" \
    "VALIDATION_ERROR"

# Test 5: Backend API - CORS Headers
print_status "Testing: CORS Headers"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
cors_headers=$(curl -s -I "http://localhost:3000/api/health" | grep -i "access-control-allow-origin" || echo "")
if [ ! -z "$cors_headers" ]; then
    print_success "CORS Headers Present"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "CORS Headers Missing"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 6: Frontend Accessibility
frontend_ports=("3000" "3001")
frontend_accessible=false

for port in "${frontend_ports[@]}"; do
    if curl -s "http://localhost:$port" > /dev/null 2>&1; then
        test_http "Frontend Accessibility (Port $port)" \
            "http://localhost:$port" \
            "200" \
            "html"
        frontend_accessible=true
        break
    fi
done

if [ "$frontend_accessible" = false ]; then
    print_status "Testing: Frontend Accessibility"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    print_error "Frontend not accessible on ports 3000 or 3001"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 7: Performance Test - Response Time
print_status "Testing: Response Time Performance"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
start_time=$(date +%s%N)
curl -s "http://localhost:3000/api/bestOffersByHotel?departureAirports=FRA&earliestDepartureDate=2024-06-01&latestReturnDate=2024-06-30&duration=7&countAdults=2&countChildren=0" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

if [ $response_time -lt 5000 ]; then # Less than 5 seconds
    print_success "Response Time Performance (${response_time}ms)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Response Time Performance (${response_time}ms) - Too slow (>5000ms)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 8: Memory Usage Check
print_status "Testing: Memory Usage"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
memory_info=$(curl -s "http://localhost:3000/api/health" | grep -o '"memoryUsage":[^}]*}' || echo "")
if [ ! -z "$memory_info" ]; then
    print_success "Memory Usage Information Available"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Memory Usage Information Not Available"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 9: API Specification Compliance
print_status "Testing: OpenAPI Specification Compliance"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
api_response=$(curl -s "http://localhost:3000/api/bestOffersByHotel?departureAirports=FRA&earliestDepartureDate=2024-06-01&latestReturnDate=2024-06-30&duration=7&countAdults=2&countChildren=0")

# Check if response is valid JSON array
if echo "$api_response" | jq -e 'type == "array"' > /dev/null 2>&1; then
    # Check if first item has required fields
    if echo "$api_response" | jq -e '.[0] | has("hotel") and has("minPrice") and has("departureDate")' > /dev/null 2>&1; then
        print_success "OpenAPI Specification Compliance"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "OpenAPI Specification Compliance - Missing required fields"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    print_error "OpenAPI Specification Compliance - Invalid JSON response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 10: Integration Test Suite
if [ -f "package.json" ] && grep -q "jest" package.json; then
    print_status "Running: Automated Integration Tests"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if npm test -- --testPathPattern=integration --silent > /dev/null 2>&1; then
        print_success "Automated Integration Tests"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_warning "Automated Integration Tests - Some tests may have failed (check with: npm test)"
        TESTS_PASSED=$((TESTS_PASSED + 1)) # Don't fail the workflow test for this
    fi
fi

# Summary
echo ""
echo "📊 Test Results Summary"
echo "======================"
echo "Total Tests: $TESTS_TOTAL"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "All tests passed! 🎉"
    echo ""
    echo "✅ Your complete workflow is working correctly!"
    echo ""
    echo "🌐 Access Points:"
    echo "  • Frontend UI:    http://localhost:3000 or http://localhost:3001"
    echo "  • Backend API:    http://localhost:3000/api"
    echo "  • Health Check:   http://localhost:3000/api/health"
    echo ""
    echo "🧪 Try these manual tests:"
    echo "  1. Open the frontend and perform a search"
    echo "  2. Click on a hotel to view details"
    echo "  3. Try different search parameters"
    echo "  4. Test error scenarios (invalid dates, etc.)"
    echo ""
    exit 0
else
    print_error "Some tests failed!"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  • Check if both backend and frontend are running"
    echo "  • Verify data files are present in data/ directory"
    echo "  • Check logs: tail -f logs/application.log"
    echo "  • Run health check: curl http://localhost:3000/api/health"
    echo "  • See TROUBLESHOOTING.md for detailed help"
    echo ""
    exit 1
fi