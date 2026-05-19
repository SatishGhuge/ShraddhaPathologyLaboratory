import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // reactStrictMode is disabled by default in Next.js 13+
  // For development, use environment variable to control behavior
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true, // Skip ESLint during builds for speed
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    
    return config;
  },
  // Enable SWC minification (default in Next.js 15+)
  // Experimental features for speed
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
