#!/bin/bash
# Start the SEKAR mobile dev workflow.
#
# Usage: ./scripts/start-mobile.sh [--android] [--device <serial>] [--all] [--lan [IP]]
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
#   --lan [IP]        real device over Wi-Fi: build the app against the LAN
#                     backend (http://<IP>:<BE_PORT>), bind Metro to 0.0.0.0, and
#                     print the one-time WSL2 Windows port-forwards. Without
#                     --lan (USB / emulator) the app is built against
#                     http://localhost:<BE_PORT> and reached via `adb reverse`.
#
# API_BASE_URL is baked at build time (react-native-config reads apps/mobile/
# .env.local), so this script sets it for the chosen mode — rebuild (--android)
# after switching modes. apps/mobile/.env.local is gitignored local dev config.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

MODE="metro"
DEVICE_FLAG=""
ALL_FLAG=false
LAN=false
LAN_IP_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --android) MODE="android"; shift ;;
    --device) DEVICE_FLAG="$2"; shift 2 ;;
    --all) ALL_FLAG=true; shift ;;
    --lan)
      LAN=true; shift
      if [[ "${1:-}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN_IP_ARG="$1"; shift; fi
      ;;
    -h|--help)
      cat <<'USAGE'
start-mobile.sh — Metro + Android run/install, with real-device networking.
  ./scripts/start-mobile.sh                 Metro (USB/emulator; app uses localhost)
  ./scripts/start-mobile.sh --android       build + install on the connected device
  ./scripts/start-mobile.sh --lan           Wi-Fi: build against the LAN backend
  ./scripts/start-mobile.sh --android --lan 192.168.1.5   build for a Wi-Fi device
USAGE
      exit 0 ;;
    *) print_error "Unknown flag: $1 (supported: --android, --device <serial>, --all, --lan [IP], --help)"; exit 1 ;;
  esac
done

load_ports

# MinIO host port (for the photo-URL reverse below). From infra/.env, default 19000.
MINIO_PORT="$(env_file_value "$ROOT/infra/.env" MINIO_PORT)"
MINIO_PORT="${MINIO_PORT:-19000}"

# Resolve the API base the app is built against, and set it in the gitignored
# mobile env so the next build bakes it in. USB/emulator → localhost (reached via
# `adb reverse`); Wi-Fi → the LAN IP (reached directly, needs a port-forward).
MOBILE_ENV="$ROOT/apps/mobile/.env.local"
CUR_API="$(env_file_value "$MOBILE_ENV" API_BASE_URL)"
if [ "$LAN" = true ]; then
  LAN_IP="${LAN_IP_ARG:-$(detect_lan_ip)}"
  [ -z "$LAN_IP" ] && { print_error "No LAN IP auto-detected — pass one: ./scripts/start-mobile.sh --lan <IP>"; exit 1; }
  MOBILE_API_BASE="http://$LAN_IP:$BE_PORT"
else
  MOBILE_API_BASE="http://localhost:$BE_PORT"
fi
# Only rewrite a LOCAL-dev API base (empty / loopback / emulator / private LAN).
# Never clobber a deliberately-set remote URL (e.g. staging) — warn instead.
if [ -f "$MOBILE_ENV" ] && [ "$CUR_API" != "$MOBILE_API_BASE" ]; then
  if [ -z "$CUR_API" ] || printf '%s' "$CUR_API" | grep -qE '://(localhost|127\.0\.0\.1|10\.0\.2\.2|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)'; then
    set_env_key "$MOBILE_ENV" API_BASE_URL "$MOBILE_API_BASE"
    print_success "Set apps/mobile/.env.local API_BASE_URL → $MOBILE_API_BASE (rebuild with --android to bake it in)"
  else
    print_warning "apps/mobile/.env.local API_BASE_URL is '$CUR_API' (non-local) — leaving it. This mode needs $MOBILE_API_BASE; edit it + rebuild to use that."
  fi
fi

# adb_reverse_backend SERIAL — tunnel the device's localhost:BE_PORT to this
# host so a USB device (or emulator) reaches the backend without any LAN setup.
adb_reverse_backend() {
  local s="$1"
  if adb -s "$s" reverse "tcp:$BE_PORT" "tcp:$BE_PORT" >/dev/null 2>&1; then
    print_success "adb reverse on $s: localhost:$BE_PORT → backend"
  else
    print_warning "adb reverse failed on $s (Wi-Fi-only device? use --lan) — API at $MOBILE_API_BASE may be unreachable"
  fi
}

# adb_reverse_metro SERIAL — the app always asks for its bundle on device:8081,
# so map that to whatever METRO_PORT this checkout runs Metro on. Without this,
# starting Metro on a non-8081 port leaves the device pointing at a dead 8081
# and the app dies with "Unable to load script".
adb_reverse_metro() {
  local s="$1"
  if adb -s "$s" reverse "tcp:8081" "tcp:$METRO_PORT" >/dev/null 2>&1; then
    print_success "adb reverse on $s: device:8081 → Metro :$METRO_PORT"
  else
    print_warning "adb reverse failed on $s — the app may not find Metro on :$METRO_PORT"
  fi
}

# adb_reverse_minio SERIAL — tunnel the device's localhost:MINIO_PORT to this
# host's MinIO, so presigned photo URLs (which the backend mints as
# http://localhost:MINIO_PORT/…) actually resolve on the device. Without this,
# uploads succeed but photos show as broken images. No-op against real S3
# (staging), where presigned URLs are public.
adb_reverse_minio() {
  local s="$1"
  if adb -s "$s" reverse "tcp:$MINIO_PORT" "tcp:$MINIO_PORT" >/dev/null 2>&1; then
    print_success "adb reverse on $s: localhost:$MINIO_PORT → MinIO (photos)"
  else
    print_warning "adb reverse failed on $s for MinIO :$MINIO_PORT — photos may not load"
  fi
}

cd "$ROOT/apps/mobile"
if [ "$MODE" = "android" ]; then
  if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] && [ ! -d "$HOME/Android/Sdk" ]; then
    print_error "Android SDK not found (set ANDROID_HOME). Falling back is not possible for --android."
    exit 1
  fi

  # Non-interactive script invocations don't source ~/.bashrc/~/.zshrc, so
  # `adb` may be missing from PATH here even though it works in your shell
  # (e.g. platform-tools only added to PATH by an rc file). Resolve it
  # explicitly and export the fix so both our own `adb` calls below AND the
  # `adb` inside `npm run android`/`android:all` can find it.
  if ! command_exists adb; then
    for candidate in "${ANDROID_HOME:-}/platform-tools" "${ANDROID_SDK_ROOT:-}/platform-tools" "$HOME/Android/Sdk/platform-tools"; do
      if [ -n "$candidate" ] && [ -x "$candidate/adb" ]; then
        export PATH="$candidate:$PATH"
        break
      fi
    done
  fi
  if ! command_exists adb; then
    print_error "adb not found on PATH (checked \$ANDROID_HOME/platform-tools, \$ANDROID_SDK_ROOT/platform-tools, ~/Android/Sdk/platform-tools). Add platform-tools to PATH or set ANDROID_HOME/ANDROID_SDK_ROOT."
    exit 1
  fi

  RUN_ALL=false
  if [ -n "$DEVICE_FLAG" ]; then
    export ANDROID_SERIAL="$DEVICE_FLAG"
  elif [ "$ALL_FLAG" = true ]; then
    RUN_ALL=true
  elif [ -z "${ANDROID_SERIAL:-}" ]; then
    # tr -d '\r' guards against WSL setups where `adb` wraps a Windows adb.exe
    # (CRLF output), which would otherwise make $2=="device" never match.
    mapfile -t DEVICES < <(adb devices 2>/dev/null | tr -d '\r' | tail -n +2 | awk '$2=="device"{print $1}')
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
  # Backend reachability: Wi-Fi → LAN IP + Windows port-forward; USB/emulator →
  # tunnel the backend port to the device so the app reaches http://localhost:$BE_PORT.
  if [ "$LAN" = true ]; then
    print_be_lan_help "$LAN_IP"
    wsl_portproxy_hint "$METRO_PORT" "Metro"
    print_info "Wi-Fi debug build: in the app's dev menu set 'Debug server host & port' to $LAN_IP:$METRO_PORT (or install a release build)."
  else
    # On WSL2 + Windows adb.exe these reverses resolve on WINDOWS, so ensure
    # Windows forwards both ports into WSL before wiring them up.
    wsl_portproxy_ensure "$METRO_PORT" "$BE_PORT"
    if [ "$RUN_ALL" = true ]; then
      mapfile -t _RTARGETS < <(adb devices 2>/dev/null | tr -d '\r' | tail -n +2 | awk '$2=="device"{print $1}')
    else
      _RTARGETS=("${ANDROID_SERIAL:-}")
    fi
    for s in "${_RTARGETS[@]}"; do [ -n "$s" ] && { adb_reverse_backend "$s"; adb_reverse_minio "$s"; }; done
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
  if [ "$LAN" = true ]; then
    print_be_lan_help "$LAN_IP"
    wsl_portproxy_hint "$METRO_PORT" "Metro"
    print_info "Starting Metro on 0.0.0.0:$METRO_PORT (Ctrl+C to stop)..."
    print_info "On the device's dev menu, set 'Debug server host & port' to $LAN_IP:$METRO_PORT."
    npm start -- --port "$METRO_PORT" --host 0.0.0.0
  else
    # USB/emulator: tunnel the backend AND Metro ports to every connected device
    # so the app reaches http://localhost:$BE_PORT (its baked API base) and finds
    # its bundle. On WSL2 with a Windows adb.exe those reverses resolve on
    # WINDOWS, so make sure Windows forwards both ports into WSL first.
    if resolve_adb; then
      wsl_portproxy_ensure "$METRO_PORT" "$BE_PORT"
      mapfile -t _RTARGETS < <(adb devices 2>/dev/null | tr -d '\r' | tail -n +2 | awk '$2=="device"{print $1}')
      for s in "${_RTARGETS[@]}"; do
        [ -n "$s" ] || continue
        adb_reverse_backend "$s"
        adb_reverse_metro "$s"
        adb_reverse_minio "$s"
      done
    else
      print_warning "adb not found — if using a USB device, run 'adb reverse tcp:$BE_PORT tcp:$BE_PORT' yourself so the app reaches the backend."
    fi
    print_info "Starting Metro bundler on :$METRO_PORT (Ctrl+C to stop)..."
    print_info "Tip: app API base is $MOBILE_API_BASE (USB/emulator via adb reverse) — see apps/mobile/.env.local"
    npm start -- --port "$METRO_PORT"
  fi
fi
