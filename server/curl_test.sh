#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8000}"

echo "[1/3] Login with admin user..."
LOGIN_RESPONSE="$(curl -sS -X POST "${BASE_URL}/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}')"

TOKEN="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["access_token"])' "$LOGIN_RESPONSE")"

if [[ -z "$TOKEN" ]]; then
  echo "Login failed. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Login success. Token acquired."

echo "[2/3] Call /echo with token..."
ECHO_RESPONSE="$(curl -sS -X POST "${BASE_URL}/echo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"message":"hello"}')"

echo "Echo response: $ECHO_RESPONSE"

echo "[3/3] Call /echo without token (expect 401)..."
HTTP_CODE="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/echo" \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}')"

if [[ "$HTTP_CODE" == "401" ]]; then
  echo "Unauthorized check passed (401)."
else
  echo "Unauthorized check failed, expected 401 but got $HTTP_CODE"
  exit 1
fi

echo "All curl tests passed."
