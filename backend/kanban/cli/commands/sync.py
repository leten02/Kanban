"""kanban sync — git 변경 내역을 칸반 보드에 자동 등록."""
from __future__ import annotations

import subprocess
import sys
from datetime import date
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from kanban.cli.client import get_client
from kanban.cli.main import app

console = Console()
sync_app = typer.Typer(help="Git 작업 내역을 칸반 보드에 자동 등록.")
app.add_typer(sync_app, name="sync")

# 파일 경로 패턴 → 카테고리 매핑
_CATEGORY_MAP = [
    (["backend/app/routers", "backend/app/crud", "backend/app/models"], "백엔드"),
    (["backend/app/schemas"], "백엔드"),
    (["frontend/src"], "프론트엔드"),
    (["backend/kanban/cli"], "CLI"),
    (["backend/tests"], "테스트"),
    (["backend/app/routers/auth", "backend/app/core/security"], "인증"),
    ([".claude", "CLAUDE.md"], "Claude 설정"),
    (["README", "docs/"], "문서"),
]

# 커밋 메시지 키워드 → 우선순위
_PRIORITY_KEYWORDS = {
    "high": ["fix", "bug", "hotfix", "urgent", "critical", "error", "fail", "broken"],
    "low": ["refactor", "chore", "docs", "style", "cleanup", "typo", "rename"],
}


def _run(cmd: str) -> str:
    """쉘 명령 실행 후 stdout 반환. 실패 시 빈 문자열."""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip()
    except Exception:
        return ""


def _detect_category(changed_files: list[str]) -> str:
    """변경된 파일 목록으로 카테고리 추론."""
    counts: dict[str, int] = {}
    for f in changed_files:
        for patterns, category in _CATEGORY_MAP:
            if any(p in f for p in patterns):
                counts[category] = counts.get(category, 0) + 1
                break
        else:
            counts["기타"] = counts.get("기타", 0) + 1

    if not counts:
        return "작업"
    return max(counts, key=lambda k: counts[k])


def _detect_priority(commit_msg: str) -> str:
    """커밋 메시지로 우선순위 추론."""
    msg_lower = commit_msg.lower()
    for priority, keywords in _PRIORITY_KEYWORDS.items():
        if any(kw in msg_lower for kw in keywords):
            return priority
    return "medium"


def _build_title(commit_msg: str, category: str, changed_files: list[str]) -> str:
    """태스크 제목 생성."""
    # 커밋 메시지가 있으면 그걸 기반으로
    if commit_msg and commit_msg not in ("HEAD", ""):
        # fix: / feat: / chore: 등 prefix 제거
        msg = commit_msg
        for prefix in ["fix:", "feat:", "chore:", "docs:", "refactor:", "style:", "test:"]:
            if msg.lower().startswith(prefix):
                msg = msg[len(prefix):].strip()
                break
        # 너무 길면 자르기
        if len(msg) > 40:
            msg = msg[:38] + "…"
        return msg

    # 커밋 없으면 카테고리 + 파일 수로
    return f"{category} 작업 ({len(changed_files)}개 파일 변경)"


def _build_description(
    commit_msg: str,
    changed_files: list[str],
    stat_output: str,
) -> str:
    """태스크 설명 생성."""
    lines = []
    if commit_msg:
        lines.append(f"커밋: {commit_msg}")
    if stat_output:
        # stat 출력에서 summary 줄만 추출 (마지막 줄)
        stat_lines = [l for l in stat_output.splitlines() if l.strip()]
        if stat_lines:
            lines.append(f"변경: {stat_lines[-1].strip()}")
    if changed_files:
        preview = ", ".join(changed_files[:3])
        if len(changed_files) > 3:
            preview += f" 외 {len(changed_files)-3}개"
        lines.append(f"파일: {preview}")
    lines.append(f"날짜: {date.today().isoformat()}")
    return " | ".join(lines)


@sync_app.command("run")
def run_sync(
    epic_id: int = typer.Argument(..., metavar="epic-id", help="등록할 에픽 ID"),
    title: Optional[str] = typer.Option(None, "--title", "-t", help="태스크 제목 (없으면 자동 생성)"),
    priority: Optional[str] = typer.Option(None, "--priority", "-p", help="우선순위: low/medium/high (없으면 자동 감지)"),
    dry_run: bool = typer.Option(False, "--dry-run", help="실제 등록 없이 미리보기"),
    commits: int = typer.Option(1, "--commits", "-n", help="분석할 최근 커밋 수 (기본 1)"),
):
    """
    최근 git 변경 내역을 분석해 칸반 보드에 태스크를 자동 등록합니다.

    예시:
      kanban sync run 3                  # epic 3에 자동 등록
      kanban sync run 3 --dry-run        # 미리보기만
      kanban sync run 3 --commits 3      # 최근 3커밋 분석
      kanban sync run 3 --title "기능 완료"
    """
    console.print("[bold blue]🔍 git 변경 내역 분석 중...[/bold blue]")

    # 1. git 정보 수집
    commit_msg = _run(f"git log --oneline -{commits} --format='%s' 2>/dev/null | head -1")
    commit_hash = _run("git rev-parse --short HEAD 2>/dev/null")
    changed_files_raw = _run(f"git diff HEAD~{commits} --name-only 2>/dev/null")
    stat_output = _run(f"git diff HEAD~{commits} --stat 2>/dev/null")

    # HEAD~n이 없을 경우 (커밋이 적을 때) staged 변경으로 fallback
    if not changed_files_raw:
        changed_files_raw = _run("git diff --cached --name-only 2>/dev/null")
        stat_output = _run("git diff --cached --stat 2>/dev/null")
        if not changed_files_raw:
            changed_files_raw = _run("git status --short 2>/dev/null")

    changed_files = [f.strip() for f in changed_files_raw.splitlines() if f.strip()]

    if not changed_files and not commit_msg:
        console.print("[yellow]⚠️  등록할 변경 내역이 없습니다.[/yellow]")
        raise typer.Exit(0)

    # 2. 자동 분석
    category = _detect_category(changed_files)
    auto_priority = priority or _detect_priority(commit_msg)
    auto_title = title or _build_title(commit_msg, category, changed_files)
    description = _build_description(commit_msg, changed_files, stat_output)

    # 3. 미리보기
    console.print()
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_row("[dim]제목[/dim]", f"[bold]{auto_title}[/bold]")
    table.add_row("[dim]에픽[/dim]", str(epic_id))
    table.add_row("[dim]카테고리[/dim]", category)
    table.add_row("[dim]우선순위[/dim]", auto_priority)
    table.add_row("[dim]커밋[/dim]", f"{commit_hash} {commit_msg}" if commit_hash else "없음")
    table.add_row("[dim]변경파일[/dim]", f"{len(changed_files)}개")
    console.print(Panel(table, title="[bold]📋 등록할 태스크[/bold]", border_style="blue"))

    if dry_run:
        console.print("[yellow]--dry-run 모드: 실제 등록을 건너뜁니다.[/yellow]")
        raise typer.Exit(0)

    # 4. 칸반 보드에 등록
    console.print("\n[bold]칸반 보드에 등록 중...[/bold]")
    client = get_client()

    payload = {
        "title": auto_title,
        "description": description,
        "priority": auto_priority,
    }
    task_data = client.post(f"/epics/{epic_id}/tasks", json=payload).json()
    task_id = task_data["id"]

    # 5. done 처리
    client.patch(f"/tasks/{task_id}/status", json={"status": "done"})

    console.print(f"\n[bold green]✅ 태스크 등록 완료![/bold green]")
    console.print(f"   ID: [bold]{task_id}[/bold]  제목: {auto_title}")
    console.print(f"   상태: done  우선순위: {auto_priority}")
    console.print(f"\n   🌐 [link=https://1000school-kanban.vercel.app]https://1000school-kanban.vercel.app[/link]")


@sync_app.command("preview")
def preview(
    commits: int = typer.Option(1, "--commits", "-n", help="분석할 최근 커밋 수"),
):
    """등록 없이 분석 결과만 미리봅니다. (= --dry-run 없이 빠르게 확인)"""
    commit_msg = _run(f"git log --oneline -{commits} --format='%s' 2>/dev/null | head -1")
    changed_files_raw = _run(f"git diff HEAD~{commits} --name-only 2>/dev/null")
    stat_output = _run(f"git diff HEAD~{commits} --stat 2>/dev/null")

    changed_files = [f.strip() for f in changed_files_raw.splitlines() if f.strip()]
    category = _detect_category(changed_files)

    console.print(f"\n[bold]커밋:[/bold] {commit_msg or '없음'}")
    console.print(f"[bold]카테고리:[/bold] {category}")
    console.print(f"[bold]우선순위:[/bold] {_detect_priority(commit_msg)}")
    console.print(f"[bold]변경 파일 ({len(changed_files)}개):[/bold]")
    for f in changed_files[:10]:
        console.print(f"  • {f}")
    if len(changed_files) > 10:
        console.print(f"  ... 외 {len(changed_files)-10}개")
    if stat_output:
        stat_summary = [l for l in stat_output.splitlines() if "changed" in l]
        if stat_summary:
            console.print(f"\n[dim]{stat_summary[0].strip()}[/dim]")
