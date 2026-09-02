import type { Position } from "./types";

const GOAL_POINTS: Record<Position, number> = { FWD: 5, MID: 6, DEF: 7, GK: 8 };
const CLEAN_SHEET_POINTS: Record<Position, number> = { DEF: 4, GK: 4, MID: 1, FWD: 0 };
const ASSIST_POINTS = 3;
const YELLOW_POINTS = -1;
const RED_POINTS = -3;
export const CAPTAIN_MULTIPLIER = 2;

export interface StatLike {
  goals: number;
  assists: number;
  cleanSheet: boolean;
  yellow: number;
  red: number;
}

/** Points a single player earned from a single match stat line, before any captain multiplier. */
export function pointsForStat(position: Position, stat: StatLike): number {
  let pts = 0;
  pts += stat.goals * GOAL_POINTS[position];
  pts += stat.assists * ASSIST_POINTS;
  if (stat.cleanSheet) pts += CLEAN_SHEET_POINTS[position];
  pts += stat.yellow * YELLOW_POINTS;
  pts += stat.red * RED_POINTS;
  return pts;
}

export const SCORING_TABLE = [
  { action: "Goal (FWD/MID)", points: "5 / 6" },
  { action: "Goal (DEF/GK)", points: "7 / 8" },
  { action: "Assist", points: "3" },
  { action: "Clean sheet (DEF/GK)", points: "4" },
  { action: "Clean sheet (MID)", points: "1" },
  { action: "Yellow card", points: "-1" },
  { action: "Red card", points: "-3" },
  { action: "Captain", points: "×2 points" },
];
