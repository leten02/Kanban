# Kanban 프로젝트 관리 시스템

Jira와 유사한 프로젝트 관리 웹 애플리케이션입니다. 칸반보드, WBS, 타임라인, 문서 관리, 회의실 예약 기능을 제공합니다.

## 📋 목차
- [기술 스택](#기술-스택)
- [화면 플로우](#화면-플로우)
- [주요 기능](#주요-기능)
- [폴더 구조](#폴더-구조)
- [화면 상세 설명](#화면-상세-설명)
- [컴포넌트 구조](#컴포넌트-구조)
- [상태 관리](#상태-관리)
- [데이터 구조](#데이터-구조)

---

## 🛠 기술 스택

### 프론트엔드
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Tailwind CSS v4** - 유틸리티 기반 스타일링
- **react-dnd** - 드래그앤드롭 (칸반보드)
- **react-markdown** + **remark-gfm** - 마크다운 렌더링
- **recharts** - 차트 및 데이터 시각화
- **lucide-react** - 아이콘
- **axios** - HTTP 클라이언트 (백엔드 연동 준비)

### 개발 환경
- **Vite** - 빌드 툴
- **pnpm** - 패키지 매니저
- **Figma Make** - 개발 환경

---

## 🎯 화면 플로우

```
┌─────────────┐
│  로그인      │  이메일 입력 (데모용)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ 프로젝트 목록    │  프로젝트 카드 그리드
│                 │  - 생성/수정/삭제
│                 │  - 프로젝트 선택
└──────┬──────────┘
       │
       ▼
┌───────────────────────────────────────┐
│        메인 작업 공간 (5개 탭)         │
├───────────────────────────────────────┤
│ [에픽] [보드] [타임라인] [문서] [회의실] │
└───────────────────────────────────────┘
```

---

## ✨ 주요 기능

### 1. **에픽 관리** (WBS Level 1)
- 큰 기능 단위 관리
- 진행률 % 표시 (프로그레스 바)
- 생성/수정/삭제
- 시작일/마감일 설정

### 2. **칸반 보드** (WBS Level 2)
- 4개 컬럼: TODO / IN PROGRESS / REVIEW / DONE
- 드래그앤드롭으로 태스크 이동
- Jira 스타일 컴팩트 카드 디자인
  - 컬러 태그 (Backend=파랑, Frontend=초록 등)
  - 우선순위 표시
  - 담당자 여러 명 (중첩 아바타)
  - 마감일 표시
- 태스크 카드 클릭 → 상세 모달

### 3. **타임라인** (간트 차트)
- 시간 축 기반 작업 시각화
- 시작일~종료일 막대 그래프
- 일정 겹침 확인
- 작업 수정/삭제

### 4. **문서 관리**
- 왼쪽: 문서 목록
- 오른쪽: 마크다운 에디터/뷰어
- 편집/미리보기 모드 전환
- 기술 조사, API 문서 등 저장
- 샘플 문서 3개 포함

### 5. **회의실 예약**
- 회의실 목록 (수용인원, 장비)
- 시간별 예약 현황
- 예약 생성/삭제

### 6. **태스크 상세 모달**
- 제목/설명 편집
- 담당자 여러 명 추가/제거
- 우선순위/상태/마감일 변경
- 태그 관리
- 댓글 작성
- 체크리스트 (서브태스크)

---

## 📁 폴더 구조

```
src/
├── app/
│   ├── App.tsx                      # 메인 애플리케이션 (라우팅 + 탭 관리)
│   └── components/                  # 앱 내부 컴포넌트
│       ├── AddTaskModal.tsx         # 새 태스크 생성 모달
│       ├── KanbanBoard.tsx          # 칸반보드 (react-dnd)
│       ├── ProjectStats.tsx         # 프로젝트 통계 (차트)
│       ├── RoomReservation.tsx      # 회의실 예약
│       ├── TaskCard.tsx             # Jira 스타일 태스크 카드
│       ├── TaskDetailModal.tsx      # 태스크 상세 모달
│       └── TimelineView.tsx         # 간트 차트
│
├── components/                      # 페이지 레벨 컴포넌트
│   ├── DocumentManagement.tsx       # 문서 관리 (마크다운)
│   ├── EpicManagement.tsx           # 에픽 관리
│   ├── Login.tsx                    # 로그인 화면
│   └── ProjectDashboard.tsx         # 프로젝트 목록
│
├── contexts/                        # React Context (전역 상태)
│   ├── AuthContext.tsx              # 인증 상태 (user, login, logout)
│   └── ProjectContext.tsx           # 선택된 프로젝트
│
├── lib/
│   └── api.ts                       # API 클라이언트 (axios, 타입 정의)
│
└── styles/
    ├── fonts.css                    # 폰트 import
    ├── theme.css                    # Tailwind 테마 + prose 스타일
    └── index.css                    # 글로벌 스타일

package.json                         # 의존성
tsconfig.json                        # TypeScript 설정
```

---

## 🖼 화면 상세 설명

### 1. 로그인 (`Login.tsx`)
- 간단한 이메일 입력 폼
- 데모용 목(mock) 인증
- localStorage에 사용자 정보 저장
- 로그인 성공 시 프로젝트 목록으로 이동

**UI 구성:**
- 중앙 카드 레이아웃
- 앱 로고 (LayoutGrid 아이콘)
- 이메일 input
- "로그인" 버튼

---

### 2. 프로젝트 목록 (`ProjectDashboard.tsx`)
- 프로젝트 카드 그리드 (1~3열, 반응형)
- 각 카드: 제목, 설명, 생성일
- 호버 시 수정/삭제 버튼 표시
- "새 프로젝트" 버튼 → 모달 열림
- 프로젝트 클릭 → 해당 프로젝트의 메인 작업 공간으로 이동

**목 데이터:**
```typescript
[
  { id: 1, name: '웹사이트 리뉴얼', description: '...', created_at: '2026-03-15' },
  { id: 2, name: '모바일 앱 개발', ... },
  { id: 3, name: '백오피스 시스템', ... }
]
```

---

### 3. 메인 작업 공간 (`App.tsx`)

**헤더:**
- 왼쪽: 뒤로가기 버튼, 프로젝트 이름, 사용자 정보
- 오른쪽: "새 작업" 버튼 (보드 탭일 때만), 로그아웃

**탭 네비게이션:**
```
[에픽] [보드] [타임라인] [문서] [회의실]
```
- viewMode state로 탭 전환
- 각 탭 클릭 시 하단 컨텐츠 영역 변경

---

### 4. 에픽 탭 (`EpicManagement.tsx`)

**레이아웃:**
- 상단: "에픽 관리", "에픽 추가" 버튼
- 에픽 리스트 (카드 형태)

**각 에픽 카드:**
- 제목
- 마감일, 생성일
- 진행률 프로그레스 바 (0~100%)
- 호버 시 수정/삭제 버튼

**목 데이터:**
```typescript
[
  { id: 1, title: '사용자 인증 시스템', progress: 65, end_date: '2026-04-30' },
  { id: 2, title: '대시보드 구현', progress: 40, ... },
  { id: 3, title: '데이터 분석 기능', progress: 0, ... }
]
```

---

### 5. 보드 탭 (`KanbanBoard.tsx` + `TaskCard.tsx`)

**상단: 프로젝트 통계 (`ProjectStats.tsx`)**
- 전체/완료/진행중 태스크 수
- 우선순위별 분포 (도넛 차트)

**칸반 보드:**
- 4개 컬럼: TODO, IN PROGRESS, REVIEW, DONE
- react-dnd로 드래그앤드롭 구현
- 각 컬럼은 `useDrop` (드롭 영역)
- 각 태스크 카드는 `useDrag` (드래그 가능)

**태스크 카드 디자인 (Jira 스타일):**
```
┌─────────────────────────────────┐
│ [Backend] [Security]            │ ← 컬러 태그
│                                 │
│ 사용자 인증 시스템 구현          │ ← 제목
│                                 │
│ 👤👤 +2    🔴 High  📅 04/15   │ ← 담당자, 우선순위, 마감일
└─────────────────────────────────┘
```

**담당자 표시:**
- 최대 3명까지 중첩된 원형 아바타
- 4명 이상이면 "+N" 표시

**컬러 태그:**
- Backend: 파란색
- Frontend: 초록색
- Design: 보라색
- Database: 노란색
- Testing: 회색
- Documentation: 오렌지색

---

### 6. 타임라인 탭 (`TimelineView.tsx`)

**간트 차트:**
- 상단: 월별 시간 축
- 각 행: 태스크
- 막대 그래프: 시작일~마감일
- 막대 위에 마우스 호버 시 상세 정보 툴팁
- 각 행에 수정/삭제 버튼

**시각화:**
```
4월                      5월
├────────┼────────┼────────┼────────┤
사용자 인증  [████████████]
UI 디자인        [██████████]
DB 스키마  [████]
API 문서             [████████]
```

---

### 7. 문서 탭 (`DocumentManagement.tsx`)

**레이아웃: 2단 구조**

**왼쪽 사이드바 (w-80):**
- 문서 목록
- 각 문서: 제목, 수정일시
- 선택된 문서는 진한 배경
- 호버 시 삭제 버튼
- "+" 버튼으로 새 문서 생성

**오른쪽 에디터/뷰어:**
- 상단: 제목, 수정일시, 버튼들
  - "편집/미리보기" 토글 버튼
  - "수정" 버튼 → 편집 모드 진입
- 하단: 컨텐츠 영역
  - **편집 모드**: `<textarea>` 마크다운 입력
  - **미리보기 모드**: `<ReactMarkdown>` 렌더링

**마크다운 지원:**
- 제목 (h1~h6)
- 리스트 (ul, ol)
- 코드블록 (```javascript)
- 테이블
- 인용구 (blockquote)
- 링크, 이미지
- **굵게**, *기울임*

**샘플 문서:**
1. "API 설계 가이드" - RESTful API 원칙, 인증 방식
2. "데이터베이스 스키마" - 테이블 구조, 관계
3. "프론트엔드 기술 스택" - 사용 라이브러리, 폴더 구조

---

### 8. 회의실 탭 (`RoomReservation.tsx`)

**레이아웃:**
- 회의실 목록 (카드)
- 각 회의실: 이름, 수용인원, 장비
- 예약 목록 (테이블)
- "회의실 예약" 버튼 → 모달

**예약 정보:**
- 회의실 이름
- 제목
- 주최자
- 참석자 (배지 형태)
- 시간 (시작~종료)
- 날짜

---

### 9. 태스크 상세 모달 (`TaskDetailModal.tsx`)

**모달 레이아웃:**
- 전체 화면 오버레이
- 중앙 큰 모달 (max-w-4xl)

**헤더:**
- 제목 (편집 가능)
- 닫기 버튼

**왼쪽 영역 (flex-1):**
- 설명 (textarea)
- 댓글 섹션
  - 작성자, 내용, 시간
  - 새 댓글 입력란

**오른쪽 사이드바 (w-80):**
- **담당자**: 여러 명 추가 가능, 태그 형태로 표시, X 버튼으로 제거
- **상태**: 드롭다운 (TODO/IN PROGRESS/REVIEW/DONE)
- **우선순위**: 드롭다운 (Low/Medium/High)
- **마감일**: date picker
- **태그**: 여러 개 추가/제거 가능
- **체크리스트**:
  - 진행률 프로그레스 바
  - 각 항목 체크박스
  - 새 항목 추가

**하단:**
- "삭제" 버튼 (빨강)
- "저장" 버튼 (검정)

---

## 🧩 컴포넌트 구조

### App.tsx
```typescript
type ViewMode = 'board' | 'timeline' | 'room' | 'epic' | 'document';

function AppContent() {
  const { isAuthenticated, user, logout } = useAuth();
  const { selectedProject, setSelectedProject } = useProject();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  
  // 모든 useState는 조건부 return 이전에 선언 (Hooks 규칙)
  
  if (!isAuthenticated) return <Login />;
  if (!selectedProject) return <ProjectDashboard />;
  
  return (
    <DndProvider>
      <header> {/* 탭 네비게이션 */} </header>
      <main>
        {viewMode === 'epic' && <EpicManagement />}
        {viewMode === 'board' && <KanbanBoard />}
        {viewMode === 'timeline' && <TimelineView />}
        {viewMode === 'document' && <DocumentManagement />}
        {viewMode === 'room' && <RoomReservation />}
      </main>
    </DndProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </AuthProvider>
  );
}
```

### KanbanBoard.tsx (react-dnd)
```typescript
// 각 컬럼은 드롭 영역
const [{ isOver }, drop] = useDrop({
  accept: 'TASK',
  drop: (item: { id: string }) => moveTask(item.id, status),
  collect: (monitor) => ({ isOver: monitor.isOver() })
});

// 각 태스크 카드는 드래그 가능
const [{ isDragging }, drag] = useDrag({
  type: 'TASK',
  item: { id: task.id },
  collect: (monitor) => ({ isDragging: monitor.isDragging() })
});
```

### DocumentManagement.tsx
```typescript
const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');

// 미리보기 모드
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {selectedDoc.content}
</ReactMarkdown>

// 편집 모드
<textarea value={selectedDoc.content} onChange={...} />
```

---

## 🔄 상태 관리

### AuthContext
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
}

// localStorage에 mock 사용자 정보 저장
// 실제로는 JWT 토큰, /api/auth/me 호출 등
```

### ProjectContext
```typescript
interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
}

// 현재 작업 중인 프로젝트 추적
// 프로젝트 목록 → 프로젝트 선택 시 설정
// 뒤로가기 → null로 설정하면 프로젝트 목록 복귀
```

### 로컬 State (App.tsx)
```typescript
const [tasks, setTasks] = useState<Task[]>([...]);         // 태스크 목록
const [rooms, setRooms] = useState<Room[]>([...]);         // 회의실 목록
const [reservations, setReservations] = useState([...]);   // 예약 목록
const [isModalOpen, setIsModalOpen] = useState(false);     // 모달 상태
const [selectedTask, setSelectedTask] = useState<Task | null>(null);
```

---

## 📊 데이터 구조

### User
```typescript
interface User {
  id: number;
  email: string;
  name: string;
  picture: string;  // 아바타 URL
}
```

### Project
```typescript
interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
}
```

### Epic
```typescript
interface Epic {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed';
  start_date?: string;
  end_date?: string;
  progress: number;        // 0~100
  created_at: string;
}
```

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  assignees: string[];     // 담당자 여러 명
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  startDate?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  tags: string[];          // ['Backend', 'Security']
  comments: Comment[];
  checklist: ChecklistItem[];
}
```

### Comment
```typescript
interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;       // ISO 8601
}
```

### ChecklistItem (서브태스크)
```typescript
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}
```

### Document
```typescript
interface Document {
  id: number;
  project_id: number;
  title: string;
  content: string;         // 마크다운 텍스트
  created_at: string;
  updated_at: string;
}
```

### Room & Reservation
```typescript
interface Room {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];     // ['빔프로젝터', '화이트보드']
}

interface Reservation {
  id: string;
  roomId: string;
  title: string;
  organizer: string;
  attendees: string[];
  startTime: string;       // 'HH:mm'
  endTime: string;
  date: string;            // 'YYYY-MM-DD'
}
```

---

## 🎨 스타일링

### Tailwind CSS v4
- 유틸리티 클래스 기반
- `theme.css`에 커스텀 디자인 토큰
- 다크모드 지원 (현재 미사용)

### 주요 색상
- Primary: `neutral-900` (검정)
- Border: `neutral-200`
- Background: `white`, `neutral-50`
- Accent: 태그별 다양한 색상

### 프로즈 스타일 (마크다운)
- `theme.css`에 `.prose` 클래스 정의
- 제목, 코드블록, 테이블 등 커스텀 스타일
- 코드블록은 어두운 배경 (`#1f2937`)

---

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
pnpm install
```

### 2. 개발 서버 실행
```bash
pnpm dev
```

### 3. 빌드 (프로덕션)
```bash
pnpm build
```

**참고:** Figma Make 환경에서는 별도 빌드 없이 자동으로 실행됩니다.

---

## 📦 주요 의존성

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-dnd": "^16.x",
    "react-dnd-html5-backend": "^16.x",
    "react-markdown": "^10.x",
    "remark-gfm": "^4.x",
    "recharts": "^2.x",
    "lucide-react": "latest",
    "axios": "^1.15.0"
  }
}
```

---

## 🔌 백엔드 연동 준비 상태

현재는 **목(mock) 데이터**로 작동하지만, 백엔드 연동을 위한 구조는 준비되어 있습니다:

### api.ts
```typescript
// Axios 클라이언트 설정
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 자동 Bearer 토큰 추가
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API 엔드포인트
export const authApi = {
  getGoogleLoginUrl: () => apiClient.get('/auth/google/login'),
  getMe: () => apiClient.get<User>('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),
};

export const projectApi = {
  list: () => apiClient.get<Project[]>('/projects/'),
  create: (data) => apiClient.post<Project>('/projects/', data),
  update: (id, data) => apiClient.put<Project>(`/projects/${id}`, data),
  delete: (id) => apiClient.delete(`/projects/${id}`),
};

// epic, task, subtask, room API도 동일 패턴
```

백엔드 시작 후 `.env` 파일에 `VITE_API_URL` 설정하면 바로 연동 가능합니다.

---

## 📝 현재 데이터 흐름

### 목 데이터 사용 중
- `AuthContext`: localStorage에 목 사용자 저장
- `ProjectDashboard`: 3개의 샘플 프로젝트
- `EpicManagement`: 3개의 샘플 에픽
- `App.tsx`: 8개의 샘플 태스크
- `DocumentManagement`: 3개의 샘플 문서
- `RoomReservation`: 4개의 회의실, 3개의 예약

### 백엔드 연동 시 변경 필요한 부분
1. `AuthContext` → `authApi.getMe()` 호출
2. `ProjectDashboard` → `projectApi.list()` 호출
3. `EpicManagement` → `epicApi.list(projectId)` 호출
4. `App.tsx` → `taskApi.list(projectId)` 호출
5. `DocumentManagement` → `documentApi.list(projectId)` 호출
6. `RoomReservation` → `roomApi.list()` 호출

각 컴포넌트의 CRUD 함수들도 API 호출로 변경하면 됩니다.

---

## 🎯 주요 특징

### 1. Jira 스타일 디자인
- 컴팩트한 카드 디자인
- 컬러 태그 시스템
- 중첩 아바타 (담당자)
- 우선순위 시각화

### 2. 드래그앤드롭
- react-dnd 라이브러리 사용
- 태스크 상태 변경을 직관적으로
- 드래그 중 시각적 피드백

### 3. 마크다운 문서
- GitHub Flavored Markdown 지원
- 코드 하이라이팅
- 테이블, 리스트 등 풍부한 서식
- 실시간 미리보기

### 4. 반응형 디자인
- 모바일/태블릿/데스크톱 대응
- Grid 레이아웃 자동 조정
- 사이드바 토글 가능

### 5. 타입 안전성
- TypeScript로 모든 데이터 구조 정의
- Interface 기반 컴포넌트 props
- 런타임 오류 최소화

---

## 🏗 아키텍처 특징

### Component Composition
- 작은 컴포넌트들의 조합
- 단일 책임 원칙
- 재사용 가능한 UI 요소

### Context API
- 전역 상태는 최소화
- AuthContext: 인증
- ProjectContext: 프로젝트 선택
- 나머지는 로컬 state

### Props Drilling 방지
- Context로 깊은 트리 전달 회피
- 필요한 곳에서 직접 useAuth(), useProject() 호출

---

## 💡 개발 시 주의사항

### React Hooks 규칙
- 모든 Hook은 조건문/반복문 밖에서 호출
- 컴포넌트 최상단에 선언
- 조건부 return은 Hook 선언 후에

### Tailwind 클래스 순서
```typescript
// 권장 순서: layout → spacing → typography → colors → effects
className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
```

### 날짜 형식
- 저장: ISO 8601 (`2026-04-11T10:30:00`)
- 표시: 한국식 (`2026.04.11 10:30`)

---

## 🔮 향후 개선 가능 사항

### 기능
- [ ] 태스크 필터링/검색
- [ ] 알림 시스템
- [ ] 파일 첨부 (S3 연동)
- [ ] 태스크 의존성 관계
- [ ] 스프린트 관리
- [ ] 리포트/차트 확장

### 기술
- [ ] React Query (캐싱, 낙관적 업데이트)
- [ ] Zustand/Redux (복잡한 상태 관리)
- [ ] WebSocket (실시간 협업)
- [ ] PWA (오프라인 지원)
- [ ] E2E 테스트 (Playwright)

---

## 📞 문의

프로젝트 관련 문의사항이나 버그 리포트는 GitHub Issues를 활용해주세요.

---

**마지막 업데이트:** 2026-04-11  
**버전:** 1.0.0  
**라이선스:** MIT
