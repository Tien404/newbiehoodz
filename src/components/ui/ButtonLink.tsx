import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: "home" | "contact";
};

/** Only the two CTA treatments observed in Canva; no unobserved variants. */
export function ButtonLink({
  variant = "home",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`button-link brown-button button-link--${variant} ${className}`}
      {...props}
    />
  );
}
