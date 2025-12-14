import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Disable static generation - render everything dynamically
  // This prevents build-time issues and is better for dynamic dashboards
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Force all pages to be dynamic (no static generation)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
