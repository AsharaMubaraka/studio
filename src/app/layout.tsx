
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
  manifest: '/manifest.json', // Link to the manifest file
  icons: {
    icon: '/favicon.ico', // Standard favicon
    apple: '/apple-touch-icon.png', // Standard apple touch icon
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default', // Or 'black-translucent' or 'black'
    title: siteConfig.name,
    // startupImage: [ // Optional: Define startup images for different devices
    //   { url: '/splash/iphone5_splash.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
    // ]
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
        {/* PWA specific meta tags added via metadata object now */}
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
