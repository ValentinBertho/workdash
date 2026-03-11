export type TemplateKey = 'juridique' | 'dev' | 'compta' | 'rh' | 'custom';

interface Template {
  label: string;
  description: string;
  steps: Array<{ name: string; color: string }>;
}

export const TEMPLATES: Record<TemplateKey, Template> = {
  juridique: {
    label: 'Juridique',
    description: 'Gestion de dossiers juridiques',
    steps: [
      { name: 'Réception', color: '#6b7280' },
      { name: 'Analyse', color: '#3b82f6' },
      { name: 'Rédaction', color: '#8b5cf6' },
      { name: 'Révision', color: '#f59e0b' },
      { name: 'Envoi', color: '#10b981' },
      { name: 'Clôturé', color: '#059669' },
    ],
  },
  dev: {
    label: 'Développement',
    description: 'Suivi de projets tech',
    steps: [
      { name: 'Backlog', color: '#6b7280' },
      { name: 'En cours', color: '#3b82f6' },
      { name: 'Test', color: '#f59e0b' },
      { name: 'Déployé', color: '#10b981' },
    ],
  },
  compta: {
    label: 'Comptabilité',
    description: 'Traitement des pièces comptables',
    steps: [
      { name: 'Réception', color: '#6b7280' },
      { name: 'Traitement', color: '#3b82f6' },
      { name: 'Validation', color: '#f59e0b' },
      { name: 'Archivé', color: '#059669' },
    ],
  },
  rh: {
    label: 'RH',
    description: 'Gestion RH et recrutement',
    steps: [
      { name: 'Ouvert', color: '#6b7280' },
      { name: 'En cours', color: '#3b82f6' },
      { name: 'Décision', color: '#f59e0b' },
      { name: 'Clôturé', color: '#059669' },
    ],
  },
  custom: {
    label: 'Personnalisé',
    description: 'Définissez vos propres étapes',
    steps: [
      { name: 'À faire', color: '#6b7280' },
      { name: 'En cours', color: '#3b82f6' },
      { name: 'Terminé', color: '#10b981' },
    ],
  },
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
