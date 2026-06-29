import './globals.css';

import type { Metadata, Viewport } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const title = process.env.SITE_TITLE || 'Wavegrid';
  const description = process.env.SITE_DESCRIPTION || 'Painting the sky with light';
  return {
    title,
    description,
    openGraph: { title, description, siteName: title },
    twitter: { card: 'summary', title, description },
    appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title }
  };
}

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
