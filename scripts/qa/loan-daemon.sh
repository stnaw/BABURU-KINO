#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INTERVAL_SECONDS="${QA_LOAN_INTERVAL_SECONDS:-20}"
SEED_BASE="${QA_LOAN_SEED_BASE:-303030}"
ITERATION=0

cd "$ROOT_DIR"

echo "BABURU KINKO multi-loan simulation daemon started."
echo "Interval: ${INTERVAL_SECONDS}s"
echo "Participants: ${QA_LOAN_PARTICIPANTS:-10}"
echo "Max rounds per cycle: ${QA_LOAN_ROUNDS:-64}"
echo "Target simulation days: ${QA_LOAN_TOTAL_DAYS:-19}"
echo "Time step options: ${QA_LOAN_TIME_STEP_OPTIONS:-21600,43200,64800,86400}"

while true; do
  ITERATION=$((ITERATION + 1))
  RUN_SEED=$((SEED_BASE + ITERATION))
  echo
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting loan simulation cycle #${ITERATION} (seed=${RUN_SEED})"

  if QA_SEED="${RUN_SEED}" npm run qa:loans; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Loan simulation cycle #${ITERATION} finished."
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Loan simulation cycle #${ITERATION} failed. Retrying after cooldown."
  fi

  sleep "${INTERVAL_SECONDS}"
done
