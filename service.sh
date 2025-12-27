#!/bin/sh

DIR="$(dirname "$0")"
LOG="/opt/usr/homebrew/logs/stream-proxy.log"

mkdir -p "$(dirname "$LOG")"

echo "[WATCHDOG] Stream Proxy starting" >> "$LOG"

while true
do
    echo "[WATCHDOG] Launching Node service" >> "$LOG"
    node "$DIR/service.js" >> "$LOG" 2>&1
    echo "[WATCHDOG] Service crashed, restarting in 2s" >> "$LOG"
    sleep 2
done
