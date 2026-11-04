import Link from "next/link";
import type { SitePage } from "@/content/navigation";
import { BrandLogo } from "./BrandLogo";
import { Navigation } from "./Navigation";

export function Header({ page }: { page: SitePage }) {
  return (
    <header className="site-header">
      <div className="site-header__inner page-container">
        <Link
          className="site-header__home-link"
          href="/"
          prefetch={false}
          aria-label="Newbiehood home"
        >
          <BrandLogo />
        </Link>
        <Navigation page={page} placement="header" />
      </div>
    </header>
  );
}
