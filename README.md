# Kanban Board

> 소규모 팀을 위한 **프로젝트 관리 웹 서비스**  
> 칸반보드·WBS로 업무를 시각화하고, 회의실 예약과 Google Calendar 연동을 한 곳에서 처리한다.

---

## 목차

1. [기능](#1-기능)
2. [기술 스택](#2-기술-스택)
3. [빠른 시작](#3-빠른-시작)
4. [환경변수](#4-환경변수)
5. [서버 실행](#5-서버-실행)
6. [화면 구성](#6-화면-구성)
7. [API 엔드포인트](#7-api-엔드포인트)
8. [문서](#8-문서)

---

## 1. 기능

| 기능 | 설명 |
|------|------|
| **칸반보드** | `Todo → In Progress → In Review → Done` 4단계 컬럼, 드래그 앤 드롭 |
| **보드 필터** | 텍스트 검색 · 담당자 · 우선순위 · 태그 필터 동시 적용 |
| **태스크 상세** | 담당자 · 태그 · 서브태스크 · 댓글 모두 DB 저장 |
| **D-day 배지** | 태스크 카드에 마감일 D-day 표시 (빨강/주황/회색) |
| **WBS** | 에픽(L1) → 태스크(L2) → 서브태스크(L3) 계층 + 진행률 자동 계산 |
| **타임라인** | 프로젝트 일정 Gantt 차트 뷰 |
| **회의실 예약** | 9시~24시 타임테이블, 슬롯 클릭으로 즉시 예약, 내 예약 목록 |
| **Google Calendar** | 예약 시 참석자 캘린더 초대 자동 발송, 취소 시 이벤트 삭제 |
| **팀 멤버** | 1000school 팀 멤버 자동 동기화, 담당자 지정 시 빈도순 제안 |

---

## 2. 기술 스택

### 백엔드
- **Python 3.11+** + **FastAPI** (async)
- **SQLAlchemy 2.x** (asyncpg) + **PostgreSQL** (Railway managed)
- **Google OAuth 2.0** (authlib)

### 프론트엔드
- **React 18** + **TypeScript** + **Vite** + **npm**
- **Tailwind CSS** + **shadcn/ui**
- **@dnd-kit** (드래그 앤 드롭)
- **sonner** (토스트 알림)

---

## 3. 빠른 시작

### 백엔드

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # 환경변수 설정 (4번 참고)
uvicorn app.main:app --reload --port 8000
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

---

## 4. 환경변수

`backend/.env` 파일:

```env
# DB
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

# 앱 보안 키 (랜덤 문자열)
SECRET_KEY=your-random-secret-key

# Google OAuth — Google Cloud Console에서 발급
# https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# 1000school
GCS_PULSE_BASE_URL=https://api.1000.school
GCS_PULSE_TOKEN=                # (선택) 서비스 계정 토큰
```

`frontend/.env` 파일 (선택):

```env
VITE_API_URL=http://localhost:8000
```

> **Google Cloud Console 체크리스트**
> 1. OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
> 2. 승인된 리디렉션 URI: `http://localhost:8000/auth/google/callback`
> 3. OAuth 범위: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar`

---

## 5. 서버 실행

```bash
# 백엔드 개발 서버 (자동 재시작)
cd backend
uvicorn app.main:app --reload --port 8000

# Swagger UI (API 전체 문서)
open http://localhost:8000/docs

# 프론트엔드 개발 서버
cd frontend
npm run dev
# → http://localhost:5173

# 프론트엔드 프로덕션 빌드
npm run build
```

---

## 6. 화면 구성

| 탭 | 설명 |
|----|------|
| **보드** | 칸반 보드 (기본 뷰). 컬럼 클릭으로 새 카드 즉시 생성 |
| **WBS** | 에픽 → 태스크 → 서브태스크 계층 구조 및 진행률 |
| **타임라인** | Gantt 차트로 일정 시각화 |
| **문서** | 프로젝트 관련 문서 첨부 |
| **회의실** | 날짜별 타임테이블 예약 + 내 예약 탭 |
| **설정** | 팀 멤버 관리, 1000school API 토큰, Google Calendar 연동 |

### 처음 사용 순서

```
1. Google 계정으로 로그인
2. 설정 → 1000school API 토큰 입력 → 팀 멤버 동기화
3. (선택) 설정 → Google Calendar 연결
4. 프로젝트 생성 → 에픽 추가 → 태스크 생성 → 보드에서 관리
```

---

## 7. API 엔드포인트

전체 API는 `http://localhost:8000/docs`에서 Swagger UI로 확인.

| 그룹 | 주요 경로 |
|------|-----------|
| 인증 | `GET /auth/google/login` · `GET /auth/me` |
| 프로젝트 | `GET /projects` · `POST /projects` |
| 멤버 | `POST /api/projects/{id}/members/sync` |
| 에픽 | `GET /projects/{id}/epics` |
| 태스크 | `GET /projects/{id}/tasks` · `PATCH /tasks/{id}` |
| 댓글 | `GET /tasks/{id}/comments` · `POST /tasks/{id}/comments` |
| 서브태스크 | `GET /tasks/{id}/subtasks` |
| 회의실 | `GET /api/meeting-rooms` · `POST /api/meeting-rooms/{id}/reservations` |
| 내 예약 | `GET /api/meeting-rooms/my-reservations` |
| 팀 | `GET /teams/me` |

자세한 요청/응답 스키마는 [docs/CLI.md](docs/CLI.md) 참조.

---

---

## 8. 라이브 배포

| 대상 | URL |
|------|-----|
| 프론트엔드 | https://1000school-kanban.vercel.app |
| 백엔드 API | https://1000school-kanban.up.railway.app |
| Swagger UI | https://1000school-kanban.up.railway.app/docs |

---

## 9. 문서

| 문서 | 내용 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 제품 요구사항 정의서 |
| [docs/TSD.md](docs/TSD.md) | 기술 설계 문서 (아키텍처, 디렉토리 구조, API 설계) |
| [docs/DATABASE.md](docs/DATABASE.md) | DB ERD 및 테이블 스키마 |
| [docs/CLI.md](docs/CLI.md) | REST API 엔드포인트 레퍼런스 |


> 소규모 팀을 위한 **터미널 기반 프로젝트 관리 도구**  
> 칸반보드·WBS로 업무를 시각화하고, 회의실 예약·Google Calendar 연동을 터미널 한 곳에서 처리한다.

---

# 발표 준비 완료 — 2026.04.13 20:43
