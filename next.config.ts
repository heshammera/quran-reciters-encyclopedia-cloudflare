import type { NextConfig } from "next";
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable in dev, enable in production
  register: true,
  skipWaiting: true,
  sw: "sw.js", // Use our custom service worker
  scope: "/",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "archive.org",
      },
      {
        protocol: "https",
        hostname: "**.archive.org",
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },

  turbopack: {}, // Silence Turbopack warning
};

export default pwaConfig(nextConfig);
