export type Status = 'en-cours' | 'a-deployer' | 'ok' | 'bloque' | 'a-cadrer';

export interface Task {
  id: string;
  label: string;
  done: boolean;
  assignedBy?: 'manager';
  dueDate?: string;
}

export interface Project {
  id: string;
  name: string;
  priority: number;
  status: Status;
  progress: number;
  currentAction: string;
  nextStep: string;
  tasks: Task[];
  notes?: string;
  dueDate?: string; // ISO date (YYYY-MM-DD)
}

export interface Comment {
  id: string;
  projectId: string | 'general';
  author: 'manager' | 'valentin';
  text: string;
  createdAt: string;
}

export interface WeeklyTodo {
  id: string;
  label: string;
  done: boolean;
}

export interface DashboardData {
  projects: Project[];
  weeklyTodos: WeeklyTodo[];
  updatedAt: string;
}

export type ChangelogEventType =
  | 'progress_changed'
  | 'status_changed'
  | 'task_completed'
  | 'task_added'
  | 'project_added'
  | 'todo_completed';

export interface ChangelogEntry {
  id: string;
  projectId?: string;
  projectName?: string;
  type: ChangelogEventType;
  description: string;
  from?: string;
  to?: string;
  createdAt: string;
  author: 'valentin' | 'manager' | 'system';
}

export interface ManagerTask {
  id: string;
  projectId: string;
  projectName: string;
  label: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  done: boolean;
  createdAt: string;
  note?: string;
}
