#!/usr/bin/env bash
# FlowTera E2E Test Suite
# Usage: bash e2e_test.sh
set -euo pipefail

BASE="http://localhost:3002"
PASS=0; FAIL=0; SKIP=0

GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[0;33m"; NC="\033[0m"; BOLD="\033[1m"

check() {
  local label="$1" expected="$2"
  shift 2
  local start=$(date +%s%3N)
  local out; out=$(eval "$@" 2>&1)
  local elapsed=$(( $(date +%s%3N) - start ))
  local status; status=$(echo "$out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "?")
  local http_code; http_code=$(echo "$out" | grep -oP '"http_code":\K[0-9]+' 2>/dev/null || echo "?")

  if echo "$out" | grep -q "$expected"; then
    echo -e "${GREEN}✓${NC} ${label} (${elapsed}ms)"
    PASS=$((PASS+1))
    echo "$out"
  else
    echo -e "${RED}✗${NC} ${label} (${elapsed}ms)"
    echo -e "  Expected: ${expected}"
    echo -e "  Got: $(echo "$out" | head -3)"
    FAIL=$((FAIL+1))
  fi
}

http_check() {
  local label="$1" url="$2" method="${3:-GET}" data="${4:-}" token="${5:-}" expected_code="${6:-200}"
  local start=$(date +%s%3N)
  local args=(-s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url" -H "Content-Type: application/json")
  [ -n "$token"  ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data"   ] && args+=(-d "$data")
  local out; out=$(curl "${args[@]}" 2>&1)
  local elapsed=$(( $(date +%s%3N) - start ))
  local http_code; http_code=$(echo "$out" | grep "HTTP_CODE:" | sed 's/HTTP_CODE://')
  local body; body=$(echo "$out" | grep -v "HTTP_CODE:")

  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✓${NC} [${http_code}] ${label} (${elapsed}ms)"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗${NC} [${http_code}] ${label} - expected ${expected_code} (${elapsed}ms)"
    echo -e "  Body: $(echo "$body" | head -2)"
    FAIL=$((FAIL+1))
  fi
  echo "$body"
}

section() { echo -e "\n${BOLD}── $1 ──${NC}"; }

# PHASE 1: Health 
section "Phase 1: Health Checks"
GW=$(http_check "Gateway health"   "$BASE/health")
NC_H=$(http_check "Node-core health (via proxy)" "$BASE/api/v1/health")
ML_H=$(http_check "Python-ML health (via proxy)" "$BASE/ml/health")

# PHASE 2: Auth 
section "Phase 2: Authentication"

TS=$(date +%s)
EMAIL="e2e_${TS}@flowtera.test"
PASS_W="TestPass123!"

SIGNUP_BODY=$(http_check "Register new user" "$BASE/api/v1/auth/signup" "POST" \
  "{\"email\":\"$EMAIL\",\"password\":\"$PASS_W\",\"name\":\"E2E Test\",\"surname\":\"User\"}" "" "201")
TOKEN=$(echo "$SIGNUP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${YELLOW}⚠ No token from signup, trying login...${NC}"
  LOGIN_BODY=$(http_check "Login" "$BASE/api/v1/auth/login" "POST" \
    "{\"email\":\"$EMAIL\",\"password\":\"$PASS_W\"}" "" "200")
  TOKEN=$(echo "$LOGIN_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")
fi

echo -e "  Token: ${TOKEN:0:40}..."

# PHASE 3: Team setup 
section "Phase 3: Team"

TEAM_BODY=$(http_check "Create team" "$BASE/api/v1/teams" "POST" \
  '{"name":"E2E Test Team","description":"Auto-created","currency":"USD","timezone":"Europe/Istanbul"}' \
  "$TOKEN" "201")
TEAM_ID=$(echo "$TEAM_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null || echo "")
echo -e "  TeamID: $TEAM_ID"

# PHASE 4: Expense CRUD 
section "Phase 4: Expense CRUD"

EXP_BODY=$(http_check "Create expense" "$BASE/api/v1/expenses?teamId=$TEAM_ID" "POST" \
  '{"title":"Client dinner","category":"Food","merchant":"Starbucks","paymentMethod":"Credit Card","amount":150.50,"currency":"USD","isReported":true}' \
  "$TOKEN" "201")
EXP_ID=$(echo "$EXP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null || echo "")
echo -e "  ExpenseID: $EXP_ID"

http_check "List expenses"  "$BASE/api/v1/expenses?teamId=$TEAM_ID" "GET" "" "$TOKEN" "200"

if [ -n "$EXP_ID" ] && [ "$EXP_ID" != "null" ]; then
  http_check "Get expense by ID" "$BASE/api/v1/expenses/$EXP_ID?teamId=$TEAM_ID" "GET" "" "$TOKEN" "200"
  http_check "Update expense" "$BASE/api/v1/expenses/$EXP_ID?teamId=$TEAM_ID" "PUT" \
    '{"title":"Client dinner - updated","category":"Food","merchant":"Starbucks","paymentMethod":"Credit Card","amount":200,"currency":"USD","isReported":true}' \
    "$TOKEN" "200"
fi

# PHASE 5: Validation (enum guard) 
section "Phase 5: Enum Validation Guards"

http_check "Reject invalid category" "$BASE/api/v1/expenses?teamId=$TEAM_ID" "POST" \
  '{"title":"Test","category":"INVALID_CATEGORY","merchant":"X","paymentMethod":"Cash","amount":10,"currency":"USD","isReported":false}' \
  "$TOKEN" "400"

http_check "Reject invalid paymentMethod" "$BASE/api/v1/expenses?teamId=$TEAM_ID" "POST" \
  '{"title":"Test","category":"Food","merchant":"X","paymentMethod":"FAKE_METHOD","amount":10,"currency":"USD","isReported":false}' \
  "$TOKEN" "400"

http_check "Reject invalid currency" "$BASE/api/v1/expenses?teamId=$TEAM_ID" "POST" \
  '{"title":"Test","category":"Food","merchant":"X","paymentMethod":"Cash","amount":10,"currency":"INVALID","isReported":false}' \
  "$TOKEN" "400"

# PHASE 6: Trip CRUD 
section "Phase 6: Trip CRUD"

TRIP_BODY=$(http_check "Create trip" "$BASE/api/v1/trips?teamId=$TEAM_ID" "POST" \
  '{"title":"Berlin Conference","category":"Conference","vehicle":"Plane","destination":"Berlin, Germany","startDate":"2025-06-01","endDate":"2025-06-05","amount":2500,"currency":"EUR","desc":"Annual tech conference"}' \
  "$TOKEN" "201")
TRIP_ID=$(echo "$TRIP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null || echo "")
echo -e "  TripID: $TRIP_ID"

http_check "List trips" "$BASE/api/v1/trips?teamId=$TEAM_ID" "GET" "" "$TOKEN" "200"

if [ -n "$TRIP_ID" ] && [ "$TRIP_ID" != "null" ]; then
  http_check "Get trip by ID" "$BASE/api/v1/trips/$TRIP_ID?teamId=$TEAM_ID" "GET" "" "$TOKEN" "200"
fi

http_check "Reject invalid trip vehicle" "$BASE/api/v1/trips?teamId=$TEAM_ID" "POST" \
  '{"title":"Test","category":"Business","vehicle":"ROCKET","destination":"Mars","startDate":"2025-06-01","endDate":"2025-06-05","amount":100,"currency":"USD","desc":"test"}' \
  "$TOKEN" "400"

# PHASE 7: Security injection tests 
section "Phase 7: Security"

http_check "Block SQL injection in body" "$BASE/api/v1/expenses?teamId=$TEAM_ID" "POST" \
  '{"title":"'; DROP TABLE expenses; --","category":"Food","merchant":"X","paymentMethod":"Cash","amount":10,"currency":"USD","isReported":false}' \
  "$TOKEN" "400"

http_check "Block XSS in body" "$BASE/api/v1/expenses?teamId=$TEAM_ID" "POST" \
  '{"title":"<script>alert(1)</script>","category":"Food","merchant":"X","paymentMethod":"Cash","amount":10,"currency":"USD","isReported":false}' \
  "$TOKEN" "400"

# PHASE 8: Analysis export 
section "Phase 8: Analysis Export"

if [ -n "$TEAM_ID" ] && [ "$TEAM_ID" != "null" ]; then
  CSV_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
    "$BASE/api/v1/expenses/export?teamId=$TEAM_ID&format=csv")
  if [ "$CSV_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} [200] CSV export"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗${NC} [${CSV_CODE}] CSV export - expected 200"
    FAIL=$((FAIL+1))
  fi

  PDF_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
    "$BASE/api/v1/expenses/export?teamId=$TEAM_ID&format=pdf")
  if [ "$PDF_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} [200] PDF export"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗${NC} [${PDF_CODE}] PDF export - expected 200"
    FAIL=$((FAIL+1))
  fi
fi

# PHASE 9: Performance test (sequential) 
section "Phase 9: Performance (20 sequential requests)"

LATENCIES=()
for i in $(seq 1 20); do
  T=$(curl -s -o /dev/null -w "%{time_total}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE/api/v1/expenses?teamId=$TEAM_ID")
  MS=$(python3 -c "print(round(float('$T')*1000))")
  LATENCIES+=($MS)
done

SUM=0; MAX=0; MIN=99999
for v in "${LATENCIES[@]}"; do
  SUM=$((SUM+v))
  [ $v -gt $MAX ] && MAX=$v
  [ $v -lt $MIN ] && MIN=$v
done
AVG=$((SUM/${#LATENCIES[@]}))

echo -e "  Avg: ${AVG}ms | Min: ${MIN}ms | Max: ${MAX}ms"
if [ $AVG -lt 500 ]; then
  echo -e "${GREEN}✓${NC} Performance acceptable (avg < 500ms)"
  PASS=$((PASS+1))
else
  echo -e "${RED}✗${NC} Performance too slow (avg >= 500ms)"
  FAIL=$((FAIL+1))
fi

# PHASE 10: Cleanup 
section "Phase 10: Cleanup"
if [ -n "$EXP_ID" ] && [ "$EXP_ID" != "null" ]; then
  http_check "Delete expense" "$BASE/api/v1/expenses/$EXP_ID?teamId=$TEAM_ID" "DELETE" "" "$TOKEN" "200"
fi
if [ -n "$TRIP_ID" ] && [ "$TRIP_ID" != "null" ]; then
  http_check "Delete trip" "$BASE/api/v1/trips/$TRIP_ID?teamId=$TEAM_ID" "DELETE" "" "$TOKEN" "200"
fi

# Summary 
TOTAL=$((PASS+FAIL+SKIP))
echo -e "\n${BOLD}════════════════════════════════════════${NC}"
echo -e "${BOLD}E2E Test Results${NC}"
echo -e "  ${GREEN}PASS: $PASS${NC} / ${RED}FAIL: $FAIL${NC} / ${YELLOW}SKIP: $SKIP${NC} / Total: $TOTAL"
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All tests passed!${NC}"
else
  echo -e "${RED}${BOLD}$FAIL test(s) failed.${NC}"
fi
echo -e "════════════════════════════════════════"
