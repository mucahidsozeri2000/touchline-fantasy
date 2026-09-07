export type WindowPhase = "locked" | "open" | "closed";

export function windowPhase(opensAt: Date, closesAt: Date, now = new Date()): WindowPhase {
  if (now < opensAt) return "locked";
  if (now < closesAt) return "open";
  return "closed";
}
