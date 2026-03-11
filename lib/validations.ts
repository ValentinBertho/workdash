import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(500),
  done: z.boolean(),
  assignedBy: z.enum(['manager']).optional(),
  dueDate: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  priority: z.number().int().min(0),
  status: z.enum(['en-cours', 'a-deployer', 'ok', 'bloque', 'a-cadrer']),
  progress: z.number().int().min(0).max(100),
  currentAction: z.string().max(500),
  nextStep: z.string().max(500),
  tasks: z.array(TaskSchema),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
});

export const WeeklyTodoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(300),
  done: z.boolean(),
});

export const DashboardDataSchema = z.object({
  projects: z.array(ProjectSchema),
  weeklyTodos: z.array(WeeklyTodoSchema),
  updatedAt: z.string(),
});

export const CommentSchema = z.object({
  text: z.string().min(1).max(2000),
  projectId: z.string().min(1),
  author: z.enum(['manager', 'valentin']),
});

export const ManagerTaskCreateSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().optional(),
  label: z.string().min(1).max(500),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  dueDate: z.string().optional(),
  note: z.string().max(1000).optional(),
});

export const ManagerTaskUpdateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(500).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  dueDate: z.string().optional(),
  done: z.boolean().optional(),
  note: z.string().max(1000).optional(),
});

export const DecisionCreateSchema = z.object({
  text: z.string().min(1).max(1000),
});

export const DecisionUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['open', 'decided', 'deferred']).optional(),
  resolution: z.string().max(1000).optional(),
  text: z.string().min(1).max(1000).optional(),
});
