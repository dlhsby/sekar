#!/bin/bash
# Start the SEKAR mobile dev workflow.
#
# Usage: ./scripts/start-mobile.sh [--android]
#   default    Metro bundler in the foreground (attach a device/emulator that
#              already has the app installed)
#   --android  build + install + launch on Android (does NOT start Metro —
#              run this script without --android in another terminal first);
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
    print_info "adb-reversing device:8081 -> host:$METRO_PORT so the app reaches this worktree's Metro."
  fi
  print_warning "This doesn't start Metro — run ./scripts/start-mobile.sh (no --android) in another terminal first."
  print_warning "adb reverse is per-device: targeting the SAME physical device/emulator from two worktrees at once will fight over its tcp:8081 mapping. Use a separate device/emulator per worktree."
  npm run android
else
  free_port "$METRO_PORT" "metro"
  print_info "Starting Metro bundler on :$METRO_PORT (Ctrl+C to stop)..."
  print_info "Tip: emulator API base is http://10.0.2.2:$BE_PORT — see apps/mobile/.env.local"
  npm start -- --port "$METRO_PORT"
fi
