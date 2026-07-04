import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReelEditor | Social Video Automation Platform',
  description: 'Instantly generate branded, high-quality social media videos from layout templates.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        {/* Preconnect and Load Google Fonts directly to bypass Next.js Turbopack compiler bugs */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Outfit:wght@400;700&family=Inter:wght@400;500;650;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
