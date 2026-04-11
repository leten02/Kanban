import { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ProjectStats } from "./components/ProjectStats";
import { KanbanBoard } from "./components/KanbanBoard";
import { TimelineView } from "./components/TimelineView";
import { RoomReservation } from "./components/RoomReservation";
import { AddTaskModal } from "./components/AddTaskModal";
import { TaskDetailModal } from "./components/TaskDetailModal";
import { SettingsPage } from "./components/SettingsPage";
import { Login } from "../components/Login";
import { ProjectDashboard } from "../components/ProjectDashboard";
import { EpicManagement } from "../components/EpicManagement";
import { DocumentManagement } from "../components/DocumentManagement";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ProjectProvider, useProject } from "../contexts/ProjectContext";
import { taskApi, epicApi, Epic as ApiEpic, Task as ApiTask } from "../lib/api";
import {
  Plus,
  LayoutGrid,
  GanttChart,
  DoorOpen,
  LogOut,
  Target,
  ArrowLeft,
  FileText,
  Settings,
} from "lucide-react";

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  assignee_member_id?: number | null;
  assignee_name?: string | null;
  priority: "low" | "medium" | "high";
  dueDate: string;
  startDate?: string;
  status: "todo" | "in-progress" | "review" | "done";
  tags: string[];
  comments: Comment[];
  checklist: ChecklistItem[];
}

type ViewMode =
  | "board"
  | "timeline"
  | "room"
  | "epic"
  | "document"
  | "settings";

const toFrontendStatus = (s: string): Task["status"] => {
  if (s === "in_progress") return "in-progress";
  if (s === "in_review") return "review";
  return s as Task["status"];
};

const toApiStatus = (s: Task["status"]): string => {
  if (s === "in-progress") return "in_progress";
  if (s === "review") return "in_review";
  return s;
};

const apiTaskToFrontend = (t: ApiTask): Task => ({
  id: String(t.id),
  title: t.title,
  description: t.description || "",
  assignees: t.assignee_name ? [t.assignee_name] : [],
  assignee_member_id: t.assignee_member_id,
  assignee_name: t.assignee_name,
  priority: t.priority || "medium",
  startDate: undefined,
  dueDate: t.due_date || "",
  status: toFrontendStatus(t.status),
  tags: t.tags || [],
  comments: [],
  checklist: [],
});

function AppContent() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { selectedProject, setSelectedProject } = useProject();
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [epicsForProject, setEpicsForProject] = useState<ApiEpic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;
    taskApi.list(selectedProject.id).then(res => setTasks(res.data.map(apiTaskToFrontend)));
    epicApi.list(selectedProject.id).then(res => setEpicsForProject(res.data));
  }, [selectedProject]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!selectedProject) {
    return <ProjectDashboard />;
  }

  const moveTask = (taskId: string, newStatus: Task["status"]) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    taskApi.updateStatus(Number(taskId), toApiStatus(newStatus)).catch(console.error);
  };

  const addTask = async (newTask: Omit<Task, "id">) => {
    if (!selectedProject || !epicsForProject.length) {
      alert('에픽을 먼저 만들어주세요. (에픽 탭에서 에픽을 생성하세요)');
      return;
    }
    const res = await taskApi.create(epicsForProject[0].id, {
      title: newTask.title,
      description: newTask.description || null,
      priority: newTask.priority,
      due_date: newTask.dueDate || null,
      assignee_member_id: newTask.assignee_member_id ?? null,
      tags: newTask.tags || [],
    });
    setTasks((prev) => [...prev, apiTaskToFrontend(res.data)]);
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    taskApi.delete(Number(taskId)).catch(console.error);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...updates } : t));
    if (updates.status) {
      taskApi.updateStatus(Number(taskId), toApiStatus(updates.status)).catch(console.error);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-white">
        <header className="border-b border-neutral-200 bg-white">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  title="프로젝트 목록으로"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl">
                    {selectedProject.name}
                  </h1>
                  <p className="mt-1 text-sm text-neutral-600">
                    {user?.name} ({user?.email})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {viewMode === "board" && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm text-white hover:bg-neutral-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />새 작업
                  </button>
                )}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            </div>
          </div>

          <div className="px-8 border-t border-neutral-200">
            <div className="flex">
              <button
                onClick={() => setViewMode("epic")}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                  viewMode === "epic"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <Target className="w-4 h-4" />
                에픽
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                  viewMode === "board"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                보드
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                  viewMode === "timeline"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <GanttChart className="w-4 h-4" />
                타임라인
              </button>
              <button
                onClick={() => setViewMode("document")}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                  viewMode === "document"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <FileText className="w-4 h-4" />
                문서
              </button>
              <button
                onClick={() => setViewMode("room")}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                  viewMode === "room"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <DoorOpen className="w-4 h-4" />
                회의실 예약
              </button>
              <button
                onClick={() => setViewMode("settings")}
                className={`ml-auto flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                  viewMode === "settings"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <Settings className="w-4 h-4" />
                설정
              </button>
            </div>
          </div>
        </header>

        <main className="px-6 py-4">
          {viewMode === "epic" && (
            <EpicManagement projectId={selectedProject.id} />
          )}
          {viewMode === "board" && (
            <>
              <ProjectStats tasks={tasks} />
              <KanbanBoard
                tasks={tasks}
                moveTask={moveTask}
                onTaskClick={setSelectedTask}
              />
            </>
          )}
          {viewMode === "timeline" && (
            <TimelineView
              tasks={tasks}
              updateTask={updateTask}
              deleteTask={deleteTask}
            />
          )}
          {viewMode === "document" && (
            <DocumentManagement
              projectId={selectedProject.id}
            />
          )}
          {viewMode === "room" && (
            <RoomReservation />
          )}
          {viewMode === "settings" && (
            <SettingsPage
              projectId={selectedProject.id}
              projectName={selectedProject.name}
              projectDescription={selectedProject.description}
              onDeleteProject={() => setSelectedProject(null)}
            />
          )}
        </main>

        <AddTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={addTask}
          projectId={selectedProject.id}
        />

        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
        />
      </div>
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