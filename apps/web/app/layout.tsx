import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { SocketProvider } from '../components/providers/SocketProvider';
import '../styles/globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Blind Test Musical',
  description: 'Jeu de blind test musical multijoueur en temps réel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${outfit.variable}`}>
      <body className="font-sans min-h-screen bg-background text-white selection:bg-primary/30">
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
