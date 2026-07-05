#!/bin/bash
# Start the SEKAR mobile dev workflow.
#
# Usage: ./scripts/start-mobile.sh [--android] [--device <serial>] [--all]
#   default          Metro bundler in the foreground (attach a device/emulator
#                     that already has the app installed)
#   --android         build + install + launch on Android (does NOT start
#                     Metro — run this script without --android in another
#                     terminal first); requires the Android SDK and a
#                     connected device/emulator.
#                     Which device gets it: $ANDROID_SERIAL if already set, or
#                     --device <serial> / --all if passed; otherwise, with
#                     exactly one device connected it's used automatically,
#                     with more than one you're prompted to pick (or "all")
#                     interactively.
#   --device <serial> pin a specific device/emulator (skips the prompt)
#   --all              install to every connected device (skips the prompt)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

MODE="metro"
DEVICE_FLAG=""
ALL_FLAG=false
while [ $# -gt 0 ]; do
  case "$1" in
    --android) MODE="android"; shift ;;
    --device) DEVICE_FLAG="$2"; shift 2 ;;
    --all) ALL_FLAG=true; shift ;;
    *) print_error "Unknown flag: $1 (supported: --android, --device <serial>, --all)"; exit 1 ;;
  esac
done

load_ports
cd "$ROOT/apps/mobile"
if [ "$MODE" = "android" ]; then
  if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] && [ ! -d "$HOME/Android/Sdk" ]; then
    print_error "Android SDK not found (set ANDROID_HOME). Falling back is not possible for --android."
    exit 1
  fi

  RUN_ALL=false
  if [ -n "$DEVICE_FLAG" ]; then
    export ANDROID_SERIAL="$DEVICE_FLAG"
  elif [ "$ALL_FLAG" = true ]; then
    RUN_ALL=true
  elif [ -z "${ANDROID_SERIAL:-}" ]; then
    mapfile -t DEVICES < <(adb devices 2>/dev/null | tail -n +2 | awk '$2=="device"{print $1}')
    if [ "${#DEVICES[@]}" -eq 0 ]; then
      print_error "No connected devices/emulators found (adb devices). Start one and retry."
      exit 1
    elif [ "${#DEVICES[@]}" -eq 1 ]; then
      export ANDROID_SERIAL="${DEVICES[0]}"
      print_info "One device connected — targeting $ANDROID_SERIAL"
    elif [ -t 0 ]; then
      echo "Multiple devices connected:"
      i=1
      for d in "${DEVICES[@]}"; do
        echo "  $i) $d"
        i=$((i + 1))
      done
      echo "  a) All devices"
      read -r -p "Pick a device [1-${#DEVICES[@]}/a]: " choice
      if [ "$choice" = "a" ] || [ "$choice" = "A" ]; then
        RUN_ALL=true
      elif [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#DEVICES[@]}" ]; then
        export ANDROID_SERIAL="${DEVICES[$((choice - 1))]}"
      else
        print_error "Invalid selection: $choice"
        exit 1
      fi
    else
      print_warning "Multiple devices connected, no ANDROID_SERIAL/--device/--all given, non-interactive shell — 'npm run android' will target whichever 'adb devices' lists first."
    fi
  fi

  if [ "$METRO_PORT" != "8081" ]; then
    print_info "adb-reversing device:8081 -> host:$METRO_PORT so the app reaches this worktree's Metro."
  fi
  print_warning "This doesn't start Metro — run ./scripts/start-mobile.sh (no --android) in another terminal first."
  if [ "$RUN_ALL" = true ]; then
    print_info "Installing to ALL connected devices..."
    npm run android:all
  else
    print_info "Targeting device: ${ANDROID_SERIAL:-<first detected by adb>}"
    npm run android
  fi
else
  free_port "$METRO_PORT" "metro"
  print_info "Starting Metro bundler on :$METRO_PORT (Ctrl+C to stop)..."
  print_info "Tip: emulator API base is http://10.0.2.2:$BE_PORT — see apps/mobile/.env.local"
  npm start -- --port "$METRO_PORT"
fi
