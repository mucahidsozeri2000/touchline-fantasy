// Ported 1:1 from the Modernist design system's styles.css tokens.
// Flat, architectural: light ground, near-mono red accent, zero radius,
// strong 2px dividers, Archivo type. See project/_ds/.../readme.md.

export const colors = {
  bg: "#f3f2f2",
  surface: "#eae9e9",
  text: "#201e1d",
  divider: "rgba(32,30,29,0.4)",

  accent: "#ec3013",
  accent100: "#fff2ef",
  accent200: "#ffe0d9",
  accent300: "#ffc4b8",
  accent400: "#ff9783",
  accent500: "#ff563c",
  accent600: "#dd2b0f",
  accent700: "#ae1800",
  accent800: "#7c1405",
  accent900: "#4d170e",

  neutral100: "#f8f4f4",
  neutral200: "#eae7e7",
  neutral300: "#d7d3d3",
  neutral400: "#bab6b6",
  neutral500: "#9b9797",
  neutral600: "#7d7979",
  neutral700: "#605d5d",
  neutral800: "#444141",
  neutral900: "#2d2b2b",

  textMuted: "rgba(32,30,29,0.55)",
  textMuted45: "rgba(32,30,29,0.45)",
  white: "#ffffff",

  riskLow: "#2d7a3a",
  riskMedium: "#b8860b",
  riskHigh: "#ec3013",
};

// Real Champions League club identity dots — small corner accents only, never full tints.
export const clubColors: Record<string, string> = {
  MCI: "#6CABDD",
  RMA: "#FEBE10",
  LIV: "#C8102E",
  BAY: "#DC052D",
  BAR: "#A50044",
  PSG: "#004170",
  ARS: "#EF0107",
  LEV: "#E32219",
  GAL: "#FDB913",
  MIL: "#FB090B",
  INT: "#010E80",
  JUV: "#000000",
  ATM: "#CB3524",
};
export function clubColor(code: string) {
  return clubColors[code] ?? colors.neutral500;
}

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 };

export const radius = { sm: 0, md: 0, lg: 0 }; // Modernist: zero corner radius everywhere but circular avatars

export const shadow = {
  sm: { shadowColor: "#2d2b2b", shadowOpacity: 0.14, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: "#2d2b2b", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  lg: { shadowColor: "#2d2b2b", shadowOpacity: 0.22, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
};

export const font = {
  heading: undefined as string | undefined, // Archivo loaded via expo-font in App.tsx; falls back to system bold
  headingFamily: "Archivo_800ExtraBold",
  headingSemiFamily: "Archivo_600SemiBold",
  bodyFamily: "Archivo_400Regular",
};

export const type = {
  h1: 42, h2: 32, h3: 25, h4: 20, h5: 16, h6: 13,
  body: 15, small: 13, micro: 11,
};

export const risk = { low: colors.riskLow, medium: colors.riskMedium, high: colors.riskHigh };
