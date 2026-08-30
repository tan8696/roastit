import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile pictures
      },
    ],
  },

  // Suppress non-critical warnings in production build output
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // Reduce build telemetry
  experimental: {
    // Turbopack is stable in Next.js 15 — enabled by default in dev
  },
};

export default nextConfig;
