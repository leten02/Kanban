# TSD — 기술 설계 문서

## 1. 기술 스택

| 영역 | 기술 |
|------|------|
| 언어 | Python 3.11+ |
| 프레임워크 | FastAPI |
| ORM | SQLAlchemy 2.x (async) |
| DB | SQLite |
| 마이그레이션 | Alembic |
| 인증 | Google OAuth 2.0 (authlib) |
| API 문서 | Swagger UI (FastAPI 내장) |
| 외부 API | GCS-PULSE REST API, Google Calendar API |
| 배포 | Railway |

---

## 2. 아키텍처 개요

```
프론트엔드 (Figma 디자인 기반)
    │
    ▼
FastAPI 백엔드 (Railway)
    ├── Google OAuth 2.0 인증
    ├── SQLite (SQLAlchemy)
    ├── GCS-PULSE REST API 클라이언트 (서비스 계정 토큰)
    ├── Google Calendar API 클라이언트 (유저 토큰)
    └── SSE relay endpoint
            │
            └── GCS-PULSE SSE 구독
```

---

## 3. 인증 설계

### 3.1 Google OAuth 흐름

```
1. 프론트 → GET /auth/google/login
2. 백엔드 → Google OAuth 리다이렉트 (scope: openid, email, profile, calendar)
3. Google → GET /auth/google/callback (code)
4. 백엔드 → access_token + refresh_token 획득
5. 백엔드 → DB에 refresh_token 저장 (암호화)
6. 백엔드 → 세션 쿠키 발급
```

- `calendar` scope를 로그인 시 동시 요청 → 별도 Calendar 인증 불필요
- refresh_token은 DB에 암호화 저장 (회의실 예약 시 Calendar API 호출에 사용)

### 3.2 GCS-PULSE 서비스 계정 토큰

- 환경변수 `GCS_PULSE_TOKEN`으로 관리
- 모든 GCS-PULSE API 호출 시 `Authorization: Bearer {GCS_PULSE_TOKEN}` 헤더 첨부
- 토큰은 코드에 하드코딩하지 않음

---

## 4. 디렉토리 구조

```
app/
├── main.py                  # FastAPI 앱 진입점
├── core/
│   ├── config.py            # 환경변수 설정 (pydantic-settings)
│   ├── database.py          # SQLAlchemy 세션
│   └── security.py          # 토큰 암호화 유틸
├── models/                  # SQLAlchemy 모델
│   ├── user.py
│   ├── project.py
│   ├── epic.py
│   ├── task.py
│   ├── subtask.py
│   └── meeting_reservation.py
├── schemas/                 # Pydantic 스키마 (요청/응답)
│   ├── user.py
│   ├── project.py
│   ├── epic.py
│   ├── task.py
│   ├── subtask.py
│   └── meeting_room.py
├── routers/                 # API 라우터
│   ├── auth.py              # Google OAuth
│   ├── projects.py
│   ├── epics.py
│   ├── tasks.py
│   ├── subtasks.py
│   ├── meeting_rooms.py
│   └── notifications.py     # SSE relay
├── services/                # 비즈니스 로직
│   ├── gcs_pulse.py         # GCS-PULSE API 클라이언트
│   ├── google_calendar.py   # Google Calendar API 클라이언트
│   └── sse_relay.py         # SSE 구독 및 relay
├── crud/                    # DB CRUD
│   ├── projects.py
│   ├── epics.py
│   ├── tasks.py
│   └── subtasks.py
└── dependencies.py          # 공통 의존성 (현재 유저 등)

alembic/                     # DB 마이그레이션
docs/                        # 설계 문서
.env                         # 환경변수 (git 제외)
```

---

## 5. API 엔드포인트 설계

### 인증
| Method | Path | 설명 |
|--------|------|------|
| GET | `/auth/google/login` | Google OAuth 로그인 시작 |
| GET | `/auth/google/callback` | OAuth 콜백 처리 |
| POST | `/auth/logout` | 로그아웃 (세션 삭제) |
| GET | `/auth/me` | 현재 로그인 유저 정보 |

### 프로젝트
| Method | Path | 설명 |
|--------|------|------|
| GET | `/projects` | 프로젝트 목록 |
| POST | `/projects` | 프로젝트 생성 |
| GET | `/projects/{id}` | 프로젝트 상세 |
| PATCH | `/projects/{id}` | 프로젝트 수정 |
| DELETE | `/projects/{id}` | 프로젝트 삭제 |

### 에픽 (WBS Level 1)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/projects/{id}/epics` | 에픽 목록 (진행률 포함) |
| POST | `/projects/{id}/epics` | 에픽 생성 |
| PATCH | `/epics/{id}` | 에픽 수정 |
| DELETE | `/epics/{id}` | 에픽 삭제 |

### 태스크 (WBS Level 2 / 칸반 카드)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/projects/{id}/tasks` | 태스크 목록 (칸반/WBS 공용) |
| POST | `/epics/{id}/tasks` | 태스크 생성 |
| PATCH | `/tasks/{id}` | 태스크 수정 (상태, 담당자 등) |
| PATCH | `/tasks/{id}/status` | 칸반 상태 변경 |
| DELETE | `/tasks/{id}` | 태스크 삭제 |

### 서브태스크 (WBS Level 3)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/tasks/{id}/subtasks` | 서브태스크 목록 |
| POST | `/tasks/{id}/subtasks` | 서브태스크 생성 |
| PATCH | `/subtasks/{id}` | 서브태스크 수정/완료 처리 |
| DELETE | `/subtasks/{id}` | 서브태스크 삭제 |

### 회의실 (GCS-PULSE proxy + Google Calendar)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/meeting-rooms` | 회의실 목록 (GCS-PULSE proxy) |
| GET | `/meeting-rooms/{id}/reservations` | 날짜별 예약 목록 |
| POST | `/meeting-rooms/{id}/reservations` | 예약 생성 + Calendar 이벤트 생성 |
| DELETE | `/meeting-rooms/reservations/{id}` | 예약 취소 + Calendar 이벤트 삭제 |

### 팀/멤버 (GCS-PULSE proxy)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/teams/me` | 내 팀 정보 + 멤버 목록 |

### 알림 (SSE relay)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/notifications/sse` | SSE 스트림 (GCS-PULSE relay) |
| GET | `/notifications` | 알림 목록 |
| PATCH | `/notifications/{id}/read` | 알림 읽음 처리 |

---

## 6. SSE Relay 설계

```
GCS-PULSE SSE ──subscribe──► 백엔드 SSE manager
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
               클라이언트1     클라이언트2     클라이언트3
```

- 백엔드 시작 시 GCS-PULSE `/notifications/sse`를 서비스 계정 토큰으로 구독 (background task)
- 수신된 이벤트를 연결된 모든 프론트 클라이언트에 broadcast
- 프론트 연결 끊김 시 자동 정리
- GCS-PULSE 연결 끊김 시 재연결 로직 (exponential backoff)

---

## 7. 회의실 예약 흐름

```
1. 프론트 → POST /meeting-rooms/{id}/reservations
   body: { start_at, end_at, purpose, attendee_emails[] }

2. 백엔드:
   a. GCS-PULSE POST /meeting-rooms/{id}/reservations 호출
      → gcs_reservation_id 획득
   b. 예약자의 Google refresh_token으로 Calendar API 호출
      → 이벤트 생성 (attendees에 이메일 추가)
      → google_calendar_event_id 획득
   c. 로컬 DB에 저장
      (gcs_reservation_id, google_calendar_event_id, attendee_emails)

3. 프론트 → 성공 응답 반환
```

---

## 8. 환경변수

```env
# GCS-PULSE
GCS_PULSE_TOKEN=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# 앱
SECRET_KEY=              # 세션/암호화 키
DATABASE_URL=sqlite+aiosqlite:///./kanban.db

# 배포
RAILWAY_ENVIRONMENT=production
```

---

## 9. 배포 (Railway)

- `Procfile` 또는 Railway `startCommand`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- SQLite 파일은 Railway Volume 마운트 (영속성 보장)
- 환경변수는 Railway 대시보드에서 설정
- HTTPS는 Railway가 자동 처리

---

## 10. CLI 설계

### 10.1 기술

| 항목 | 내용 |
|------|------|
| 라이브러리 | Typer (FastAPI와 동일 개발팀, Pydantic 기반) |
| 출력 포맷 | Rich (컬러 테이블, 진행 표시) |
| 설정 파일 | `~/.kanban/config.json` (서버 URL, 세션 토큰 저장) |
| 진입점 | `kanban` (pip install 후 전역 명령어) |

### 10.2 디렉토리 구조 추가

```
cli/
├── __init__.py
├── main.py          # Typer 앱 진입점, 모든 서브커맨드 등록
├── commands/
│   ├── auth.py      # login, logout, whoami
│   ├── projects.py  # project list/create/show/update/delete
│   ├── epics.py     # epic list/create/update/delete
│   ├── tasks.py     # task list/create/update/move/delete
│   ├── subtasks.py  # subtask list/create/update/done/delete
│   ├── rooms.py     # room list/reservations/book/cancel
│   ├── team.py      # team show
│   └── notify.py   # notify list/read/stream
├── client.py        # HTTP 클라이언트 (httpx), 인증 헤더 자동 첨부
└── config.py        # ~/.kanban/config.json 읽기/쓰기
```

### 10.3 모든 명령어 목록 (API 1:1 대응)

자세한 help 텍스트는 [CLI.md](CLI.md) 참조.

| CLI 명령어 | HTTP | 엔드포인트 |
|-----------|------|-----------|
| `kanban login` | GET | `/auth/google/login` |
| `kanban logout` | POST | `/auth/logout` |
| `kanban whoami` | GET | `/auth/me` |
| `kanban project list` | GET | `/projects` |
| `kanban project create` | POST | `/projects` |
| `kanban project show <id>` | GET | `/projects/{id}` |
| `kanban project update <id>` | PATCH | `/projects/{id}` |
| `kanban project delete <id>` | DELETE | `/projects/{id}` |
| `kanban epic list <project-id>` | GET | `/projects/{id}/epics` |
| `kanban epic create <project-id>` | POST | `/projects/{id}/epics` |
| `kanban epic update <id>` | PATCH | `/epics/{id}` |
| `kanban epic delete <id>` | DELETE | `/epics/{id}` |
| `kanban task list <project-id>` | GET | `/projects/{id}/tasks` |
| `kanban task create <epic-id>` | POST | `/epics/{id}/tasks` |
| `kanban task update <id>` | PATCH | `/tasks/{id}` |
| `kanban task move <id> <status>` | PATCH | `/tasks/{id}/status` |
| `kanban task delete <id>` | DELETE | `/tasks/{id}` |
| `kanban subtask list <task-id>` | GET | `/tasks/{id}/subtasks` |
| `kanban subtask create <task-id>` | POST | `/tasks/{id}/subtasks` |
| `kanban subtask update <id>` | PATCH | `/subtasks/{id}` |
| `kanban subtask done <id>` | PATCH | `/subtasks/{id}` |
| `kanban subtask delete <id>` | DELETE | `/subtasks/{id}` |
| `kanban room list` | GET | `/meeting-rooms` |
| `kanban room reservations <room-id> <date>` | GET | `/meeting-rooms/{id}/reservations` |
| `kanban room book <room-id>` | POST | `/meeting-rooms/{id}/reservations` |
| `kanban room cancel <reservation-id>` | DELETE | `/meeting-rooms/reservations/{id}` |
| `kanban team show` | GET | `/teams/me` |
| `kanban notify list` | GET | `/notifications` |
| `kanban notify read <id>` | PATCH | `/notifications/{id}/read` |
| `kanban notify stream` | GET | `/notifications/sse` |

---

## 11. 테스트 설계

### 11.1 기술

| 항목 | 내용 |
|------|------|
| 테스트 프레임워크 | pytest + pytest-asyncio |
| HTTP 테스트 | httpx AsyncClient (FastAPI TestClient) |
| CLI 테스트 | Typer CliRunner |
| DB | 테스트용 인메모리 SQLite (`:memory:`) |
| 외부 API 모킹 | pytest-mock / respx (GCS-PULSE, Google API) |
| 커버리지 | pytest-cov (목표: 80% 이상) |

### 11.2 테스트 디렉토리 구조

```
tests/
├── conftest.py              # DB 픽스처, 테스트 클라이언트, 모킹 설정
├── api/                     # API 엔드포인트 테스트
│   ├── test_auth.py
│   ├── test_projects.py
│   ├── test_epics.py
│   ├── test_tasks.py
│   ├── test_subtasks.py
│   ├── test_meeting_rooms.py
│   ├── test_team.py
│   └── test_notifications.py
└── cli/                     # CLI 명령어 테스트
    ├── test_cli_auth.py
    ├── test_cli_projects.py
    ├── test_cli_epics.py
    ├── test_cli_tasks.py
    ├── test_cli_subtasks.py
    ├── test_cli_rooms.py
    ├── test_cli_team.py
    └── test_cli_notify.py
```

### 11.3 테스트 커버리지 기준

모든 API 엔드포인트에 대해 아래 케이스를 포함한다.

| 케이스 | 설명 |
|--------|------|
| Happy path | 정상 입력 → 정상 응답 |
| Not found | 존재하지 않는 ID → 404 |
| Unauthenticated | 로그인 없이 접근 → 401 |
| Invalid input | 필수 필드 누락 → 422 |
| External API failure | GCS-PULSE / Google API 오류 → 적절한 에러 반환 |

CLI 테스트는 각 명령어가 올바른 API를 호출하는지, 출력 포맷이 올바른지 검증한다.
