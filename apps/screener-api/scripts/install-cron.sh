#!/bin/bash
# Install Money OS daily auto-trader as a macOS launchd job.
#
# Usage: bash scripts/install-cron.sh
#
# To uninstall: bash scripts/install-cron.sh --uninstall
# To test now:  bash scripts/install-cron.sh --run-now

set -euo pipefail

PLIST_NAME="com.moneyos.daily-trader"
PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/$PLIST_NAME.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

if [ "${1:-}" = "--uninstall" ]; then
    echo "Uninstalling $PLIST_NAME..."
    launchctl bootout "gui/$(id -u)/$PLIST_NAME" 2>/dev/null || true
    rm -f "$PLIST_DST"
    echo "Done. Cron job removed."
    exit 0
fi

if [ "${1:-}" = "--run-now" ]; then
    echo "Running daily cron manually..."
    bash "$(dirname "$0")/cron-daily.sh"
    exit 0
fi

# Install
echo "Installing Money OS daily auto-trader..."
echo ""
echo "  Schedule: Mon-Fri 5:30 PM PT"
echo "  Action:   Fetch data → Compute signals → Execute trades (Alpaca paper)"
echo "  Logs:     apps/screener-api/logs/"
echo ""

# Create logs dir
mkdir -p "$(dirname "$PLIST_SRC")/../logs"

# Copy plist to LaunchAgents
cp "$PLIST_SRC" "$PLIST_DST"

# Unload if already loaded
launchctl bootout "gui/$(id -u)/$PLIST_NAME" 2>/dev/null || true

# Load
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"

echo "Installed! The auto-trader will run Mon-Fri at 5:30 PM."
echo ""
echo "Commands:"
echo "  Check status:  launchctl print gui/$(id -u)/$PLIST_NAME"
echo "  Run manually:  bash scripts/install-cron.sh --run-now"
echo "  View logs:     tail -f logs/\$(date +%Y-%m-%d).log"
echo "  Uninstall:     bash scripts/install-cron.sh --uninstall"
