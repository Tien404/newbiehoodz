export type SitePage =
  | "home"
  | "cheatsheet"
  | "about-us"
  | "lock-in"
  | "local-bites"
  | "side-quests";

export const pagePaths: Record<SitePage, string> = {
  home: "/",
  cheatsheet: "/cheatsheet",
  "about-us": "/about-us",
  "lock-in": "/lock-in",
  "local-bites": "/local-bites",
  "side-quests": "/side-quests",
};

export const navigation = [
  { label: "Home", page: "home" },
  { label: "About Us", page: "about-us" },
  { label: "Lock In", page: "lock-in" },
  { label: "Local Bites", page: "local-bites" },
  { label: "Side Quests", page: "side-quests" },
  { label: "Newbie Cheatsheet", page: "cheatsheet" },
] satisfies ReadonlyArray<{ label: string; page?: SitePage }>;
