import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/server-only deps out of the client/edge bundle.
  serverExternalPackages: ["postgres", "bullmq", "ioredis", "imapflow", "nodemailer", "pino"],
};

export default nextConfig;
