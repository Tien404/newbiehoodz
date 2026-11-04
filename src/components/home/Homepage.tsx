import Image from "next/image";
import { BrandLogo } from "@/components/site/BrandLogo";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { discoveryCards, homeCopy, type DiscoveryCard } from "@/content/home";
import "./home.css";

function Hero() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/home/hero-background-delivery.webp"
        fetchPriority="high"
      />
      <section className="home-hero" aria-labelledby="home-title">
        <Image
          className="home-hero__corner home-hero__corner--top-right"
          src="/home/hero-line-top-right.webp"
          alt=""
          width={268}
          height={312}
          loading="eager"
          aria-hidden="true"
        />
        <Image
          className="home-hero__corner home-hero__corner--bottom-left"
          src="/home/hero-line-bottom-left.webp"
          alt=""
          width={268}
          height={312}
          aria-hidden="true"
        />
        <div className="home-artboard home-hero__inner">
          <div data-reveal="intro" className="home-hero__panel">
            <BrandLogo className="home-hero__logo" />
            <h1 id="home-title">
              {homeCopy.hero.heading.map((line, index) => (
                <span key={line}>
                  {index > 0 && " "}
                  {line}
                </span>
              ))}
            </h1>
            <p>{homeCopy.hero.subtitle}</p>
            <ButtonLink
              href="#next-move"
              prefetch={false}
              className="home-hero__cta"
            >
              {homeCopy.hero.cta}
            </ButtonLink>
          </div>
          <Image
            className="home-hero__butterfly"
            loading="eager"
            src="/home/hero-butterfly.webp"
            alt=""
            width={160}
            height={176}
            aria-hidden="true"
          />
        </div>
      </section>
    </>
  );
}

// Original sprite regions; positions spread with the section while each motif keeps its proportions.
const welcomeFlowerPieces = [
  { x: 242, y: 250, width: 206, height: 198 },
  { x: 938, y: 432, width: 206, height: 198 },
  { x: 824, y: 248, width: 162, height: 148 },
  { x: 400, y: 484, width: 162, height: 148 },
  { x: 0, y: 402, width: 154, height: 156 },
  { x: 1232, y: 322, width: 134, height: 158 },
  { x: 586, y: 248, width: 162, height: 136 },
  { x: 640, y: 496, width: 160, height: 136 },
  { x: 46, y: 140, width: 132, height: 146 },
  { x: 1174, y: 602, width: 126, height: 152 },
];

function Welcome() {
  return (
    <section className="home-welcome" aria-labelledby="welcome-title">
      <div className="home-welcome__flowers" aria-hidden="true">
        {welcomeFlowerPieces.map(({ x, y, width, height }) => (
          <span
            key={`${x}-${y}`}
            className={`home-welcome__flower-piece${x >= 683 ? " home-welcome__flower-piece--right" : ""}`}
            style={{
              top: `${(y / 768) * 100}%`,
              left: x < 683 ? `${(x / 1366) * 100}%` : undefined,
              right:
                x >= 683 ? `${((1366 - x - width) / 1366) * 100}%` : undefined,
              width,
              height,
              backgroundPosition: `-${x}px -${y}px`,
            }}
          />
        ))}
      </div>
      <Image
        className="home-welcome__butterfly"
        src="/home/welcome-butterfly.webp"
        alt=""
        width={296}
        height={288}
        aria-hidden="true"
      />
      <div className="home-artboard home-welcome__inner">
        <Image
          className="home-welcome__paper"
          src="/home/welcome-paper.svg"
          alt=""
          width={600}
          height={596}
          aria-hidden="true"
        />
        <Image
          className="home-welcome__heart"
          src="/home/welcome-heart.svg"
          alt=""
          width={216}
          height={180}
          aria-hidden="true"
        />
        <div data-reveal className="home-welcome__copy">
          <h2 id="welcome-title">{homeCopy.welcome.heading}</h2>
          <p className="home-welcome__script">{homeCopy.welcome.subtitle}</p>
          <p className="home-welcome__description">
            {homeCopy.welcome.lines.map((line, i) => (
              <span key={line}>
                {i > 0 && " "}
                {line}
              </span>
            ))}
          </p>
          <ButtonLink
            href="/about-us"
            prefetch={false}
            className="home-welcome__cta"
          >
            {homeCopy.welcome.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function DiscoveryCardView({ card }: { card: DiscoveryCard }) {
  return (
    <article
      data-reveal
      className={`discovery-card discovery-card--${card.id}`}
    >
      <div className="discovery-card__label">{card.label}</div>
      <Image
        className="discovery-card__tape"
        src={`/home/tape-${card.id}.webp`}
        alt=""
        width={80}
        height={48}
        aria-hidden="true"
      />
      <Image
        className="discovery-card__illustration"
        src={`/home/${card.id}.webp`}
        alt=""
        width={card.image.width}
        height={card.image.height}
        aria-hidden="true"
      />
      <h3>{card.heading}</h3>
      <p>{card.description}</p>
      <ButtonLink
        href={card.href}
        prefetch={false}
        className="discovery-card__cta"
      >
        {card.cta}
      </ButtonLink>
    </article>
  );
}

function Discovery() {
  return (
    <section
      id="next-move"
      className="home-discovery"
      aria-labelledby="discovery-title"
    >
      <h2 data-reveal id="discovery-title">
        {homeCopy.discoveryHeading}
      </h2>
      <Container
        variant="home"
        data-reveal-group
        className="home-discovery__grid page-container"
      >
        {discoveryCards.map((card) => (
          <DiscoveryCardView key={card.id} card={card} />
        ))}
      </Container>
    </section>
  );
}

function CheatsheetPromotion() {
  return (
    <section className="home-promotion" aria-labelledby="promotion-title">
      <div className="home-promotion__dots" aria-hidden="true">
        <span className="home-promotion__dot home-promotion__dot--pink" />
        <span className="home-promotion__dot home-promotion__dot--yellow" />
        <span className="home-promotion__dot home-promotion__dot--blue" />
        <span className="home-promotion__dot home-promotion__dot--mint" />
      </div>
      <div data-reveal className="home-artboard home-promotion__inner">
        <h2 id="promotion-title">{homeCopy.promotion.heading}</h2>
        <p>{homeCopy.promotion.subtitle}</p>
        <ButtonLink
          href="/cheatsheet"
          prefetch={false}
          className="home-promotion__cta"
        >
          {homeCopy.promotion.cta}
        </ButtonLink>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="home-about" aria-labelledby="about-title">
      <div className="home-artboard home-about__inner">
        <Image
          className="home-about__tower"
          src="/home/tower-clipped.webp"
          alt=""
          width={168}
          height={664}
          aria-hidden="true"
        />
        <Image
          className="home-about__market"
          src="/home/market-clipped.webp"
          alt=""
          width={488}
          height={664}
          aria-hidden="true"
        />
        <Image
          className="home-about__saigon"
          src="/home/saigon-collage.webp"
          alt="Sài Gòn"
          width={366}
          height={200}
        />
        <div data-reveal-group className="home-about__notes">
          {homeCopy.about.notes.map((note, index) => (
            <aside
              data-reveal
              className={`home-about__note home-about__note--${index + 1}`}
              key={note.heading}
              aria-labelledby={`about-note-${index}`}
            >
              <h3 id={`about-note-${index}`}>{note.heading}</h3>
              <p>{note.body}</p>
            </aside>
          ))}
        </div>
        <div data-reveal className="home-about__copy">
          <p className="home-about__tag">{homeCopy.about.tag}</p>
          <h2 id="about-title">
            Meet the <span>hood</span>.
          </h2>
          <p className="home-about__description">{homeCopy.about.body}</p>
          <ButtonLink
            href="/about-us"
            prefetch={false}
            className="home-about__cta"
          >
            {homeCopy.about.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function Homepage() {
  return (
    <main id="main-content" className="home-main" tabIndex={-1}>
      <Hero />
      <Welcome />
      <Discovery />
      <CheatsheetPromotion />
      <About />
    </main>
  );
}
