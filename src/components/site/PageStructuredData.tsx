import type { SitePage } from "@/content/navigation";
import { pageStructuredData } from "@/lib/seo";

export function PageStructuredData({ page }: { page: SitePage }) {
  const data = pageStructuredData(page);
  return data ? (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  ) : null;
}
