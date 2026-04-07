import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
