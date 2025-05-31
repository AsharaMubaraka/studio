
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
        hostname: 'placehold.co', // For placeholder images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'live.lunawadajamaat.org', // Existing, kept
        port: '',
        pathname: '/**',
      },
      // IMPORTANT: Add hostnames for any external image services you use here.
      // For example, if you use Imgur:
      // {
      //   protocol: 'https',
      //   hostname: 'i.imgur.com',
      //   port: '',
      //   pathname: '/**',
      // }
    ],
  },
  allowedDevOrigins: [
    "https://6000-firebase-studio-1747641767815.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev"
  ]
};

export default nextConfig;

