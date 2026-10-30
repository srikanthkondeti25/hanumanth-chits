import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@whiskeysockets/baileys", "pino"],
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
