import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Backend URL proxying for local dev — avoids CORS issues
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
