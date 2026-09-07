import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";

export async function getChat(leagueId: string, managerId: string) {
  await requireMembership(leagueId, managerId);
  const messages = await prisma.chatMessage.findMany({
    where: { leagueId },
    include: { manager: true },
    orderBy: { sentAt: "asc" },
  });
  return messages.map((m) => ({
    id: m.id,
    sender: m.manager.coachName,
    text: m.text,
    sentAt: m.sentAt,
    me: m.managerId === managerId,
  }));
}

export async function sendChatMessage(leagueId: string, managerId: string, text: string) {
  await requireMembership(leagueId, managerId);
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  return prisma.chatMessage.create({ data: { leagueId, managerId, text: trimmed } });
}
