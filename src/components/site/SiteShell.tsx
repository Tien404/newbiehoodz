import type { ReactNode } from "react";
import type { SitePage } from "@/content/navigation";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function SiteShell({
  page,
  children,
}: {
  page: SitePage;
  children: ReactNode;
}) {
  return (
    <div className={`site-shell site-shell--${page}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header page={page} />
      {children}
      <Footer page={page} />
    </div>
  );
}
