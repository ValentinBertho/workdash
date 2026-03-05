import fs from 'fs';
import path from 'path';
import { DashboardData, Comment, ChangelogEntry, ManagerTask, DecisionPoint } from '@/types';

// File-based storage (falls back to in-memory when filesystem is read-only, e.g. Vercel)
// You can force a persistent folder with WORKDASH_DATA_DIR.
const DATA_DIR = process.env.WORKDASH_DATA_DIR
  ?? (process.env.VERCEL ? '/tmp/workdash-data' : path.join(process.cwd(), '.data'));
const memoryStore = new Map<string, unknown>();

function canUseFileStorage(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function readFile<T>(filename: string, fallback: T): T {
  if (!canUseFileStorage()) {
    return (memoryStore.get(filename) as T | undefined) ?? fallback;
  }

  const file = path.join(DATA_DIR, filename);
  const backup = `${file}.bak`;
  try {
    if (!fs.existsSync(file)) {
      if (fs.existsSync(backup)) {
        return JSON.parse(fs.readFileSync(backup, 'utf-8')) as T;
      }
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    // Corrupted write safety net: recover from previous good snapshot.
    try {
      if (fs.existsSync(backup)) {
        return JSON.parse(fs.readFileSync(backup, 'utf-8')) as T;
      }
    } catch {
      // noop
    }
    return fallback;
  }
}

function writeFile(filename: string, data: unknown): void {
  if (!canUseFileStorage()) {
    memoryStore.set(filename, data);
    return;
  }

  const file = path.join(DATA_DIR, filename);
  const backup = `${file}.bak`;
  const temp = `${file}.tmp`;
  try {
    // Keep last successful snapshot.
    if (fs.existsSync(file)) fs.copyFileSync(file, backup);
    // Atomic replace to avoid partial/corrupted files on crash.
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(temp, file);
  } catch {
    try {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    } catch {
      // noop
    }
    memoryStore.set(filename, data);
  }
}

const DEFAULT_DECISIONS: DecisionPoint[] = [
  { id: 'dp1', text: 'SMART TECH évol : arbitrer les évolutions en attente de validation Nadir', status: 'open', createdAt: new Date('2026-03-01').toISOString() },
  { id: 'dp2', text: 'BOOKINGS : confirmer la pertinence de maintenir le développement', status: 'open', createdAt: new Date('2026-03-01').toISOString() },
  { id: 'dp3', text: 'SCAN IT : planifier validation AMOR + fenêtre de test global', status: 'open', createdAt: new Date('2026-03-01').toISOString() },
];

/* ─── Dashboard data ─────────────────────────────────────────── */
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
      currentAction: 'Évolutions fonctionnelles préparées, en attente d’arbitrage',
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
        { id: 'ao2', label: 'Réalisation d’une V1', done: false },
      ]
    },
    {
      id: 'ws-notif', name: 'WS notif', priority: 5, status: 'ok', progress: 100,
      currentAction: 'Validation technique réalisée',
      nextStep: 'Capitaliser ce test dans un flux produit',
      tasks: [
        { id: 'ws1', label: 'Tester la création d’un mail brouillon depuis WS Notif', done: true },
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
      currentAction: 'Socle livré, évolutions en file d’attente',
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
      currentAction: 'Lot d’évolutions post-développement',
      nextStep: 'Livrer ajout analytique/gestion frais véhicule puis suppression de frais',
      tasks: [
        { id: 'ndf1', label: 'Développement initial', done: true },
        { id: 'ndf2', label: 'Évolution 1 : ajout analytique / gestion frais véhicule', done: false },
        { id: 'ndf3', label: 'Évolution 2 : supprimer un frais d’une note de frais', done: false },
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
        { id: 'sc3', label: 'Test global de l’application — En attente', done: false },
      ]
    },
  ]
};

export async function getData(): Promise<DashboardData> {
  return readFile<DashboardData>('dashboard.json', defaultData);
}

export async function saveData(data: DashboardData): Promise<void> {
  writeFile('dashboard.json', { ...data, updatedAt: new Date().toISOString() });
}

/* ─── Comments ───────────────────────────────────────────────── */
export async function getComments(): Promise<Comment[]> {
  return readFile<Comment[]>('comments.json', []);
}

export async function saveComment(comment: Comment): Promise<void> {
  const existing = await getComments();
  writeFile('comments.json', [...existing, comment]);
}

export async function deleteComment(id: string): Promise<void> {
  const existing = await getComments();
  writeFile('comments.json', existing.filter(c => c.id !== id));
}

/* ─── Changelog ──────────────────────────────────────────────── */
export async function getChangelog(): Promise<ChangelogEntry[]> {
  return readFile<ChangelogEntry[]>('changelog.json', []);
}

export async function addChangelogEntries(entries: ChangelogEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const existing = await getChangelog();
  const merged = [...existing, ...entries];
  writeFile('changelog.json', merged.slice(-500));
}

/* ─── Manager tasks ──────────────────────────────────────────── */
export async function getManagerTasks(): Promise<ManagerTask[]> {
  return readFile<ManagerTask[]>('manager-tasks.json', []);
}

export async function saveManagerTask(task: ManagerTask): Promise<void> {
  const existing = await getManagerTasks();
  writeFile('manager-tasks.json', [...existing, task]);
}

export async function updateManagerTask(id: string, updates: Partial<ManagerTask>): Promise<void> {
  const existing = await getManagerTasks();
  writeFile('manager-tasks.json', existing.map(t => t.id === id ? { ...t, ...updates } : t));
}

export async function deleteManagerTask(id: string): Promise<void> {
  const existing = await getManagerTasks();
  writeFile('manager-tasks.json', existing.filter(t => t.id !== id));
}

/* ─── Decision points ────────────────────────────────────── */
export async function getDecisions(): Promise<DecisionPoint[]> {
  return readFile<DecisionPoint[]>('decisions.json', DEFAULT_DECISIONS);
}

export async function saveDecision(decision: DecisionPoint): Promise<void> {
  const existing = await getDecisions();
  writeFile('decisions.json', [...existing, decision]);
}

export async function updateDecision(id: string, updates: Partial<DecisionPoint>): Promise<void> {
  const existing = await getDecisions();
  writeFile('decisions.json', existing.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d));
}

export async function deleteDecision(id: string): Promise<void> {
  const existing = await getDecisions();
  writeFile('decisions.json', existing.filter(d => d.id !== id));
}
