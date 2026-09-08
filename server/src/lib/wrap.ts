import { Request, Response, NextFunction } from "express";

type Handler = (req: Request, res: Response) => Promise<unknown>;

/** An error whose message and status are meant for the client. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function wrap(handler: Handler) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const result = await handler(req, res);
      if (!res.headersSent) res.json(result);
    } catch (err: any) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      // Anything else is a bug or a database error: its message can carry
      // query fragments and column names, so it stays in the logs.
      console.error(`${req.method} ${req.originalUrl} failed:`, err);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };
}
