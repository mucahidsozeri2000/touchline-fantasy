// Load .env before anything reads process.env (auth.ts checks JWT_SECRET at import time).
import "dotenv/config";
import express from "express";
import cors from "cors";
import { router } from "./routes";

const app = express();

// In production, only the configured web/app origins may call the API.
// CORS_ORIGINS is a comma-separated list; unset means "allow any" (dev default).
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));

app.use(express.json());
app.use("/api", router);
app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Touchline API listening on :${port}`);
});
