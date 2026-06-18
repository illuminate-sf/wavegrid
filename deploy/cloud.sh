#!/usr/bin/env bash
# Cloud server launcher (machine #1, the internet box at CLOUD_IP).
# Runs the simulator + ui under PM2 so they stay up unattended.
#
#   deploy/cloud.sh start     start (or reload) sim + ui under PM2
#   deploy/cloud.sh stop      stop both
#   deploy/cloud.sh restart   restart both (picks up code/.env changes)
#   deploy/cloud.sh logs      tail combined logs
#   deploy/cloud.sh status    show process list
#   deploy/cloud.sh setup     install pm2 if missing + enable boot persistence
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
ECO="$DEPLOY_DIR/ecosystem.config.js"

ensure_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "pm2 not found — installing globally with pnpm…"
    pnpm add -g pm2
  fi
}

cmd="${1:-status}"
case "$cmd" in
  start)
    ensure_pm2
    pm2 start "$ECO"
    pm2 save
    ;;
  stop)    pm2 stop "$ECO" ;;
  restart) pm2 restart "$ECO" ;;
  logs)    pm2 logs ;;
  status)  pm2 status ;;
  setup)
    ensure_pm2
    pm2 start "$ECO"
    pm2 save
    echo
    echo "To survive reboots, run the command pm2 prints below (needs sudo):"
    pm2 startup
    ;;
  *)
    echo "usage: $0 {start|stop|restart|logs|status|setup}" >&2
    exit 1
    ;;
esac
