#!/bin/bash
# Start the SEKAR mobile dev workflow.
#
# Usage: ./scripts/start-mobile.sh [--android]
#   default    Metro bundler in the foreground (attach a device/emulator that
#              already has the app installed)
#   --android  build + install + launch on Android (starts its own Metro);
#              requires the Android SDK and a connected device/emulator
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

MODE="metro"
for arg in "$@"; do
  case "$arg" in
    --android) MODE="android" ;;
    *) print_error "Unknown flag: $arg (supported: --android)"; exit 1 ;;
  esac
done

load_ports
cd "$ROOT/apps/mobile"
if [ "$MODE" = "android" ]; then
  if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] && [ ! -d "$HOME/Android/Sdk" ]; then
    print_error "Android SDK not found (set ANDROID_HOME). Falling back is not possible for --android."
    exit 1
  fi
  if [ "$METRO_PORT" != "8081" ]; then
    print_warning "METRO_PORT=$METRO_PORT, but 'npm run android' always adb-reverses tcp:8081 — only run --android from one worktree/checkout at a time."
  fi
  print_info "Building + installing on Android (this also starts Metro)..."
  npm run android
else
  free_port "$METRO_PORT" "metro"
  print_info "Starting Metro bundler on :$METRO_PORT (Ctrl+C to stop)..."
  print_info "Tip: emulator API base is http://10.0.2.2:$BE_PORT — see apps/mobile/.env.local"
  npm start -- --port "$METRO_PORT"
fi
