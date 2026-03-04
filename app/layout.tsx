import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WorkDash — Valentin · MISMO',
  description: 'Tableau de bord charge de travail',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
