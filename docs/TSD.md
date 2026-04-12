# TSD — 기술 설계 문서

## 1. 기술 스택

### 백엔드

| 영역 | 기술 |
|------|------|
| 언어 | Python 3.12 |
| 프레임워크 | FastAPI |
| ORM | SQLAlchemy 2.x (async, asyncpg) |
| DB | PostgreSQL (Railway managed) |
| 인증 | Google OAuth 2.0 (authlib) + itsdangerous Bearer 토큰 |
| API 문서 | Swagger UI (`/docs`) |
| 외부 API | 1000school(GCS-PULSE) REST API, Google Calendar API |
| 배포 | Railway |

### 프론트엔드

| 영역 | 기술 |
|------|------|
| 언어 | TypeScript |
| 프레임워크 | React 18 |
| 빌드 | Vite + npm |
| 스타일 | Tailwind CSS |
| UI 컴포넌트 | shadcn/ui (Radix UI 기반) |
| 아이콘 | lucide-react |
| HTTP 클라이언트 | axios |
| D&D | @dnd-kit |
| 토스트 알림 | sonner |
| 배포 | Vercel |

---

## 2. 아키텍처 개요

```
브라우저 (React + Vite)
      │ HTTP + Bearer Token
      ▼
FastAPI 백엔드 (Railway · https://1000school-kanban.up.railway.app)
      ├── Google OAuth 2.0 인증
      ├── PostgreSQL (Railway managed)
      ├── 1000school REST API 프록시 (팀 멤버, 회의실)
      └── Google Calendar API (예약 시 이벤트 생성/삭제)
              │
              └── 1000school API (api.1000.school)
              └── Google APIs (accounts.google.com)
```

---

## 3. 인증 설계

### 3.1 Google OAuth 흐름

```
1. 프론트 → GET /auth/google/login?callback_url={frontend_url}
2. 백엔드 → Google OAuth 리다이렉트 (scope: openid, email, profile, calendar)
3. Google → GET /auth/google/callback (code + state)
4. 백엔드 → access_token + refresh_token 획득
5. 백엔드 → DB에 refresh_token 저장 (Fernet 암호화)
6. 백엔드 → Bearer 토큰 발급 → 프론트 리다이렉트 (?token=xxx)
7. 프론트 → localStorage에 token 저장
```

- `calendar` scope를 로그인 시 동시 요청 → 별도 Calendar 인증 불필요
- 이후 모든 API 요청: `Authorization: Bearer <itsdangerous-signed-user-id>`
- Railway는 stateless이므로 세션 대신 Bearer 토큰 사용 (MismatchingStateError 우회 처리)

### 3.2 1000school API 토큰

- 사용자가 설정 페이지에서 직접 입력
- `users.school_api_token`에 저장
- 회의실/팀 멤버 API 호출 시 `Authorization: Bearer {school_api_token}` 헤더 첨부
- 회의실 API는 서비스 공용 토큰(`GCS_PULSE_TOKEN`)으로 프록시

---

## 4. 디렉토리 구조

```
backend/app/
├── main.py                      # FastAPI 앱 진입점, 라우터 등록
├── core/
│   ├── config.py                # 환경변수 설정 (pydantic-settings)
│   ├── database.py              # SQLAlchemy async 세션 (asyncpg)
│   └── security.py              # 토큰 암호화 유틸 (itsdangerous + Fernet)
├── models/                      # SQLAlchemy ORM 모델
│   ├── user.py
│   ├── project.py
│   ├── project_member.py        # 1000school 팀 멤버 캐시
│   ├── epic.py
│   ├── task.py
│   ├── subtask.py
│   ├── task_tag.py              # 태스크 태그
│   ├── task_comment.py          # 태스크 댓글
│   └── meeting_reservation.py
├── schemas/                     # Pydantic 스키마 (요청/응답)
│   ├── user.py
│   ├── project.py
│   ├── epic.py
│   ├── task.py                  # start_date 필드 포함
│   └── subtask.py
├── routers/                     # API 라우터
│   ├── auth.py                  # Google OAuth + 1000school 토큰 연결
│   ├── projects.py
│   ├── epics.py
│   ├── tasks.py                 # + 댓글 엔드포인트
│   ├── subtasks.py
│   ├── meeting_rooms.py         # 1000school proxy + 내 예약
│   ├── teams.py                 # 1000school 팀 proxy
│   └── project_members.py      # 멤버 동기화, 담당자 제안, 태그 조회
├── crud/                        # DB CRUD 헬퍼
│   ├── projects.py
│   ├── epics.py
│   ├── tasks.py
│   └── subtasks.py
├── services/
│   ├── google_calendar.py       # Google Calendar API 클라이언트
│   └── calendar.py
└── dependencies.py              # 공통 의존성 (현재 유저 등)

frontend/src/
├── main.tsx                     # React 앱 진입점 + Toaster(sonner) 등록
├── contexts/
│   ├── AuthContext.tsx           # Google OAuth 상태 관리
│   └── ProjectContext.tsx        # 프로젝트 전역 상태
├── components/
│   └── Login.tsx                # Google 로그인 페이지
├── lib/
│   ├── api.ts                   # axios 클라이언트 + API 함수 전체
│   └── avatarUtils.ts           # 아바타 색상 유틸
└── app/
    ├── App.tsx                  # 라우팅, 상태, 뷰 전환 루트
    └── components/
        ├── KanbanBoard.tsx       # 칸반 보드 (반응형 그리드, 필터)
        ├── KanbanColumn.tsx      # 칸반 컬럼
        ├── TaskCard.tsx          # 칸반 카드 + D-day 배지
        ├── TaskDetailModal.tsx   # 태스크 상세 모달 (댓글·서브태스크·담당자·태그)
        ├── BoardFilterBar.tsx    # 보드 필터 바 (검색·담당자·우선순위·태그)
        ├── AddTaskModal.tsx      # 새 태스크 생성 모달 (중복 제출 방지)
        ├── AssigneePicker.tsx    # 담당자 선택 컴포넌트
        ├── TagPicker.tsx         # 태그 자동완성 컴포넌트
        ├── RoomReservation.tsx   # 회의실 예약 (타임테이블·내 예약)
        ├── TimelineView.tsx      # 타임라인 / Gantt 차트
        ├── ProjectStats.tsx      # 프로젝트 통계
        ├── SettingsPage.tsx      # 설정 (멤버·Calendar·API 토큰)
        └── ui/                  # shadcn/ui 컴포넌트
```

---

## 5. API 엔드포인트 설계

### 인증
| Method | Path | 설명 |
|--------|------|------|
| GET | `/auth/google/login` | Google OAuth 리다이렉트 URL 반환 |
| GET | `/auth/google/callback` | OAuth 콜백 처리 · Bearer 토큰 발급 |
| POST | `/auth/logout` | 로그아웃 |
| GET | `/auth/me` | 현재 로그인 유저 정보 |
| POST | `/auth/1000school/link` | 1000school API 토큰 연결 |

### 프로젝트
| Method | Path | 설명 |
|--------|------|------|
| GET | `/projects` | 프로젝트 목록 |
| POST | `/projects` | 프로젝트 생성 |
| GET | `/projects/{id}` | 프로젝트 상세 |
| PATCH | `/projects/{id}` | 프로젝트 수정 |
| DELETE | `/projects/{id}` | 프로젝트 삭제 |

### 프로젝트 멤버
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/projects/{id}/members` | 프로젝트 멤버 목록 |
| POST | `/api/projects/{id}/members/sync` | 1000school 팀 → 멤버 동기화 |
| PATCH | `/api/projects/{id}/members/{mid}` | 멤버 역할 변경 |
| DELETE | `/api/projects/{id}/members/{mid}` | 멤버 제거 |
| GET | `/api/projects/{id}/assignee-suggestions` | 담당자 제안 (최근 지정 빈도순) |
| GET | `/api/projects/{id}/tags` | 프로젝트 내 태그 목록 (자동완성용) |

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
| PATCH | `/tasks/{id}` | 태스크 수정 (담당자·태그·우선순위·시작일·마감일 등) |
| PATCH | `/tasks/{id}/status` | 칸반 상태 변경 |
| DELETE | `/tasks/{id}` | 태스크 삭제 |
| GET | `/tasks/{id}/comments` | 댓글 목록 |
| POST | `/tasks/{id}/comments` | 댓글 작성 |
| DELETE | `/tasks/comments/{cid}` | 댓글 삭제 (본인만) |

### 서브태스크 (WBS Level 3)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/tasks/{id}/subtasks` | 서브태스크 목록 |
| POST | `/tasks/{id}/subtasks` | 서브태스크 생성 |
| PATCH | `/subtasks/{id}` | 서브태스크 수정·완료 처리 |
| DELETE | `/subtasks/{id}` | 서브태스크 삭제 |

### 회의실 (1000school proxy + Google Calendar)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/meeting-rooms` | 회의실 목록 |
| GET | `/api/meeting-rooms/{id}/reservations` | 날짜별 예약 현황 |
| POST | `/api/meeting-rooms/{id}/reservations` | 예약 생성 + Calendar 이벤트 |
| DELETE | `/api/meeting-rooms/reservations/{id}` | 예약 취소 + Calendar 이벤트 삭제 |
| GET | `/api/meeting-rooms/my-reservations` | 오늘 이후 내 예약 목록 |

### 팀 (1000school proxy)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/teams/me` | 내 팀 정보 + 멤버 목록 |

---

## 6. 회의실 예약 흐름

```
1. 프론트 → POST /api/meeting-rooms/{id}/reservations
   body: { start_at, end_at, purpose, attendee_emails[], room_name?, room_location? }

2. 백엔드:
   a. 1000school POST /meeting-rooms/{id}/reservations 호출
      → reservation_id 획득
   b. 예약자의 Google refresh_token으로 Calendar API 호출 (non-fatal)
      → 이벤트 생성 (attendees에 이메일 추가)
      → Calendar 실패해도 예약 자체는 성공으로 반환

3. 프론트 → 성공 응답 + 타임테이블 즉시 갱신
```

---

## 7. 환경변수

백엔드 (Railway 환경변수 또는 로컬 `.env`):

```env
# DB
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

# 앱 보안 키
SECRET_KEY=your-random-secret-key
ENCRYPTION_KEY=base64-fernet-key    # 토큰 암호화용

# Google OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=https://1000school-kanban.up.railway.app/auth/google/callback

# 1000school
GCS_PULSE_TOKEN=                    # 서비스 계정 토큰
GCS_PULSE_BASE_URL=https://api.1000.school
```

프론트엔드 (Vercel 환경변수 또는 `frontend/.env`):

```env
VITE_API_URL=https://1000school-kanban.up.railway.app
```

---

## 8. 배포

| 대상 | 플랫폼 | URL |
|------|--------|-----|
| 백엔드 | Railway | https://1000school-kanban.up.railway.app |
| 프론트엔드 | Vercel | https://1000school-kanban.vercel.app |
| DB | Railway PostgreSQL | Railway 내부 네트워크 |

- DB 마이그레이션: Alembic 미사용, `create_all()`로 앱 시작 시 자동 생성
- HTTPS: Railway/Vercel이 자동 처리
- 백엔드 시작: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- 프론트엔드 빌드: `npm run build` → `dist/` Vercel 서빙
