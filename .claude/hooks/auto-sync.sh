#!/bin/bash
# Claude Code Stop hook — 작업 완료 시 칸반 보드 자동 등록
# 위치: .claude/hooks/auto-sync.sh

# stdin에서 Claude Code hook JSON 수신 (사용하지 않지만 읽어야 함)
read -t 1 INPUT 2>/dev/null || true

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# 변경된 파일이 있는지 확인
CHANGED=$(git -C "$PROJECT_DIR" diff HEAD --stat 2>/dev/null)
if [ -z "$CHANGED" ]; then
  exit 0  # 변경사항 없음 → 조용히 종료
fi

# default_epic_id 읽기
EPIC_ID=$(python3 -c "
import json, pathlib, sys
cfg = pathlib.Path.home() / '.kanban' / 'config.json'
if not cfg.exists():
    sys.exit(0)
data = json.loads(cfg.read_text())
epic_id = data.get('default_epic_id')
if epic_id:
    print(epic_id)
" 2>/dev/null)

if [ -z "$EPIC_ID" ]; then
  exit 0  # 기본 에픽 미설정 → 조용히 종료
fi

# kanban CLI 경로 찾기 (venv 우선)
KANBAN_CMD=""
if [ -f "$PROJECT_DIR/backend/.venv/bin/kanban" ]; then
  KANBAN_CMD="$PROJECT_DIR/backend/.venv/bin/kanban"
elif command -v kanban &>/dev/null; then
  KANBAN_CMD="kanban"
else
  exit 0  # kanban CLI 없음 → 조용히 종료
fi

# 칸반 보드에 자동 등록
$KANBAN_CMD sync run "$EPIC_ID" 2>/dev/null

exit 0
