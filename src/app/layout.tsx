import type { Metadata } from 'next';
import Providers from './Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'VEILO | Anoniem Chat',
  description: 'Anoniem chatten en anoniem nieuwe mensen ontmoeten. Je identiteit blijft verborgen.',
  openGraph: {
    title: 'VEILO | Anoniem Chat',
    description: 'Anoniem chatten en anoniem nieuwe mensen ontmoeten. Je identiteit blijft verborgen.',
    url: 'https://veilo.nl',
    siteName: 'VEILO',
    images: [{ url: 'https://veilo.nl/images/fbpost.png' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@veilonl',
    title: 'VEILO | Anoniem Chat',
    description: 'Anoniem chatten en anoniem nieuwe mensen ontmoeten. Je identiteit blijft verborgen.',
    images: ['https://veilo.nl/images/fbpost.png'],
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'VEILO',
              alternateName: 'VEILO Anoniem Chat',
              url: 'https://veilo.nl/',
              logo: 'https://veilo.nl/images/veilo-logo.svg',
            }),
          }}
        />
      </head>
      <body className="font-roboto">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
