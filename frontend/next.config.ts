import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    const supabaseTarget = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://asuxwdfunyfsymjhmexx.supabase.co";
    return [
      {
        source: "/supabase/:path*",
        destination: `${supabaseTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
