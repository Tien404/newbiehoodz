import { PageStructuredData } from "@/components/site/PageStructuredData";
import { createPageMetadata } from "@/lib/seo";
import { SiteShell } from "@/components/site/SiteShell";
import { LockInPage } from "@/components/lock-in/LockInPage";

import records from "@/content/places/cafes.json";
import { publicPlaceSchema } from "@/lib/validation/publicPlaces";

export const metadata = createPageMetadata("lock-in");

export default function LockIn() {
  return (
    <>
      <PageStructuredData page="lock-in" />
      <SiteShell page="lock-in">
        <LockInPage
          cafes={records
            .map((record) => publicPlaceSchema.parse(record))
            .filter((record) => record.category === "cafe")}
        />
      </SiteShell>
    </>
  );
}
