import fs from 'fs';
import path from 'path';
import { DashboardData, Comment, ChangelogEntry, ManagerTask, DecisionPoint } from '@/types';

// File-based storage (falls back to in-memory when filesystem is read-only, e.g. Vercel)
const DATA_DIR = process.env.VERCEL
  ? '/tmp/workdash-data'
  : path.join(process.cwd(), '.data');
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
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch { return fallback; }
}

function writeFile(filename: string, data: unknown): void {
  if (!canUseFileStorage()) {
    memoryStore.set(filename, data);
    return;
  }

  const file = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    memoryStore.set(filename, data);
  }
}

const DEFAULT_DECISIONS: DecisionPoint[] = [
  { id: 'dp1', text: "Brouillon mail via API GRAPH — confirmer l'implémentation ?", status: 'open', createdAt: new Date('2026-03-01').toISOString() },
  { id: 'dp2', text: "NDF : ajout analytique + suppression d'un frais — priorité et délai ?", status: 'open', createdAt: new Date('2026-03-01').toISOString() },
  { id: 'dp3', text: "Outil d'Audit : lancer CRON auto + réconciliation + paramétrage dynamique ?", status: 'open', createdAt: new Date('2026-03-01').toISOString() },
];

/* ─── Dashboard data ─────────────────────────────────────────── */
export const defaultData: DashboardData = {
  updatedAt: new Date().toISOString(),
  weeklyTodos: [
    { id: 'w1', label: 'Envoyer API Sage analyse', done: true },
    { id: 'w2', label: 'Brouillon GRAPH premier jet', done: true },
    { id: 'w3', label: 'Continuer Add-in Outlook', done: true },
    { id: 'w4', label: 'Générer version test CHORUS (PS)', done: true },
    { id: 'w5', label: 'Relancer suivi ticket PXO', done: false },
    { id: 'w6', label: 'Avancer RDV V2', done: false },
    { id: 'w7', label: 'Préparer version Factur-X Terrena', done: false },
    { id: 'w8', label: 'Installer FacturX nouveautés Terrena', done: false },
    { id: 'w9', label: 'Avancer API SMART TECH V2', done: false },
  ],
  projects: [
    {
      id: 'chorus', name: 'Interface CHORUS', priority: 1, status: 'en-cours', progress: 45,
      currentAction: 'Décommissionnement JPA/Hibernate en procédure stockée',
      nextStep: 'Valider les tests en environnement THCR',
      tasks: [
        { id: 'c1', label: 'Décom JPA / Hibernate → Procédures stockées', done: false },
        { id: 'c2', label: 'Générer version de test', done: true },
      ]
    },
    {
      id: 'facturx', name: 'Interface FacturX', priority: 2, status: 'a-deployer', progress: 75,
      currentAction: 'Préparer le déploiement Terrena avec les nouvelles fonctionnalités',
      nextStep: 'Installer la version FacturX avec nouveautés chez Terrena',
      tasks: [
        { id: 'f1', label: 'Finaliser TX2', done: true },
        { id: 'f2', label: 'API Sage — brouillon envoyé', done: true },
        { id: 'f3', label: 'Préparer version Factur-X Terrena', done: false },
        { id: 'f4', label: 'Installer nouveautés Terrena', done: false },
      ]
    },
    {
      id: 'graph', name: 'SYNC Graph — API Microsoft', priority: 3, status: 'en-cours', progress: 50,
      currentAction: 'Décommissionnement des tables temporaires',
      nextStep: 'Attente retour de test THCR · Relancer ticket PXO',
      tasks: [
        { id: 'g1', label: 'Analyse API Sage envoyée', done: true },
        { id: 'g2', label: 'Brouillon GRAPH — premier jet', done: true },
        { id: 'g3', label: 'Retour de test THCR', done: false },
        { id: 'g4', label: 'Relancer suivi ticket PXO', done: false },
      ]
    },
    {
      id: 'ndf', name: 'Appli NDF', priority: 4, status: 'ok', progress: 70,
      currentAction: 'Développement du module analytique',
      nextStep: 'Intégrer ajout analytique + suppression de frais',
      tasks: [
        { id: 'n1', label: 'Démo sur NA-ATHERP', done: true },
        { id: 'n2', label: 'Ajout analytique', done: false },
        { id: 'n3', label: 'Suppression d\'un frais dans NDF', done: false },
      ]
    },
    {
      id: 'scanit', name: 'SCAN-IT', priority: 5, status: 'en-cours', progress: 80,
      currentAction: 'Finalisation des modifications récentes',
      nextStep: 'Démo des modifs — validation fonctionnelle',
      tasks: [
        { id: 's1', label: 'Finalisation fonctionnelle', done: false },
        { id: 's2', label: 'Démo modifs récentes', done: false },
      ]
    },
    {
      id: 'outlook', name: 'Add-in Outlook', priority: 6, status: 'en-cours', progress: 50,
      currentAction: 'Développement en cours — brouillon mail via API GRAPH',
      nextStep: 'Créer brouillon de mail depuis l\'API GRAPH (TODO YN)',
      tasks: [
        { id: 'o1', label: 'Développement Add-in', done: true },
        { id: 'o2', label: 'Créer brouillon depuis API GRAPH', done: false },
        { id: 'o3', label: 'Démo à préparer', done: false },
      ]
    },
    {
      id: 'athmobile', name: 'ATH Mobile', priority: 7, status: 'en-cours', progress: 40,
      currentAction: 'Développements en cours',
      nextStep: 'Préparer démo du développement en cours',
      tasks: [
        { id: 'a1', label: 'Développements feature en cours', done: false },
        { id: 'a2', label: 'Démo à préparer', done: false },
      ]
    },
    {
      id: 'smarttech', name: 'SMART TECH V2', priority: 8, status: 'en-cours', progress: 30,
      currentAction: 'Refonte en application PWA classique',
      nextStep: 'Avancer API V2 + migration PWA',
      tasks: [
        { id: 'st1', label: 'Migration vers PWA classique', done: false },
        { id: 'st2', label: 'Avancer API V2', done: false },
      ]
    },
    {
      id: 'audit', name: 'Outil d\'Audit', priority: 9, status: 'bloque', progress: 20,
      currentAction: 'En attente d\'arbitrage sur la suite',
      nextStep: 'Décider : CRON auto + réconciliation + paramétrage dynamique ?',
      tasks: [
        { id: 'au1', label: 'Point d\'avancement (à faire en réunion YN)', done: false },
        { id: 'au2', label: 'CRON pour lancer Audit automatiquement', done: false },
        { id: 'au3', label: 'Réconciliation automatique', done: false },
        { id: 'au4', label: 'Paramétrage dynamique des champs', done: false },
      ]
    },
    {
      id: 'rdv', name: 'RDV V2 / Bookings', priority: 10, status: 'a-cadrer', progress: 10,
      currentAction: 'Scope non défini',
      nextStep: 'Cadrer le périmètre fonctionnel avec YN',
      tasks: [
        { id: 'r1', label: 'Cadrage du scope à faire', done: false },
        { id: 'r2', label: 'Démarrage développement', done: false },
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
