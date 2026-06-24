#!/usr/bin/env bash
# Fully automated mobile screenshot capture: boot a headless Linux emulator,
# install the SEKAR x86_64 APK, drive it with Maestro (login + navigate), and
# drop the real screenshots into fe/docs/static/img/mobile/.
#
# Prereqs (see scripts/README.md "Automated mobile capture"):
#   - A Linux Android SDK at $ANDROID_SDK_ROOT with an AVD named "$AVD"
#     (emulator + platform-tools + a google_apis x86_64 system image).
#   - Maestro on PATH (~/.maestro/bin).
#   - KVM available (/dev/kvm) for acceleration.
#
#   bash fe/docs/scripts/capture-mobile-auto.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_IMG="$HERE/../static/img/mobile"
SHOTS="$(mktemp -d)/shots"
mkdir -p "$SHOTS"

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/android-linux}"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$HOME/.maestro/bin:$PATH"
AVD="${AVD:-sekar}"
APK="${APK:-$(dirname "$HERE")/sekar-x86.apk}"   # falls back below

# Resolve an APK: prefer a local file, else download the x86_64 build from staging.
if [ ! -f "$APK" ]; then
  APK="$SHOTS/../sekar-x86.apk"
  echo "▶ downloading x86_64 APK from staging…"
  curl -fsSL -o "$APK" "https://api.sekar.wahyutrip.com/api/v1/app-releases/latest/download?platform=android_x86"
fi

echo "▶ booting emulator ($AVD, headless, swiftshader)…"
emulator -avd "$AVD" -no-window -no-audio -no-boot-anim -no-snapshot \
  -gpu swiftshader_indirect -accel on -netdelay none -netspeed full \
  >/tmp/sekar-emulator.log 2>&1 &
EMU_PID=$!
trap 'adb emu kill >/dev/null 2>&1 || kill $EMU_PID >/dev/null 2>&1 || true' EXIT

echo "▶ waiting for device + full boot…"
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
adb shell input keyevent 82 >/dev/null 2>&1 || true   # dismiss lock if any

echo "▶ installing APK…"
adb install -r -g "$APK" >/dev/null

echo "▶ running Maestro capture flow…"
( cd "$(dirname "$SHOTS")" && maestro test "$HERE/maestro/capture.yaml" ) || echo "⚠ Maestro flow had failures — keeping whatever was captured"

echo "▶ copying captured screenshots into the docs…"
N=0
for png in "$SHOTS"/*.png; do
  [ -e "$png" ] || continue
  base="$(basename "$png")"
  if [ -f "$DOCS_IMG/$base" ]; then
    cp "$png" "$DOCS_IMG/$base"; echo "  ✓ $base"; N=$((N+1))
  else
    echo "  ↷ $base (no matching docs placeholder — skipped)"
  fi
done
echo "▶ updated $N screenshots in $DOCS_IMG"
echo "  Review them, then rebuild: cd fe/docs && npm run build"
