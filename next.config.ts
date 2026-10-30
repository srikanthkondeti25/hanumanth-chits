import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@whiskeysockets/baileys", "pino"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "localhost:3000", "localhost:3001"],
    },
  },
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "localhost:3000",
    "localhost:3001",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/admin/:path*",
        destination: "/",
        permanent: false,
      },
      {
        source: "/agent/:path*",
        destination: "/",
        permanent: false,
      },
      {
        source: "/member/:path*",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
