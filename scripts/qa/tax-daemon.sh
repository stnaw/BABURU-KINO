#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INTERVAL_SECONDS="${QA_TAX_INTERVAL_SECONDS:-25}"
SEED_BASE="${QA_SEED_BASE:-20260409}"
ITERATION=0

cd "$ROOT_DIR"

echo "BABURU KINKO tax simulation daemon started."
echo "Interval: ${INTERVAL_SECONDS}s"

while true; do
  ITERATION=$((ITERATION + 1))
  RUN_SEED=$((SEED_BASE + ITERATION))
  echo
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting tax simulation window #${ITERATION} (seed=${RUN_SEED})"

  if QA_SEED="${RUN_SEED}" npm run qa:tax; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tax simulation window #${ITERATION} finished."
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tax simulation window #${ITERATION} failed. Retrying after cooldown."
  fi

  sleep "${INTERVAL_SECONDS}"
done
