#!/bin/bash
# SEKAR Backend Smoke Tests
# Usage: ./scripts/smoke-tests.sh <API_URL>
# Example: ./scripts/smoke-tests.sh https://sekar.wahyutrip.com
#
# Exit codes:
#   0 - All tests passed
#   1 - One or more tests failed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default API URL
API_URL="${1:-http://localhost:3000}"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        ((TESTS_FAILED++))
    fi
}

# Function to make HTTP request and check status
check_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local description=$3

    status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint")

    if [ "$status" -eq "$expected_status" ]; then
        print_result 0 "$description (HTTP $status)"
        return 0
    else
        print_result 1 "$description (Expected HTTP $expected_status, got $status)"
        return 1
    fi
}

# Function to check JSON response
check_json_response() {
    local endpoint=$1
    local expected_key=$2
    local description=$3

    response=$(curl -s "$API_URL$endpoint")

    if echo "$response" | jq -e ".$expected_key" > /dev/null 2>&1; then
        print_result 0 "$description"
        return 0
    else
        print_result 1 "$description (Missing key: $expected_key)"
        return 1
    fi
}

echo ""
echo "=========================================="
echo "  SEKAR Backend Smoke Tests"
echo "=========================================="
echo "  API URL: $API_URL"
echo "  Date: $(date)"
echo "=========================================="
echo ""

# Test 1: Health Check Endpoint
echo -e "${YELLOW}Test 1: Health Check${NC}"
check_endpoint "/api/health" 200 "Health endpoint returns 200 OK"
check_json_response "/api/health" "status" "Health response contains status field"
echo ""

# Test 2: API Documentation
echo -e "${YELLOW}Test 2: API Documentation${NC}"
check_endpoint "/api/docs" 200 "Swagger documentation is accessible"
echo ""

# Test 3: Authentication Endpoint (Invalid credentials)
echo -e "${YELLOW}Test 3: Authentication${NC}"
auth_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"phone":"0000000000","password":"wrongpassword"}')

if [ "$auth_status" -eq 401 ]; then
    print_result 0 "Login endpoint returns 401 for invalid credentials"
else
    print_result 1 "Login endpoint (Expected 401, got $auth_status)"
fi
echo ""

# Test 4: Rate Limiting Headers
echo -e "${YELLOW}Test 4: Rate Limiting${NC}"
headers=$(curl -s -I "$API_URL/api/health")
if echo "$headers" | grep -qi "x-ratelimit"; then
    print_result 0 "Rate limiting headers present"
else
    print_result 1 "Rate limiting headers not found"
fi
echo ""

# Test 5: CORS Headers
echo -e "${YELLOW}Test 5: CORS Headers${NC}"
cors_response=$(curl -s -I -X OPTIONS "$API_URL/api/health" -H "Origin: https://sekar.wahyutrip.com")
if echo "$cors_response" | grep -qi "access-control"; then
    print_result 0 "CORS headers present"
else
    print_result 1 "CORS headers not found (may be expected in production)"
fi
echo ""

# Test 6: Security Headers
echo -e "${YELLOW}Test 6: Security Headers${NC}"
sec_headers=$(curl -s -I "$API_URL/api/health")

# Check for X-Content-Type-Options
if echo "$sec_headers" | grep -qi "x-content-type-options"; then
    print_result 0 "X-Content-Type-Options header present"
else
    print_result 1 "X-Content-Type-Options header missing"
fi

# Check for X-Frame-Options
if echo "$sec_headers" | grep -qi "x-frame-options"; then
    print_result 0 "X-Frame-Options header present"
else
    print_result 1 "X-Frame-Options header missing"
fi
echo ""

# Test 7: Database Connectivity (via public endpoint if available)
echo -e "${YELLOW}Test 7: Database Connectivity${NC}"
# Try to access an endpoint that requires database
areas_status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/areas" \
    -H "Content-Type: application/json")

if [ "$areas_status" -eq 401 ] || [ "$areas_status" -eq 200 ]; then
    print_result 0 "Database connection working (endpoint responds)"
else
    print_result 1 "Database may be disconnected (HTTP $areas_status)"
fi
echo ""

# Test 8: Response Time
echo -e "${YELLOW}Test 8: Response Time${NC}"
response_time=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/api/health")
response_ms=$(echo "$response_time * 1000" | bc | cut -d'.' -f1)

if [ "$response_ms" -lt 1000 ]; then
    print_result 0 "Health endpoint response time: ${response_ms}ms (< 1000ms)"
else
    print_result 1 "Health endpoint response time: ${response_ms}ms (>= 1000ms)"
fi
echo ""

# Summary
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo -e "  ${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC} $TESTS_FAILED"
echo "=========================================="
echo ""

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
