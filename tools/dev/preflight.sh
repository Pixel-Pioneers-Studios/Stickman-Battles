#!/usr/bin/env bash
# tools/dev/preflight.sh — everything to check before shipping an update, in one go.
#
#   tools/dev/preflight.sh
#
# Runs: syntax check of every file, the invariant audit, the changelog spoiler lint,
# and lists changed files whose ?v= tag still needs a bump. Lint (eslint) is left out
# because it's slow; run `npm run lint` separately. A syntax pass is not a playtest.
cd "$(dirname "$0")/../.."
fail=0
step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

step "Syntax (npm run build)"
if npm run -s build >/tmp/smb-preflight-build.log 2>&1; then echo "ok"; else fail=1; tail -20 /tmp/smb-preflight-build.log; fi

step "Invariant audit (npm run audit)"
node tools/audit/check.js 2>&1 | grep -E "^(ERROR|WARN)|error|summary|[0-9]+ (error|finding)" | tail -25
[ "${PIPESTATUS[0]}" = 0 ] || fail=1

step "Changelog spoilers (latest entry)"
node tools/dev/changelog-lint.js --latest || fail=1

step "Cache-bust tags for changed files"
bump_out=$(node tools/dev/bump-version.js --dry-run)
echo "$bump_out" | grep -- '->' | head -10
echo "$bump_out" | tail -1
echo "Apply with: node tools/smb.js bump"

step "Owner powers config"
node tools/dev/owner-check.js >/dev/null && echo "ok" || echo "see: node tools/dev/owner-check.js"

echo
if [ $fail = 0 ]; then echo "Preflight passed."; else echo "Preflight FAILED (see above)."; fi
exit $fail
