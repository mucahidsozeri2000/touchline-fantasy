import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";

const BID_STEP = 0.5;

export async function getAuction(leagueId: string, managerId: string, positionFilter?: string, search?: string) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  const membership = await requireMembership(leagueId, managerId);

  const lots = await prisma.auctionLot.findMany({
    where: {
      leagueId,
      status: "OPEN",
      ...(positionFilter ? { player: { position: positionFilter as any } } : {}),
      ...(search ? { player: { name: { contains: search, mode: "insensitive" } } } : {}),
    },
    include: { player: { include: { club: true } }, bids: { include: { manager: true }, orderBy: { amount: "desc" } } },
  });

  let freeFunds = membership.budgetRemaining;
  let committed = 0;
  let leadingCount = 0;
  const outbidAlerts: any[] = [];

  const lotDtos = lots.map((lot) => {
    const top = lot.bids[0];
    const myBid = lot.bids.find((b) => b.managerId === managerId);
    if (myBid && myBid !== top) committed += myBid.amount;
    if (top && top.managerId === managerId) leadingCount++;

    if (top && !league.blindRound && myBid && top.managerId !== managerId) {
      outbidAlerts.push({
        playerId: lot.playerId,
        playerName: lot.player.name,
        newLeader: top.manager.coachName,
        topBid: top.amount,
      });
    }

    const floor = Math.max(lot.listPrice, (top?.amount ?? 0) + BID_STEP);
    let status: string;
    if (league.blindRound) {
      status = myBid ? "Bid In" : "Sealed";
    } else if (!top) {
      status = "Open";
    } else if (top.managerId === managerId) {
      status = "Leading";
    } else if (myBid) {
      status = "Outbid";
    } else {
      status = "Open";
    }

    return {
      lotId: lot.id,
      playerId: lot.playerId,
      name: lot.player.name,
      club: lot.player.club.shortCode,
      clubColor: lot.player.club.colorHex,
      position: lot.player.position,
      listPrice: lot.listPrice,
      closesAt: lot.closesAt,
      status,
      bidCount: lot.bids.length,
      topBid: league.blindRound ? null : top?.amount ?? null,
      topBidder: league.blindRound ? null : top?.manager.coachName ?? null,
      myBid: myBid?.amount ?? null,
      nextBidFloor: floor,
    };
  });

  return {
    blindRound: league.blindRound,
    antiSnipeSeconds: league.antiSnipeSeconds,
    stats: { freeFunds, committed, leading: leadingCount },
    outbidAlerts,
    lots: lotDtos,
  };
}

export async function placeBid(leagueId: string, managerId: string, playerId: string, amount: number) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  const membership = await requireMembership(leagueId, managerId);
  const lot = await prisma.auctionLot.findUnique({
    where: { leagueId_playerId: { leagueId, playerId } },
    include: { bids: { orderBy: { amount: "desc" } } },
  });
  if (!lot || lot.status !== "OPEN") throw new Error("This lot is not open for bidding");

  const top = lot.bids[0];
  const floor = Math.max(lot.listPrice, (top?.amount ?? 0) + BID_STEP);
  if (amount < floor) throw new Error(`Bid must be at least £${floor.toFixed(1)}m`);
  if (amount > membership.budgetRemaining) throw new Error("Bid exceeds free funds");

  const bid = await prisma.bid.create({
    data: { leagueId, lotId: lot.id, playerId, managerId, amount, isBlind: league.blindRound },
  });

  let extended = false;
  const msToClose = lot.closesAt.getTime() - Date.now();
  if (!league.blindRound && msToClose < league.antiSnipeSeconds * 1000 && msToClose > 0) {
    const newClosesAt = new Date(Date.now() + league.antiSnipeSeconds * 1000);
    await prisma.auctionLot.update({ where: { id: lot.id }, data: { closesAt: newClosesAt, winningBidId: bid.id } });
    extended = true;
  } else {
    await prisma.auctionLot.update({ where: { id: lot.id }, data: { winningBidId: bid.id } });
  }

  return { bid, extended };
}

export async function counterBid(leagueId: string, managerId: string, playerId: string) {
  const lot = await prisma.auctionLot.findUnique({
    where: { leagueId_playerId: { leagueId, playerId } },
    include: { bids: { orderBy: { amount: "desc" } } },
  });
  if (!lot) throw new Error("Lot not found");
  const top = lot.bids[0];
  const amount = Math.max(lot.listPrice, (top?.amount ?? 0) + BID_STEP);
  return placeBid(leagueId, managerId, playerId, amount);
}

export async function setBlindRound(leagueId: string, managerId: string, enabled: boolean) {
  const membership = await requireMembership(leagueId, managerId);
  if (!membership.isCommissioner) throw new Error("Only the commissioner can change auction mode");
  return prisma.league.update({ where: { id: leagueId }, data: { blindRound: enabled } });
}

export async function closeLot(leagueId: string, playerId: string) {
  const lot = await prisma.auctionLot.findUnique({
    where: { leagueId_playerId: { leagueId, playerId } },
    include: { bids: { orderBy: { amount: "desc" } } },
  });
  if (!lot || lot.status !== "OPEN") return;
  const top = lot.bids[0];
  if (!top) {
    await prisma.auctionLot.update({ where: { id: lot.id }, data: { status: "UNSOLD" } });
    return;
  }
  await prisma.$transaction([
    prisma.auctionLot.update({ where: { id: lot.id }, data: { status: "SOLD", winningBidId: top.id } }),
    prisma.playerOwnership.update({
      where: { leagueId_playerId: { leagueId, playerId } },
      data: { managerId: top.managerId, acquiredVia: "AUCTION", acquiredAt: new Date(), currentPrice: top.amount },
    }),
    prisma.leagueMembership.updateMany({
      where: { leagueId, managerId: top.managerId },
      data: { budgetRemaining: { decrement: top.amount } },
    }),
  ]);
  const membership = await requireMembership(leagueId, top.managerId);
  await prisma.squadSlot.upsert({
    where: { leagueMembershipId_playerId: { leagueMembershipId: membership.id, playerId } },
    update: {},
    create: { leagueMembershipId: membership.id, playerId, isStarting: false },
  });
}
