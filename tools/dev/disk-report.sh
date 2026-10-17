#!/usr/bin/env bash
# tools/dev/disk-report.sh — where the repo's disk space is going. Read-only: deletes nothing.
#
#   tools/dev/disk-report.sh
cd "$(dirname "$0")/../.."

echo "Total repo: $(du -sh . 2>/dev/null | cut -f1)    .git: $(du -sh .git 2>/dev/null | cut -f1)"
echo
echo "Biggest top-level folders:"
du -sh -- */ 2>/dev/null | sort -rh | head -10 | sed 's/^/  /'
echo
echo "Biggest data/ folders (brain training output, level tests):"
du -sh data/*/ 2>/dev/null | sort -rh | head -10 | sed 's/^/  /'
echo
echo "Brain snapshot counts:"
for d in data/*/snapshots; do
  [ -d "$d" ] && printf '  %-34s %5s files  %s\n' "$d" "$(ls "$d" | wc -l | tr -d ' ')" "$(du -sh "$d" | cut -f1)"
done
echo
echo "Largest single files outside .git and node_modules:"
find . -type f -not -path './.git/*' -not -path '*/node_modules/*' -size +5M -exec du -h {} + 2>/dev/null \
  | sort -rh | head -12 | sed 's/^/  /'
echo
echo "Untracked files over 5 MB (not in git, easy to lose or to commit by accident):"
git ls-files --others --exclude-standard -z | xargs -0 -I{} find {} -maxdepth 0 -size +5M 2>/dev/null | head -12 | sed 's/^/  /'
