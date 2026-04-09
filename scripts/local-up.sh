#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.local/dev"
HARDHAT_PID_FILE="$STATE_DIR/hardhat.pid"
VITE_PID_FILE="$STATE_DIR/vite.pid"
HARDHAT_LOG="$STATE_DIR/hardhat.log"
DEPLOY_LOG="$STATE_DIR/deploy.log"
VITE_LOG="$STATE_DIR/vite.log"

mkdir -p "$STATE_DIR"

cleanup_failed_start() {
  rm -f "$HARDHAT_PID_FILE" "$VITE_PID_FILE"
}

port_in_use() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_port() {
  local port="$1"
  local name="$2"
  local retries="${3:-50}"

  for _ in $(seq 1 "$retries"); do
    if port_in_use "$port"; then
      return 0
    fi
    sleep 0.2
  done

  echo "Failed to start ${name} on port ${port}."
  return 1
}

cleanup_stale_pid() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "Process already running with PID ${pid}. Use scripts/local-down.sh first if you want a clean restart."
      return 1
    fi
    rm -f "$pid_file"
  fi
  return 0
}

if ! cleanup_stale_pid "$HARDHAT_PID_FILE"; then
  exit 1
fi

if ! cleanup_stale_pid "$VITE_PID_FILE"; then
  exit 1
fi

if port_in_use 8545; then
  echo "Port 8545 is already in use. Stop the existing local chain before starting a new one."
  exit 1
fi

if port_in_use 4173; then
  echo "Port 4173 is already in use. Stop the existing frontend dev server before starting a new one."
  exit 1
fi

cd "$ROOT_DIR"

./node_modules/.bin/hardhat node --hostname 127.0.0.1 >"$HARDHAT_LOG" 2>&1 &
echo $! >"$HARDHAT_PID_FILE"
if ! wait_for_port 8545 "Hardhat node"; then
  cleanup_failed_start
  tail -n 40 "$HARDHAT_LOG" || true
  exit 1
fi

npm run deploy:local >"$DEPLOY_LOG" 2>&1

./node_modules/.bin/vite --host 127.0.0.1 --port 4173 >"$VITE_LOG" 2>&1 &
echo $! >"$VITE_PID_FILE"
if ! wait_for_port 4173 "Vite dev server"; then
  cleanup_failed_start
  tail -n 40 "$VITE_LOG" || true
  exit 1
fi

MOCK_ADDRESS="$(sed -n 's/^MockBABURU: //p' "$DEPLOY_LOG" | tail -n 1)"
KINKO_ADDRESS="$(sed -n 's/^BABURU KINKO: //p' "$DEPLOY_LOG" | tail -n 1)"
BORROWER_ADDRESS="$(sed -n 's/^Borrower test account: //p' "$DEPLOY_LOG" | tail -n 1)"

cat <<EOF
Local services started.

Frontend:
  http://127.0.0.1:4173/

Local chain:
  http://127.0.0.1:8545/

Contracts:
  MockBABURU: ${MOCK_ADDRESS}
  BABURU KINKO: ${KINKO_ADDRESS}

Borrower test account:
  Address: ${BORROWER_ADDRESS}
  Private key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Logs:
  Hardhat: ${HARDHAT_LOG}
  Deploy:  ${DEPLOY_LOG}
  Vite:    ${VITE_LOG}
EOF
