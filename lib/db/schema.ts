import { pgTable, text, integer, boolean, primaryKey } from 'drizzle-orm/pg-core';

export const teams = pgTable('teams', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  template: text('template').notNull().default('custom'),
  accentColor: text('accent_color').notNull().default('#ff7a59'),
  folderCount: integer('folder_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey(),
  teamSlug: text('team_slug').notNull().references(() => teams.slug, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role').notNull().default('operator'), // admin | operator | viewer
  canComment: boolean('can_comment').notNull().default(true),
  passwordHash: text('password_hash'), // optional per-member password
  token: text('token').notNull(),
  sessionVersion: integer('session_version').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const workflowSteps = pgTable('workflow_steps', {
  id: text('id').primaryKey(),
  teamSlug: text('team_slug').notNull().references(() => teams.slug, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6b7280'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const folders = pgTable('folders', {
  id: text('id').primaryKey(),
  ref: text('ref').notNull(),
  teamSlug: text('team_slug').notNull().references(() => teams.slug, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  assigneeId: text('assignee_id'),
  stepId: text('step_id'),
  priority: integer('priority').notNull().default(0),
  tags: text('tags').notNull().default('[]'), // JSON array
  description: text('description'),
  dueDate: text('due_date'),
  archived: boolean('archived').notNull().default(false),
  lastActivityAt: text('last_activity_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const folderComments = pgTable('folder_comments', {
  id: text('id').primaryKey(),
  folderId: text('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
  authorId: text('author_id'),
  authorName: text('author_name').notNull(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});

export const folderHistory = pgTable('folder_history', {
  id: text('id').primaryKey(),
  folderId: text('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
  actorName: text('actor_name').notNull(),
  type: text('type').notNull(), // step_change | comment | assignment | priority_change | due_date_change
  payload: text('payload').notNull(), // structured JSON
  createdAt: text('created_at').notNull(),
});

export const folderTasks = pgTable('folder_tasks', {
  id: text('id').primaryKey(),
  folderId: text('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  done: boolean('done').notNull().default(false),
  assigneeId: text('assignee_id'),
  assigneeName: text('assignee_name'),
  dueDate: text('due_date'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const memberFolderViews = pgTable('member_folder_views', {
  memberId: text('member_id').notNull().references(() => teamMembers.id, { onDelete: 'cascade' }),
  folderId: text('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
  lastViewedAt: text('last_viewed_at').notNull(),
}, (t) => [primaryKey({ columns: [t.memberId, t.folderId] })]);
