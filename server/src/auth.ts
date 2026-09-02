import type { NextFunction, Request, Response } from "express";
import { prisma } from "./db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      managerId?: string;
      leagueId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  const manager = await prisma.manager.findUnique({ where: { token } });
  if (!manager) return res.status(401).json({ error: "Invalid token" });
  req.managerId = manager.id;
  req.leagueId = manager.leagueId;
  next();
}
