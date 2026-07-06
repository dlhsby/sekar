#!/usr/bin/env bash
#
# Cut a versioned release via a PULL REQUEST — never a direct push to main.
# The script creates a release branch, bumps versions, opens a PR into main,
# waits for the CI gate, squash-merges it, then pushes ONLY the tag. A
# tag-triggered GitHub Actions workflow then builds + publishes the release.
#
#   scripts/release.sh server X.Y.Z            # backend + web (coupled) → sekar-vX.Y.Z
#   scripts/release.sh mobile X.Y.Z [vCode]    # mobile app → mobile-vX.Y.Z (vCode = Android versionCode)
#
# Server releases build + push version-pinned ECR images + a GitHub Release
# (release-server.yml). Mobile releases build the signed APK/AAB + auto-publish
# to the download registry (mobile-release.yml). Run from anywhere in the repo.
#
# `main` (and `staging`) are ALWAYS protected: no direct push, force-push, or
# delete — not even with admin bypass. This tool goes through a PR so it can
# never bypass that. The only thing pushed directly is the immutable release
# TAG, after the version bump has landed on main via the merged PR.
set -euo pipefail

COMPONENT="${1:-}"
VERSION="${2:-}"
VERSION_CODE="${3:-}"

die() { echo "✖ $*" >&2; exit 1; }

[ -n "$COMPONENT" ] && [ -n "$VERSION" ] || die "usage: release.sh <server|mobile> <X.Y.Z> [versionCode]"
echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' || die "version must be semver X.Y.Z (got '$VERSION')"
command -v gh >/dev/null 2>&1 || die "gh CLI required and authenticated (gh auth status)"

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# Safety: clean tree, on main, in sync with origin/main — the PR branches off it.
[ -z "$(git status --porcelain)" ] || die "working tree not clean — commit/stash first"
BRANCH_NOW="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH_NOW" = "main" ] || die "must be on main (on '$BRANCH_NOW')"
git fetch origin main --quiet
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] ||
  die "local main is not in sync with origin/main — pull first"

bump_pkg() { # $1 = workspace dir
  ( cd "$1" && npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null )
  echo "  bumped $1/package.json → $VERSION"
}

FILES=()
case "$COMPONENT" in
  server)
    TAG="sekar-v$VERSION"
    echo "▸ Server release $TAG (backend + web)"
    bump_pkg apps/be
    bump_pkg apps/web
    FILES=(apps/be/package.json apps/web/package.json)
    [ -f apps/be/package-lock.json ] && FILES+=(apps/be/package-lock.json)
    [ -f apps/web/package-lock.json ] && FILES+=(apps/web/package-lock.json)
    COMMIT_MSG="chore(release): server v$VERSION"
    ;;
  mobile)
    [ -n "$VERSION_CODE" ] || die "mobile needs a versionCode: release.sh mobile $VERSION <versionCode>"
    echo "$VERSION_CODE" | grep -qE '^[0-9]+$' || die "versionCode must be an integer (got '$VERSION_CODE')"
    TAG="mobile-v$VERSION"
    echo "▸ Mobile release $TAG (versionCode $VERSION_CODE)"
    bump_pkg apps/mobile
    # Android versionName + versionCode
    sed -i "s/versionName \"[^\"]*\"/versionName \"$VERSION\"/" apps/mobile/android/app/build.gradle
    sed -i "s/versionCode [0-9]\+/versionCode $VERSION_CODE/" apps/mobile/android/app/build.gradle
    # iOS marketing version + build number
    sed -i "s/MARKETING_VERSION = [^;]*;/MARKETING_VERSION = $VERSION;/g" apps/mobile/ios/SekarApp.xcodeproj/project.pbxproj
    sed -i "s/CURRENT_PROJECT_VERSION = [0-9]\+;/CURRENT_PROJECT_VERSION = $VERSION_CODE;/g" apps/mobile/ios/SekarApp.xcodeproj/project.pbxproj
    echo "  set android versionName=$VERSION versionCode=$VERSION_CODE + iOS MARKETING_VERSION/CURRENT_PROJECT_VERSION"
    FILES=(apps/mobile/package.json apps/mobile/android/app/build.gradle apps/mobile/ios/SekarApp.xcodeproj/project.pbxproj)
    COMMIT_MSG="chore(release): mobile v$VERSION (versionCode $VERSION_CODE)"
    ;;
  *)
    die "unknown component '$COMPONENT' (expected: server | mobile)"
    ;;
esac

REL_BRANCH="release/$TAG"
echo "▸ Creating release branch $REL_BRANCH …"
git checkout -b "$REL_BRANCH"
git add "${FILES[@]}"
git commit -q -m "$COMMIT_MSG"
git push -u origin "$REL_BRANCH" --quiet

echo "▸ Opening release PR into main …"
gh pr create --base main --head "$REL_BRANCH" \
  --title "$COMMIT_MSG" \
  --body "Automated release PR for \`$TAG\`. Merging bumps the version on \`main\`; the \`$TAG\` tag is pushed after the merge to trigger the build/publish workflow."

echo "▸ Waiting for the CI gate to pass …"
gh pr checks "$REL_BRANCH" --watch --interval 20 ||
  die "CI gate failed — fix it, then merge the PR and push the tag manually:
       git checkout main && git pull --ff-only && git tag -a $TAG -m $TAG && git push origin $TAG"

echo "▸ Merging release PR (squash) …"
gh pr merge "$REL_BRANCH" --squash --delete-branch

echo "▸ Tagging the merged commit on main …"
git checkout main --quiet
git pull --ff-only --quiet
git tag -a "$TAG" -m "$TAG"
git push origin "$TAG"   # only the immutable tag is pushed directly — never a branch

echo "✓ Released $TAG via PR — watch GitHub Actions for the build/publish."
