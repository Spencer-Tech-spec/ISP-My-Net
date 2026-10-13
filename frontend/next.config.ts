import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/supabase/:path*",
        destination: "https://asuxwdfunyfsymjhmexx.supabase.co/:path*",
      },
    ];
  },
};

export default nextConfig;
