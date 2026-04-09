#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.local/dev"
HARDHAT_PID_FILE="$STATE_DIR/hardhat.pid"
VITE_PID_FILE="$STATE_DIR/vite.pid"

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  rm -f "$pid_file"

  if [[ -n "${pid}" ]] && kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    sleep 0.3
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    echo "Stopped ${label} (${pid})."
  fi
}

stop_port() {
  local port="$1"
  local label="$2"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -n "${pids}" ]]; then
    echo "${pids}" | xargs kill >/dev/null 2>&1 || true
    sleep 0.3
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
    if [[ -n "${pids}" ]]; then
      echo "${pids}" | xargs kill -9 >/dev/null 2>&1 || true
    fi
    echo "Cleared ${label} on port ${port}."
  fi
}

stop_pid_file "$HARDHAT_PID_FILE" "Hardhat node"
stop_pid_file "$VITE_PID_FILE" "Vite dev server"
stop_port 8545 "local chain"
stop_port 4173 "frontend dev server"

cat <<EOF
Local services stopped.

Checked ports:
  8545
  4173
EOF
