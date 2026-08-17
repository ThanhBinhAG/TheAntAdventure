import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Ant Adventures CRM',
  description: 'The Ant Adventures CRM v4.3',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
