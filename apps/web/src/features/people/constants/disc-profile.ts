// Canonical DISC profile domain — the single source of truth shared by the
// People write contract (form + schemas + mutation boundaries) and the People
// read contract (management/profile read models). The domain includes the four
// primary styles and their two-letter combinations.
export const DISC_PROFILE_VALUES = [
  "D",
  "I",
  "S",
  "C",
  "ID",
  "IS",
  "IC",
  "DI",
  "DS",
  "DC",
  "SI",
  "SD",
  "SC",
  "CI",
  "CD",
  "CS",
] as const

export type DiscProfile = (typeof DISC_PROFILE_VALUES)[number]
