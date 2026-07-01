import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true, // TODO(Sprint 5): flip to false after the TypeScript cleanup pass
  },
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  async headers() {
    // Belt-and-braces: even if Caddy is bypassed in dev, Next itself
    // refuses to send a Server header. Caddyfile is the production
    // source of truth for HSTS/CSP — see Caddyfile.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
