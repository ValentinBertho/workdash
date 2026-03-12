import { eq, desc, sql, and, isNull } from 'drizzle-orm';
import { db } from './db';
import {
  teams,
  teamMembers,
  workflowSteps,
  folders,
  folderComments,
  folderHistory,
  folderTasks,
  memberFolderViews,
} from './db/schema';
import {
  Team,
  TeamMember,
  WorkflowStep,
  Folder,
  FolderComment,
  FolderHistoryEntry,
  FolderTask,
  MemberRole,
  HistoryEventType,
  HistoryPayload,
} from '@/types';
import { TEMPLATES, TemplateKey } from './templates';
import { hashPassword } from './auth';

/* ─── Teams ──────────────────────────────────────────────────── */

export async function createTeam(data: {
  slug: string;
  name: string;
  template: TemplateKey;
  password?: string;
  accentColor?: string;
  adminName: string;
}): Promise<{ token: string }> {
  const now = new Date().toISOString();
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  const accentColor = data.accentColor ?? '#ff7a59';

  await db.insert(teams).values({
    slug: data.slug,
    name: data.name,
    passwordHash,
    template: data.template,
    accentColor,
    folderCount: 0,
    createdAt: now,
  });

  const template = TEMPLATES[data.template];
  const stepValues = template.steps.map((s, i) => ({
    id: crypto.randomUUID(),
    teamSlug: data.slug,
    name: s.name,
    color: s.color,
    sortOrder: i,
  }));
  if (stepValues.length > 0) {
    await db.insert(workflowSteps).values(stepValues);
  }

  const token = crypto.randomUUID();
  await db.insert(teamMembers).values({
    id: crypto.randomUUID(),
    teamSlug: data.slug,
    name: data.adminName,
    role: 'admin',
    canComment: true,
    token,
    createdAt: now,
  });

  return { token };
}

export async function getTeam(slug: string): Promise<Team | null> {
  const [row] = await db.select().from(teams).where(eq(teams.slug, slug));
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    accentColor: row.accentColor,
    template: row.template,
    hasPassword: !!row.passwordHash,
    folderCount: row.folderCount,
    createdAt: row.createdAt,
  };
}

export async function getTeamForAuth(slug: string) {
  const [row] = await db.select().from(teams).where(eq(teams.slug, slug));
  return row ?? null;
}

export async function updateTeam(
  slug: string,
  updates: { name?: string; accentColor?: string; password?: string | null }
) {
  const set: Record<string, unknown> = {};
  if (updates.name !== undefined) set.name = updates.name;
  if (updates.accentColor !== undefined) set.accentColor = updates.accentColor;
  if (updates.password !== undefined) {
    set.passwordHash = updates.password ? await hashPassword(updates.password) : null;
  }
  if (Object.keys(set).length > 0) {
    await db.update(teams).set(set).where(eq(teams.slug, slug));
  }
}

/* ─── Members ────────────────────────────────────────────────── */

export async function getTeamMembers(slug: string): Promise<TeamMember[]> {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamSlug, slug))
    .orderBy(teamMembers.createdAt);
  return rows.map(r => ({
    id: r.id,
    teamSlug: r.teamSlug,
    name: r.name,
    role: r.role as MemberRole,
    canComment: r.canComment,
    createdAt: r.createdAt,
  }));
}

export async function getMemberByToken(token: string): Promise<(TeamMember & { teamSlug: string }) | null> {
  const [row] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.token, token));
  if (!row) return null;
  return {
    id: row.id,
    teamSlug: row.teamSlug,
    name: row.name,
    role: row.role as MemberRole,
    canComment: row.canComment,
    createdAt: row.createdAt,
  };
}

export async function getMemberByName(teamSlug: string, name: string): Promise<TeamMember | null> {
  const [row] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamSlug, teamSlug), eq(teamMembers.name, name)));
  if (!row) return null;
  return {
    id: row.id,
    teamSlug: row.teamSlug,
    name: row.name,
    role: row.role as MemberRole,
    canComment: row.canComment,
    createdAt: row.createdAt,
  };
}

export async function getMemberToken(id: string): Promise<string | null> {
  const [row] = await db
    .select({ token: teamMembers.token })
    .from(teamMembers)
    .where(eq(teamMembers.id, id));
  return row?.token ?? null;
}

export async function createMember(data: {
  teamSlug: string;
  name: string;
  role?: MemberRole;
  canComment?: boolean;
}): Promise<{ member: TeamMember; token: string }> {
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.insert(teamMembers).values({
    id,
    teamSlug: data.teamSlug,
    name: data.name,
    role: data.role ?? 'operator',
    canComment: data.canComment ?? true,
    token,
    createdAt: now,
  });
  return {
    token,
    member: {
      id,
      teamSlug: data.teamSlug,
      name: data.name,
      role: data.role ?? 'operator',
      canComment: data.canComment ?? true,
      createdAt: now,
    },
  };
}

export async function updateMember(
  id: string,
  updates: { role?: MemberRole; canComment?: boolean; name?: string }
) {
  const set: Record<string, unknown> = {};
  if (updates.role !== undefined) set.role = updates.role;
  if (updates.canComment !== undefined) set.canComment = updates.canComment;
  if (updates.name !== undefined) set.name = updates.name;
  if (Object.keys(set).length > 0) {
    await db.update(teamMembers).set(set).where(eq(teamMembers.id, id));
  }
}

export async function deleteMember(id: string) {
  await db.delete(teamMembers).where(eq(teamMembers.id, id));
}

/* ─── Workflow steps ─────────────────────────────────────────── */

export async function getTeamSteps(slug: string): Promise<WorkflowStep[]> {
  const rows = await db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.teamSlug, slug))
    .orderBy(workflowSteps.sortOrder);
  return rows.map(r => ({
    id: r.id,
    teamSlug: r.teamSlug,
    name: r.name,
    color: r.color,
    sortOrder: r.sortOrder,
  }));
}

export async function createStep(data: {
  teamSlug: string;
  name: string;
  color: string;
  sortOrder: number;
}): Promise<WorkflowStep> {
  const id = crypto.randomUUID();
  await db.insert(workflowSteps).values({ id, ...data });
  return { id, ...data };
}

export async function updateStep(
  id: string,
  updates: { name?: string; color?: string; sortOrder?: number }
) {
  if (Object.keys(updates).length > 0) {
    await db.update(workflowSteps).set(updates).where(eq(workflowSteps.id, id));
  }
}

export async function deleteStep(id: string) {
  await db.update(folders).set({ stepId: null }).where(eq(folders.stepId, id));
  await db.delete(workflowSteps).where(eq(workflowSteps.id, id));
}

/* ─── Folders ────────────────────────────────────────────────── */

function parseFolder(
  row: typeof folders.$inferSelect,
  members: Array<{ id: string; name: string }>,
  steps: Array<{ id: string; name: string; color: string }>,
  lastViewedAt?: string | null
): Folder {
  const assignee = row.assigneeId ? members.find(m => m.id === row.assigneeId) : undefined;
  const step = row.stepId ? steps.find(s => s.id === row.stepId) : undefined;
  return {
    id: row.id,
    ref: row.ref,
    teamSlug: row.teamSlug,
    title: row.title,
    assigneeId: row.assigneeId ?? undefined,
    assigneeName: assignee?.name,
    stepId: row.stepId ?? undefined,
    stepName: step?.name,
    stepColor: step?.color,
    priority: row.priority,
    tags: JSON.parse(row.tags) as string[],
    description: row.description ?? undefined,
    dueDate: row.dueDate ?? undefined,
    archived: row.archived,
    lastActivityAt: row.lastActivityAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hasUnread: lastViewedAt ? row.lastActivityAt > lastViewedAt : false,
  };
}

export async function getTeamFolders(
  slug: string,
  memberId: string,
  includeArchived = false
): Promise<Folder[]> {
  const [folderRows, memberRows, stepRows, viewRows] = await Promise.all([
    db.select().from(folders).where(
      includeArchived
        ? eq(folders.teamSlug, slug)
        : and(eq(folders.teamSlug, slug), eq(folders.archived, false))
    ).orderBy(desc(folders.lastActivityAt)),
    db.select({ id: teamMembers.id, name: teamMembers.name })
      .from(teamMembers).where(eq(teamMembers.teamSlug, slug)),
    db.select({ id: workflowSteps.id, name: workflowSteps.name, color: workflowSteps.color })
      .from(workflowSteps).where(eq(workflowSteps.teamSlug, slug)),
    db.select({ folderId: memberFolderViews.folderId, lastViewedAt: memberFolderViews.lastViewedAt })
      .from(memberFolderViews).where(eq(memberFolderViews.memberId, memberId)),
  ]);

  const viewMap = new Map(viewRows.map(v => [v.folderId, v.lastViewedAt]));
  return folderRows.map(r => parseFolder(r, memberRows, stepRows, viewMap.get(r.id)));
}

export async function getFolder(id: string, memberId: string): Promise<Folder | null> {
  const [row] = await db.select().from(folders).where(eq(folders.id, id));
  if (!row) return null;
  const [memberRows, stepRows, [viewRow]] = await Promise.all([
    db.select({ id: teamMembers.id, name: teamMembers.name })
      .from(teamMembers).where(eq(teamMembers.teamSlug, row.teamSlug)),
    db.select({ id: workflowSteps.id, name: workflowSteps.name, color: workflowSteps.color })
      .from(workflowSteps).where(eq(workflowSteps.teamSlug, row.teamSlug)),
    db.select({ lastViewedAt: memberFolderViews.lastViewedAt })
      .from(memberFolderViews)
      .where(and(eq(memberFolderViews.memberId, memberId), eq(memberFolderViews.folderId, id))),
  ]);
  return parseFolder(row, memberRows, stepRows, viewRow?.lastViewedAt);
}

export async function createFolder(data: {
  teamSlug: string;
  title: string;
  assigneeId?: string;
  stepId?: string;
  priority?: number;
  tags?: string[];
  description?: string;
  dueDate?: string;
}): Promise<Folder> {
  const now = new Date().toISOString();

  const [updated] = await db
    .update(teams)
    .set({ folderCount: sql`${teams.folderCount} + 1` })
    .where(eq(teams.slug, data.teamSlug))
    .returning({ folderCount: teams.folderCount });

  const year = new Date().getFullYear();
  const ref = `${year}-${String(updated.folderCount).padStart(4, '0')}`;
  const id = crypto.randomUUID();

  await db.insert(folders).values({
    id,
    ref,
    teamSlug: data.teamSlug,
    title: data.title,
    assigneeId: data.assigneeId ?? null,
    stepId: data.stepId ?? null,
    priority: data.priority ?? 0,
    tags: JSON.stringify(data.tags ?? []),
    description: data.description ?? null,
    dueDate: data.dueDate ?? null,
    archived: false,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const folder = await getFolder(id, '');
  return folder!;
}

export async function updateFolder(
  id: string,
  updates: Partial<{
    title: string;
    assigneeId: string | null;
    stepId: string | null;
    priority: number;
    tags: string[];
    description: string | null;
    dueDate: string | null;
    archived: boolean;
  }>
) {
  const now = new Date().toISOString();
  const set: Record<string, unknown> = { updatedAt: now, lastActivityAt: now };
  if (updates.title !== undefined) set.title = updates.title;
  if (updates.assigneeId !== undefined) set.assigneeId = updates.assigneeId;
  if (updates.stepId !== undefined) set.stepId = updates.stepId;
  if (updates.priority !== undefined) set.priority = updates.priority;
  if (updates.tags !== undefined) set.tags = JSON.stringify(updates.tags);
  if (updates.description !== undefined) set.description = updates.description;
  if (updates.dueDate !== undefined) set.dueDate = updates.dueDate;
  if (updates.archived !== undefined) set.archived = updates.archived;
  await db.update(folders).set(set).where(eq(folders.id, id));
}

/* ─── Comments ───────────────────────────────────────────────── */

export async function getFolderComments(folderId: string): Promise<FolderComment[]> {
  const rows = await db
    .select()
    .from(folderComments)
    .where(eq(folderComments.folderId, folderId))
    .orderBy(folderComments.createdAt);
  return rows.map(r => ({
    id: r.id,
    folderId: r.folderId,
    authorId: r.authorId ?? undefined,
    authorName: r.authorName,
    text: r.text,
    createdAt: r.createdAt,
  }));
}

export async function addComment(data: {
  folderId: string;
  authorId?: string;
  authorName: string;
  text: string;
}): Promise<FolderComment> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(folderComments).values({
    id,
    folderId: data.folderId,
    authorId: data.authorId ?? null,
    authorName: data.authorName,
    text: data.text,
    createdAt: now,
  });
  await db.update(folders).set({ lastActivityAt: now, updatedAt: now }).where(eq(folders.id, data.folderId));
  return { id, folderId: data.folderId, authorId: data.authorId, authorName: data.authorName, text: data.text, createdAt: now };
}

/* ─── History ────────────────────────────────────────────────── */

export async function getFolderHistory(folderId: string): Promise<FolderHistoryEntry[]> {
  const rows = await db
    .select()
    .from(folderHistory)
    .where(eq(folderHistory.folderId, folderId))
    .orderBy(desc(folderHistory.createdAt));
  return rows.map(r => ({
    id: r.id,
    folderId: r.folderId,
    actorName: r.actorName,
    type: r.type as HistoryEventType,
    payload: JSON.parse(r.payload) as HistoryPayload,
    createdAt: r.createdAt,
  }));
}

export async function addHistoryEntry(data: {
  folderId: string;
  actorName: string;
  type: HistoryEventType;
  payload: HistoryPayload;
}) {
  await db.insert(folderHistory).values({
    id: crypto.randomUUID(),
    folderId: data.folderId,
    actorName: data.actorName,
    type: data.type,
    payload: JSON.stringify(data.payload),
    createdAt: new Date().toISOString(),
  });
}

/* ─── Views (notifications) ──────────────────────────────────── */

/* ─── Tasks ──────────────────────────────────────────────────── */

export async function getFolderTasks(folderId: string): Promise<FolderTask[]> {
  const rows = await db
    .select()
    .from(folderTasks)
    .where(eq(folderTasks.folderId, folderId))
    .orderBy(folderTasks.sortOrder, folderTasks.createdAt);
  return rows.map(r => ({
    id: r.id,
    folderId: r.folderId,
    title: r.title,
    done: r.done,
    assigneeId: r.assigneeId ?? undefined,
    assigneeName: r.assigneeName ?? undefined,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
  }));
}

export async function createFolderTask(data: {
  folderId: string;
  title: string;
  assigneeId?: string;
  assigneeName?: string;
  sortOrder?: number;
}): Promise<FolderTask> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(folderTasks).values({
    id,
    folderId: data.folderId,
    title: data.title,
    done: false,
    assigneeId: data.assigneeId ?? null,
    assigneeName: data.assigneeName ?? null,
    sortOrder: data.sortOrder ?? 0,
    createdAt: now,
  });
  return {
    id, folderId: data.folderId, title: data.title, done: false,
    assigneeId: data.assigneeId, assigneeName: data.assigneeName,
    sortOrder: data.sortOrder ?? 0, createdAt: now,
  };
}

export async function updateFolderTask(
  id: string,
  updates: Partial<{ title: string; done: boolean; assigneeId: string | null; assigneeName: string | null; sortOrder: number }>,
): Promise<void> {
  await db.update(folderTasks).set(updates).where(eq(folderTasks.id, id));
}

export async function deleteFolderTask(id: string): Promise<void> {
  await db.delete(folderTasks).where(eq(folderTasks.id, id));
}

export async function markFolderViewed(memberId: string, folderId: string) {
  const now = new Date().toISOString();
  await db
    .insert(memberFolderViews)
    .values({ memberId, folderId, lastViewedAt: now })
    .onConflictDoUpdate({
      target: [memberFolderViews.memberId, memberFolderViews.folderId],
      set: { lastViewedAt: sql`excluded.last_viewed_at` },
    });
}
