export type Status = 'en-cours' | 'a-deployer' | 'ok' | 'bloque' | 'a-cadrer';

export interface Task {
  id: string;
  label: string;
  done: boolean;
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
