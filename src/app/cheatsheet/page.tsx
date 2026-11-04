import { PageStructuredData } from "@/components/site/PageStructuredData";
import { createPageMetadata } from "@/lib/seo";
import { SiteShell } from "@/components/site/SiteShell";
import { CheatsheetPage } from "@/components/cheatsheet/CheatsheetPage";

export const metadata = createPageMetadata("cheatsheet");

export default function Cheatsheet() {
  return (
    <>
      <PageStructuredData page="cheatsheet" />
      <SiteShell page="cheatsheet">
        <CheatsheetPage />
      </SiteShell>
    </>
  );
}
