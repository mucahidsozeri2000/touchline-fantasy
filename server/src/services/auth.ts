import { prisma } from "../lib/prisma";
import { issueToken } from "../lib/auth";
import { HttpError } from "../lib/wrap";
import { hashPassword, verifyPassword, normaliseEmail, MIN_PASSWORD_LENGTH } from "../lib/password";

function publicManager(m: { id: string; email: string; teamName: string; coachName: string; avatarInitial: string }) {
  return {
    id: m.id,
    email: m.email,
    teamName: m.teamName,
    coachName: m.coachName,
    avatarInitial: m.avatarInitial,
  };
}

export async function register(input: {
  email: string;
  password: string;
  teamName: string;
  coachName: string;
}) {
  const email = normaliseEmail(input.email ?? "");
  const teamName = input.teamName?.trim();
  const coachName = input.coachName?.trim();

  if (!email.includes("@")) throw new HttpError(400, "A valid email address is required");
  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (!teamName || !coachName) throw new HttpError(400, "Team name and coach name are required");

  // Registration must never overwrite an existing account — that was how the
  // old name-derived login let anyone take over someone else's squad.
  const existing = await prisma.manager.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "An account with that email already exists");

  const manager = await prisma.manager.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      teamName,
      coachName,
      avatarInitial: coachName[0]!.toUpperCase(),
    },
  });
  return { token: issueToken(manager.id), manager: publicManager(manager) };
}

export async function login(input: { email: string; password: string }) {
  const email = normaliseEmail(input.email ?? "");
  const manager = await prisma.manager.findUnique({ where: { email } });

  // Same message and roughly the same work either way, so the response does not
  // reveal which addresses have accounts.
  const ok = manager
    ? await verifyPassword(input.password ?? "", manager.passwordHash)
    : await verifyPassword(input.password ?? "", "scrypt$00$00");
  if (!manager || !ok) throw new HttpError(401, "Email or password is incorrect");

  return { token: issueToken(manager.id), manager: publicManager(manager) };
}

export async function getMe(managerId: string) {
  const m = await prisma.manager.findUniqueOrThrow({ where: { id: managerId } });
  return publicManager(m);
}

export async function updateProfile(managerId: string, input: { teamName?: string; coachName?: string }) {
  const teamName = input.teamName?.trim();
  const coachName = input.coachName?.trim();
  const manager = await prisma.manager.update({
    where: { id: managerId },
    data: {
      ...(teamName ? { teamName } : {}),
      ...(coachName ? { coachName, avatarInitial: coachName[0]!.toUpperCase() } : {}),
    },
  });
  return publicManager(manager);
}
