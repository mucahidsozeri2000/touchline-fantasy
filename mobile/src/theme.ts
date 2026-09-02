// Ported from the Modernist design system's styles.css custom properties.
// Flat sRGB mixes are pre-computed here since RN style values don't support color-mix().
export const colors = {
  bg: "#f3f2f2",
  surface: "#eae9e9",
  text: "#201e1d",
  accent: "#ec3013",
  accent2: "#e15b47",
  divider: "rgba(32,30,29,0.4)",

  neutral100: "#f8f4f4",
  neutral200: "#eae7e7",
  neutral300: "#d7d3d3",
  neutral400: "#bab6b6",
  neutral500: "#9b9797",
  neutral600: "#7d7979",
  neutral700: "#605d5d",
  neutral800: "#444141",
  neutral900: "#2d2b2b",

  accent100: "#fff2ef",
  accent200: "#ffe0d9",
  accent300: "#ffc4b8",
  accent400: "#ff9783",
  accent500: "#ff563c",
  accent600: "#dd2b0f",
  accent700: "#ae1800",
  accent800: "#7c1405",
  accent900: "#4d170e",

  textMuted45: "rgba(32,30,29,0.45)",
  textMuted50: "rgba(32,30,29,0.5)",
  textMuted55: "rgba(32,30,29,0.55)",
  textMuted60: "rgba(32,30,29,0.6)",
  textMuted70: "rgba(32,30,29,0.7)",
};

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
};

// The system is deliberately square-cornered ("--radius: 0" everywhere).
export const radius = 0;

export const fonts = {
  heading: "Archivo_800ExtraBold",
  body: "Archivo_400Regular",
};

export const shadowLg = {
  shadowColor: "#2d2b2b",
  shadowOpacity: 0.22,
  shadowRadius: 32,
  shadowOffset: { width: 0, height: 12 },
  elevation: 12,
};
