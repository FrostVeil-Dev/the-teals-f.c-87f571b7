/** Static club identity used across the portal (editable club info lives in the database). */
export const CLUB_CONFIG = {
  name: "The Teals F.C.",
  shortName: "Teals FC",
  motto: "Freedom, Aggression, Teamwork & Intelligent Movement",
  foundedYear: 2024,
  homeGround: "The Teals Community Arena",
  logoUrl: "/assets/aistudio/teals_logo_e43437ce.png",
  kitsUrl: "/assets/aistudio/teals_kit_c5ea6daf.png",
} as const;

export const FALLBACK_IMAGE = CLUB_CONFIG.logoUrl;
