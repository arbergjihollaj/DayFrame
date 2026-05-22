import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "node-ical"],
  allowedDevOrigins: ["192.168.178.115"],
};

export default nextConfig;
