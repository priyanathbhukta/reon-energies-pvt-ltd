import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: {
    default: 'REON POS Partner Portal',
    template: '%s | REON POS Portal',
  },
  description:
    'Manage your solar energy leads, commissions, and marketing materials with REON Energies POS Partner Portal.',
  keywords: ['solar', 'POS partner', 'REON Energies', 'solar CRM', 'lead management'],
  openGraph: {
    title: 'REON POS Partner Portal',
    description: 'Your solar business management hub',
    type: 'website',
    url: 'https://pos.reonenergy.in',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
