#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
#  FlowTera E2E Test Suite (Bash)
#  Kullanım : bash e2e_test.sh [--base http://localhost:3002]
#  Gereksinim: curl, python3
# ══════════════════════════════════════════════════════════════════════════
set -euo pipefail

BASE="http://localhost:3002"
CORE="http://localhost:3001"
ML="http://localhost:8000"

while [[ $# -gt 0 ]]; do
  case $1 in
    --base) BASE="$2"; shift 2 ;;
    --core) CORE="$2"; shift 2 ;;
    --ml)   ML="$2";   shift 2 ;;
    *) echo "Bilinmeyen argüman: $1"; exit 1 ;;
  esac
done

BASE="${BASE%/}"; CORE="${CORE%/}"; ML="${ML%/}"

# Renkler 
GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[0;33m"
NC="\033[0m"; BOLD="\033[1m"

PASS=0; FAIL=0
HTTP_BODY=""   # global: last response body from http_check (avoids subshell isolation)

# Yardımcılar 
section() { echo -e "\n${BOLD}── $1 ──${NC}"; }

# http_check — sets HTTP_BODY global; always runs in parent shell (no subshell isolation)
http_check() {
  local label="$1" url="$2" method="${3:-GET}" data="${4:-}" token="${5:-}" expected_code="${6:-200}"
  local start; start=$(date +%s%3N)
  local args=(-s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url" -H "Content-Type: application/json")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data"  ] && args+=(-d "$data")
  local out; out=$(curl "${args[@]}" 2>&1)
  local elapsed=$(( $(date +%s%3N) - start ))
  local http_code; http_code=$(echo "$out" | grep "HTTP_CODE:" | sed 's/HTTP_CODE://')
  HTTP_BODY=$(echo "$out" | grep -v "HTTP_CODE:")

  if [ "$http_code" = "$expected_code" ]; then
    echo -e "  ${GREEN}✓${NC} [${http_code}] ${label} (${elapsed}ms)"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${NC} [${http_code}] ${label} — beklenen ${expected_code} (${elapsed}ms)"
    echo -e "    Yanıt: $(echo "$HTTP_BODY" | head -c 200)"
    FAIL=$((FAIL+1))
  fi
}

py_get() {
  # Basit JSON alan okuyucu — '.' ile path ver (ör: "data.id")
  echo "$1" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    for k in '$2'.split('.'):
        d = d.get(k, '') if isinstance(d, dict) else ''
    print(d if d is not None else '')
except Exception:
    print('')
" 2>/dev/null || echo ""
}

# ══════════════════════════════════════════════════════════════════════════
# PHASE 1 — Sağlık Kontrolleri
# ══════════════════════════════════════════════════════════════════════════
section "Phase 1: Health Checks"
http_check "Gateway health"                   "$BASE/health"
http_check "Node-core health (via Gateway)"   "$BASE/api/v1/health"
http_check "Python-ML health (via Gateway)"   "$BASE/ml/health"
http_check "Node-core direct health"          "$CORE/health"
http_check "Python-ML direct health"          "$ML/health"

# ══════════════════════════════════════════════════════════════════════════
# PHASE 2 — Kimlik Doğrulama
# ══════════════════════════════════════════════════════════════════════════
section "Phase 2: Authentication"

TS=$(date +%s)
EMAIL="e2e_${TS}@flowtera.test"
PASS_W="TestPass123!"

http_check "Register new user" "$BASE/api/v1/auth/signup" "POST" \
  "{\"email\":\"$EMAIL\",\"password\":\"$PASS_W\",\"name\":\"E2E User $TS\"}" "" "201"
SIGNUP_BODY="$HTTP_BODY"
TOKEN=$(py_get "$SIGNUP_BODY" "token")
USER_ID=$(py_get "$SIGNUP_BODY" "user.id")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "  ${RED}Token alınamadı — test durduruluyor.${NC}"
  exit 1
fi
echo -e "  Token : ${TOKEN:0:40}..."
echo -e "  UserID: $USER_ID"

http_check "Login with correct credentials" "$BASE/api/v1/auth/login" "POST" \
  "{\"email\":\"$EMAIL\",\"password\":\"$PASS_W\"}" "" "200"

http_check "Login with wrong password → 401" "$BASE/api/v1/auth/login" "POST" \
  "{\"email\":\"$EMAIL\",\"password\":\"YANLIS\"}" "" "401"

http_check "Protected route without token → 401" "$BASE/api/v1/expenses?teamId=dummy" \
  "GET" "" "" "401"

# ══════════════════════════════════════════════════════════════════════════
# PHASE 3 — Takım Kurulumu
# ══════════════════════════════════════════════════════════════════════════
section "Phase 3: Team Setup"

http_check "Create team" "$BASE/api/v1/teams" "POST" \
  "{\"name\":\"E2E Team $TS\",\"category\":\"technology\",\"description\":\"Otomatik test\"}" \
  "$TOKEN" "201"
TEAM_BODY="$HTTP_BODY"
TEAM_ID=$(py_get "$TEAM_BODY" "data.id")
echo -e "  TeamID: $TEAM_ID"

http_check "List my teams"    "$BASE/api/v1/teams"                    "GET" "" "$TOKEN" "200"
http_check "Get team members" "$BASE/api/v1/teams/$TEAM_ID/members"   "GET" "" "$TOKEN" "200"

# ══════════════════════════════════════════════════════════════════════════
# PHASE 4 — Harcama CRUD
# ══════════════════════════════════════════════════════════════════════════
section "Phase 4: Expense CRUD"

http_check "Create expense" "$BASE/api/v1/expenses" "POST" \
  "{\"title\":\"E2E Müşteri Yemeği\",\"category\":\"Food\",\"merchant\":\"Starbucks\",\"paymentMethod\":\"Credit Card\",\"amount\":150.50,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "201"
EXP_BODY="$HTTP_BODY"
EXP_ID=$(py_get "$EXP_BODY" "data.id")
echo -e "  ExpenseID: $EXP_ID"

http_check "List expenses" "$BASE/api/v1/expenses?teamId=$TEAM_ID" "GET" "" "$TOKEN" "200"

if [ -n "$EXP_ID" ] && [ "$EXP_ID" != "null" ]; then
  http_check "Get expense by ID" "$BASE/api/v1/expenses/$EXP_ID?teamId=$TEAM_ID" "GET" "" "$TOKEN" "200"
  http_check "Update expense" "$BASE/api/v1/expenses/$EXP_ID" "PUT" \
    "{\"title\":\"E2E Yemek Güncel\",\"category\":\"Food\",\"merchant\":\"Starbucks\",\"paymentMethod\":\"Credit Card\",\"amount\":200,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
    "$TOKEN" "200"
fi

# Merchant olmadan (OCR akışı) — server restart sonrası 201, öncesinde 400
http_check "Create expense without merchant (OCR case)" "$BASE/api/v1/expenses" "POST" \
  "{\"title\":\"OCR Fatura\",\"category\":\"Transport\",\"amount\":75.00,\"currency\":\"TRY\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "201"
NM_ID=$(py_get "$HTTP_BODY" "data.id")

# ══════════════════════════════════════════════════════════════════════════
# PHASE 5 — Enum Doğrulama Guard'ları
# ══════════════════════════════════════════════════════════════════════════
section "Phase 5: Input Validation (Enum Guards)"

http_check "Reject invalid category → 400" "$BASE/api/v1/expenses" "POST" \
  "{\"title\":\"x\",\"category\":\"INVALID\",\"merchant\":\"x\",\"paymentMethod\":\"Cash\",\"amount\":10,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "400"

http_check "Reject invalid paymentMethod → 400" "$BASE/api/v1/expenses" "POST" \
  "{\"title\":\"x\",\"category\":\"Food\",\"merchant\":\"x\",\"paymentMethod\":\"ROCKET_PAY\",\"amount\":10,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "400"

http_check "Reject invalid currency → 400" "$BASE/api/v1/expenses" "POST" \
  "{\"title\":\"x\",\"category\":\"Food\",\"merchant\":\"x\",\"paymentMethod\":\"Cash\",\"amount\":10,\"currency\":\"INVALID\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "400"

http_check "Reject negative amount → 400" "$BASE/api/v1/expenses" "POST" \
  "{\"title\":\"x\",\"category\":\"Food\",\"merchant\":\"x\",\"paymentMethod\":\"Cash\",\"amount\":-50,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "400"

# ══════════════════════════════════════════════════════════════════════════
# PHASE 6 — Seyahat CRUD
# ══════════════════════════════════════════════════════════════════════════
section "Phase 6: Trip CRUD"

http_check "Create trip" "$BASE/api/v1/trips" "POST" \
  "{\"title\":\"E2E Berlin Konferansı\",\"category\":\"Conference\",\"vehicle\":\"Plane\",\"destination\":\"Berlin, Almanya\",\"startDate\":\"2026-07-01\",\"endDate\":\"2026-07-05\",\"amount\":2500,\"currency\":\"EUR\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "201"
TRIP_BODY="$HTTP_BODY"
TRIP_ID=$(py_get "$TRIP_BODY" "data.id")
echo -e "  TripID: $TRIP_ID"

http_check "List trips" "$BASE/api/v1/trips?teamId=$TEAM_ID" "GET" "" "$TOKEN" "200"

if [ -n "$TRIP_ID" ] && [ "$TRIP_ID" != "null" ]; then
  http_check "Get trip by ID" "$BASE/api/v1/trips/$TRIP_ID" "GET" "" "$TOKEN" "200"
  http_check "Update trip" "$BASE/api/v1/trips/$TRIP_ID" "PUT" \
    "{\"title\":\"E2E Berlin Güncel\",\"category\":\"Conference\",\"vehicle\":\"Train\",\"amount\":2800,\"currency\":\"EUR\"}" \
    "$TOKEN" "200"
fi

http_check "Reject invalid trip vehicle → 400" "$BASE/api/v1/trips" "POST" \
  "{\"title\":\"x\",\"category\":\"Business\",\"vehicle\":\"ROCKET\",\"destination\":\"Mars\",\"startDate\":\"2026-07-01\",\"endDate\":\"2026-07-05\",\"amount\":100,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "400"

http_check "Reject invalid trip category → 400" "$BASE/api/v1/trips" "POST" \
  "{\"title\":\"x\",\"category\":\"SPACE\",\"vehicle\":\"Car\",\"destination\":\"Ankara\",\"startDate\":\"2026-07-01\",\"endDate\":\"2026-07-05\",\"amount\":100,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "400"

# ══════════════════════════════════════════════════════════════════════════
# PHASE 7 — Güvenlik
# ══════════════════════════════════════════════════════════════════════════
section "Phase 7: Security (Injection & Auth Guards)"

http_check "Unauthorized access → 401" "$BASE/api/v1/expenses?teamId=$TEAM_ID" \
  "GET" "" "" "401"

http_check "SQL injection in title → 400" "$BASE/api/v1/expenses" "POST" \
  "{\"title\":\"'; DROP TABLE expenses; --\",\"category\":\"Food\",\"merchant\":\"x\",\"paymentMethod\":\"Cash\",\"amount\":10,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "400"

http_check "UNION SELECT injection → 400" "$BASE/api/v1/expenses" "POST" \
  "{\"title\":\"test UNION SELECT * FROM users\",\"category\":\"Food\",\"merchant\":\"x\",\"paymentMethod\":\"Cash\",\"amount\":10,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "400"

http_check "XSS script tag → 400" "$BASE/api/v1/expenses" "POST" \
  "{\"title\":\"<script>alert(1)<\\/script>\",\"category\":\"Food\",\"merchant\":\"x\",\"paymentMethod\":\"Cash\",\"amount\":10,\"currency\":\"USD\",\"teamId\":\"$TEAM_ID\"}" \
  "$TOKEN" "400"

# ══════════════════════════════════════════════════════════════════════════
# PHASE 8 — İstekler & Bildirimler
# ══════════════════════════════════════════════════════════════════════════
section "Phase 8: Requests & Notifications"

http_check "List pending requests" "$BASE/api/v1/requests?teamId=$TEAM_ID" "GET" "" "$TOKEN" "200"
REQ_BODY="$HTTP_BODY"
REQ_COUNT=$(echo "$REQ_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null || echo "?")
echo -e "  Bekleyen istek sayısı: $REQ_COUNT"

# İlk bekleyen isteği onayla (varsa)
FIRST_REQ_ID=$(echo "$REQ_BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    reqs = d.get('data', [])
    print(reqs[0]['id'] if reqs else '')
except Exception:
    print('')
" 2>/dev/null || echo "")

if [ -n "$FIRST_REQ_ID" ] && [ "$FIRST_REQ_ID" != "null" ]; then
  http_check "Approve first pending request" \
    "$BASE/api/v1/requests/$FIRST_REQ_ID/respond?teamId=$TEAM_ID" \
    "PATCH" "{\"action\":\"approved\"}" "$TOKEN" "200"
fi

http_check "List notifications" "$BASE/api/v1/notifications" "GET" "" "$TOKEN" "200"

# ══════════════════════════════════════════════════════════════════════════
# PHASE 9 — Dışa Aktarma & Arşiv
# ══════════════════════════════════════════════════════════════════════════
section "Phase 9: Export & Archive"

# Export veri döndürmesi için gideri önceden onayla
if [ -n "$EXP_ID" ] && [ "$EXP_ID" != "null" ] && [ -n "$TEAM_ID" ] && [ "$TEAM_ID" != "null" ]; then
  APPROVE_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$BASE/api/v1/expenses/$EXP_ID/status" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"approved\",\"teamId\":\"$TEAM_ID\"}")
  if [ "$APPROVE_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} Expense pre-approved for export test"
  else
    # Requests üzerinden dene
    REQ2=$(curl -s -H "Authorization: Bearer $TOKEN" \
      "$BASE/api/v1/requests?teamId=$TEAM_ID" 2>/dev/null)
    REQ_ID2=$(echo "$REQ2" | python3 -c "import sys,json; d=json.load(sys.stdin); reqs=d.get('data',[]); print(reqs[0]['id'] if reqs else '')" 2>/dev/null || echo "")
    if [ -n "$REQ_ID2" ] && [ "$REQ_ID2" != "null" ]; then
      curl -s -o /dev/null -X PATCH "$BASE/api/v1/requests/$REQ_ID2/respond?teamId=$TEAM_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"approved\"}" || true
    fi
  fi
fi

for fmt in csv pdf excel; do
  EXP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE/api/v1/expenses/export?teamId=$TEAM_ID&format=$fmt")
  if [ "$EXP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} [200] Export ${fmt^^}"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${NC} [${EXP_CODE}] Export ${fmt^^} — beklenen 200"
    FAIL=$((FAIL+1))
  fi
done

http_check "Get archive data"    "$BASE/api/v1/archive?teamId=$TEAM_ID" "GET" "" "$TOKEN" "200"
http_check "Get team logs"       "$BASE/api/v1/logs?teamId=$TEAM_ID"    "GET" "" "$TOKEN" "200"
http_check "List plans (public)" "$BASE/api/v1/plans"                   "GET" ""         "200"

# ══════════════════════════════════════════════════════════════════════════
# PHASE 10 — Üye İşlemleri
# ══════════════════════════════════════════════════════════════════════════
section "Phase 10: Member Management"

TS2=$((TS+1))
MEMBER_EMAIL="e2e_member_${TS2}@flowtera.test"

http_check "Register member user" "$BASE/api/v1/auth/signup" "POST" \
  "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"$PASS_W\",\"name\":\"E2E Member $TS2\"}" "" "201"
MEMBER_ID=$(py_get "$HTTP_BODY" "user.id")

if [ -n "$MEMBER_ID" ] && [ "$MEMBER_ID" != "null" ]; then
  http_check "Add member to team" "$BASE/api/v1/teams/$TEAM_ID/members" "POST" \
    "{\"userId\":\"$MEMBER_ID\",\"roleName\":\"Member\"}" "$TOKEN" "201"

  http_check "Update member permissions (deny-list)" \
    "$BASE/api/v1/teams/$TEAM_ID/members/$MEMBER_ID" "PUT" \
    "{\"roleName\":\"Member\",\"permissions\":[\"view_archive\"]}" "$TOKEN" "200"

  http_check "Remove member from team" \
    "$BASE/api/v1/teams/$TEAM_ID/members/$MEMBER_ID" "DELETE" "" "$TOKEN" "200"
fi

# ══════════════════════════════════════════════════════════════════════════
# PHASE 11 — Performans
# ══════════════════════════════════════════════════════════════════════════
section "Phase 11: Performance (20 sequential requests)"

LATENCIES=()
for _i in $(seq 1 20); do
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
  echo -e "  ${GREEN}✓${NC} Performans mükemmel (avg < 500ms)"
  PASS=$((PASS+1))
else
  echo -e "  ${RED}✗${NC} Performans yavaş (avg ≥ 500ms)"
  FAIL=$((FAIL+1))
fi

# ══════════════════════════════════════════════════════════════════════════
# PHASE 12 — Temizlik
# ══════════════════════════════════════════════════════════════════════════
section "Phase 12: Cleanup"

[ -n "$EXP_ID"  ] && [ "$EXP_ID"  != "null" ] && \
  http_check "Delete expense"     "$BASE/api/v1/expenses/$EXP_ID"  "DELETE" "" "$TOKEN" "200"
[ -n "$NM_ID"   ] && [ "$NM_ID"   != "null" ] && \
  http_check "Delete OCR expense" "$BASE/api/v1/expenses/$NM_ID"   "DELETE" "" "$TOKEN" "200"
[ -n "$TRIP_ID" ] && [ "$TRIP_ID" != "null" ] && \
  http_check "Delete trip"        "$BASE/api/v1/trips/$TRIP_ID"    "DELETE" "" "$TOKEN" "200"

# ══════════════════════════════════════════════════════════════════════════
# ÖZET
# ══════════════════════════════════════════════════════════════════════════
TOTAL=$((PASS+FAIL))
echo -e "\n${BOLD}════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}FlowTera E2E Sonuçları — $(date '+%Y-%m-%d %H:%M')${NC}"
echo -e "  ${GREEN}PASS: $PASS${NC}  ${RED}FAIL: $FAIL${NC}  Toplam: $TOTAL"
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}Tüm $TOTAL test geçti!${NC}"
else
  echo -e "${RED}${BOLD}$FAIL/$TOTAL test BAŞARISIZ.${NC}"
fi
echo -e "${BOLD}════════════════════════════════════════════════════${NC}"

exit $( [ $FAIL -eq 0 ] && echo 0 || echo 1 )
