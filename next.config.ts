import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Não gerar AGENTS.md/CLAUDE.md automaticamente; convenções ficam em CONTRIBUTING.md.
  agentRules: false,
  // typedRoutes: re-enable once the route surface stabilises (post Sprint 2).
  // Incremental route creation across sprints makes strict route typing noisy now.
  typedRoutes: false,
  images: {
    remotePatterns: [
      // Supabase Storage public buckets
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
