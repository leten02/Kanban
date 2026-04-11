import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Epic {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  progress: number;
}

export interface Task {
  id: number;
  epic_id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee_user_id: number | null;
  due_date: string | null;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  assignee_user_id: number | null;
  is_completed: boolean;
  task_progress?: number | null;
}

export interface MeetingRoom {
  id: number;
  name: string;
  capacity: number;
  building?: string;
  floor?: string;
}

export interface MeetingReservation {
  id: number;
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  user_email: string;
  attendee_emails: string[];
  gcs_reservation_id?: string;
  google_calendar_event_id?: string;
  created_at: string;
}

export const authApi = {
  getGoogleLoginUrl: (callbackUrl?: string) =>
    api.get<{ url: string }>('/auth/google/login', { params: callbackUrl ? { callback_url: callbackUrl } : {} }),
  getMe: () => api.get<User>('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const projectApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: number) => api.get<Project>(`/projects/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post<Project>('/projects', data),
  update: (id: number, data: { name?: string; description?: string }) =>
    api.patch<Project>(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
};

export const epicApi = {
  list: (projectId: number) => api.get<Epic[]>(`/projects/${projectId}/epics`),
  create: (projectId: number, data: {
    title: string;
    description?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }) => api.post<Epic>(`/projects/${projectId}/epics`, data),
  update: (id: number, data: {
    title?: string | null;
    description?: string | null;
    status?: 'todo' | 'in_progress' | 'done' | null;
    start_date?: string | null;
    end_date?: string | null;
  }) => api.patch<Epic>(`/epics/${id}`, data),
  delete: (id: number) => api.delete(`/epics/${id}`),
};

export const taskApi = {
  list: (projectId: number, status?: string) =>
    api.get<Task[]>(`/projects/${projectId}/tasks`, { params: { status } }),
  create: (epicId: number, data: {
    title: string;
    description?: string | null;
    assignee_user_id?: number | null;
    priority?: 'low' | 'medium' | 'high';
    due_date?: string | null;
  }) => api.post<Task>(`/epics/${epicId}/tasks`, data),
  update: (id: number, data: {
    title?: string | null;
    description?: string | null;
    assignee_user_id?: number | null;
    priority?: 'low' | 'medium' | 'high' | null;
    due_date?: string | null;
  }) => api.patch<Task>(`/tasks/${id}`, data),
  updateStatus: (id: number, status: Task['status']) =>
    api.patch<Task>(`/tasks/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/tasks/${id}`),
};

export const subtaskApi = {
  list: (taskId: number) => api.get<Subtask[]>(`/tasks/${taskId}/subtasks`),
  create: (taskId: number, data: {
    title: string;
    assignee_user_id?: number | null;
  }) => api.post<Subtask>(`/tasks/${taskId}/subtasks`, data),
  update: (id: number, data: {
    title?: string | null;
    assignee_user_id?: number | null;
    is_completed?: boolean | null;
  }) => api.patch<Subtask>(`/subtasks/${id}`, data),
  delete: (id: number) => api.delete(`/subtasks/${id}`),
};

export const roomApi = {
  list: () => api.get<MeetingRoom[]>('/meeting-rooms'),
  getReservations: (roomId: number, date: string) =>
    api.get<MeetingReservation[]>(`/meeting-rooms/${roomId}/reservations`, { params: { date } }),
  book: (roomId: number, data: {
    date: string;
    start_time: string;
    end_time: string;
    purpose: string;
    attendee_emails?: string[];
  }) => api.post<MeetingReservation>(`/meeting-rooms/${roomId}/reservations`, data),
  cancel: (reservationId: number) =>
    api.delete(`/meeting-rooms/reservations/${reservationId}`),
};
