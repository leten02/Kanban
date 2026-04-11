# PRD — 팀 프로젝트 일정관리 툴

## 1. 제품 개요

Jira/GitHub Projects에 익숙하지 않은 소규모 팀(3명)을 위한 단순하고 직관적인 프로젝트 일정관리 웹 서비스.
칸반보드로 태스크를 시각화하고, WBS로 프로젝트 진행 상황을 계층적으로 모니터링한다.
GCS-PULSE와 연동해 회의실 예약, 실시간 알림을 처리한다.

---

## 2. 사용자

- 팀 구성: 3명 (GCS-PULSE에 등록된 팀원)
- 기술 숙련도: Jira/GitHub Projects 미숙
- 목표: 최소한의 학습으로 프로젝트 진행 상황 파악 및 협업

---

## 3. 핵심 기능

### 3.1 칸반보드

- 태스크를 상태(컬럼)별로 시각화
- 컬럼: `Todo` / `In Progress` / `In Review` / `Done`
- 태스크 카드: 제목, 담당자, 우선순위, 마감일 표시
- 드래그 앤 드롭으로 상태 변경
- 프로젝트별 보드 분리

### 3.2 WBS (Work Breakdown Structure)

- 3단계 계층 구조: **에픽 → 태스크 → 서브태스크**
- 에픽: 프로젝트의 대단위 목표
- 태스크: 칸반보드 카드와 동일한 엔티티 (WBS와 칸반보드가 같은 태스크를 공유)
- 서브태스크: 태스크 하위의 세부 작업 (완료 체크박스)
- 진행률 자동 계산 (완료된 서브태스크 / 전체 서브태스크)

### 3.3 회의실 예약

- GCS-PULSE에 등록된 회의실 목록 조회
- 날짜/시간 선택 후 예약
- 예약 완료 시 참석자 이메일로 Google Calendar 이벤트 자동 생성
- 예약 취소 시 Google Calendar 이벤트 동시 삭제
- 예약자 본인 Google 계정으로 이벤트 생성 (참석자는 캘린더 초대 수신)

### 3.4 실시간 알림

- GCS-PULSE SSE 스트림을 백엔드가 구독 후 프론트엔드로 relay
- 태스크 담당자 변경, 댓글 등 GCS-PULSE 알림 실시간 수신

---

### 3.5 CLI (Command Line Interface)

- 터미널에서 모든 API 기능을 명령어로 실행 가능
- 비개발자도 읽을 수 있는 plain English help 메시지
- 모든 API 엔드포인트에 1:1 대응하는 명령어 제공
- `kanban --help` 로 전체 명령어 목록 확인 가능
- 자세한 명령어 목록은 [CLI.md](CLI.md) 참조

---

## 4. 범위 외 (Out of Scope)

- 팀/멤버 관리 (GCS-PULSE에서 가져옴, 별도 구현 없음)
- WBS ↔ 스니펫 자동 연동
- 권한 관리 (팀원 전원 동등 권한)
- 모바일 앱

---

## 5. GCS-PULSE 연동 요약

| 기능 | GCS-PULSE 엔드포인트 | 방식 |
|------|---------------------|------|
| 팀/멤버 조회 | `GET /teams/me` | 서비스 계정 토큰 |
| 회의실 목록 | `GET /meeting-rooms` | 서비스 계정 토큰 |
| 회의실 예약 | `POST /meeting-rooms/{id}/reservations` | 서비스 계정 토큰 |
| 예약 취소 | `DELETE /meeting-rooms/reservations/{id}` | 서비스 계정 토큰 |
| 실시간 알림 | `GET /notifications/sse` | 서비스 계정 토큰, 백엔드 relay |

---

## 6. 비기능 요구사항

- 배포: Railway
- 응답 속도: 일반 CRUD 200ms 이내
- 동시 사용자: 최대 3명 (SQLite 적합 범위)
- API 문서: Swagger UI (FastAPI 내장) 자동 제공
