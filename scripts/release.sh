#!/usr/bin/env bash
#
# Cut a versioned release by bumping package.json, committing, tagging, and pushing.
# A tag-triggered GitHub Actions workflow then builds + publishes the release.
#
#   scripts/release.sh server X.Y.Z            # backend + web (coupled) → sekar-vX.Y.Z
#   scripts/release.sh mobile X.Y.Z [vCode]    # mobile app → mobile-vX.Y.Z (vCode = Android versionCode)
#
# Server releases build + push version-pinned ECR images + a GitHub Release
# (release-server.yml). Mobile releases build the signed APK/AAB + auto-publish
# to the download registry (mobile-release.yml). Run from anywhere in the repo.
set -euo pipefail

COMPONENT="${1:-}"
VERSION="${2:-}"
VERSION_CODE="${3:-}"

die() { echo "✖ $*" >&2; exit 1; }

[ -n "$COMPONENT" ] && [ -n "$VERSION" ] || die "usage: release.sh <server|mobile> <X.Y.Z> [versionCode]"
echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' || die "version must be semver X.Y.Z (got '$VERSION')"

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# Safety: clean tree on the default branch.
[ -z "$(git status --porcelain)" ] || die "working tree not clean — commit/stash first"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || die "must be on main (on '$BRANCH')"

bump_pkg() { # $1 = workspace dir
  ( cd "$1" && npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null )
  echo "  bumped $1/package.json → $VERSION"
}

case "$COMPONENT" in
  server)
    TAG="sekar-v$VERSION"
    echo "▸ Server release $TAG (backend + web)"
    bump_pkg be
    bump_pkg fe/web
    git add be/package.json be/package-lock.json fe/web/package.json fe/web/package-lock.json 2>/dev/null || git add be/package.json fe/web/package.json
    git commit -q -m "chore(release): server v$VERSION"
    ;;
  mobile)
    [ -n "$VERSION_CODE" ] || die "mobile needs a versionCode: release.sh mobile $VERSION <versionCode>"
    echo "$VERSION_CODE" | grep -qE '^[0-9]+$' || die "versionCode must be an integer (got '$VERSION_CODE')"
    TAG="mobile-v$VERSION"
    echo "▸ Mobile release $TAG (versionCode $VERSION_CODE)"
    bump_pkg fe/mobile
    # Android versionName + versionCode
    sed -i "s/versionName \"[^\"]*\"/versionName \"$VERSION\"/" fe/mobile/android/app/build.gradle
    sed -i "s/versionCode [0-9]\+/versionCode $VERSION_CODE/" fe/mobile/android/app/build.gradle
    # iOS marketing version + build number
    sed -i "s/MARKETING_VERSION = [^;]*;/MARKETING_VERSION = $VERSION;/g" fe/mobile/ios/SekarApp.xcodeproj/project.pbxproj
    sed -i "s/CURRENT_PROJECT_VERSION = [0-9]\+;/CURRENT_PROJECT_VERSION = $VERSION_CODE;/g" fe/mobile/ios/SekarApp.xcodeproj/project.pbxproj
    echo "  set android versionName=$VERSION versionCode=$VERSION_CODE + iOS MARKETING_VERSION/CURRENT_PROJECT_VERSION"
    git add fe/mobile/package.json fe/mobile/android/app/build.gradle fe/mobile/ios/SekarApp.xcodeproj/project.pbxproj
    git commit -q -m "chore(release): mobile v$VERSION (versionCode $VERSION_CODE)"
    ;;
  *)
    die "unknown component '$COMPONENT' (expected: server | mobile)"
    ;;
esac

git tag -a "$TAG" -m "$TAG"
echo "▸ Pushing commit + tag $TAG …"
git push origin main
git push origin "$TAG"
echo "✓ Released $TAG — watch GitHub Actions for the build/publish."
