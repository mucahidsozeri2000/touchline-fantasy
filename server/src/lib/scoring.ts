import { Position, EventType } from "@prisma/client";

// Section 4.4 of the design spec: goal value rises for positions less
// expected to score; assists/clean sheets are flat except MID clean sheets.
export const GOAL_POINTS: Record<Position, number> = { FWD: 5, MID: 6, DEF: 7, GK: 8 };
export const CLEAN_SHEET_POINTS: Record<Position, number> = { GK: 4, DEF: 4, MID: 1, FWD: 0 };
export const ASSIST_POINTS = 3;
export const YELLOW_POINTS = -1;
export const RED_POINTS = -3;
export const PENALTY_SAVE_POINTS = 5;
export const PENALTY_MISS_POINTS = -2;
export const CAPTAIN_MULTIPLIER = 2;

export function pointsForEvent(type: EventType, position: Position): number {
  switch (type) {
    case "GOAL":
      return GOAL_POINTS[position];
    case "ASSIST":
      return ASSIST_POINTS;
    case "CLEAN_SHEET":
      return CLEAN_SHEET_POINTS[position];
    case "YELLOW":
      return YELLOW_POINTS;
    case "RED":
      return RED_POINTS;
    case "PENALTY_SAVE":
      return PENALTY_SAVE_POINTS;
    case "PENALTY_MISS":
      return PENALTY_MISS_POINTS;
    default:
      return 0;
  }
}

export const SQUAD_RULES = {
  squadSize: 15,
  startingXi: 11,
  benchSize: 4,
  gkRange: [1, 1],
  defRange: [3, 5],
  midRange: [3, 5],
  fwdRange: [1, 3],
  maxPerClub: 3,
};
