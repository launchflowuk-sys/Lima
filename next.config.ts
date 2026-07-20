import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so a stray lockfile higher up the tree can't be picked as the workspace root.
  turbopack: { root: process.cwd() },
  // Keep native/server-only deps out of the client/edge bundle.
  serverExternalPackages: ["postgres", "bullmq", "ioredis", "imapflow", "nodemailer", "pino"],
};

export default nextConfig;
