import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beta — Content Launch System',
  description: 'Sistem internal Delta untuk merancang, memproduksi, dan meluncurkan konten media film KIG.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
