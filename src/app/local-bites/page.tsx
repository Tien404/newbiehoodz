import { PageStructuredData } from "@/components/site/PageStructuredData";
import { createPageMetadata } from "@/lib/seo";
import { SiteShell } from "@/components/site/SiteShell";
import { LocalBitesPage } from "@/components/local-bites/LocalBitesPage";

import records from "@/content/places/food.json";
import { publicPlaceSchema } from "@/lib/validation/publicPlaces";

export const metadata = createPageMetadata("local-bites");

export default function LocalBites() {
  return (
    <>
      <PageStructuredData page="local-bites" />
      <SiteShell page="local-bites">
        <LocalBitesPage
          places={records
            .map((record) => publicPlaceSchema.parse(record))
            .filter((record) => record.category === "food")}
        />
      </SiteShell>
    </>
  );
}
