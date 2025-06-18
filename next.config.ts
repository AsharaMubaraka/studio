
import type {NextConfig} from 'next';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true, 
  skipWaiting: true, 
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
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
        hostname: 'firebasestorage.googleapis.com', // Generic for Firebase Storage
        port: '',
        pathname: '/**', // Allows any path, including specific bucket paths
      },
      { // Specifically for your primary project's default logo if needed
        protocol: 'https',
        hostname: 'ashara1447.udaem.site',
        port: '',
        pathname: '/**',
      },
      // Note: `firebasestorage.googleapis.com` should cover the new storage bucket `lnv-fmb.appspot.com`
      // as images are served from this domain with bucket info in the path.
    ],
  },
  allowedDevOrigins: [
    "https://6000-firebase-studio-1747641767815.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev",
    "https://9000-firebase-studio-1747641767815.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev"
  ]
};

export default withPWA(nextConfig);
