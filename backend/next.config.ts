import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OOM prevention: cap all request bodies at 1MB
  // Malicious sync payloads are rejected before they reach route handlers
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
