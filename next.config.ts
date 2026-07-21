import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so a stray lockfile higher up the tree can't be picked as the workspace root.
  turbopack: { root: process.cwd() },
  // Keep native/server-only deps out of the client/edge bundle.
  serverExternalPackages: ["postgres", "bullmq", "ioredis", "imapflow", "nodemailer", "pino"],
  // The production host (Hetzner, 3.7GB shared with Postgres/Redis/Coolify) OOMs during `next build`'s
  // in-build TypeScript phase. We gate types separately — `pnpm typecheck` + tests run locally before
  // every push (the deploy rule) — so skipping the redundant in-build type-check keeps safety while
  // letting the memory-constrained box finish the build. Do NOT rely on this to catch errors; the local
  // `pnpm typecheck` gate does. (Next 16 no longer runs ESLint during build, so no eslint key is needed.)
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
