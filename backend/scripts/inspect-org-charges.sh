#!/bin/bash

# Organization Charges API Response Inspector
# Bash script to inspect the organization charges API endpoint
# 
# Usage: ./inspect-org-charges.sh [organization-id] [port]
# Example: ./inspect-org-charges.sh ORG-AAC 5000

ORG_ID="${1:-ORG-AAC}"
PORT="${2:-5000}"
API_URL="http://localhost:$PORT/api/master/organizations/$ORG_ID/charges"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔍 Organization Charges API Response Inspector${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}📋 Request Details:${NC}"
echo "   URL: $API_URL"
echo "   Method: GET"
echo "   Organization ID: $ORG_ID"
echo "   Port: $PORT"
echo ""

echo -e "${YELLOW}⏳ Sending request...${NC}"
echo ""

# Make the request
response=$(curl -s -w "\n%{http_code}" "$API_URL" \
  -H "Content-Type: application/json")

# Extract response body and status code
http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

if [ "$http_code" -ne 200 ]; then
    echo -e "${RED}❌ Error: HTTP $http_code${NC}"
    echo ""
    echo -e "${YELLOW}Make sure:${NC}"
    echo "  1. The server is running on http://localhost:$PORT"
    echo "  2. The organization ID \"$ORG_ID\" exists in the database"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Response Status: $http_code OK${NC}"
echo "   Content-Type: application/json"
echo ""

# Display raw JSON
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📄 Raw Response (Pretty JSON)${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Pretty print JSON using jq if available, otherwise raw
if command -v jq &> /dev/null; then
    echo "$response_body" | jq '.'
else
    echo "$response_body" | python3 -m json.tool 2>/dev/null || echo "$response_body"
fi

echo ""

# Parse JSON and display detailed field analysis using jq
if command -v jq &> /dev/null; then
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}🔬 Detailed Field Analysis${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo ""

    success=$(echo "$response_body" | jq '.success')
    echo "success: $success (boolean)"

    data_count=$(echo "$response_body" | jq '.data | length')
    echo ""
    echo "data: Array with $data_count charge record(s)"

    if [ "$data_count" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}  📊 First Charge Object Fields:${NC}"
        echo -e "${YELLOW}  ────────────────────────────────${NC}"

        echo "$response_body" | jq '.data[0] | to_entries[] | "\(.key): \(.value | type)"' | while read -r line; do
            key=$(echo "$line" | cut -d: -f1 | sed 's/.*"\(.*\)".*/\1/')
            type=$(echo "$line" | cut -d: -f2- | tr -d '""')
            echo -e "${GRAY}    • $key ($type)${NC}"
        done

        # Show nested test object
        has_test=$(echo "$response_body" | jq '.data[0].test' | grep -q "^\{" && echo "true" || echo "false")
        if [ "$has_test" = "true" ]; then
            echo ""
            echo -e "${YELLOW}  📌 Nested Object - charge.test:${NC}"
            echo -e "${YELLOW}  ────────────────────────────────${NC}"

            echo "$response_body" | jq '.data[0].test | to_entries[] | "\(.key): \(.value | type)"' | while read -r line; do
                key=$(echo "$line" | cut -d: -f1 | sed 's/.*"\(.*\)".*/\1/')
                type=$(echo "$line" | cut -d: -f2- | tr -d '""')
                echo -e "${GRAY}      • $key ($type)${NC}"
            done
        fi

        # Show nested organization object
        has_org=$(echo "$response_body" | jq '.data[0].organization' | grep -q "^\{" && echo "true" || echo "false")
        if [ "$has_org" = "true" ]; then
            echo ""
            echo -e "${YELLOW}  📌 Nested Object - charge.organization:${NC}"
            echo -e "${YELLOW}  ────────────────────────────────${NC}"

            echo "$response_body" | jq '.data[0].organization | to_entries[] | "\(.key): \(.value | type)"' | while read -r line; do
                key=$(echo "$line" | cut -d: -f1 | sed 's/.*"\(.*\)".*/\1/')
                type=$(echo "$line" | cut -d: -f2- | tr -d '""')
                echo -e "${GRAY}      • $key ($type)${NC}"
            done
        fi
    fi

    # Summary statistics
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}📊 Summary Statistics${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo ""

    total=$(echo "$response_body" | jq '.data | length')
    echo "Total Charges: $total"

    if [ "$total" -gt 0 ]; then
        unique_tests=$(echo "$response_body" | jq '[.data[].testId] | unique | length')
        unique_orgs=$(echo "$response_body" | jq '[.data[].organizationId] | unique | length')
        
        echo "Unique Tests: $unique_tests"
        echo "Unique Organizations: $unique_orgs"

        avg_b2c=$(echo "$response_body" | jq '[.data[].b2cCharge] | add / length' 2>/dev/null || echo "N/A")
        avg_b2b=$(echo "$response_body" | jq '[.data[].b2bCharge] | add / length' 2>/dev/null || echo "N/A")
        
        echo "Average B2C Charge: ₹$(printf "%.2f" "$avg_b2c" 2>/dev/null || echo "N/A")"
        echo "Average B2B Charge: ₹$(printf "%.2f" "$avg_b2b" 2>/dev/null || echo "N/A")"
    fi
else
    echo -e "${YELLOW}⚠️  Note: Install 'jq' for better JSON parsing and analysis${NC}"
    echo ""
    echo "You can install jq:"
    echo "  • macOS: brew install jq"
    echo "  • Ubuntu/Debian: sudo apt-get install jq"
    echo "  • CentOS/RHEL: sudo yum install jq"
fi

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo ""
