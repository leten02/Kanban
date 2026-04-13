#!/bin/bash
# Claude Code Stop hook — 작업 완료 시 칸반 보드 자동 등록
# - 코드 변경 있음  → done (완료)
# - 플랜 파일 생성  → todo (예정)

read -t 1 INPUT 2>/dev/null || true

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LAST_SYNC_FILE="$HOME/.kanban/.last-sync"

# default_epic_id 읽기
EPIC_ID=$(python3 -c "
import json, pathlib, sys
cfg = pathlib.Path.home() / '.kanban' / 'config.json'
if not cfg.exists(): sys.exit(0)
data = json.loads(cfg.read_text())
epic_id = data.get('default_epic_id')
if epic_id: print(epic_id)
" 2>/dev/null)

if [ -z "$EPIC_ID" ]; then
  exit 0  # 기본 에픽 미설정 → 종료
fi

# kanban CLI 경로 찾기
KANBAN_CMD=""
if [ -f "$PROJECT_DIR/backend/.venv/bin/kanban" ]; then
  KANBAN_CMD="$PROJECT_DIR/backend/.venv/bin/kanban"
elif command -v kanban &>/dev/null; then
  KANBAN_CMD="kanban"
else
  exit 0
fi

# ── 케이스 1: 코드 변경 있음 → done ──────────────────────────────────────
CHANGED=$(git -C "$PROJECT_DIR" diff HEAD --stat 2>/dev/null)
if [ -n "$CHANGED" ]; then
  $KANBAN_CMD sync run "$EPIC_ID" --status done 2>/dev/null
  date +%s > "$LAST_SYNC_FILE"
  exit 0
fi

# ── 케이스 2: 플랜 파일 새로 생성됨 → todo ───────────────────────────────
PLANS_DIR="$HOME/.claude/plans"
LAST_SYNC=0
if [ -f "$LAST_SYNC_FILE" ]; then
  LAST_SYNC=$(cat "$LAST_SYNC_FILE")
fi

NEW_PLAN=$(python3 -c "
import os, pathlib, time, sys

plans_dir = pathlib.Path.home() / '.claude' / 'plans'
last_sync = $LAST_SYNC
now = time.time()

if not plans_dir.exists():
    sys.exit(0)

# 최근 120초 내 생성된 플랜 파일 찾기
for f in sorted(plans_dir.glob('*.md'), key=lambda x: x.stat().st_mtime, reverse=True):
    mtime = f.stat().st_mtime
    if mtime > max(last_sync, now - 120):
        # 첫 줄에서 제목 추출
        try:
            lines = f.read_text().splitlines()
            for line in lines:
                line = line.strip()
                if line.startswith('# '):
                    print(line[2:].strip())
                    sys.exit(0)
        except Exception:
            pass
        print('새 구현 계획')
        sys.exit(0)
" 2>/dev/null)

if [ -n "$NEW_PLAN" ]; then
  $KANBAN_CMD sync run "$EPIC_ID" \
    --status todo \
    --title "계획: $NEW_PLAN" \
    --priority medium 2>/dev/null
  date +%s > "$LAST_SYNC_FILE"
  exit 0
fi

exit 0
