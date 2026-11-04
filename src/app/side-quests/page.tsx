import { PageStructuredData } from "@/components/site/PageStructuredData";
import { createPageMetadata } from "@/lib/seo";
import { SideQuestsPage } from "@/components/side-quests/SideQuestsPage";
import { SiteShell } from "@/components/site/SiteShell";

import records from "@/content/places/activities.json";
import { publicPlaceSchema } from "@/lib/validation/publicPlaces";

export const metadata = createPageMetadata("side-quests");

export default function SideQuests() {
  return (
    <>
      <PageStructuredData page="side-quests" />
      <SiteShell page="side-quests">
        <SideQuestsPage
          activities={records
            .map((record) => publicPlaceSchema.parse(record))
            .filter((record) => record.category === "activity")}
        />
      </SiteShell>
    </>
  );
}
