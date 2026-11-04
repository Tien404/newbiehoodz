import Image from "next/image";
import type { SitePage } from "@/content/navigation";
import { contactEmail, contactHref } from "@/content/contact";
import { BrandLogo } from "./BrandLogo";
import { Navigation } from "./Navigation";

export function Footer({ page }: { page: SitePage }) {
  return (
    <footer
      className="site-footer"
      data-edge={
        page === "home" || page === "side-quests" ? "straight" : "scalloped"
      }
    >
      {page === "cheatsheet" && (
        <>
          <Image
            className="site-footer__decoration site-footer__star"
            src="/brand/star.svg"
            alt=""
            aria-hidden="true"
            width={64}
            height={67}
          />
          <Image
            className="site-footer__decoration site-footer__lotus"
            src="/brand/lotus.svg"
            alt=""
            aria-hidden="true"
            width={147}
            height={91}
          />
        </>
      )}
      {page === "side-quests" && (
        <>
          <Image
            className="site-footer__decoration site-footer__lotus-left"
            src="/side-quests/lotus-left.webp"
            alt=""
            aria-hidden="true"
            width={112}
            height={152}
          />
          <Image
            className="site-footer__decoration site-footer__lotus-right"
            src="/side-quests/lotus-right.webp"
            alt=""
            aria-hidden="true"
            width={116}
            height={152}
          />
        </>
      )}
      <div data-reveal className="site-footer__inner page-container">
        <BrandLogo />
        <Navigation page={page} placement="footer" />
        <p className="site-footer__contact">
          CONTACT US VIA: <a href={contactHref}>{contactEmail}</a>
        </p>
        <p className="site-footer__signoff">
          Made with love in Ho Chi Minh City
        </p>
      </div>
    </footer>
  );
}
