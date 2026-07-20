import pino from "pino";

// Read NODE_ENV directly (not the validated env) so importing the logger never forces full env
// validation — that would break `next build`, which imports server modules without runtime secrets.
const isProd = process.env.NODE_ENV === "production";

/** Structured logger. Pretty-printed in development, JSON in production for log aggregation. */
export const logger = pino({
  level: isProd ? "info" : "debug",
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } }),
});
