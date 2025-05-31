
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
  manifest: '/manifest.json', // Link to the web app manifest
  appleWebApp: { // For iOS "Add to Home Screen"
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name,
    // startupImage: [...] // You can add startup images for iOS here
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [ // Theme color for browser UI
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
