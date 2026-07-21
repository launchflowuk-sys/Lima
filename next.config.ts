import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so a stray lockfile higher up the tree can't be picked as the workspace root.
  turbopack: { root: process.cwd() },
  // Keep native/server-only deps out of the client/edge bundle.
  serverExternalPackages: ["postgres", "bullmq", "ioredis", "imapflow", "nodemailer", "pino"],
  // The production host (Hetzner, 3.7GB shared with Postgres/Redis/Coolify) OOMs during `next build`'s
  // in-build type-check/lint phase. We gate both separately — `pnpm typecheck` + tests run locally before
  // every push (the deploy rule) — so skipping the redundant in-build passes keeps safety while letting
  // the memory-constrained box finish the build. Do NOT rely on these to catch errors; the local gate does.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
