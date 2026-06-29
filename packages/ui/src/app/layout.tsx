import './globals.css';

import type { Metadata, Viewport } from 'next';

const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Wavegrid';
const siteDescription = process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Painting the sky with light';

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: siteTitle
  },
  twitter: {
    card: 'summary',
    title: siteTitle,
    description: siteDescription
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: siteTitle
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
