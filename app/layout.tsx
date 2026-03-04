import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WorkDash — Valentin · MISMO',
  description: 'Tableau de bord charge de travail',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0e0f14] text-[#e8eaf0] min-h-screen" style={{ fontFamily: "'Syne', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
