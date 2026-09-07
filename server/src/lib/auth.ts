import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// A predictable signing key lets anyone mint a valid session, so the dev
// fallback is allowed only outside production — in production a missing
// JWT_SECRET stops the server rather than silently accepting forged tokens.
const SECRET = (() => {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production (see server/.env.example)");
  }
  return "dev-only-secret-change-me";
})();

export function issueToken(managerId: string) {
  return jwt.sign({ sub: managerId }, SECRET, { expiresIn: "30d" });
}

export interface AuthedRequest extends Request {
  managerId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    const payload = jwt.verify(header.slice("Bearer ".length), SECRET) as { sub: string };
    req.managerId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
