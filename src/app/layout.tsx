import type { Metadata } from 'next';
import { Roboto, Roboto_Condensed } from 'next/font/google';
import Providers from './Providers';
import './globals.css';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

const robotoCondensed = Roboto_Condensed({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-condensed',
});

export const metadata: Metadata = {
  title: 'Veilo | Anoniem Chat',
  description: 'Anoniem chatten en anoniem nieuwe mensen ontmoeten. Je identiteit blijft verborgen.',
  openGraph: {
    title: 'Veilo | Anoniem Chat',
    description: 'Anoniem chatten en anoniem nieuwe mensen ontmoeten. Je identiteit blijft verborgen.',
    url: 'https://veilo.nl',
    siteName: 'VEILO',
    images: [{ url: 'https://veilo.nl/images/fbpost.png' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@veilonl',
    title: 'Veilo | Anoniem Chat',
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
    <html lang="nl" className={`${roboto.variable} ${robotoCondensed.variable}`}>
      <head>
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
