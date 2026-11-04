import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const { siteUrl, indexable } = getSiteConfig();
  return {
    rules: indexable
      ? { userAgent: "*", allow: "/" }
      : { userAgent: "*", disallow: "/" },
    ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).href } : {}),
  };
}
