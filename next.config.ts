import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@remotion/renderer', '@remotion/bundler', 'esbuild'],
};

export default nextConfig;
