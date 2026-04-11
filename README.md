# Kanban

소규모 팀을 위한 프로젝트 일정관리 CLI 도구.  
칸반보드·WBS로 업무를 시각화하고, 회의실 예약과 실시간 알림을 터미널에서 처리한다.  
GCS-PULSE와 연동되며 Google Calendar 자동 연동을 지원한다.

---

## 설치

Python 3.11 이상이 필요하다.

```bash
pip install -e .
kanban --help   # 설치 확인
```

---

## 빠른 시작

### 1. 로그인

```bash
kanban login        # 브라우저에서 Google 계정으로 인증
kanban whoami       # 로그인 확인
```

### 2. 프로젝트 만들기

```bash
kanban project create --name "Mobile App" --description "iOS / Android 클라이언트"
kanban project list
```

### 3. 에픽 추가

에픽은 프로젝트 안의 대단위 목표 단위다 (WBS Level 1).

```bash
kanban epic create 1 --title "사용자 인증" --end-date 2026-05-01
kanban epic list 1
```

### 4. 태스크 추가 및 보드 이동

태스크는 칸반보드 카드와 동일한 엔티티다 (WBS Level 2).

```bash
kanban task create 1 --title "로그인 페이지 구현" --priority high
kanban task list 1
kanban task move 1 in_progress    # todo → in_progress
kanban task move 1 in_review
kanban task move 1 done
```

### 5. 서브태스크로 세분화

```bash
kanban subtask create 1 --title "UI 디자인"
kanban subtask create 1 --title "API 연동"
kanban subtask done 1               # 완료 체크
```

### 6. 회의실 예약

```bash
kanban room list                              # 예약 가능한 회의실 확인
kanban room reservations 1 2026-04-16        # 빈 시간대 확인
kanban room book 1 \
  --date 2026-04-16 --start 10:00 --end 11:00 \
  --purpose "주간 싱크" \
  --attendees "minho@gachon.ac.kr,sua@gachon.ac.kr"
```

Google Calendar 이벤트가 자동으로 생성되고 참석자에게 초대가 전송된다.

---

## 명령어 요약

### 인증

| 명령어 | 설명 |
|--------|------|
| `kanban login` | Google 계정으로 로그인 |
| `kanban logout` | 로그아웃 |
| `kanban whoami` | 현재 계정 확인 |

### 프로젝트

| 명령어 | 설명 |
|--------|------|
| `kanban project list` | 전체 프로젝트 목록 |
| `kanban project create` | 프로젝트 생성 |
| `kanban project show <id>` | 상세 조회 |
| `kanban project update <id>` | 이름·설명 수정 |
| `kanban project delete <id>` | 삭제 (하위 전체 삭제됨) |

### 에픽 (WBS Level 1)

| 명령어 | 설명 |
|--------|------|
| `kanban epic list <project-id>` | 에픽 목록 및 진행률 |
| `kanban epic create <project-id>` | 에픽 추가 |
| `kanban epic update <id>` | 수정 |
| `kanban epic delete <id>` | 삭제 |

### 태스크 (WBS Level 2 / 칸반 카드)

상태값: `todo` → `in_progress` → `in_review` → `done`

| 명령어 | 설명 |
|--------|------|
| `kanban task list <project-id>` | 태스크 목록 (칸반 뷰) |
| `kanban task create <epic-id>` | 태스크 추가 |
| `kanban task update <id>` | 수정 |
| `kanban task move <id> <status>` | 칸반 보드 컬럼 이동 |
| `kanban task delete <id>` | 삭제 |

### 서브태스크 (WBS Level 3)

| 명령어 | 설명 |
|--------|------|
| `kanban subtask list <task-id>` | 서브태스크 목록 |
| `kanban subtask create <task-id>` | 추가 |
| `kanban subtask update <id>` | 수정 |
| `kanban subtask done <id>` | 완료 처리 |
| `kanban subtask delete <id>` | 삭제 |

### 회의실

| 명령어 | 설명 |
|--------|------|
| `kanban room list` | 예약 가능한 회의실 목록 |
| `kanban room reservations <room-id> <date>` | 날짜별 예약 현황 |
| `kanban room book <room-id>` | 예약 + Google Calendar 이벤트 생성 |
| `kanban room cancel <reservation-id>` | 예약 취소 |

### 팀 / 알림

| 명령어 | 설명 |
|--------|------|
| `kanban team show` | 팀원 목록 |
| `kanban notify list` | 최근 알림 목록 |
| `kanban notify read <id>` | 알림 읽음 처리 |
| `kanban notify stream` | 실시간 알림 수신 (Ctrl+C로 종료) |

> 각 명령어의 상세 옵션: `kanban <명령어> --help`  
> 전체 레퍼런스: [docs/CLI.md](docs/CLI.md)

---

## 문서

| 문서 | 내용 |
|------|------|
| [docs/CLI.md](docs/CLI.md) | 전체 CLI 명령어 레퍼런스 |
| [docs/PRD.md](docs/PRD.md) | 제품 요구사항 정의서 |
| [docs/TSD.md](docs/TSD.md) | 기술 설계 문서 |
| [docs/DATABASE.md](docs/DATABASE.md) | 데이터베이스 스키마 |
