import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['@vercel/sandbox'],
  outputFileTracingIncludes: { '/*': ['./content/**/*', './src/**/*', './scripts/runner.cjs', './supabase/bootstrap.sql', './tests/*.test.ts'] },
  async redirects() { return [
    { source: '/build-log/2026-10-16-002-isolated-harness', destination: '/source?file=controlled-evidence', permanent: true },
    { source: '/build-log/:path*', destination: '/source', permanent: true },
  ]; },
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ] }]; },
};
export default config;
