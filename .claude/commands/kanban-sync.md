# /kanban-sync

이번 세션에서 한 작업을 팀 칸반 보드에 자동 등록합니다.

## 실행 순서

**Step 1: 현재 프로젝트 확인**

```bash
cd /Users/le_ten/Desktop/Coding/Kanban
kanban project list
```

프로젝트 목록을 보여주고, 어떤 프로젝트에 등록할지 사용자에게 확인한다.
(이전에 사용한 프로젝트가 있으면 그걸 기본으로 제안)

**Step 2: 에픽 목록 확인**

```bash
kanban epic list <project-id>
```

사용 가능한 에픽 목록을 보여주고, 이번 작업이 어느 에픽에 속하는지 제안한다.
적절한 에픽이 없으면 새로 만들 것을 제안한다.

**Step 3: 미리보기 실행**

```bash
kanban sync preview --commits 1
```

분석 결과(카테고리, 우선순위, 변경 파일)를 사용자에게 보여준다.

**Step 4: 칸반 보드에 등록**

사용자가 확인하면:

```bash
kanban sync run <epic-id>
```

또는 제목을 직접 지정하고 싶을 때:

```bash
kanban sync run <epic-id> --title "<작업 제목>" --priority <high|medium|low>
```

**Step 5: 결과 확인**

등록 완료 후:
- 생성된 태스크 ID와 제목을 알려준다
- 웹에서 확인하는 링크를 알려준다: https://1000school-kanban.vercel.app

## 동작 규칙

- 변경사항이 없으면 `kanban sync preview`로 확인 후 사용자에게 알린다
- 에픽 ID를 모르면 반드시 `kanban epic list`를 먼저 실행한다
- 여러 독립적인 작업(예: 백엔드 + CLI)이 있으면 각각 별도 태스크로 등록할지 물어본다
- `--dry-run` 옵션으로 먼저 미리보기 후 사용자 확인을 받는 것을 권장한다
