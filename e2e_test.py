#!/usr/bin/env python3
"""FlowTera E2E + Performance Test Suite"""
import time, json, sys, requests
from datetime import datetime

BASE = "http://localhost:3002"
PASS = FAIL = 0
RESULTS = []

GREEN = "\033[0;32m"; RED = "\033[0;31m"; YELLOW = "\033[0;33m"; NC = "\033[0m"; BOLD = "\033[1m"

def check(label, resp, expected_code):
    global PASS, FAIL
    elapsed = getattr(resp, '_elapsed_ms', 0)
    ok = resp.status_code == expected_code
    symbol = f"{GREEN}✓{NC}" if ok else f"{RED}✗{NC}"
    print(f"  {symbol} [{resp.status_code}] {label} ({elapsed}ms)")
    if not ok:
        try:
            body = resp.json()
        except Exception:
            body = resp.text[:200]
        print(f"      Expected {expected_code} → {json.dumps(body)[:120]}")
    if ok: PASS += 1
    else:  FAIL += 1
    RESULTS.append({"label": label, "code": resp.status_code, "expected": expected_code,
                    "ok": ok, "ms": elapsed})
    return ok

def req(method, path, token=None, json_body=None, params=None, timeout=10):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = f"Bearer {token}"
    start = time.time()
    r = requests.request(method, url, headers=headers, json=json_body,
                         params=params, timeout=timeout)
    r._elapsed_ms = round((time.time() - start) * 1000)
    return r

def section(title):
    print(f"\n{BOLD}── {title} ──{NC}")

def jget(r, *keys, default=""):
    try:
        d = r.json()
        for k in keys: d = d[k]
        return d
    except Exception:
        return default

# Phase 1: Health 
section("Phase 1: Health Checks")
check("Gateway health",              req("GET", "/health"),         200)
check("Node-core health (via proxy)", req("GET", "/api/v1/health"), 200)
check("Python-ML health (via proxy)", req("GET", "/ml/health"),     200)

# Phase 2: Auth 
section("Phase 2: Authentication")

TS = int(time.time())
EMAIL    = f"e2e_{TS}@flowtera.test"
USERNAME = f"e2e_{TS}"
PASSWORD = "TestPass123!"

r_signup = req("POST", "/api/v1/auth/signup", json_body={
    "email": EMAIL, "password": PASSWORD,
    "name": "E2E", "username": USERNAME,
})
check("Register new user", r_signup, 201)
TOKEN = jget(r_signup, "token")

if not TOKEN:
    # 2FA login flow
    r_login = req("POST", "/api/v1/auth/login", json_body={"email": EMAIL, "password": PASSWORD})
    check("Login (step 1)", r_login, 200)
    code = jget(r_login, "codeHint", default="000000")
    r_verify = req("POST", "/api/v1/auth/verify", json_body={"email": EMAIL, "code": str(code)})
    check("Verify OTP (step 2)", r_verify, 200)
    TOKEN = jget(r_verify, "token")

print(f"  Token: {TOKEN[:40]}..." if TOKEN else f"  {RED}No token obtained!{NC}")

# Phase 3: Team 
section("Phase 3: Team Setup")

r_team = req("POST", "/api/v1/teams", token=TOKEN, json_body={
    "name": f"E2E Team {TS}", "category": "Tech",
    "currency": "USD", "timezone": "Europe/Istanbul",
})
check("Create team", r_team, 201)
TEAM_ID = jget(r_team, "data", "id")
print(f"  TeamID: {TEAM_ID}")

r_my_teams = req("GET", "/api/v1/teams", token=TOKEN)
check("List my teams", r_my_teams, 200)

# Phase 4: Expense CRUD 
section("Phase 4: Expense CRUD")

r_create_exp = req("POST", "/api/v1/expenses", token=TOKEN, params={"teamId": TEAM_ID},
    json_body={
        "title": "E2E Client Dinner", "category": "Food",
        "merchant": "Starbucks", "paymentMethod": "Credit Card",
        "amount": 150.50, "currency": "USD", "isReported": True,
        "teamId": TEAM_ID,
    })
check("Create expense", r_create_exp, 201)
EXP_ID = jget(r_create_exp, "data", "id")
print(f"  ExpenseID: {EXP_ID}")

check("List expenses", req("GET", "/api/v1/expenses", token=TOKEN, params={"teamId": TEAM_ID}), 200)

if EXP_ID:
    check("Get expense by ID", req("GET", f"/api/v1/expenses/{EXP_ID}", token=TOKEN,
                                   params={"teamId": TEAM_ID}), 200)
    check("Update expense", req("PUT", f"/api/v1/expenses/{EXP_ID}", token=TOKEN,
        json_body={
            "title": "E2E Dinner Updated", "category": "Food",
            "merchant": "Starbucks", "paymentMethod": "Credit Card",
            "amount": 200.0, "currency": "USD", "isReported": True,
            "teamId": TEAM_ID,
        }), 200)

# Phase 5: Enum Validation Guards 
section("Phase 5: Input Validation (Enum Guards)")

check("Reject invalid category", req("POST", "/api/v1/expenses", token=TOKEN,
    params={"teamId": TEAM_ID},
    json_body={"title": "x", "category": "INVALID_CATEGORY", "merchant": "x",
               "paymentMethod": "Cash", "amount": 10, "currency": "USD",
               "isReported": False, "teamId": TEAM_ID}), 400)

check("Reject invalid paymentMethod", req("POST", "/api/v1/expenses", token=TOKEN,
    params={"teamId": TEAM_ID},
    json_body={"title": "x", "category": "Food", "merchant": "x",
               "paymentMethod": "FAKE_METHOD", "amount": 10, "currency": "USD",
               "isReported": False, "teamId": TEAM_ID}), 400)

check("Reject invalid currency", req("POST", "/api/v1/expenses", token=TOKEN,
    params={"teamId": TEAM_ID},
    json_body={"title": "x", "category": "Food", "merchant": "x",
               "paymentMethod": "Cash", "amount": 10, "currency": "INVALID",
               "isReported": False, "teamId": TEAM_ID}), 400)

# Phase 6: Trip CRUD 
section("Phase 6: Trip CRUD")

r_trip = req("POST", "/api/v1/trips", token=TOKEN, params={"teamId": TEAM_ID},
    json_body={
        "title": "E2E Berlin Conference", "category": "Conference",
        "vehicle": "Plane", "destination": "Berlin, Germany",
        "startDate": "2025-06-01", "endDate": "2025-06-05",
        "amount": 2500, "currency": "EUR",
        "desc": "Annual tech conference", "teamId": TEAM_ID,
    })
check("Create trip", r_trip, 201)
TRIP_ID = jget(r_trip, "data", "id")
print(f"  TripID: {TRIP_ID}")

check("List trips", req("GET", "/api/v1/trips", token=TOKEN, params={"teamId": TEAM_ID}), 200)

if TRIP_ID:
    check("Get trip by ID", req("GET", f"/api/v1/trips/{TRIP_ID}", token=TOKEN,
                                params={"teamId": TEAM_ID}), 200)

check("Reject invalid trip vehicle", req("POST", "/api/v1/trips", token=TOKEN,
    params={"teamId": TEAM_ID},
    json_body={"title": "x", "category": "Business", "vehicle": "ROCKET",
               "destination": "Mars", "startDate": "2025-06-01", "endDate": "2025-06-05",
               "amount": 100, "currency": "USD", "desc": "test", "teamId": TEAM_ID}), 400)

check("Reject invalid trip category", req("POST", "/api/v1/trips", token=TOKEN,
    params={"teamId": TEAM_ID},
    json_body={"title": "x", "category": "INVALID_CAT", "vehicle": "Car",
               "destination": "Ankara", "startDate": "2025-06-01", "endDate": "2025-06-05",
               "amount": 100, "currency": "USD", "desc": "test", "teamId": TEAM_ID}), 400)

# Phase 7: Security Tests 
section("Phase 7: Security (Injection Guards)")

# SQL injection — sanitize middleware should block
check("Block SQL injection in title", req("POST", "/api/v1/expenses", token=TOKEN,
    params={"teamId": TEAM_ID},
    json_body={"title": "'; DROP TABLE expenses; --", "category": "Food",
               "merchant": "x", "paymentMethod": "Cash", "amount": 10,
               "currency": "USD", "isReported": False, "teamId": TEAM_ID}), 400)

check("Block UNION SELECT injection", req("POST", "/api/v1/expenses", token=TOKEN,
    params={"teamId": TEAM_ID},
    json_body={"title": "test UNION SELECT * FROM users", "category": "Food",
               "merchant": "x", "paymentMethod": "Cash", "amount": 10,
               "currency": "USD", "isReported": False, "teamId": TEAM_ID}), 400)

check("Block XSS script tag", req("POST", "/api/v1/expenses", token=TOKEN,
    params={"teamId": TEAM_ID},
    json_body={"title": "<script>alert(1)</script>", "category": "Food",
               "merchant": "x", "paymentMethod": "Cash", "amount": 10,
               "currency": "USD", "isReported": False, "teamId": TEAM_ID}), 400)

# Phase 8: Analysis Export 
section("Phase 8: Analysis Export")

# Approve the expense so it appears in export (export only shows approved)
if EXP_ID:
    check("Approve expense (admin)", req("PATCH", f"/api/v1/expenses/{EXP_ID}/status", token=TOKEN,
        params={"teamId": TEAM_ID},
        json_body={"status": "approved", "teamId": TEAM_ID}), 200)

if TEAM_ID:
    for fmt in ["csv", "pdf", "excel"]:
        r_export = req("GET", "/api/v1/expenses/export", token=TOKEN,
                       params={"teamId": TEAM_ID, "format": fmt}, timeout=20)
        check(f"Export {fmt.upper()}", r_export, 200)

# Phase 9: Performance 
section("Phase 9: Performance (30 sequential GET /expenses)")

latencies = []
for _ in range(30):
    r = req("GET", "/api/v1/expenses", token=TOKEN, params={"teamId": TEAM_ID})
    latencies.append(r._elapsed_ms)

avg = sum(latencies) // len(latencies)
mn  = min(latencies)
mx  = max(latencies)
p95 = sorted(latencies)[int(len(latencies)*0.95)]

print(f"  Avg: {avg}ms | Min: {mn}ms | Max: {mx}ms | P95: {p95}ms")

if avg < 300:
    print(f"  {GREEN}✓ Performance excellent (avg < 300ms){NC}")
    PASS += 1
elif avg < 600:
    print(f"  {YELLOW}⚠ Performance acceptable (avg < 600ms){NC}")
    PASS += 1
else:
    print(f"  {RED}✗ Performance slow (avg ≥ 600ms){NC}")
    FAIL += 1

# Phase 10: Cleanup 
section("Phase 10: Cleanup")

if EXP_ID:
    check("Delete expense", req("DELETE", f"/api/v1/expenses/{EXP_ID}", token=TOKEN), 200)
if TRIP_ID:
    check("Delete trip", req("DELETE", f"/api/v1/trips/{TRIP_ID}", token=TOKEN), 200)

# Summary 
total = PASS + FAIL
print(f"\n{BOLD}{'='*48}{NC}")
print(f"{BOLD}FlowTera E2E Test Results — {datetime.now().strftime('%Y-%m-%d %H:%M')}{NC}")
print(f"  {GREEN}PASS: {PASS}{NC}  {RED}FAIL: {FAIL}{NC}  Total: {total}")

if FAIL == 0:
    print(f"{GREEN}{BOLD}All {total} tests passed!{NC}")
else:
    print(f"{RED}{BOLD}{FAIL}/{total} tests FAILED.{NC}")
    print(f"\n{BOLD}Failed tests:{NC}")
    for r in RESULTS:
        if not r["ok"]:
            print(f"  ✗ [{r['code']}→{r['expected']}] {r['label']}")

print(f"{BOLD}{'='*48}{NC}")

# Save summary for docs
SUMMARY = {
    "date": datetime.now().isoformat(),
    "pass": PASS, "fail": FAIL, "total": total,
    "perf": {"avg_ms": avg, "min_ms": mn, "max_ms": mx, "p95_ms": p95},
    "results": RESULTS,
}
with open("/tmp/e2e_results.json", "w") as f:
    json.dump(SUMMARY, f, indent=2)

sys.exit(0 if FAIL == 0 else 1)
