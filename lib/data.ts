import { kv } from '@vercel/kv';
import { DashboardData, Comment } from '@/types';

const DATA_KEY = 'dashboard:data';
const COMMENTS_KEY = 'dashboard:comments';

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
      id: 'chorus', name: 'Interface CHORUS', priority: 'high', status: 'en-cours', progress: 45,
      tasks: [
        { id: 'c1', label: 'Décom JPA / Hibernate → PS', done: false },
        { id: 'c2', label: 'Tests version chorus', done: true },
      ]
    },
    {
      id: 'facturx', name: 'Interface FacturX', priority: 'high', status: 'a-deployer', progress: 65,
      tasks: [
        { id: 'f1', label: 'Finaliser TX2', done: true },
        { id: 'f2', label: 'API Sage brouillon', done: true },
        { id: 'f3', label: 'Préparer Factur-X Terrena', done: false },
        { id: 'f4', label: 'Installer nouveautés Terrena', done: false },
      ]
    },
    {
      id: 'graph', name: 'SYNC Graph (API Microsoft)', priority: 'high', status: 'en-cours', progress: 55,
      tasks: [
        { id: 'g1', label: 'Analyse API Sage envoyée', done: true },
        { id: 'g2', label: 'Brouillon GRAPH premier jet', done: true },
        { id: 'g3', label: 'Retour test THCR en attente', done: false },
        { id: 'g4', label: 'Relancer ticket PXO', done: false },
      ]
    },
    {
      id: 'athmobile', name: 'ATH Mobile', priority: 'med', status: 'en-cours', progress: 40,
      tasks: [
        { id: 'a1', label: 'Devs en cours', done: false },
        { id: 'a2', label: 'Démo à préparer', done: false },
      ]
    },
    {
      id: 'ndf', name: 'Appli NDF', priority: 'med', status: 'ok', progress: 70,
      tasks: [
        { id: 'n1', label: 'Démo sur NA-ATHERP OK', done: true },
        { id: 'n2', label: 'Ajout analytique à caler', done: false },
        { id: 'n3', label: 'Suppression frais NDF', done: false },
      ]
    },
    {
      id: 'scanit', name: 'SCAN-IT', priority: 'med', status: 'en-cours', progress: 80,
      tasks: [
        { id: 's1', label: 'Finalisation (fonctionnel)', done: false },
        { id: 's2', label: 'Démo modifs récentes', done: false },
      ]
    },
    {
      id: 'outlook', name: 'Add-in Outlook', priority: 'med', status: 'en-cours', progress: 50,
      tasks: [
        { id: 'o1', label: 'Devs en cours avancés', done: true },
        { id: 'o2', label: 'Démo à préparer', done: false },
      ]
    },
    {
      id: 'smarttech', name: 'SMART TECH V2', priority: 'med', status: 'en-cours', progress: 30,
      tasks: [
        { id: 'st1', label: 'Migration PWA classique', done: false },
        { id: 'st2', label: 'Avancer API V2', done: false },
      ]
    },
    {
      id: 'audit', name: "Outil d'Audit", priority: 'low', status: 'bloque', progress: 20,
      tasks: [
        { id: 'au1', label: "Point d'avancement (YN)", done: false },
        { id: 'au2', label: 'CRON + réconciliation auto', done: false },
        { id: 'au3', label: 'Paramétrage dynamique', done: false },
      ]
    },
    {
      id: 'rdv', name: 'RDV V2 / Bookings', priority: 'low', status: 'a-cadrer', progress: 10,
      tasks: [
        { id: 'r1', label: 'Avancer sur le sujet', done: false },
        { id: 'r2', label: 'Scope à définir', done: false },
      ]
    },
  ]
};

export async function getData(): Promise<DashboardData> {
  try {
    const data = await kv.get<DashboardData>(DATA_KEY);
    return data ?? defaultData;
  } catch {
    return defaultData;
  }
}

export async function saveData(data: DashboardData): Promise<void> {
  await kv.set(DATA_KEY, { ...data, updatedAt: new Date().toISOString() });
}

export async function getComments(): Promise<Comment[]> {
  try {
    const comments = await kv.get<Comment[]>(COMMENTS_KEY);
    return comments ?? [];
  } catch {
    return [];
  }
}

export async function saveComment(comment: Comment): Promise<void> {
  const existing = await getComments();
  await kv.set(COMMENTS_KEY, [...existing, comment]);
}

export async function deleteComment(id: string): Promise<void> {
  const existing = await getComments();
  await kv.set(COMMENTS_KEY, existing.filter(c => c.id !== id));
}
