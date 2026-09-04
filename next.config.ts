import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Não gerar AGENTS.md/CLAUDE.md automaticamente; convenções ficam em CONTRIBUTING.md.
  agentRules: false,
  // typedRoutes: re-enable once the route surface stabilises (post Sprint 2).
  // Incremental route creation across sprints makes strict route typing noisy now.
  typedRoutes: false,
  experimental: {
    serverActions: {
      // Padrão do Next: 1 MB — e uploads multipart passam pelo mesmo controle,
      // então qualquer foto de celular estourava antes da validação do app.
      // As imagens são comprimidas no navegador (src/lib/utils/image.ts); esta
      // folga cobre o caso em que o navegador não tem canvas. Teto do runtime
      // de funções do Netlify é 6 MB — não subir daqui.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Next 16 blocks the optimizer from fetching private IPs (SSRF guard). The
    // local Supabase Storage runs on 127.0.0.1, so allow it in dev only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns: [
      // Supabase Storage public buckets (hosted + local)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54421",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54421",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
