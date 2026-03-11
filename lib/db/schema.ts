import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  priority: integer('priority').notNull().default(0),
  status: text('status').notNull().default('en-cours'),
  progress: integer('progress').notNull().default(0),
  currentAction: text('current_action').notNull().default(''),
  nextStep: text('next_step').notNull().default(''),
  notes: text('notes'),
  dueDate: text('due_date'),
  updatedAt: text('updated_at').notNull(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  done: boolean('done').notNull().default(false),
  assignedBy: text('assigned_by'),
  dueDate: text('due_date'),
});

export const weeklyTodos = pgTable('weekly_todos', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  done: boolean('done').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  author: text('author').notNull(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});

export const changelog = pgTable('changelog', {
  id: text('id').primaryKey(),
  projectId: text('project_id'),
  projectName: text('project_name'),
  type: text('type').notNull(),
  description: text('description').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  createdAt: text('created_at').notNull(),
  author: text('author').notNull(),
});

export const managerTasks = pgTable('manager_tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  projectName: text('project_name').notNull(),
  label: text('label').notNull(),
  priority: text('priority').notNull().default('medium'),
  dueDate: text('due_date'),
  done: boolean('done').notNull().default(false),
  createdAt: text('created_at').notNull(),
  note: text('note'),
});

export const decisions = pgTable('decisions', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  status: text('status').notNull().default('open'),
  resolution: text('resolution'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});
