import { HeroCard } from "@/components/ui/HeroCard";
import { aboutStory, aboutValues } from "@/content/about-us";
import { AboutArt } from "./AboutArt";
import { AboutExperience } from "./AboutExperience";
import "./about-us.css";

function AboutIntroduction() {
  return (
    <>
      <section className="about-hero page-hero" aria-labelledby="about-title">
        <HeroCard
          titleId="about-title"
          eyebrow="HI, NEWBIE!"
          title="about us"
          subtitle={
            <>
              A free, student-led community made by students
              <br className="about-desktop-break" /> who have been in your
              shoes.
            </>
          }
        />
        {(["pink", "green", "blue", "purple"] as const).map((color) => (
          <AboutArt
            key={color}
            name={`hero-flower-${color}`}
            width={64}
            height={64}
          />
        ))}
        <div className="about-hero__meadow" aria-hidden="true" />
        {[
          [108, 108],
          [144, 168],
          [108, 84],
          [108, 84],
          [108, 108],
          [168, 168],
        ].map(([width, height], i) => (
          <AboutArt
            key={i}
            name={`hero-butterflies-${i + 1}`}
            width={width}
            height={height}
          />
        ))}
      </section>
      <section className="about-story" aria-labelledby="about-story-title">
        <div data-reveal className="about-story__paper page-container">
          <h2 id="about-story-title">THE STORY</h2>
          <p className="about-story__script">we were newbies once too</p>
          <p className="about-story__copy">{aboutStory}</p>
        </div>
        <AboutArt name="story-star-trail" width={276} height={456} />
        <p className="about-story__date">est. 2026</p>
        <AboutArt name="story-heart-left" width={200} height={176} />
        <AboutArt name="story-heart-right" width={200} height={176} />
        <AboutArt name="story-trumpet" width={116} height={128} />
        <AboutArt name="story-piano" width={232} height={188} />
        <AboutArt name="story-rabbit" width={104} height={152} />
        <AboutArt name="story-cat" width={124} height={136} />
        <AboutArt name="story-sheep" width={140} height={132} />
        <AboutArt name="story-music-left" width={120} height={116} />
        <AboutArt name="story-music-right" width={260} height={500} />
      </section>
      <section className="about-values" aria-labelledby="about-values-title">
        <div className="about-values__band" aria-hidden="true" />
        <AboutArt name="values-stickers" width={188} height={244} />
        <AboutArt name="values-exclaim" width={232} height={228} />
        <div className="about-values__content page-container">
          <h2 data-reveal id="about-values-title">
            WHAT WE CARE ABOUT
          </h2>
          <div data-reveal-group className="about-values__cards">
            {aboutValues.map((value) => (
              <article
                key={value.title}
                data-reveal
                className={`about-value about-value--${value.title.toLowerCase()}`}
              >
                <h3>{value.title}</h3>
                {value.tagline && (
                  <p className="about-value__tagline">{value.tagline}</p>
                )}
                <p className="about-value__copy">{value.copy}</p>
              </article>
            ))}
          </div>
        </div>
        <AboutArt name="stars-left" width={304} height={88} />
        <AboutArt name="stars-right" width={256} height={76} />
      </section>
    </>
  );
}

export function AboutPage() {
  return <AboutExperience introduction={<AboutIntroduction />} />;
}
