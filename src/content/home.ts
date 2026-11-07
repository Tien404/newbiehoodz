export type DiscoveryCard = {
  id: "study" | "food" | "activities" | "cheatsheet";
  label: string;
  heading: string;
  description: string;
  cta: string;
  href: "/lock-in" | "/local-bites" | "/side-quests" | "/cheatsheet";
  image: { width: number; height: number };
};

export const homeCopy = {
  hero: {
    heading: ["Your friendly guide to life in", "Ho Chi Minh City"],
    subtitle: "Free, made by students, for students.",
    cta: "Start exploring",
  },
  welcome: {
    heading: "New here?",
    subtitle: "You belong here.",
    lines: [
      "Whether you’re coming from",
      "another province or another",
      "country, discover study spots,",
      "local flavours, cultural",
      "experiences, and everyday tips",
      "to help you find your feet.",
    ],
    cta: "Explore the Hood",
  },
  discoveryHeading: "What’s your next move?",
  promotion: {
    heading: "Just landed? Start here.",
    subtitle: "Transport, apps and student perks, all in one place.",
    cta: "Open the Newbie Cheatsheet",
  },
  about: {
    notes: [
      {
        heading: "who we are?",
        body: "We’re a student team from the Faculty of Industrial Management at HCMUT, sharing our favourite corners of Ho Chi Minh City.",
      },
      {
        heading: "What’s inside?",
        body: "Study spots, budget-friendly picks, and practical tips - all in one free, easy-to-read guide.",
      },
    ],
    tag: "nice to meet you!",
    heading: "Meet the hood.",
    body: "New city, so many places - where do you start? We created this guide for exchange students and students moving here from other provinces, hoping to make those first days a little easier.",
    cta: "Meet the team",
  },
} as const;

export const discoveryCards: readonly DiscoveryCard[] = [
  {
    id: "study",
    label: "Lock In",
    heading: "Find your spot. Get in the zone.",
    description:
      "Solo study session or group project? Explore study and work spaces that fit your needs, with details on Wi-Fi, sockets, noise levels, and prices.",
    cta: "Find Your Study Spot",
    href: "/lock-in",
    image: { width: 180, height: 152 },
  },
  {
    id: "food",
    label: "Local Bites",
    heading: "New city. New cravings.",
    description:
      "Discover local dishes and places to eat, with useful details on prices, food options, and what to try. Your next favourite meal could be just around the corner.",
    cta: "Explore Local Bites",
    href: "/local-bites",
    image: { width: 200, height: 144 },
  },
  {
    id: "activities",
    label: "Side Quests",
    heading: "There’s more to the city than your campus.",
    description:
      "Take a break from your usual routine and explore cultural landmarks and distinctive local places. Find out where to go, what to expect, and how to plan your visit.",
    cta: "Start a Side Quest",
    href: "/side-quests",
    image: { width: 184, height: 128 },
  },
  {
    id: "cheatsheet",
    label: "Newbie Cheatsheet",
    heading: "A little local know-how goes a long way.",
    description:
      "From sudden rain and transport to useful apps and student perks, get practical tips to make everyday life in the city easier.",
    cta: "Get the Cheat Codes",
    href: "/cheatsheet",
    image: { width: 164, height: 140 },
  },
];
