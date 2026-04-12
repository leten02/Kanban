# DATABASE.md — 데이터베이스 설계

## 1. 개요

- **DBMS**: SQLite
- **ORM**: SQLAlchemy 2.x (async, aiosqlite)
- **파일 경로**: `./kanban.db`

팀/멤버 데이터는 1000school(GCS-PULSE)에서 실시간 조회하므로 로컬 DB에 저장하지 않는다.
단, 프로젝트별 멤버 목록(담당자 지정, 권한 관리용)은 `project_members` 테이블에 캐싱한다.
`users` 테이블은 Google OAuth 인증 정보와 1000school API 토큰만 보관한다.

---

## 2. ERD (개념)

```
users
  │
  ├──(created_by)── projects ──── project_members
  │                    │
  │                    ├── epics
  │                    │      │
  │                    │      └── tasks ──── subtasks
  │                    │              │
  │                    │              ├── task_tags
  │                    │              └── task_comments
  │                    │
  │                    └── (tasks는 project에도 직접 연결)
  │
  └──(user via 1000school)── meeting_reservations
```

---

## 3. 테이블 정의

### 3.1 users

Google OAuth로 로그인한 유저 정보.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| google_id | TEXT | UNIQUE, NOT NULL | Google sub claim |
| email | TEXT | UNIQUE, NOT NULL | Google 이메일 |
| name | TEXT | NOT NULL | 표시 이름 |
| picture | TEXT | NULL | 프로필 이미지 URL |
| google_refresh_token | TEXT | NULL | Calendar API용 (암호화 저장) |
| school_api_token | TEXT | NULL | 1000school API 토큰 |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    picture TEXT,
    google_refresh_token TEXT,
    school_api_token TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.2 projects

팀이 관리하는 프로젝트.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| name | TEXT | NOT NULL | 프로젝트명 |
| description | TEXT | NULL | 설명 |
| created_by_user_id | INTEGER | FK(users.id) | 생성자 |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.3 project_members

프로젝트별 멤버 캐시 (1000school 팀원 동기화 결과).

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| project_id | INTEGER | FK(projects.id), NOT NULL | |
| school_user_id | INTEGER | NOT NULL | 1000school 사용자 ID |
| name | TEXT | NOT NULL | 이름 |
| email | TEXT | NOT NULL | 이메일 |
| picture | TEXT | NULL | 프로필 이미지 URL |
| role | TEXT | NOT NULL, default 'member' | admin / member |
| created_at | DATETIME | NOT NULL, default now | |

UNIQUE(project_id, school_user_id)

```sql
CREATE TABLE project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    school_user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    picture TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, school_user_id)
);
```

---

### 3.4 epics

WBS Level 1. 프로젝트의 대단위 목표.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| project_id | INTEGER | FK(projects.id), NOT NULL | |
| title | TEXT | NOT NULL | 에픽명 |
| description | TEXT | NULL | |
| status | TEXT | NOT NULL, default 'todo' | todo / in_progress / done |
| start_date | DATE | NULL | 계획 시작일 |
| end_date | DATE | NULL | 계획 종료일 |
| display_order | INTEGER | NOT NULL, default 0 | 정렬 순서 |
| created_by_user_id | INTEGER | FK(users.id) | |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE epics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
    start_date DATE,
    end_date DATE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.5 tasks

WBS Level 2이자 칸반보드 카드. 에픽에 속하며 칸반 상태를 갖는다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| epic_id | INTEGER | FK(epics.id), NOT NULL | 소속 에픽 |
| project_id | INTEGER | FK(projects.id), NOT NULL | 빠른 조회용 |
| title | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| status | TEXT | NOT NULL, default 'todo' | todo / in_progress / in_review / done |
| priority | TEXT | NOT NULL, default 'medium' | low / medium / high |
| assignee_user_id | INTEGER | FK(users.id), NULL | 로그인 유저 담당자 |
| assignee_member_id | INTEGER | FK(project_members.id), NULL | 팀 멤버 담당자 |
| assignee_name | TEXT | NULL | 담당자 표시 이름 |
| start_date | DATE | NULL | |
| due_date | DATE | NULL | 마감일 (D-day 배지 표시) |
| display_order | INTEGER | NOT NULL, default 0 | 칸반 컬럼 내 순서 |
| created_by_user_id | INTEGER | FK(users.id) | |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epic_id INTEGER NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo'
        CHECK(status IN ('todo','in_progress','in_review','done')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('low','medium','high')),
    assignee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assignee_member_id INTEGER REFERENCES project_members(id) ON DELETE SET NULL,
    assignee_name TEXT,
    start_date DATE,
    due_date DATE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.6 subtasks

WBS Level 3. 태스크 하위 세부 작업 (체크리스트).

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| task_id | INTEGER | FK(tasks.id), NOT NULL | |
| title | TEXT | NOT NULL | |
| is_completed | BOOLEAN | NOT NULL, default false | |
| assignee_user_id | INTEGER | FK(users.id), NULL | |
| display_order | INTEGER | NOT NULL, default 0 | |
| created_by_user_id | INTEGER | FK(users.id) | |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT 0,
    assignee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.7 task_tags

태스크에 붙은 태그. 태스크당 동일 태그는 1회만 허용.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| task_id | INTEGER | FK(tasks.id), NOT NULL | |
| tag | TEXT | NOT NULL | 태그 문자열 |

UNIQUE(task_id, tag)

```sql
CREATE TABLE task_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    UNIQUE(task_id, tag)
);
```

---

### 3.8 task_comments

태스크에 달린 댓글.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| task_id | INTEGER | FK(tasks.id), NOT NULL | |
| author_user_id | INTEGER | FK(users.id), NULL | 작성자 (탈퇴 시 NULL) |
| author_name | TEXT | NOT NULL | 작성 당시 이름 (스냅샷) |
| content | TEXT | NOT NULL | 댓글 내용 |
| created_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.9 meeting_reservations

1000school 예약 + Google Calendar 이벤트 연결 정보.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| gcs_reservation_id | INTEGER | UNIQUE, NOT NULL | 1000school 예약 ID |
| gcs_room_id | INTEGER | NOT NULL | 1000school 회의실 ID |
| reserved_by_user_id | INTEGER | FK(users.id), NOT NULL | 예약자 |
| start_at | DATETIME | NOT NULL | |
| end_at | DATETIME | NOT NULL | |
| purpose | TEXT | NULL | 예약 목적 |
| attendee_emails | TEXT | NULL | JSON 배열로 저장 |
| google_calendar_event_id | TEXT | NULL | Calendar 이벤트 삭제에 사용 |
| created_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE meeting_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gcs_reservation_id INTEGER UNIQUE NOT NULL,
    gcs_room_id INTEGER NOT NULL,
    reserved_by_user_id INTEGER NOT NULL REFERENCES users(id),
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    purpose TEXT,
    attendee_emails TEXT,           -- JSON: ["a@b.com", "c@d.com"]
    google_calendar_event_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. 인덱스

```sql
-- 프로젝트별 에픽 조회
CREATE INDEX idx_epics_project_id ON epics(project_id);

-- 에픽별 태스크 조회 (WBS)
CREATE INDEX idx_tasks_epic_id ON tasks(epic_id);

-- 프로젝트별 태스크 조회 (칸반보드)
CREATE INDEX idx_tasks_project_id_status ON tasks(project_id, status);

-- 태스크별 서브태스크 조회
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);

-- 태스크별 태그 조회
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);

-- 태스크별 댓글 조회
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);

-- 프로젝트 멤버 조회
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
```

---

## 5. 진행률 계산 로직

### 태스크 진행률
```
task.progress = 완료된 서브태스크 수 / 전체 서브태스크 수 * 100
(서브태스크 없으면: status == 'done' ? 100 : 0)
```

### 에픽 진행률
```
epic.progress = 완료된 태스크 수 / 전체 태스크 수 * 100
(태스크 없으면 0)
```

진행률은 DB에 저장하지 않고 API 응답 시 계산해서 반환한다.


## 1. 개요

- **DBMS**: SQLite
- **ORM**: SQLAlchemy 2.x (async)
- **마이그레이션**: Alembic
- **파일 경로**: `./kanban.db` (Railway Volume 마운트)

팀/멤버 데이터는 GCS-PULSE에서 실시간 조회하므로 로컬 DB에 저장하지 않는다.
`users` 테이블은 Google OAuth 인증 정보와 Calendar refresh_token만 보관한다.

---

## 2. ERD (개념)

```
users
  │
  ├──(created_by)── projects
  │                    │
  │                    ├── epics
  │                    │      │
  │                    │      └── tasks ──── subtasks
  │                    │
  │                    └── (tasks는 project에도 직접 연결)
  │
  └──(reserved_by)── meeting_reservations
```

---

## 3. 테이블 정의

### 3.1 users

Google OAuth로 로그인한 유저 정보.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| google_id | TEXT | UNIQUE, NOT NULL | Google sub claim |
| email | TEXT | UNIQUE, NOT NULL | Google 이메일 |
| name | TEXT | NOT NULL | 표시 이름 |
| picture | TEXT | NULL | 프로필 이미지 URL |
| google_refresh_token | TEXT | NULL | Calendar API용 (암호화 저장) |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    picture TEXT,
    google_refresh_token TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.2 projects

팀이 관리하는 프로젝트.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| name | TEXT | NOT NULL | 프로젝트명 |
| description | TEXT | NULL | 설명 |
| created_by_user_id | INTEGER | FK(users.id) | 생성자 |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.3 epics

WBS 1단계. 프로젝트의 대단위 목표.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| project_id | INTEGER | FK(projects.id), NOT NULL | |
| title | TEXT | NOT NULL | 에픽명 |
| description | TEXT | NULL | |
| status | TEXT | NOT NULL, default 'todo' | todo / in_progress / done |
| start_date | DATE | NULL | 계획 시작일 |
| end_date | DATE | NULL | 계획 종료일 |
| display_order | INTEGER | NOT NULL, default 0 | 정렬 순서 |
| created_by_user_id | INTEGER | FK(users.id) | |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE epics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
    start_date DATE,
    end_date DATE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.4 tasks

WBS 2단계이자 칸반보드 카드. 에픽에 속하며 칸반 상태를 갖는다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| epic_id | INTEGER | FK(epics.id), NOT NULL | 소속 에픽 |
| project_id | INTEGER | FK(projects.id), NOT NULL | 빠른 조회용 |
| title | TEXT | NOT NULL | |
| description | TEXT | NULL | |
| status | TEXT | NOT NULL, default 'todo' | todo / in_progress / in_review / done |
| priority | TEXT | NOT NULL, default 'medium' | low / medium / high |
| assignee_user_id | INTEGER | FK(users.id), NULL | 담당자 |
| start_date | DATE | NULL | |
| due_date | DATE | NULL | 마감일 |
| display_order | INTEGER | NOT NULL, default 0 | 칸반 컬럼 내 순서 |
| created_by_user_id | INTEGER | FK(users.id) | |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epic_id INTEGER NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo'
        CHECK(status IN ('todo','in_progress','in_review','done')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('low','medium','high')),
    assignee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    start_date DATE,
    due_date DATE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.5 subtasks

WBS 3단계. 태스크 하위 세부 작업.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| task_id | INTEGER | FK(tasks.id), NOT NULL | |
| title | TEXT | NOT NULL | |
| is_completed | BOOLEAN | NOT NULL, default false | |
| assignee_user_id | INTEGER | FK(users.id), NULL | |
| display_order | INTEGER | NOT NULL, default 0 | |
| created_by_user_id | INTEGER | FK(users.id) | |
| created_at | DATETIME | NOT NULL, default now | |
| updated_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT 0,
    assignee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.6 meeting_reservations

GCS-PULSE 예약 + Google Calendar 이벤트 연결 정보.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INTEGER | PK, autoincrement | |
| gcs_reservation_id | INTEGER | UNIQUE, NOT NULL | GCS-PULSE 예약 ID |
| gcs_room_id | INTEGER | NOT NULL | GCS-PULSE 회의실 ID |
| reserved_by_user_id | INTEGER | FK(users.id), NOT NULL | 예약자 |
| start_at | DATETIME | NOT NULL | |
| end_at | DATETIME | NOT NULL | |
| purpose | TEXT | NULL | 예약 목적 |
| attendee_emails | TEXT | NULL | JSON 배열로 저장 |
| google_calendar_event_id | TEXT | NULL | Calendar 이벤트 삭제에 사용 |
| created_at | DATETIME | NOT NULL, default now | |

```sql
CREATE TABLE meeting_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gcs_reservation_id INTEGER UNIQUE NOT NULL,
    gcs_room_id INTEGER NOT NULL,
    reserved_by_user_id INTEGER NOT NULL REFERENCES users(id),
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    purpose TEXT,
    attendee_emails TEXT,           -- JSON: ["a@b.com", "c@d.com"]
    google_calendar_event_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. 인덱스

```sql
-- 프로젝트별 에픽 조회
CREATE INDEX idx_epics_project_id ON epics(project_id);

-- 에픽별 태스크 조회 (WBS)
CREATE INDEX idx_tasks_epic_id ON tasks(epic_id);

-- 프로젝트별 태스크 조회 (칸반보드)
CREATE INDEX idx_tasks_project_id_status ON tasks(project_id, status);

-- 태스크별 서브태스크 조회
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);
```

---

## 5. 진행률 계산 로직

### 태스크 진행률
```
task.progress = 완료된 서브태스크 수 / 전체 서브태스크 수 * 100
(서브태스크 없으면: status == 'done' ? 100 : 0)
```

### 에픽 진행률
```
epic.progress = 완료된 태스크 수 / 전체 태스크 수 * 100
(태스크 없으면 0)
```

진행률은 DB에 저장하지 않고 API 응답 시 계산해서 반환한다.

---

## 6. 마이그레이션 관리

```bash
# 마이그레이션 파일 생성
alembic revision --autogenerate -m "create initial tables"

# 마이그레이션 적용
alembic upgrade head

# 롤백
alembic downgrade -1
```

`alembic/env.py`에서 SQLAlchemy 모델을 import해 자동감지(autogenerate) 사용.
