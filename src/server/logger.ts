import pino from "pino";
import { env } from "@/env";

/** Structured logger. Pretty-printed in development, JSON in production for log aggregation. */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  ...(env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } }
    : {}),
});
