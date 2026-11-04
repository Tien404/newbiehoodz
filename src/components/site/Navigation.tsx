import Link from "next/link";
import { navigation, pagePaths, type SitePage } from "@/content/navigation";

export function Navigation({
  page,
  placement,
}: {
  page: SitePage;
  placement: "header" | "footer";
}) {
  const items =
    placement === "header"
      ? [
          ...navigation.filter((item) => item.page !== "about-us"),
          ...navigation.filter((item) => item.page === "about-us"),
        ]
      : navigation;

  return (
    <nav
      aria-label={
        placement === "header" ? "Main navigation" : "Footer navigation"
      }
    >
      <ul className={`site-navigation site-navigation--${placement}`}>
        {items.map((item) => {
          const isCurrentPage = item.page === page;
          return (
            <li key={item.label}>
              <Link
                href={item.page ? pagePaths[item.page] : pagePaths[page]}
                aria-current={isCurrentPage ? "page" : undefined}
                prefetch={false}
                scroll={item.page ? undefined : false}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
