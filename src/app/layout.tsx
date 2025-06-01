
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
// import '@vime/core/themes/default.css'; // Vime player CSS - currently commented out in globals.css due to install issues
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { siteConfig } from '@/config/site';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AdminModeProvider } from '@/contexts/AdminModeContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico', // Standard favicon at public/favicon.ico
    apple: '/apple-touch-icon.png', // Standard apple touch icon at public/apple-touch-icon.png
    // You can add more specific icon links here if needed, e.g.:
    // { rel: 'icon', url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    // { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [ 
    { media: '(prefers-color-scheme: light)', color: '#9f8a3e' },
    { media: '(prefers-color-scheme: dark)', color: '#bfa95e' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <AdminModeProvider>
              {children}
              <Toaster />
            </AdminModeProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

    