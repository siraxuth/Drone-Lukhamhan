import type { Metadata, Viewport } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import '@fontsource-variable/noto-sans-thai';
import './globals.css';
import { OG_IMAGE, SITE } from '@/lib/site';
import { JsonLd } from '@/components/JsonLd';
import { siteSchema } from '@/lib/schema';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.fullName} · เรียนโดรนและเขียนโค้ดสั่งโดรน`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.fullName, url: SITE.url }],
  creator: SITE.fullName,
  publisher: SITE.school,
  category: 'education',
  alternates: { canonical: '/', languages: { 'th-TH': '/' } },
  openGraph: { type: 'website', locale: SITE.locale, siteName: SITE.name, url: SITE.url, title: SITE.fullName, description: SITE.description, images: [OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: SITE.fullName, description: SITE.description, images: [OG_IMAGE.url] },
  robots: SITE.isProduction
    ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } }
    : { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION, other: process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : undefined },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#27272a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <JsonLd data={siteSchema()} />
        <RootProvider theme={{ attribute: 'class', defaultTheme: 'system', enableSystem: true }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
