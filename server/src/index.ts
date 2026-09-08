// Load .env before anything reads process.env (auth.ts checks JWT_SECRET at import time).
import "dotenv/config";
import express from "express";
import cors from "cors";
import { router } from "./routes";
import { startScheduler } from "./jobs/scheduler";

const app = express();

// Render, Railway and friends terminate TLS in front of the app, so without
// this every request looks like it comes from the proxy and the auth rate
// limiter would throttle all users as one. Trust exactly one hop.
app.set("trust proxy", 1);

// In production, only the configured web/app origins may call the API.
// CORS_ORIGINS is a comma-separated list; unset means "allow any" (dev default).
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));

app.use(express.json({ limit: "100kb" }));
app.use("/api", router);
app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Touchline API listening on :${port}`);
  startScheduler();
});
