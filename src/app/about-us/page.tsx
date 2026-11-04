import { PageStructuredData } from "@/components/site/PageStructuredData";
import { createPageMetadata } from "@/lib/seo";
import { AboutPage } from "@/components/about-us/AboutPage";

export const metadata = createPageMetadata("about-us");

export default function AboutUs() {
  return (
    <>
      <PageStructuredData page="about-us" />
      <AboutPage />
    </>
  );
}
