import type { MetadataRoute } from "next";
import { pagePaths } from "@/content/navigation";
import { getSiteConfig } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = getSiteConfig();
  return siteUrl
    ? Object.values(pagePaths).map((path) => ({
        url: new URL(path, siteUrl).href,
      }))
    : [];
}
