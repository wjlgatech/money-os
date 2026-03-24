#!/bin/bash
# Money OS Daily Cron — runs after market close
#
# Schedule: Mon-Fri 5:30 PM PT (market closes 1 PM PT)
# What it does:
#   1. Fetch latest bars + VIX from Yahoo Finance
#   2. Compute trendlines, scanner results, signals
#   3. Run auto-trader against Alpaca paper trading
#   4. Log everything to daily log file
#
# Set up with: scripts/install-cron.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"

cd "$PROJECT_DIR"

echo "=== Money OS Daily Cron — $(date) ===" >> "$LOG_FILE"

# Step 1: Fetch data + compute signals
echo "[$(date +%H:%M:%S)] Running pipeline..." >> "$LOG_FILE"
npx tsx scripts/run-pipeline.ts >> "$LOG_FILE" 2>&1

# Step 2: Run auto-trader (execute via Alpaca paper)
echo "" >> "$LOG_FILE"
echo "[$(date +%H:%M:%S)] Running auto-trader..." >> "$LOG_FILE"
npx tsx scripts/daily-auto-trader.ts --execute --backend=alpaca >> "$LOG_FILE" 2>&1

echo "" >> "$LOG_FILE"
echo "[$(date +%H:%M:%S)] Done." >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
