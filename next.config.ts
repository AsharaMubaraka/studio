
import type {NextConfig} from 'next';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true, // auto registers the service worker
  skipWaiting: true, // forces prompt to update PWA when new version available
  // disable: process.env.NODE_ENV === 'development', // Optional: disable PWA in development
});

const nextConfig: NextConfig = {
  // output: 'export', // Removed for PWA, standard Next.js build is generally preferred
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // unoptimized: true, // Removed, default Next.js image optimization will apply
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'live.lunawadajamaat.org', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com', 
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ashara1447.udaem.site', // Added this new hostname
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: [
    "https://6000-firebase-studio-1747641767815.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev",
    "https://9000-firebase-studio-1747641767815.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev"
  ]
};

export default withPWA(nextConfig);
