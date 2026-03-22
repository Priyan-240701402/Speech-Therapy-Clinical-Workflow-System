import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import { CORS_ORIGIN } from "./config.js";
import { registerRoutes } from "./routes/index.js";

const parseCorsOrigins = (value) => {
  if (!value) return "*";
  const trimmed = value.trim();
  if (trimmed === "*") return "*";
  return trimmed
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const createApp = (options = {}) => {
  const app = express();
  const corsOrigins = parseCorsOrigins(CORS_ORIGIN);

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  const dbPromise = options.skipDb ? Promise.resolve() : initDb();
  registerRoutes(app, { dbPromise });

  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    const status = Number(err?.status) || 500;
    if (status >= 500) {
      return res.status(status).json({ error: "Internal server error" });
    }
    return res.status(status).json({ error: err?.message || "Request failed" });
  });

  return app;
};
