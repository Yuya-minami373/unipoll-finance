import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typescript: { ignoreBuildErrors: true },
  headers: async () => [
    {
      // Cache all page routes on Vercel CDN for 60s, serve stale while revalidating
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      headers: [
        {
          key: "CDN-Cache-Control",
          value: "public, s-maxage=60, stale-while-revalidate=300",
        },
      ],
    },
  ],
};

export default nextConfig;
// force redeploy
