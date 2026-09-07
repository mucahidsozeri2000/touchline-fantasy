import { Request, Response, NextFunction } from "express";

type Handler = (req: Request, res: Response) => Promise<unknown>;

export function wrap(handler: Handler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await handler(req, res);
      if (!res.headersSent) res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Unexpected error" });
    }
  };
}
