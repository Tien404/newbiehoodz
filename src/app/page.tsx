import { PageStructuredData } from "@/components/site/PageStructuredData";
import { createPageMetadata } from "@/lib/seo";
import { Homepage } from "@/components/home/Homepage";
import { SiteShell } from "@/components/site/SiteShell";

export const metadata = createPageMetadata("home");

export default function Home() {
  return (
    <>
      <PageStructuredData page="home" />
      <SiteShell page="home">
        <Homepage />
      </SiteShell>
    </>
  );
}
