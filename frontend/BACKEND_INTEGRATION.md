# 백엔드 API 연동 가이드

## 개요

이 프론트엔드는 FastAPI 기반 Kanban 백엔드와 완전히 통합되었습니다.

## 화면 구조

```
로그인 (Google OAuth)
  └─→ 프로젝트 대시보드
        └─→ 프로젝트 선택
              ├─→ 에픽 관리 (WBS Level 1)
              ├─→ 칸반 보드 (Task 관리)
              ├─→ 타임라인 뷰
              └─→ 회의실 예약
```

## 새로 추가된 화면

### 1. 로그인 화면 (`/components/Login.tsx`)
- Google OAuth 2.0 로그인
- 자동 토큰 처리 및 저장
- 로그인 성공 시 자동으로 메인 화면 이동

### 2. 프로젝트 대시보드 (`/components/ProjectDashboard.tsx`)
- 프로젝트 목록 조회
- 프로젝트 생성/수정/삭제
- 프로젝트 선택하여 메인 화면 진입

### 3. 에픽 관리 화면 (`/components/EpicManagement.tsx`)
- WBS Level 1 에픽 관리
- 에픽 생성/수정/삭제
- 자동 진행률 계산 (하위 태스크 기반)
- 프로그레스 바로 시각화

## API 엔드포인트 매핑

### 인증
- `GET /auth/google/login` - Google OAuth URL 받기
- `GET /auth/me` - 현재 사용자 정보
- `POST /auth/logout` - 로그아웃

### 프로젝트
- `GET /projects` - 프로젝트 목록
- `POST /projects` - 프로젝트 생성
- `GET /projects/{id}` - 프로젝트 조회
- `PATCH /projects/{id}` - 프로젝트 수정
- `DELETE /projects/{id}` - 프로젝트 삭제

### 에픽 (WBS Level 1)
- `GET /projects/{id}/epics` - 에픽 목록 + 진행률
- `POST /projects/{id}/epics` - 에픽 생성
- `PATCH /epics/{id}` - 에픽 수정
- `DELETE /epics/{id}` - 에픽 삭제

### 태스크 (칸반 카드)
- `GET /projects/{id}/tasks` - 태스크 목록
- `POST /epics/{id}/tasks` - 태스크 생성
- `PATCH /tasks/{id}` - 태스크 수정
- `PATCH /tasks/{id}/status` - 칸반 상태 변경
- `DELETE /tasks/{id}` - 태스크 삭제

### 서브태스크 (체크리스트)
- `GET /tasks/{id}/subtasks` - 서브태스크 목록
- `POST /tasks/{id}/subtasks` - 서브태스크 생성
- `PATCH /subtasks/{id}` - 서브태스크 수정
- `DELETE /subtasks/{id}` - 서브태스크 삭제

### 회의실 예약
- `GET /meeting-rooms` - 회의실 목록
- `GET /meeting-rooms/{id}/reservations` - 예약 현황
- `POST /meeting-rooms/{id}/reservations` - 예약 생성
- `DELETE /meeting-rooms/reservations/{id}` - 예약 취소

## 환경 설정

### 1. 환경 변수 파일 생성

```bash
cp .env.example .env
```

`.env` 파일 내용:
```env
VITE_API_URL=http://localhost:8000
```

### 2. 백엔드 서버 실행

```bash
cd Kanban
uvicorn app.main:app --reload --port 8000
```

### 3. 프론트엔드 개발 서버

Figma Make 환경에서는 자동으로 실행됩니다.

## 인증 플로우

1. 사용자가 "Google로 로그인" 버튼 클릭
2. `/auth/google/login` API 호출하여 Google OAuth URL 받음
3. Google 로그인 페이지로 리다이렉트
4. 로그인 성공 시 백엔드의 `/auth/google/callback`으로 리다이렉트
5. 백엔드가 Bearer 토큰 생성 후 프론트엔드로 전달 (`?token=...`)
6. 프론트엔드가 토큰을 localStorage에 저장
7. `/auth/me` API 호출하여 사용자 정보 가져오기
8. 메인 화면으로 이동

## 데이터 흐름

```
User 로그인
  ↓
프로젝트 선택
  ↓
Project (선택된 프로젝트)
  ↓
Epic (WBS Level 1) - 진행률 자동 계산
  ↓
Task (WBS Level 2 / 칸반 카드)
  ├─ 상태: todo → in_progress → in_review → done
  ├─ 우선순위: low / medium / high
  └─ Subtask (WBS Level 3 / 체크리스트)
```

## 주요 컨텍스트

### AuthContext
- 전역 인증 상태 관리
- 로그인/로그아웃 기능
- 자동 토큰 검증

### ProjectContext
- 선택된 프로젝트 상태 관리
- 프로젝트 전환 기능

## API 클라이언트 (`src/lib/api.ts`)

- Axios 기반 HTTP 클라이언트
- 자동 Bearer 토큰 인증
- 401 에러 시 자동 로그아웃 처리
- 모든 백엔드 API 엔드포인트 정의

## 다음 단계

현재는 프론트엔드 UI만 백엔드 구조에 맞춰 준비된 상태입니다.
실제 백엔드 API와 연동하려면:

1. 백엔드 서버를 실행하세요
2. `.env` 파일에서 `VITE_API_URL` 설정
3. Google Cloud Console에서 OAuth 클라이언트 ID 설정
4. 백엔드 `.env` 파일에 Google OAuth 정보 입력

## 백엔드와의 차이점

**백엔드 데이터 구조:**
- User → Project → Epic → Task → Subtask

**현재 프론트엔드 (Mock 데이터):**
- Task에 comments와 checklist를 프론트엔드에서 관리
- 백엔드에는 comments 기능이 없음 (필요시 백엔드에 추가 필요)
- Subtask = checklist로 매핑됨

**권장 사항:**
- 댓글 기능이 필요하면 백엔드에 comments 테이블 추가 요청
- 또는 프론트엔드에서만 임시로 localStorage에 저장
