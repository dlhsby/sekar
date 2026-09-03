#!/usr/bin/env bash
#
# Tail SEKAR's Android logs, scoped to one app on one device.
#
# Plain `adb logcat` on a busy emulator is unreadable and, with more than one
# device attached, `adb` refuses to run at all. This picks a device by position
# in `adb devices` and filters to the app's own pid, so what you get is only
# SEKAR.
#
#   ./scripts/logcat.sh              # 1st device, JS + crashes (the usual case)
#   ./scripts/logcat.sh 2            # 2nd device
#   ./scripts/logcat.sh 1 --all      # every tag from the app, not just JS
#   ./scripts/logcat.sh 1 --dump     # clear, then print what happens next, and exit
#   ./scripts/logcat.sh --list       # show attached devices with their index
#
# The pid is resolved fresh on each run: a Metro reload keeps it, but a crash,
# a reinstall or a cold start does not — so re-run this after any of those.

set -uo pipefail

PACKAGE="${SEKAR_PACKAGE:-com.wahyutrip.sekar}"

die() {
  echo "✖ $*" >&2
  exit 1
}

command -v adb >/dev/null 2>&1 || die "adb not on PATH."

# Serials of devices that are actually ready ('device', not 'offline'/'unauthorized').
devices() {
  adb devices | awk 'NR>1 && $2=="device" {print $1}'
}

list_devices() {
  local i=0
  while read -r serial; do
    i=$((i + 1))
    echo "  $i) $serial"
  done < <(devices)
  [ "$i" -eq 0 ] && echo "  (none attached)"
}

INDEX=1
MODE="js"
for arg in "$@"; do
  case "$arg" in
    --list) echo "Devices:"; list_devices; exit 0 ;;
    --all) MODE="all" ;;
    --dump) MODE="dump" ;;
    -h | --help) sed -n '3,20p' "$0" | sed 's/^# \?//'; exit 0 ;;
    '' | *[!0-9]*) die "Unknown argument: $arg" ;;
    *) INDEX="$arg" ;;
  esac
done

COUNT=$(devices | wc -l)
[ "$COUNT" -eq 0 ] && die "No device attached. Start an emulator, or check 'adb devices'."
if [ "$INDEX" -gt "$COUNT" ] || [ "$INDEX" -lt 1 ]; then
  echo "✖ No device at position $INDEX — $COUNT attached:" >&2
  list_devices >&2
  exit 1
fi

SERIAL=$(devices | sed -n "${INDEX}p")

# `adb shell` returns a trailing CR, which silently breaks `logcat --pid`.
PID=$(adb -s "$SERIAL" shell pidof -s "$PACKAGE" 2>/dev/null | tr -d '\r')
if [ -z "$PID" ]; then
  echo "✖ $PACKAGE is not running on $SERIAL." >&2
  echo "  Launch it, then re-run — the pid has to exist to filter on it." >&2
  exit 1
fi

echo "▶ $SERIAL · $PACKAGE · pid $PID · mode $MODE"
echo "  (Ctrl-C to stop)"
echo

case "$MODE" in
  all)
    exec adb -s "$SERIAL" logcat --pid="$PID"
    ;;
  dump)
    adb -s "$SERIAL" logcat -c
    echo "  Log cleared — reproduce the problem now, then Ctrl-C."
    exec adb -s "$SERIAL" logcat --pid="$PID"
    ;;
  *)
    # ReactNativeJS carries console.* and JS errors; AndroidRuntime carries
    # native crashes. *:S silences everything else.
    exec adb -s "$SERIAL" logcat --pid="$PID" \
      ReactNativeJS:V ReactNative:V AndroidRuntime:E *:S
    ;;
esac
