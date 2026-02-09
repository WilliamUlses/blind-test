import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { SocketProvider } from '../components/providers/SocketProvider';
import '../styles/globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Blind Test Musical — Quiz Musique Multijoueur | Par William Ulses',
    template: '%s | Blind Test Musical',
  },
  description:
    'Jeu de blind test musical multijoueur en temps réel. Créez une room, invitez vos amis et devinez les morceaux ! Développé par William Ulses.',
  keywords: [
    'blind test',
    'quiz musical',
    'multijoueur',
    'jeu musique',
    'blind test en ligne',
    'quiz musique gratuit',
    'William Ulses',
    'jeu temps réel',
  ],
  authors: [{ name: 'William Ulses', url: 'https://portfolio.williamulses.fr' }],
  creator: 'William Ulses',
  publisher: 'William Ulses',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Blind Test Musical',
    title: 'Blind Test Musical — Quiz Musique Multijoueur',
    description:
      'Créez une room, invitez vos amis et devinez les morceaux en temps réel !',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blind Test Musical — Quiz Musique Multijoueur',
    description: 'Jeu de blind test musical multijoueur gratuit.',
    creator: '@williamulses',
  },
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
  manifest: '/site.webmanifest',
  other: {
    'theme-color': '#A855F7',
    'apple-mobile-web-app-title': 'Blind Test',
    'application-name': 'Blind Test Musical',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}/#app`,
      name: 'Blind Test Musical',
      url: siteUrl,
      description:
        'Jeu de blind test musical multijoueur en temps réel. Créez une room, invitez vos amis et devinez les morceaux !',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
      author: { '@id': 'https://portfolio.williamulses.fr/#person' },
      creator: { '@id': 'https://portfolio.williamulses.fr/#person' },
      inLanguage: 'fr-FR',
    },
    {
      '@type': 'Person',
      '@id': 'https://portfolio.williamulses.fr/#person',
      name: 'William Ulses',
      url: 'https://portfolio.williamulses.fr',
      sameAs: [
        'https://www.linkedin.com/in/william-music/',
        'https://github.com/williamMusic',
      ],
      jobTitle: 'Développeur Full-Stack',
      worksFor: {
        '@id': 'https://portfolio.williamulses.fr/#organization',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://portfolio.williamulses.fr/#organization',
      name: 'Do Corp',
      url: 'https://portfolio.williamulses.fr',
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Blind Test Musical',
      description: 'Quiz musique multijoueur en temps réel',
      publisher: { '@id': 'https://portfolio.williamulses.fr/#person' },
      inLanguage: 'fr-FR',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${siteUrl}/#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Portfolio William Ulses',
          item: 'https://portfolio.williamulses.fr',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blind Test Musical',
          item: siteUrl,
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${outfit.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans min-h-screen bg-background text-white selection:bg-primary/30">
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
