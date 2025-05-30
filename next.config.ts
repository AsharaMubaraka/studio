
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // experimental: {
  //   turbo: false,
  // },
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
      }
    ],
  },
  allowedDevOrigins: [
    "https://6000-firebase-studio-1747641767815.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev"
  ]
};

export default nextConfig;
