import { eq, notInArray, desc, sql } from 'drizzle-orm';
import { db } from './db';
import {
  projects as projectsTable,
  tasks as tasksTable,
  weeklyTodos as todosTable,
  comments as commentsTable,
  changelog as changelogTable,
  managerTasks as managerTasksTable,
  decisions as decisionsTable,
} from './db/schema';
import { DashboardData, Comment, ChangelogEntry, ManagerTask, DecisionPoint, Status } from '@/types';

/* ─── Default seed data ──────────────────────────────────────── */
export const defaultData: DashboardData = {
  updatedAt: new Date().toISOString(),
  weeklyTodos: [
    { id: 'w1', label: 'Mes RDV V2 — Continuer développement ISO V1', done: false },
    { id: 'w2', label: 'Mes RDV V2 — Ajouter fonctionnalités V2', done: false },
    { id: 'w3', label: 'Add-in Outlook — Réaliser une V1 stable', done: false },
    { id: 'w4', label: 'TX2 — Traiter le retour de test de Théry', done: false },
    { id: 'w5', label: 'Refonte SMART-TECH API vers BDD ATHENEO', done: false },
    { id: 'w6', label: 'Refonte CHORUS — suppression dépendances JPA/Hibernate', done: false },
    { id: 'w7', label: 'NDF — cadrer évolutions analytiques et suppression de frais', done: false },
    { id: 'w8', label: 'Outil Audit — préparer lot évolutions CRON/réconciliation/dynamique', done: false },
  ],
  projects: [
    {
      id: 'facturx-mentions', name: 'INTERFACE FACTURX — Mentions légales Terrena', priority: 1, status: 'ok', progress: 100,
      currentAction: 'Développement et packaging livrés',
      nextStep: 'Suivi post-livraison côté Terrena',
      tasks: [
        { id: 'fx1', label: 'Développer ajout des mentions légales', done: true },
        { id: 'fx2', label: 'Packager la version Terrena', done: true },
      ]
    },
    {
      id: 'mes-rdv-v2', name: 'Mes RDV V2', priority: 2, status: 'en-cours', progress: 55,
      currentAction: 'Poursuite du développement ISO V1',
      nextStep: 'Ajouter les fonctionnalités V2',
      tasks: [
        { id: 'rdv1', label: 'Continuer développement ISO V1', done: false },
        { id: 'rdv2', label: 'Ajouter fonctionnalités V2', done: false },
      ]
    },
    {
      id: 'smart-tech-evol', name: 'Smart tech évol', priority: 3, status: 'bloque', progress: 35,
      currentAction: 'Évolutions fonctionnelles préparées, en attente d\'arbitrage',
      nextStep: 'Relancer Nadir pour validation des évolutions 1 & 2',
      tasks: [
        { id: 'ste1', label: 'Évolution 1 : une intervention sur plusieurs dates — En attente Nadir', done: false },
        { id: 'ste2', label: 'Évolution 2 : une intervention avec plusieurs participants — En attente Nadir', done: false },
      ]
    },
    {
      id: 'addin-outlook', name: 'Add-in Outlook', priority: 4, status: 'en-cours', progress: 60,
      currentAction: 'Construction de la V1',
      nextStep: 'Finaliser puis valider une V1 exploitable',
      tasks: [
        { id: 'ao1', label: 'Test protocole ATH depuis le nouveau client Windows', done: true },
        { id: 'ao2', label: 'Réalisation d\'une V1', done: false },
      ]
    },
    {
      id: 'ws-notif', name: 'WS notif', priority: 5, status: 'ok', progress: 100,
      currentAction: 'Validation technique réalisée',
      nextStep: 'Capitaliser ce test dans un flux produit',
      tasks: [
        { id: 'ws1', label: 'Tester la création d\'un mail brouillon depuis WS Notif', done: true },
      ]
    },
    {
      id: 'tx2', name: 'Interface TX2', priority: 6, status: 'en-cours', progress: 65,
      currentAction: 'Analyse des retours de test de Théry',
      nextStep: 'Appliquer corrections puis revalider',
      tasks: [
        { id: 'tx1', label: 'Retour de test de Théry', done: false },
      ]
    },
    {
      id: 'outil-audit', name: 'Outil audit', priority: 7, status: 'bloque', progress: 70,
      currentAction: 'Socle livré, évolutions en file d\'attente',
      nextStep: 'Prioriser CRON, réconciliation auto puis paramétrage dynamique',
      tasks: [
        { id: 'au1', label: 'Développement du socle', done: true },
        { id: 'au2', label: 'Évolution 1 : tâche cron pour lancer Audit — En attente', done: false },
        { id: 'au3', label: 'Évolution 2 : réconciliation auto — En attente', done: false },
        { id: 'au4', label: 'Évolution 3 : paramètre dynamique — En attente', done: false },
      ]
    },
    {
      id: 'ndf', name: 'Appli NDF', priority: 8, status: 'en-cours', progress: 72,
      currentAction: 'Lot d\'évolutions post-développement',
      nextStep: 'Livrer ajout analytique/gestion frais véhicule puis suppression de frais',
      tasks: [
        { id: 'ndf1', label: 'Développement initial', done: true },
        { id: 'ndf2', label: 'Évolution 1 : ajout analytique / gestion frais véhicule', done: false },
        { id: 'ndf3', label: 'Évolution 2 : supprimer un frais d\'une note de frais', done: false },
      ]
    },
    {
      id: 'sage', name: 'Interface SAGE', priority: 9, status: 'a-deployer', progress: 85,
      currentAction: 'Développement terminé, en phase de préparation tests',
      nextStep: 'Lancer et valider le test fonctionnel',
      tasks: [
        { id: 'sg1', label: 'Développement', done: true },
        { id: 'sg2', label: 'Test fonctionnel — En attente', done: false },
      ]
    },
    {
      id: 'refonte-smart-tech', name: 'Refonte smart tech', priority: 10, status: 'en-cours', progress: 48,
      currentAction: 'Refonte API SMART-TECH pour branchement direct BDD ATHENEO',
      nextStep: 'Stabiliser la connexion et finaliser les endpoints clés',
      tasks: [
        { id: 'rst1', label: 'Refonte API SMART-TECH vers la BDD ATHENEO', done: false },
      ]
    },
    {
      id: 'refonte-chorus', name: 'Refonte chorus / hibernate', priority: 11, status: 'en-cours', progress: 50,
      currentAction: 'Suppression progressive des dépendances JPA/Hibernate',
      nextStep: 'Finaliser la migration puis lancer batterie de tests',
      tasks: [
        { id: 'rc1', label: 'Supprimer dépendances JPA/Hibernate dans Interface CHORUS', done: false },
      ]
    },
    {
      id: 'bookings', name: 'BOOKINGS', priority: 12, status: 'a-cadrer', progress: 15,
      currentAction: 'Projet en observation',
      nextStep: 'Décider si le développement doit être maintenu',
      tasks: [
        { id: 'bk1', label: 'Pertinence de maintenir le développement ? — En attente', done: false },
      ]
    },
    {
      id: 'scan-it', name: 'Scan it', priority: 13, status: 'bloque', progress: 58,
      currentAction: 'Socle série finalisé, attente validations externes',
      nextStep: 'Débloquer AMOR puis lancer test global',
      tasks: [
        { id: 'sc1', label: 'Développement gestion numéro de série', done: true },
        { id: 'sc2', label: 'Adaptation fonctionnelle des requêtes — En attente AMOR', done: false },
        { id: 'sc3', label: 'Test global de l\'application — En attente', done: false },
      ]
    },
  ]
};

/* ─── Dashboard data ─────────────────────────────────────────── */
export async function getData(): Promise<DashboardData> {
  const [projectRows, taskRows, todoRows] = await Promise.all([
    db.select().from(projectsTable).orderBy(projectsTable.priority),
    db.select().from(tasksTable),
    db.select().from(todosTable).orderBy(todosTable.sortOrder),
  ]);

  // Auto-seed on first run
  if (projectRows.length === 0) {
    await saveData(defaultData);
    return defaultData;
  }

  return {
    projects: projectRows.map(p => ({
      id: p.id,
      name: p.name,
      priority: p.priority,
      status: p.status as Status,
      progress: p.progress,
      currentAction: p.currentAction,
      nextStep: p.nextStep,
      tasks: taskRows
        .filter(t => t.projectId === p.id)
        .map(t => ({
          id: t.id,
          label: t.label,
          done: t.done,
          ...(t.assignedBy ? { assignedBy: t.assignedBy as 'manager' } : {}),
          ...(t.dueDate ? { dueDate: t.dueDate } : {}),
        })),
      ...(p.notes ? { notes: p.notes } : {}),
      ...(p.dueDate ? { dueDate: p.dueDate } : {}),
    })),
    weeklyTodos: todoRows.map(t => ({ id: t.id, label: t.label, done: t.done })),
    updatedAt: new Date().toISOString(),
  };
}

export async function saveData(data: DashboardData): Promise<void> {
  const now = new Date().toISOString();

  if (data.projects.length > 0) {
    await db.insert(projectsTable)
      .values(data.projects.map(p => ({
        id: p.id,
        name: p.name,
        priority: p.priority,
        status: p.status,
        progress: p.progress,
        currentAction: p.currentAction,
        nextStep: p.nextStep,
        notes: p.notes ?? null,
        dueDate: p.dueDate ?? null,
        updatedAt: now,
      })))
      .onConflictDoUpdate({
        target: projectsTable.id,
        set: {
          name: sql`excluded.name`,
          priority: sql`excluded.priority`,
          status: sql`excluded.status`,
          progress: sql`excluded.progress`,
          currentAction: sql`excluded.current_action`,
          nextStep: sql`excluded.next_step`,
          notes: sql`excluded.notes`,
          dueDate: sql`excluded.due_date`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
    const projectIds = data.projects.map(p => p.id);
    await db.delete(projectsTable).where(notInArray(projectsTable.id, projectIds));
  } else {
    await db.delete(projectsTable);
  }

  const allTasks = data.projects.flatMap(p =>
    p.tasks.map(t => ({
      id: t.id,
      projectId: p.id,
      label: t.label,
      done: t.done,
      assignedBy: t.assignedBy ?? null,
      dueDate: t.dueDate ?? null,
    }))
  );

  if (allTasks.length > 0) {
    await db.insert(tasksTable)
      .values(allTasks)
      .onConflictDoUpdate({
        target: tasksTable.id,
        set: {
          label: sql`excluded.label`,
          done: sql`excluded.done`,
          assignedBy: sql`excluded.assigned_by`,
          dueDate: sql`excluded.due_date`,
        },
      });
    const taskIds = allTasks.map(t => t.id);
    await db.delete(tasksTable).where(notInArray(tasksTable.id, taskIds));
  } else {
    await db.delete(tasksTable);
  }

  if (data.weeklyTodos.length > 0) {
    await db.insert(todosTable)
      .values(data.weeklyTodos.map((t, i) => ({
        id: t.id,
        label: t.label,
        done: t.done,
        sortOrder: i,
      })))
      .onConflictDoUpdate({
        target: todosTable.id,
        set: {
          label: sql`excluded.label`,
          done: sql`excluded.done`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
    const todoIds = data.weeklyTodos.map(t => t.id);
    await db.delete(todosTable).where(notInArray(todosTable.id, todoIds));
  } else {
    await db.delete(todosTable);
  }
}

/* ─── Comments ───────────────────────────────────────────────── */
export async function getComments(): Promise<Comment[]> {
  const rows = await db.select().from(commentsTable).orderBy(commentsTable.createdAt);
  return rows.map(r => ({
    id: r.id,
    projectId: r.projectId,
    author: r.author as 'manager' | 'valentin',
    text: r.text,
    createdAt: r.createdAt,
  }));
}

export async function saveComment(comment: Comment): Promise<void> {
  await db.insert(commentsTable).values({
    id: comment.id,
    projectId: comment.projectId,
    author: comment.author,
    text: comment.text,
    createdAt: comment.createdAt,
  });
}

export async function deleteComment(id: string): Promise<void> {
  await db.delete(commentsTable).where(eq(commentsTable.id, id));
}

/* ─── Changelog ──────────────────────────────────────────────── */
export async function getChangelog(): Promise<ChangelogEntry[]> {
  const rows = await db.select().from(changelogTable)
    .orderBy(desc(changelogTable.createdAt))
    .limit(500);
  return rows.map(r => ({
    id: r.id,
    projectId: r.projectId ?? undefined,
    projectName: r.projectName ?? undefined,
    type: r.type as ChangelogEntry['type'],
    description: r.description,
    from: r.fromValue ?? undefined,
    to: r.toValue ?? undefined,
    createdAt: r.createdAt,
    author: r.author as ChangelogEntry['author'],
  }));
}

export async function addChangelogEntries(entries: ChangelogEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await db.insert(changelogTable).values(entries.map(e => ({
    id: e.id,
    projectId: e.projectId ?? null,
    projectName: e.projectName ?? null,
    type: e.type,
    description: e.description,
    fromValue: e.from ?? null,
    toValue: e.to ?? null,
    createdAt: e.createdAt,
    author: e.author,
  })));
}

/* ─── Manager tasks ──────────────────────────────────────────── */
export async function getManagerTasks(): Promise<ManagerTask[]> {
  const rows = await db.select().from(managerTasksTable).orderBy(desc(managerTasksTable.createdAt));
  return rows.map(r => ({
    id: r.id,
    projectId: r.projectId,
    projectName: r.projectName,
    label: r.label,
    priority: r.priority as 'high' | 'medium' | 'low',
    dueDate: r.dueDate ?? undefined,
    done: r.done,
    createdAt: r.createdAt,
    note: r.note ?? undefined,
  }));
}

export async function saveManagerTask(task: ManagerTask): Promise<void> {
  await db.insert(managerTasksTable).values({
    id: task.id,
    projectId: task.projectId,
    projectName: task.projectName,
    label: task.label,
    priority: task.priority,
    dueDate: task.dueDate ?? null,
    done: task.done,
    createdAt: task.createdAt,
    note: task.note ?? null,
  });
}

export async function updateManagerTask(id: string, updates: Partial<ManagerTask>): Promise<void> {
  const set: Partial<typeof managerTasksTable.$inferInsert> = {};
  if (updates.label !== undefined) set.label = updates.label;
  if (updates.priority !== undefined) set.priority = updates.priority;
  if (updates.dueDate !== undefined) set.dueDate = updates.dueDate ?? null;
  if (updates.done !== undefined) set.done = updates.done;
  if (updates.note !== undefined) set.note = updates.note ?? null;
  if (Object.keys(set).length > 0) {
    await db.update(managerTasksTable).set(set).where(eq(managerTasksTable.id, id));
  }
}

export async function deleteManagerTask(id: string): Promise<void> {
  await db.delete(managerTasksTable).where(eq(managerTasksTable.id, id));
}

/* ─── Decision points ────────────────────────────────────────── */
export async function getDecisions(): Promise<DecisionPoint[]> {
  const rows = await db.select().from(decisionsTable).orderBy(decisionsTable.createdAt);
  return rows.map(r => ({
    id: r.id,
    text: r.text,
    status: r.status as 'open' | 'decided' | 'deferred',
    resolution: r.resolution ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? undefined,
  }));
}

export async function saveDecision(decision: DecisionPoint): Promise<void> {
  await db.insert(decisionsTable).values({
    id: decision.id,
    text: decision.text,
    status: decision.status,
    resolution: decision.resolution ?? null,
    createdAt: decision.createdAt,
    updatedAt: null,
  });
}

export async function updateDecision(id: string, updates: Partial<DecisionPoint>): Promise<void> {
  const set: Partial<typeof decisionsTable.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (updates.status !== undefined) set.status = updates.status;
  if (updates.resolution !== undefined) set.resolution = updates.resolution ?? null;
  if (updates.text !== undefined) set.text = updates.text;
  await db.update(decisionsTable).set(set).where(eq(decisionsTable.id, id));
}

export async function deleteDecision(id: string): Promise<void> {
  await db.delete(decisionsTable).where(eq(decisionsTable.id, id));
}
