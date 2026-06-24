#!/usr/bin/env bash
# Capture real SEKAR mobile-app screenshots from a connected Android device/emulator
# and drop them straight into the docs at the filenames the pages already reference.
# This OVERWRITES the branded placeholders with real captures.
#
# Prereqs: an Android emulator or USB device running the SEKAR app, with `adb`
# on PATH (`adb devices` must list one device).
#
# Usage:   bash fe/docs/scripts/capture-mobile.sh
# It walks each screen in mobile-screens.json: navigate the app to the screen it
# names, then press Enter to capture (or `s` + Enter to skip / keep the placeholder).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$HERE/mobile-screens.json"
OUT="$HERE/../static/img/mobile"
mkdir -p "$OUT"

command -v adb >/dev/null || { echo "✖ adb not found on PATH. Install Android platform-tools."; exit 1; }
DEV_COUNT=$(adb devices | awk 'NR>1 && $2=="device"' | wc -l | tr -d ' ')
if [ "$DEV_COUNT" -eq 0 ]; then
  echo "✖ No Android device/emulator attached. Start one (emulator or USB) and run 'adb devices'."; exit 1
fi
echo "▶ Using device: $(adb devices | awk 'NR>1 && $2=="device"{print $1; exit}')"
echo "  Open the SEKAR app and log in (satgas/linmas) before continuing."
echo

# Emit "file<TAB>title<TAB>reach" rows from the manifest (python3 = no jq dependency).
python3 - "$MANIFEST" <<'PY' | while IFS=$'\t' read -r FILE TITLE REACH; do
import json, sys
m = json.load(open(sys.argv[1]))
for s in m["screens"]:
    print(f"{s['file']}\t{s['title']}\t{s['reach']}")
PY
  echo "──────────────────────────────────────────────"
  echo "  $TITLE"
  echo "  Navigate: $REACH"
  read -r -p "  [Enter] capture · [s] skip · [q] quit: " ANS </dev/tty
  case "${ANS:-}" in
    s|S) echo "  ↷ skipped (placeholder kept)";;
    q|Q) echo "  ✋ stopped"; break;;
    *)   adb exec-out screencap -p > "$OUT/$FILE.png" && echo "  ✓ saved $FILE.png";;
  esac
done

echo
echo "Done. Review fe/docs/static/img/mobile/*.png, then rebuild the docs (npm run build)."
