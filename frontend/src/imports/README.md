# Kanban CLI

> 소규모 팀을 위한 **터미널 기반 프로젝트 관리 도구**  
> 칸반보드·WBS로 업무를 시각화하고, 회의실 예약·Google Calendar 연동을 터미널 한 곳에서 처리한다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [아키텍처](#3-아키텍처)
4. [데이터 모델](#4-데이터-모델)
5. [설치 및 환경 설정](#5-설치-및-환경-설정)
6. [서버 실행](#6-서버-실행)
7. [빠른 시작 — 전체 흐름](#7-빠른-시작--전체-흐름)
8. [CLI 명령어 전체 레퍼런스](#8-cli-명령어-전체-레퍼런스)
9. [REST API 엔드포인트](#9-rest-api-엔드포인트)
10. [테스트](#10-테스트)
11. [문서](#11-문서)

---

## 1. 프로젝트 개요

Jira·GitHub Projects에 익숙하지 않은 **소규모 팀(3인)** 을 위해 설계된 CLI 프로젝트 관리 도구다.

| 기능 | 설명 |
|------|------|
| **칸반보드** | `todo → in_progress → in_review → done` 4단계 컬럼 |
| **WBS** | 프로젝트 → 에픽(Level 1) → 태스크(Level 2) → 서브태스크(Level 3) 3단계 계층 |
| **진행률 자동 계산** | 에픽: 완료 태스크 / 전체 태스크, 태스크: 완료 서브태스크 / 전체 서브태스크 |
| **회의실 예약** | GCS-PULSE 회의실 목록 조회 · 예약 · 취소 |
| **Google Calendar 연동** | 예약 시 참석자에게 캘린더 초대 자동 발송, 취소 시 이벤트 자동 삭제 |
| **팀 정보** | GCS-PULSE 팀 멤버 목록 조회 |
| **Google OAuth 2.0** | 브라우저 기반 로그인, CLI에 Bearer 토큰 저장 |

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| **언어** | Python 3.11+ |
| **백엔드 프레임워크** | FastAPI (비동기) |
| **ORM** | SQLAlchemy 2.x (async) |
| **데이터베이스** | SQLite (aiosqlite) |
| **인증** | Google OAuth 2.0 (authlib) · itsdangerous Bearer 토큰 |
| **CLI** | Typer · Rich |
| **외부 API** | GCS-PULSE REST API · Google Calendar API |
| **HTTP 클라이언트** | httpx (비동기) |
| **테스트** | pytest · pytest-asyncio · respx · pytest-mock |

---

## 3. 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                  터미널 (kanban CLI)                      │
│  Typer + Rich · ~/.kanban/config.json 에 토큰 저장        │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP + Bearer Token
                        ▼
┌─────────────────────────────────────────────────────────┐
│               FastAPI 백엔드 (localhost:8000)             │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  /auth   │  │/projects │  │  /tasks  │  │/rooms  │  │
│  │  /me     │  │  /epics  │  │/subtasks │  │/teams  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │              │              │             │       │
│  ┌────▼──────────────▼──────────────▼─────────────▼───┐  │
│  │         SQLAlchemy (async) + SQLite                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │  GCS-PULSE Proxy │    │  Google Calendar Service  │  │
│  │  /meeting-rooms  │    │  예약 시 이벤트 생성/삭제   │  │
│  │  /teams/me       │    │  참석자 초대 메일 자동 발송  │  │
│  └──────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
 ┌─────────────────┐       ┌──────────────────────┐
 │   GCS-PULSE API  │       │  Google OAuth / API   │
 │  api.1000.school │       │  accounts.google.com  │
 └─────────────────┘       └──────────────────────┘
```

### 인증 흐름

```
1. kanban login
      │
      ├─ 임시 HTTP 서버를 로컬 포트에 바인드 (callback 수신 대기)
      ├─ GET /auth/google/login?callback_port=<N> 호출
      ├─ 브라우저에서 Google 계정 선택
      └─ Google → 백엔드 /auth/google/callback → http://127.0.0.1:<N>/?token=<signed>
                                                         │
                                                         └─ ~/.kanban/config.json 저장

이후 모든 API 요청: Authorization: Bearer <itsdangerous-signed-user-id>
```

---

## 4. 데이터 모델

```
User
 └── Project (여러 개 소유)
       └── Epic  (WBS Level 1, progress % 자동 계산)
             └── Task  (WBS Level 2 / 칸반 카드)
                   └── Subtask  (WBS Level 3 / 체크리스트)

MeetingReservation  (gcs_reservation_id, google_calendar_event_id, attendee_emails)
```

- 상위 엔티티 삭제 시 하위 전체 **CASCADE 삭제**
- `Task.status`: `todo` / `in_progress` / `in_review` / `done`
- `Task.priority`: `low` / `medium` / `high`
- `MeetingReservation.attendee_emails`: JSON 배열을 문자열로 저장

---

## 5. 설치 및 환경 설정

### 요구사항

- Python **3.11** 이상
- pip 또는 가상환경

### 패키지 설치

```bash
git clone https://github.com/leten02/Kanban.git
cd Kanban
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

### 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 아래 값을 채운다:

```env
# 세션 보안 키 (랜덤 문자열)
SECRET_KEY=your-random-secret-key

# Google OAuth — Google Cloud Console에서 발급
# https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# GCS-PULSE 서비스 토큰
GCS_PULSE_TOKEN=your-gcs-pulse-token
GCS_PULSE_BASE_URL=https://api.1000.school
```

> **Google Cloud Console 설정 체크리스트**
> 1. OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
> 2. 승인된 리디렉션 URI: `http://localhost:8000/auth/google/callback`
> 3. OAuth 범위 추가: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar`

### CLI 서버 주소 설정

```bash
kanban config set-server http://localhost:8000
```

---

## 6. 서버 실행

```bash
# 개발 서버 (자동 재시작)
uvicorn app.main:app --reload --port 8000

# 백그라운드 실행
nohup uvicorn app.main:app --port 8000 &

# Swagger UI (API 문서)
open http://localhost:8000/docs
```

---

## 7. 빠른 시작 — 전체 흐름

아래 예시는 처음 사용할 때 전체 흐름을 순서대로 보여준다.

```bash
# ① 로그인
kanban login
kanban whoami
# → 이름: 홍길동  이메일: hong@gmail.com

# ② 프로젝트 생성
kanban project create --name "모바일 앱" --description "iOS/Android 클라이언트"
kanban project list
# ID  Name       Description
# 1   모바일 앱   iOS/Android 클라이언트

# ③ 에픽 추가 (WBS Level 1)
kanban epic create 1 --title "사용자 인증" --end-date 2026-05-01
kanban epic list 1
# ID  Title     Progress  End Date
# 1   사용자 인증  0%       2026-05-01

# ④ 태스크 추가 (WBS Level 2 / 칸반 카드)
kanban task create 1 --title "로그인 페이지 구현" --priority high
kanban task create 1 --title "회원가입 페이지 구현" --priority medium
kanban task list 1
# [TODO]
#   #1  로그인 페이지 구현   high
#   #2  회원가입 페이지 구현  medium

# ⑤ 칸반 보드 이동
kanban task move 1 in_progress
kanban task move 1 in_review
kanban task move 1 done

# ⑥ 서브태스크로 세분화 (WBS Level 3)
kanban subtask create 2 --title "UI 디자인"
kanban subtask create 2 --title "API 연동"
kanban subtask done 1            # 완료 처리 → 태스크 진행률 50%

# ⑦ 에픽 진행률 확인
kanban epic list 1
# ID  Title     Progress  End Date
# 1   사용자 인증  50%      2026-05-01

# ⑧ 팀 멤버 확인
kanban team show
# Team: 우리팀
# ID   Name    Email
# 10   Alice   alice@gachon.ac.kr
# 11   Bob     bob@gachon.ac.kr

# ⑨ 회의실 예약
kanban room list
kanban room reservations 1 2026-04-16
kanban room book 1 \
  --date 2026-04-16 --start 10:00 --end 11:00 \
  --purpose "주간 싱크" \
  --attendees "alice@gachon.ac.kr,bob@gachon.ac.kr"
# → Google Calendar 이벤트 생성 + 참석자 초대 메일 발송

# ⑩ 예약 취소
kanban room cancel <reservation-id>
# → GCS-PULSE 예약 취소 + Calendar 이벤트 삭제
```

---

## 8. CLI 명령어 전체 레퍼런스

> 각 명령어의 상세 옵션은 `kanban <명령어> --help` 참고

### 인증

```bash
kanban login              # 브라우저에서 Google 로그인 → 토큰 저장
kanban logout             # 로컬 토큰 삭제
kanban whoami             # 현재 로그인 계정 확인
```

### 프로젝트

```bash
kanban project list                                         # 전체 목록
kanban project create --name <이름> [--description <설명>]  # 생성
kanban project show <id>                                    # 상세 조회
kanban project update <id> [--name <이름>] [--description]  # 수정
kanban project delete <id>                                  # 삭제 (하위 전체 삭제)
```

### 에픽 (WBS Level 1)

```bash
kanban epic list <project-id>                               # 목록 + 진행률
kanban epic create <project-id> --title <제목> [--end-date YYYY-MM-DD]
kanban epic update <id> [--title <제목>] [--end-date]
kanban epic delete <id>
```

### 태스크 (WBS Level 2 / 칸반 카드)

```bash
kanban task list <project-id> [--status todo|in_progress|in_review|done]
kanban task create <epic-id> --title <제목> [--priority low|medium|high] [--assignee <email>] [--due-date YYYY-MM-DD]
kanban task update <id> [--title] [--priority] [--assignee] [--due-date]
kanban task move <id> todo|in_progress|in_review|done       # 칸반 컬럼 이동
kanban task delete <id>
```

상태 흐름: `todo` → `in_progress` → `in_review` → `done`

### 서브태스크 (WBS Level 3)

```bash
kanban subtask list <task-id>
kanban subtask create <task-id> --title <제목> [--assignee <email>]
kanban subtask update <id> [--title] [--assignee]
kanban subtask done <id>                                    # 완료 처리
kanban subtask delete <id>
```

### 회의실

```bash
kanban room list                                            # 예약 가능한 회의실 목록
kanban room reservations <room-id> <YYYY-MM-DD>            # 날짜별 예약 현황
kanban room book <room-id> \
  --date <YYYY-MM-DD> --start <HH:MM> --end <HH:MM> \
  --purpose <목적> \
  [--attendees <email1,email2,...>]                        # 예약 + Calendar 이벤트 생성
kanban room cancel <reservation-id>                        # 취소 + Calendar 이벤트 삭제
```

### 팀

```bash
kanban team show          # 팀 이름 + 멤버 목록 (GCS-PULSE 연동)
```

---

## 9. REST API 엔드포인트

서버 실행 후 **`http://localhost:8000/docs`** 에서 Swagger UI로 전체 API를 확인하고 직접 테스트할 수 있다.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/auth/google/login` | Google OAuth 리다이렉트 URL 반환 |
| `GET` | `/auth/google/callback` | OAuth 콜백 처리 · CLI 토큰 발급 |
| `GET` | `/auth/me` | 현재 유저 정보 |
| `POST` | `/auth/logout` | 로그아웃 |
| `GET` | `/projects` | 프로젝트 목록 |
| `POST` | `/projects` | 프로젝트 생성 |
| `GET` | `/projects/{id}` | 프로젝트 상세 |
| `PATCH` | `/projects/{id}` | 프로젝트 수정 |
| `DELETE` | `/projects/{id}` | 프로젝트 삭제 |
| `GET` | `/projects/{id}/epics` | 에픽 목록 (진행률 포함) |
| `POST` | `/projects/{id}/epics` | 에픽 생성 |
| `PATCH` | `/epics/{id}` | 에픽 수정 |
| `DELETE` | `/epics/{id}` | 에픽 삭제 |
| `GET` | `/projects/{id}/tasks` | 태스크 목록 |
| `POST` | `/epics/{id}/tasks` | 태스크 생성 |
| `PATCH` | `/tasks/{id}` | 태스크 수정 |
| `PATCH` | `/tasks/{id}/status` | 칸반 상태 변경 |
| `DELETE` | `/tasks/{id}` | 태스크 삭제 |
| `GET` | `/tasks/{id}/subtasks` | 서브태스크 목록 |
| `POST` | `/tasks/{id}/subtasks` | 서브태스크 생성 |
| `PATCH` | `/subtasks/{id}` | 서브태스크 수정·완료 |
| `DELETE` | `/subtasks/{id}` | 서브태스크 삭제 |
| `GET` | `/meeting-rooms` | 회의실 목록 (GCS-PULSE proxy) |
| `GET` | `/meeting-rooms/{id}/reservations` | 날짜별 예약 현황 |
| `POST` | `/meeting-rooms/{id}/reservations` | 예약 + Calendar 이벤트 생성 |
| `DELETE` | `/meeting-rooms/reservations/{id}` | 예약 취소 + Calendar 이벤트 삭제 |
| `GET` | `/teams/me` | 내 팀 정보 (GCS-PULSE proxy) |

---

## 10. 테스트

```bash
# 전체 테스트 실행
pytest

# 커버리지 포함
pytest --cov=app --cov=kanban

# 특정 모듈만
pytest tests/api/test_projects.py -v
pytest tests/api/test_rooms.py -v
```

**현재 테스트 현황: 129 tests, 0 failures**

| 테스트 파일 | 대상 |
|------------|------|
| `tests/api/test_projects.py` | 프로젝트 CRUD |
| `tests/api/test_epics.py` | 에픽 CRUD + 진행률 |
| `tests/api/test_tasks.py` | 태스크 CRUD + 상태 이동 |
| `tests/api/test_subtasks.py` | 서브태스크 CRUD + 완료 처리 |
| `tests/api/test_rooms.py` | 회의실 예약 (GCS-PULSE mock) |
| `tests/api/test_teams.py` | 팀 정보 조회 |
| `tests/cli/` | CLI 명령어 단위 테스트 (99개) |
| `tests/e2e/` | 인증 E2E 흐름 |

외부 의존성(GCS-PULSE, Google API)은 모두 `respx` / `pytest-mock`으로 격리한다.

---

## 11. 문서

| 문서 | 내용 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 제품 요구사항 정의서 |
| [docs/TSD.md](docs/TSD.md) | 기술 설계 문서 (아키텍처, 인증 설계, DB 스키마) |
| [docs/CLI.md](docs/CLI.md) | CLI 명령어 전체 레퍼런스 |
| [docs/DATABASE.md](docs/DATABASE.md) | 데이터베이스 ERD 및 스키마 설명 |
