export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentText: string;
  quote: string;
  quoteLink: string;
  danger: string;
  sfw: string;
  nsfw: string;
  header: string;
  tabBar: string;
};

export const darkPalette: Palette = {
  background: "#121212",
  surface: "#1c1c1e",
  surfaceAlt: "#2a2a2c",
  text: "#f2f2f2",
  textMuted: "#9a9aa0",
  border: "#2e2e32",
  accent: "#8aaa55",
  accentText: "#142006",
  quote: "#789922",
  quoteLink: "#e07a5f",
  danger: "#e05a5a",
  sfw: "#3d8c5a",
  nsfw: "#c45b5b",
  header: "#161616",
  tabBar: "#161616",
};

export const lightPalette: Palette = {
  background: "#f3f3f4",
  surface: "#ffffff",
  surfaceAlt: "#ececee",
  text: "#1a1a1a",
  textMuted: "#66666e",
  border: "#e2e2e6",
  accent: "#4d6b22",
  accentText: "#ffffff",
  quote: "#5d7a16",
  quoteLink: "#b42318",
  danger: "#b42318",
  sfw: "#1f7a3a",
  nsfw: "#b42318",
  header: "#ffffff",
  tabBar: "#ffffff",
};
