import type { ReactNode } from "react";

type HeroCardProps = {
  titleId: string;
  eyebrow?: string;
  title: string;
  subtitle: ReactNode;
  script?: string;
};

/** Shared intro geometry; the owning page supplies its palette and heading face. */
export function HeroCard({
  titleId,
  eyebrow,
  title,
  subtitle,
  script,
}: HeroCardProps) {
  return (
    <div data-reveal="intro" className="hero-card">
      {eyebrow && <p className="hero-card__eyebrow">{eyebrow}</p>}
      <h1 id={titleId} className="hero-card__title">
        {title}
      </h1>
      {script && <p className="hero-card__script">{script}</p>}
      <p className="hero-card__description">{subtitle}</p>
    </div>
  );
}
