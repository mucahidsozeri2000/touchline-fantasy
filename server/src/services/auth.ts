import { prisma } from "../lib/prisma";
import { issueToken } from "../lib/auth";

export async function enterLeagueAuth(teamName: string, coachName: string, email?: string) {
  const resolvedEmail = email ?? `${teamName}-${coachName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "@local.touchline";
  const manager = await prisma.manager.upsert({
    where: { email: resolvedEmail },
    update: { teamName, coachName },
    create: { email: resolvedEmail, teamName, coachName, avatarInitial: coachName[0]?.toUpperCase() ?? "?" },
  });
  return { token: issueToken(manager.id), manager };
}

// Prototype-fidelity stub: seeds default team/coach names, no real OAuth handshake.
export async function googleAuthStub() {
  return enterLeagueAuth("FC Northbank", "Alex Morgan", "alex.morgan@gmail.stub");
}

export async function getMe(managerId: string) {
  return prisma.manager.findUniqueOrThrow({ where: { id: managerId } });
}
