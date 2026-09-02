import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./db";
import { createRouter } from "./routes";

const PORT = Number(process.env.PORT || 4000);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("join", async (token: string) => {
    const manager = await prisma.manager.findUnique({ where: { token } });
    if (manager) socket.join(`league:${manager.leagueId}`);
  });
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", createRouter(io));

httpServer.listen(PORT, () => {
  console.log(`Touchline Fantasy server listening on :${PORT}`);
});
