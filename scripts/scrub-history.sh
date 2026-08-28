#!/usr/bin/env bash
# One-time: remove the local Supabase dev keys that were hardcoded in early
# commits (scripts/seed.mjs, src/test/supabase.ts). The current code no longer
# contains them; this only rewrites history so GitHub push protection is happy.
#
# Run from the repo root, on a clean working tree, with NO other checkout open:
#   bash scripts/scrub-history.sh
#
# It rewrites ALL branches. After it finishes:
#   git push --force-with-lease origin main develop
set -euo pipefail

git rev-parse --is-inside-work-tree >/dev/null

FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --force --tree-filter '
  for f in scripts/seed.mjs src/test/supabase.ts src/test/setup.ts; do
    [ -f "$f" ] && sed -i \
      -e "s/sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz/LOCAL_DEV_KEY_REMOVED/g" \
      -e "s/sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH/LOCAL_DEV_KEY_REMOVED/g" \
      "$f" || true
  done
  true
' -- --all

rm -rf .git/refs/original/ .git/logs/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo
echo "History rewritten. Now push:"
echo "  git push --force-with-lease origin main develop"
