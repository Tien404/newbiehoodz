import type { Metadata } from "next";
import { pagePaths, type SitePage } from "../content/navigation.ts";

/** Build-time SEO only. No placeholder production origin is published. */
export function getSiteConfig(
  env: { SITE_URL?: string; SITE_INDEXABLE?: string } = {
    SITE_URL: process.env.SITE_URL,
    SITE_INDEXABLE: process.env.SITE_INDEXABLE,
  },
) {
  let siteUrl: URL | undefined;
  if (env.SITE_URL) {
    try {
      siteUrl = new URL(env.SITE_URL);
    } catch {
      throw new Error("SITE_URL must be an absolute HTTPS origin.");
    }
    if (
      siteUrl.protocol !== "https:" ||
      siteUrl.username ||
      siteUrl.password ||
      siteUrl.search ||
      siteUrl.hash ||
      siteUrl.pathname !== "/"
    ) {
      throw new Error(
        "SITE_URL must be an HTTPS origin without credentials, path, query or fragment.",
      );
    }
  }
  if (env.SITE_INDEXABLE && !["true", "false"].includes(env.SITE_INDEXABLE))
    throw new Error("SITE_INDEXABLE must be true or false.");
  if (env.SITE_INDEXABLE === "true" && !siteUrl)
    throw new Error("An indexable build requires SITE_URL.");
  return {
    siteUrl,
    indexable: Boolean(siteUrl) && env.SITE_INDEXABLE !== "false",
  };
}

export const pageSeo = {
  home: {
    title: "Discover Ho Chi Minh City | newbiehoodzzzz",
    description:
      "Discover study cafés, local food, city activities and practical newcomer tips for international students exploring Ho Chi Minh City.",
    type: "WebPage",
  },
  cheatsheet: {
    title: "Newbie Cheatsheet | newbiehoodzzzz",
    description:
      "Get practical newcomer tips for Ho Chi Minh City: street safety, useful apps, student life, weather and everyday Vietnamese phrases.",
    type: "WebPage",
  },
  "about-us": {
    title: "About Us | newbiehoodzzzz",
    description:
      "Meet the student team behind newbiehoodzzzz and learn the story and values of this student-led guide for newcomers to Ho Chi Minh City.",
    type: "AboutPage",
  },
  "lock-in": {
    title: "Lock In: Study Cafés | newbiehoodzzzz",
    description:
      "Find study cafés in Ho Chi Minh City. Search by name or district, explore quiet, budget and late-opening options, and open locations in Google Maps.",
    type: "CollectionPage",
  },
  "local-bites": {
    title: "Local Bites: Food in Ho Chi Minh City | newbiehoodzzzz",
    description:
      "Explore local food in Ho Chi Minh City, browse places and recommended dishes, view available prices and photos, and open locations in Google Maps.",
    type: "CollectionPage",
  },
  "side-quests": {
    title: "Side Quests: City Activities | newbiehoodzzzz",
    description:
      "Explore cultural landmarks, museums, markets and activities in Ho Chi Minh City, with available visit details, photos and Google Maps links.",
    type: "CollectionPage",
  },
} satisfies Record<
  SitePage,
  {
    title: string;
    description: string;
    type: "WebPage" | "AboutPage" | "CollectionPage";
  }
>;

export function createPageMetadata(page: SitePage): Metadata {
  const { siteUrl, indexable } = getSiteConfig();
  const { title, description } = pageSeo[page];
  const url = siteUrl ? new URL(pagePaths[page], siteUrl).href : undefined;
  const images = siteUrl
    ? [
        {
          url: new URL("/brand/social-card.png", siteUrl).href,
          width: 600,
          height: 315,
          alt: "Newbiehood logo",
        },
      ]
    : undefined;
  return {
    title: { absolute: title },
    description,
    robots: { index: indexable, follow: indexable },
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      type: "website",
      title,
      description,
      siteName: "newbiehoodzzzz",
      locale: "en_US",
      ...(url ? { url } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

export function pageStructuredData(page: SitePage) {
  const { siteUrl } = getSiteConfig();
  if (!siteUrl) return null;
  const url = new URL(pagePaths[page], siteUrl).href;
  const websiteId = `${siteUrl.href}#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl.href,
        name: "newbiehoodzzzz",
        inLanguage: "en",
      },
      {
        "@type": pageSeo[page].type,
        "@id": `${url}#webpage`,
        url,
        name: pageSeo[page].title,
        description: pageSeo[page].description,
        inLanguage: "en",
        isPartOf: { "@id": websiteId },
      },
    ],
  };
}
