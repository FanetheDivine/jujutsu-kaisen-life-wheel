#!/bin/sh
# 一键同步到 GitHub：sh sync.sh "提交说明"
# 仓库：https://github.com/Solar-CV/jujutsu-kaisen-life-wheel
set -e
cd "$(dirname "$0")"
MSG=${1:-"chore: 同步更新"}
git add -A
if git diff --cached --quiet; then
  echo "没有需要提交的改动。"
  exit 0
fi
git commit -m "$MSG"
git push origin main
echo "已推送：$(git log -1 --oneline)"
