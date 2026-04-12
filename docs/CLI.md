# API 레퍼런스

백엔드 실행 후 **`http://localhost:8000/docs`** 에서 Swagger UI로 전체 API를 확인하고 직접 테스트할 수 있다.

> **참고**: 아래 모든 엔드포인트는 `Authorization: Bearer <token>` 헤더 필요.
> 로그인 후 응답받은 토큰을 사용한다.

---

## 1. 인증

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/auth/google/login` | Google OAuth 리다이렉트 URL 반환 |
| `GET` | `/auth/google/callback` | OAuth 콜백 처리 · Bearer 토큰 발급 |
| `GET` | `/auth/me` | 현재 로그인 유저 정보 |
| `POST` | `/auth/logout` | 로그아웃 |
| `POST` | `/auth/1000school/link` | 1000school API 토큰 연결 |

---

## 2. 프로젝트

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/projects` | 프로젝트 목록 |
| `POST` | `/projects` | 프로젝트 생성 |
| `GET` | `/projects/{id}` | 프로젝트 상세 |
| `PATCH` | `/projects/{id}` | 프로젝트 수정 |
| `DELETE` | `/projects/{id}` | 프로젝트 삭제 (하위 전체 CASCADE) |

---

## 3. 프로젝트 멤버

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/projects/{id}/members` | 멤버 목록 |
| `POST` | `/api/projects/{id}/members/sync` | 1000school 팀원 동기화 |
| `PATCH` | `/api/projects/{id}/members/{mid}` | 역할 변경 (admin/member) |
| `DELETE` | `/api/projects/{id}/members/{mid}` | 멤버 제거 |
| `GET` | `/api/projects/{id}/assignee-suggestions` | 담당자 제안 (빈도순) |
| `GET` | `/api/projects/{id}/tags` | 프로젝트 내 사용된 태그 목록 |

---

## 4. 에픽 (WBS Level 1)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/projects/{id}/epics` | 에픽 목록 (진행률 포함) |
| `POST` | `/projects/{id}/epics` | 에픽 생성 |
| `PATCH` | `/epics/{id}` | 에픽 수정 |
| `DELETE` | `/epics/{id}` | 에픽 삭제 |

---

## 5. 태스크 (WBS Level 2 / 칸반 카드)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/projects/{id}/tasks` | 태스크 목록 |
| `POST` | `/epics/{id}/tasks` | 태스크 생성 |
| `PATCH` | `/tasks/{id}` | 태스크 수정 (제목·설명·담당자·우선순위·태그·마감일) |
| `PATCH` | `/tasks/{id}/status` | 칸반 상태 변경 |
| `DELETE` | `/tasks/{id}` | 태스크 삭제 |

---

## 6. 댓글

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/tasks/{id}/comments` | 댓글 목록 |
| `POST` | `/tasks/{id}/comments` | 댓글 작성 · body: `{ "content": "..." }` |
| `DELETE` | `/tasks/comments/{cid}` | 댓글 삭제 (본인만) |

---

## 7. 서브태스크 (WBS Level 3)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/tasks/{id}/subtasks` | 서브태스크 목록 |
| `POST` | `/tasks/{id}/subtasks` | 서브태스크 생성 |
| `PATCH` | `/subtasks/{id}` | 서브태스크 수정·완료 처리 |
| `DELETE` | `/subtasks/{id}` | 서브태스크 삭제 |

---

## 8. 회의실

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/meeting-rooms` | 회의실 목록 (1000school proxy) |
| `GET` | `/api/meeting-rooms/{id}/reservations` | 날짜별 예약 현황 · query: `date=YYYY-MM-DD` |
| `POST` | `/api/meeting-rooms/{id}/reservations` | 예약 생성 + Google Calendar 이벤트 |
| `DELETE` | `/api/meeting-rooms/reservations/{id}` | 예약 취소 + Calendar 이벤트 삭제 |
| `GET` | `/api/meeting-rooms/my-reservations` | 오늘 이후 내 예약 목록 |

**예약 생성 body 예시**:
```json
{
  "start_at": "2026-04-16T10:00:00",
  "end_at": "2026-04-16T11:00:00",
  "purpose": "주간 싱크",
  "attendee_emails": ["alice@gachon.ac.kr", "bob@gachon.ac.kr"]
}
```

---

## 9. 팀

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/teams/me` | 내 팀 정보 + 멤버 목록 (1000school proxy) |


`kanban` 명령어로 서버의 모든 기능을 터미널에서 실행할 수 있다.

```bash
kanban --help           # 전체 명령어 목록
kanban <명령어> --help   # 특정 명령어 상세 도움말
```

설치 방법은 [README.md](../README.md)를 참고한다.

---

## 1. 인증

### `kanban login`

```
Opens your browser to sign in with your Google account.
Once you sign in, the tool saves your session locally so you
stay logged in for future commands.

You only need to do this once. If your session expires,
just run this command again.

Usage:
  kanban login

Example:
  $ kanban login
  > Opening browser for Google sign-in...
  > Logged in as Jiyeon Park (jiyeon@gachon.ac.kr)
```

**API:** `GET /auth/google/login`

---

### `kanban logout`

```
Signs you out and removes your saved session from this computer.
After logging out, you will need to run 'kanban login' again
before using any other commands.

Usage:
  kanban logout

Example:
  $ kanban logout
  > You have been signed out.
```

**API:** `POST /auth/logout`

---

### `kanban whoami`

```
Shows the name and email address of the account you are
currently signed in with.

Useful to confirm you are using the right account before
making changes.

Usage:
  kanban whoami

Example:
  $ kanban whoami
  Name:  Jiyeon Park
  Email: jiyeon@gachon.ac.kr
```

**API:** `GET /auth/me`

---

## 2. 프로젝트

프로젝트는 모든 업무의 최상위 컨테이너다. 에픽·태스크·서브태스크는 모두 프로젝트에 속한다.

### `kanban project list`

```
Shows all projects that exist on the server.

Usage:
  kanban project list

Example:
  $ kanban project list
  ID  Name               Created
  1   Mobile App         2026-03-01
  2   Backend Redesign   2026-03-15
```

**API:** `GET /projects`

---

### `kanban project create`

```
Creates a new project. You will be asked for a name and an
optional short description.

Usage:
  kanban project create

Options:
  --name TEXT         The name of the project  [required]
  --description TEXT  A short description of what this project is about

Example:
  $ kanban project create --name "Mobile App" --description "iOS and Android client"
  > Project created! ID: 3
```

**API:** `POST /projects`

---

### `kanban project show <id>`

```
Shows the details of one project, including its name,
description, and when it was created.

Arguments:
  id    The numeric ID of the project (get this from 'kanban project list')

Usage:
  kanban project show <id>

Example:
  $ kanban project show 1
  ID:          1
  Name:        Mobile App
  Description: iOS and Android client
  Created:     2026-03-01
```

**API:** `GET /projects/{id}`

---

### `kanban project update <id>`

```
Changes the name or description of an existing project.
Only provide the fields you want to change — anything
you leave out will stay the same.

Arguments:
  id    The numeric ID of the project

Options:
  --name TEXT         New project name
  --description TEXT  New description

Usage:
  kanban project update <id> [--name TEXT] [--description TEXT]

Example:
  $ kanban project update 1 --name "Mobile App v2"
  > Project updated.
```

**API:** `PATCH /projects/{id}`

---

### `kanban project delete <id>`

```
Permanently deletes a project and everything inside it —
all epics, tasks, and subtasks. This cannot be undone.

You will be asked to confirm before anything is deleted.

Arguments:
  id    The numeric ID of the project

Usage:
  kanban project delete <id>

Example:
  $ kanban project delete 1
  > Are you sure you want to delete "Mobile App"? This will also delete
    all epics, tasks, and subtasks inside it. [y/N]: y
  > Project deleted.
```

**API:** `DELETE /projects/{id}`

---

## 3. 에픽

에픽은 프로젝트 안의 대단위 목표(WBS Level 1)다. 연관된 태스크를 하나의 챕터처럼 묶는다. 진행률은 내부 태스크 완료 현황을 바탕으로 자동 계산된다.

### `kanban epic list <project-id>`

```
Shows all epics in a project, along with how far along each one is.
Progress is calculated automatically based on the tasks inside.

Arguments:
  project-id    The numeric ID of the project

Usage:
  kanban epic list <project-id>

Example:
  $ kanban epic list 1
  ID  Title           Status       Progress  Due Date
  1   User Auth       done         100%      2026-03-10
  2   Feed Feature    in_progress   45%      2026-04-01
  3   Settings Page   todo           0%      2026-04-20
```

**API:** `GET /projects/{id}/epics`

---

### `kanban epic create <project-id>`

```
Adds a new epic to a project.

Arguments:
  project-id    The numeric ID of the project

Options:
  --title TEXT        The name of this epic  [required]
  --description TEXT  What this epic is about
  --start-date DATE   When work on this epic begins (YYYY-MM-DD)
  --end-date DATE     Deadline for this epic (YYYY-MM-DD)

Usage:
  kanban epic create <project-id> --title TEXT [options]

Example:
  $ kanban epic create 1 --title "Settings Page" --end-date 2026-04-20
  > Epic created! ID: 3
```

**API:** `POST /projects/{id}/epics`

---

### `kanban epic update <id>`

```
Changes the details of an existing epic such as its title,
status, or deadline. Only the fields you provide will change.

Arguments:
  id    The numeric ID of the epic

Options:
  --title TEXT        New title
  --description TEXT  New description
  --status TEXT       New status: todo, in_progress, or done
  --start-date DATE   New start date (YYYY-MM-DD)
  --end-date DATE     New deadline (YYYY-MM-DD)

Usage:
  kanban epic update <id> [options]

Example:
  $ kanban epic update 2 --status done
  > Epic updated.
```

**API:** `PATCH /epics/{id}`

---

### `kanban epic delete <id>`

```
Permanently removes an epic and all the tasks and subtasks
inside it. This cannot be undone.

You will be asked to confirm first.

Arguments:
  id    The numeric ID of the epic

Usage:
  kanban epic delete <id>

Example:
  $ kanban epic delete 3
  > Are you sure you want to delete "Settings Page"? [y/N]: y
  > Epic deleted.
```

**API:** `DELETE /epics/{id}`

---

## 4. 태스크

태스크는 에픽에 속하는 단위 작업(WBS Level 2)이자 칸반보드 카드다. WBS와 칸반보드는 같은 태스크 엔티티를 공유한다.

상태값: `todo` → `in_progress` → `in_review` → `done`

### `kanban task list <project-id>`

```
Shows all tasks in a project. You can filter by status to
see only the tasks on a specific column of the Kanban board.

Arguments:
  project-id    The numeric ID of the project

Options:
  --status TEXT   Filter by status: todo, in_progress, in_review, done

Usage:
  kanban task list <project-id> [--status TEXT]

Example:
  $ kanban task list 1 --status in_progress
  ID  Title              Assignee      Priority  Due Date
  4   Build login page   Jiyeon Park   high      2026-03-20
  7   Write API tests    Minho Kim     medium    2026-03-25
```

**API:** `GET /projects/{id}/tasks`

---

### `kanban task create <epic-id>`

```
Creates a new task inside an epic. The task will start in
the "todo" column of the Kanban board.

Arguments:
  epic-id    The numeric ID of the epic this task belongs to

Options:
  --title TEXT         The name of this task  [required]
  --description TEXT   More details about what needs to be done
  --assignee-id INT    The user ID of the person responsible for this task
  --priority TEXT      How urgent this is: low, medium, or high (default: medium)
  --due-date DATE      When this task should be finished (YYYY-MM-DD)

Usage:
  kanban task create <epic-id> --title TEXT [options]

Example:
  $ kanban task create 2 --title "Build login page" --priority high --due-date 2026-03-20
  > Task created! ID: 4
```

**API:** `POST /epics/{id}/tasks`

---

### `kanban task update <id>`

```
Changes any details of an existing task — title, description,
who it is assigned to, priority, or deadline.

Arguments:
  id    The numeric ID of the task

Options:
  --title TEXT         New title
  --description TEXT   New description
  --assignee-id INT    ID of the new assignee (use 0 to remove assignee)
  --priority TEXT      New priority: low, medium, or high
  --due-date DATE      New deadline (YYYY-MM-DD)

Usage:
  kanban task update <id> [options]

Example:
  $ kanban task update 4 --assignee-id 2 --due-date 2026-03-22
  > Task updated.
```

**API:** `PATCH /tasks/{id}`

---

### `kanban task move <id> <status>`

```
Moves a task to a different column on the Kanban board by
changing its status.

Arguments:
  id       The numeric ID of the task
  status   Where to move it: todo, in_progress, in_review, or done

Usage:
  kanban task move <id> <status>

Example:
  $ kanban task move 4 in_review
  > Task moved to "In Review".
```

**API:** `PATCH /tasks/{id}/status`

---

### `kanban task delete <id>`

```
Permanently removes a task and all of its subtasks.
This cannot be undone.

Arguments:
  id    The numeric ID of the task

Usage:
  kanban task delete <id>

Example:
  $ kanban task delete 4
  > Are you sure you want to delete "Build login page"? [y/N]: y
  > Task deleted.
```

**API:** `DELETE /tasks/{id}`

---

## 5. 서브태스크

서브태스크는 태스크 하위의 세부 체크리스트 항목(WBS Level 3)이다. 서브태스크 완료 여부가 태스크 진행률에 반영된다.

### `kanban subtask list <task-id>`

```
Shows all subtasks for a given task, including whether
each one has been completed.

Arguments:
  task-id    The numeric ID of the task

Usage:
  kanban subtask list <task-id>

Example:
  $ kanban subtask list 4
  ID  Title                  Done?  Assignee
  1   Design the login form  Yes    Jiyeon Park
  2   Connect to auth API    No     Minho Kim
  3   Write unit tests       No     —
```

**API:** `GET /tasks/{id}/subtasks`

---

### `kanban subtask create <task-id>`

```
Adds a new subtask (checklist item) to a task.

Arguments:
  task-id    The numeric ID of the task

Options:
  --title TEXT        What needs to be done  [required]
  --assignee-id INT   The user ID of the person responsible

Usage:
  kanban subtask create <task-id> --title TEXT [--assignee-id INT]

Example:
  $ kanban subtask create 4 --title "Write unit tests" --assignee-id 3
  > Subtask created! ID: 3
```

**API:** `POST /tasks/{id}/subtasks`

---

### `kanban subtask update <id>`

```
Changes the title or assignee of an existing subtask.

Arguments:
  id    The numeric ID of the subtask

Options:
  --title TEXT        New title
  --assignee-id INT   New assignee user ID

Usage:
  kanban subtask update <id> [options]

Example:
  $ kanban subtask update 3 --title "Write unit and integration tests"
  > Subtask updated.
```

**API:** `PATCH /subtasks/{id}`

---

### `kanban subtask done <id>`

```
Marks a subtask as completed. If all subtasks under a task
are done, the task progress will show 100%.

Arguments:
  id    The numeric ID of the subtask

Usage:
  kanban subtask done <id>

Example:
  $ kanban subtask done 2
  > Subtask marked as done. (Task progress: 67%)
```

**API:** `PATCH /subtasks/{id}`

---

### `kanban subtask delete <id>`

```
Permanently removes a subtask from its task.
This cannot be undone.

Arguments:
  id    The numeric ID of the subtask

Usage:
  kanban subtask delete <id>

Example:
  $ kanban subtask delete 3
  > Subtask deleted.
```

**API:** `DELETE /subtasks/{id}`

---

## 6. 회의실

GCS-PULSE에 등록된 회의실을 예약한다. 예약 시 Google Calendar 이벤트가 자동 생성되고 참석자에게 초대가 전송된다.

### `kanban room list`

```
Shows all meeting rooms available to book, including their
name, location, and a short description.

Usage:
  kanban room list

Example:
  $ kanban room list
  ID  Name          Location   Description
  1   Room A        Floor 3    8-person room with projector
  2   Phone Booth   Floor 2    1-person quiet call booth
  3   Main Hall     Floor 1    Up to 20 people
```

**API:** `GET /meeting-rooms`

---

### `kanban room reservations <room-id> <date>`

```
Shows who has already booked a specific room on a given day.
Use this to find an open time slot before making a reservation.

Arguments:
  room-id   The numeric ID of the meeting room
  date      The date you want to check (YYYY-MM-DD)

Usage:
  kanban room reservations <room-id> <date>

Example:
  $ kanban room reservations 1 2026-04-15
  Time              Reserved by    Purpose
  09:00 – 10:00    Jiyeon Park    Sprint planning
  14:00 – 15:30    Minho Kim      Client call
```

**API:** `GET /meeting-rooms/{id}/reservations`

---

### `kanban room book <room-id>`

```
Reserves a meeting room for a specific time.
After booking, a Google Calendar event is automatically created
on your account and invites are sent to the attendees you list.

Arguments:
  room-id    The numeric ID of the room to book

Options:
  --date DATE              The date of the meeting (YYYY-MM-DD)  [required]
  --start TIME             Start time in HH:MM format (e.g. 14:00)  [required]
  --end TIME               End time in HH:MM format (e.g. 15:30)  [required]
  --purpose TEXT           A short note about what the meeting is for
  --attendees TEXT         Comma-separated list of email addresses to invite
                           (e.g. "a@school.ac.kr,b@school.ac.kr")

Usage:
  kanban room book <room-id> --date DATE --start TIME --end TIME [options]

Example:
  $ kanban room book 1 --date 2026-04-16 --start 10:00 --end 11:00 \
      --purpose "Weekly sync" --attendees "minho@gachon.ac.kr,sua@gachon.ac.kr"
  > Room booked! Reservation ID: 12
  > Google Calendar event created. Invites sent to 2 attendees.
```

**API:** `POST /meeting-rooms/{id}/reservations`

---

### `kanban room cancel <reservation-id>`

```
Cancels an existing room reservation.
The matching Google Calendar event will also be deleted automatically,
and attendees will receive a cancellation notice.

Arguments:
  reservation-id    The numeric ID of the reservation (get this from 'room reservations')

Usage:
  kanban room cancel <reservation-id>

Example:
  $ kanban room cancel 12
  > Are you sure you want to cancel this reservation? [y/N]: y
  > Reservation cancelled. Google Calendar event deleted.
```

**API:** `DELETE /meeting-rooms/reservations/{id}`

---

## 7. 팀

팀 정보는 GCS-PULSE에서 실시간으로 가져온다.

### `kanban team show`

```
Shows the members of your team, including their name
and email address. This information is pulled from GCS-PULSE.

Usage:
  kanban team show

Example:
  $ kanban team show
  Team: Gachon Dev Squad

  ID  Name          Email
  1   Jiyeon Park   jiyeon@gachon.ac.kr
  2   Minho Kim     minho@gachon.ac.kr
  3   Sua Lee       sua@gachon.ac.kr
```

**API:** `GET /teams/me`

---

## 8. 알림

### `kanban notify list`

```
Shows your most recent notifications from GCS-PULSE,
such as when someone comments on your post or mentions you.
Unread notifications are highlighted.

Options:
  --limit INT   How many notifications to show (default: 20, max: 100)

Usage:
  kanban notify list [--limit INT]

Example:
  $ kanban notify list
  ID   Read?  Message                                    Time
  45   No     Minho Kim commented on your daily post     5 min ago
  44   Yes    You were mentioned in a weekly snippet     2 hours ago
```

**API:** `GET /notifications`

---

### `kanban notify read <id>`

```
Marks a single notification as read so it no longer
appears highlighted.

Arguments:
  id    The numeric ID of the notification

Usage:
  kanban notify read <id>

Example:
  $ kanban notify read 45
  > Notification marked as read.
```

**API:** `PATCH /notifications/{id}/read`

---

### `kanban notify stream`

```
Connects to the server and shows new notifications as they
arrive in real time. The terminal will stay open and print
each new notification the moment it happens.

Press Ctrl+C to stop watching.

Usage:
  kanban notify stream

Example:
  $ kanban notify stream
  > Connected. Watching for new notifications... (Ctrl+C to stop)
  [10:32] Minho Kim commented on your daily post
  [10:45] Sua Lee mentioned you in a comment
```

**API:** `GET /notifications/sse`

---

## 9. 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `kanban login` | Google 계정으로 로그인 |
| `kanban logout` | 로그아웃 |
| `kanban whoami` | 현재 계정 확인 |
| `kanban project list` | 프로젝트 목록 |
| `kanban project create` | 프로젝트 생성 |
| `kanban project show <id>` | 프로젝트 상세 조회 |
| `kanban project update <id>` | 프로젝트 이름·설명 수정 |
| `kanban project delete <id>` | 프로젝트 삭제 |
| `kanban epic list <project-id>` | 에픽 목록 및 진행률 |
| `kanban epic create <project-id>` | 에픽 추가 |
| `kanban epic update <id>` | 에픽 수정 |
| `kanban epic delete <id>` | 에픽 삭제 |
| `kanban task list <project-id>` | 태스크 목록 (칸반 뷰) |
| `kanban task create <epic-id>` | 태스크 추가 |
| `kanban task update <id>` | 태스크 수정 |
| `kanban task move <id> <status>` | 칸반 보드 컬럼 이동 |
| `kanban task delete <id>` | 태스크 삭제 |
| `kanban subtask list <task-id>` | 서브태스크 목록 |
| `kanban subtask create <task-id>` | 서브태스크 추가 |
| `kanban subtask update <id>` | 서브태스크 수정 |
| `kanban subtask done <id>` | 서브태스크 완료 처리 |
| `kanban subtask delete <id>` | 서브태스크 삭제 |
| `kanban room list` | 예약 가능한 회의실 목록 |
| `kanban room reservations <room-id> <date>` | 날짜별 예약 현황 확인 |
| `kanban room book <room-id>` | 회의실 예약 + Calendar 이벤트 생성 |
| `kanban room cancel <reservation-id>` | 예약 취소 |
| `kanban team show` | 팀원 목록 |
| `kanban notify list` | 최근 알림 목록 |
| `kanban notify read <id>` | 알림 읽음 처리 |
| `kanban notify stream` | 실시간 알림 수신 |
