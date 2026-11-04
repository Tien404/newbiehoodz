import { HeroCard } from "@/components/ui/HeroCard";
import Image from "next/image";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { contactHref } from "@/content/contact";
import {
  apps,
  months,
  phrases,
  streetTips,
  studentTips,
  weatherTips,
  type GuideTip,
} from "@/content/cheatsheet";
import "./cheatsheet.css";

function Art({
  name,
  width,
  height,
  className = "",
  alt = "",
}: {
  name: string;
  width: number;
  height: number;
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      className={`guide-art guide-art--${name} ${className} z-10`}
      src={`/cheatsheet/${name}.webp`}
      width={width}
      height={height}
      alt={alt}
      aria-hidden={alt ? undefined : true}
    />
  );
}
function Badge({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span className={`guide-badge guide-badge--${color}`} aria-hidden="true">
      {children}
    </span>
  );
}
function Heading({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <header data-reveal className="guide-heading">
      <p className="guide-eyebrow">EVERYDAY SURVIVAL GUIDE · {number}</p>
      <h2 id={`guide-${number}`}>{title}</h2>
      <p className="guide-script">{subtitle}</p>
    </header>
  );
}
function TipList({
  tips,
  className = "",
  vietnamese = false,
}: {
  tips: GuideTip[];
  className?: string;
  vietnamese?: boolean;
}) {
  return (
    <ol data-reveal-group className={`guide-grid ${className}`}>
      {tips.map((tip, index) => (
        <li data-reveal className="guide-card" key={tip.heading}>
          <div className="guide-card__heading">
            <Badge color={tip.color}>{index + 1}</Badge>
            <h3 lang={vietnamese ? "vi" : undefined}>{tip.heading}</h3>
          </div>
          <p>{tip.body}</p>
        </li>
      ))}
    </ol>
  );
}
function Hero() {
  return (
    <section
      className="guide-hero page-hero"
      aria-labelledby="cheatsheet-title"
    >
      <HeroCard
        titleId="cheatsheet-title"
        eyebrow="EVERYDAY SURVIVAL GUIDE"
        title="newbie cheatsheet"
        subtitle={
          <>
            Street smarts, local apps, student perks, rainy-day tips and a
            little
            <br className="guide-desktop-break" /> Vietnamese — everything you
            wish you knew on day one.
          </>
        }
      />
      <Art name="hero-hat" width={268} height={268} />
      <Art name="hero-child" width={368} height={504} />
      <Art name="hero-heart" width={68} height={64} />
    </section>
  );
}
function StreetSmarts() {
  return (
    <section className="guide-band guide-street" aria-labelledby="guide-01">
      <Container
        variant="cheatsheet"
        className="guide-container page-container"
      >
        <Heading
          number="01"
          title="saigon street smarts"
          subtitle="Little local habits that make everyday life easier."
        />
        <TipList tips={streetTips} />
      </Container>
      <Art name="street-scooter" width={344} height={240} />
      <Art name="street-star" width={92} height={88} />
      <Art name="street-bag" width={152} height={152} />
      <Art name="street-fruit" width={104} height={104} />
    </section>
  );
}
function AppKit() {
  return (
    <section className="guide-band guide-apps" aria-labelledby="guide-02">
      <Container
        variant="cheatsheet"
        className="guide-container page-container"
      >
        <Heading
          number="02"
          title="your local app kit"
          subtitle="Download a little help. Save a little time."
        />
        <div data-reveal-group className="guide-grid guide-app-grid">
          {apps.map((app) => (
            <article
              data-reveal
              className={`guide-card guide-app-card guide-app-card--${app.image}`}
              key={app.badge}
            >
              <div className="guide-card__heading">
                <Badge color={app.color}>{app.badge}</Badge>
                <h3>{app.heading}</h3>
              </div>
              <p>{app.body}</p>
              <Art
                name={`app-${app.image}`}
                width={app.image === "map" ? 164 : 144}
                height={app.image === "map" ? 176 : 144}
              />
            </article>
          ))}
          <aside
            data-reveal
            className="guide-checkout"
            aria-labelledby="checkout-heading"
          >
            <h3 id="checkout-heading">Before checkout</h3>
            <p>
              Check the payment options and final total. Some offers require a
              particular payment method or account eligibility.
            </p>
            <Art name="app-drinks" width={244} height={244} />
          </aside>
        </div>
      </Container>
      <Art name="app-heart" width={80} height={76} />
      <Art name="app-phone" width={84} height={128} />
      <Art name="app-lantern" width={64} height={104} />
    </section>
  );
}
function StudentId() {
  return (
    <section className="guide-band guide-student" aria-labelledby="guide-03">
      <Container
        variant="cheatsheet"
        className="guide-container page-container guide-student__layout"
      >
        <div className="guide-student__intro">
          <Heading
            number="03"
            title={
              <>
                student ID,
                <br />
                extra possibilities
              </>
            }
            subtitle="Your student card is worth keeping close."
          />
          <Art
            name="student-card"
            width={448}
            height={276}
            alt="Illustrated sample HCMUT student ID for Nguyễn Văn A, with placeholder ID number"
          />
          <Art name="student-star" width={88} height={88} />
          <Art name="student-lotus" width={128} height={100} />
        </div>
        <TipList tips={studentTips} className="guide-student__tips" />
      </Container>
    </section>
  );
}
function Weather() {
  return (
    <section className="guide-band guide-weather" aria-labelledby="guide-04">
      <Container
        variant="cheatsheet"
        className="guide-container page-container"
      >
        <Heading
          number="04"
          title="sun out, rain ready"
          subtitle="Pack for the weather you might get."
        />
        <div className="guide-weather__key">
          <ol className="guide-months" aria-label="Saigon seasons by month">
            {months.map((month, i) => (
              <li
                key={month}
                className={i >= 4 && i <= 10 ? "is-rainy" : "is-drier"}
                aria-label={`${month}: ${i >= 4 && i <= 10 ? "rainy season" : "drier month"}`}
              >
                <span aria-hidden="true">{month[0]}</span>
              </li>
            ))}
          </ol>
          <div className="guide-weather__legend">
            <span>drier months</span>
            <span>rainy season (May - Nov)</span>
          </div>
        </div>
        <TipList tips={weatherTips} />
      </Container>
      <Art name="weather-umbrella" width={124} height={144} />
      <Art name="weather-sun-cloud" width={212} height={140} />
      <Art name="weather-rain" width={84} height={48} />
    </section>
  );
}
function Phrases() {
  return (
    <section className="guide-band guide-phrases" aria-labelledby="guide-05">
      <Container
        variant="cheatsheet"
        className="guide-container page-container"
      >
        <Heading
          number="05"
          title={
            <>
              a little vietnamese
              <br />
              goes a long way
            </>
          }
          subtitle="Small phrases for everyday moments."
        />
        <TipList tips={phrases} className="guide-phrase-grid" vietnamese />
      </Container>
      <Art name="phrase-heart" width={76} height={72} />
      <Art name="phrase-hat" width={112} height={112} />
      <Art name="phrase-lotus" width={176} height={128} />
      <Art name="phrase-lantern" width={68} height={108} />
    </section>
  );
}
function Contact() {
  return (
    <section className="guide-contact" aria-labelledby="contact-title">
      <Container
        variant="cheatsheet"
        data-reveal
        className="guide-container page-container guide-contact__panel"
      >
        <Art name="contact-hat" width={136} height={144} />
        <Art name="contact-lantern" width={84} height={144} />
        <div>
          <h2 id="contact-title">Got a tip we missed?</h2>
          <p>Tell us and help the next newbie feel at home.</p>
        </div>
        <ButtonLink variant="contact" href={contactHref} prefetch={false}>
          Get in touch
        </ButtonLink>
      </Container>
    </section>
  );
}
export function CheatsheetPage() {
  return (
    <main id="main-content" className="guide-main" tabIndex={-1}>
      <Hero />
      <StreetSmarts />
      <AppKit />
      <StudentId />
      <Weather />
      <Phrases />
      <Contact />
    </main>
  );
}
