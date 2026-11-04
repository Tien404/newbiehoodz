"use client";

import { HeroCard } from "@/components/ui/HeroCard";
import Image from "next/image";
import { PlacePhoto } from "@/components/ui/PlacePhoto";
import {
  EmptyResults,
  ListingPagination,
  ListingToolbar,
  useListing,
} from "@/components/ui/ListingControls";
import type { PublicActivity } from "@/lib/validation/publicPlaces";
import { questFilters, questIntroduction } from "@/content/side-quests";
import { TextDisclosure } from "@/components/ui/TextDisclosure";
import "./side-quests.css";

function Art({
  name,
  width,
  height,
}: {
  name: string;
  width: number;
  height: number;
}) {
  return (
    <Image
      className={`quests-art quests-art--${name}`}
      src={`/side-quests/${name}.webp`}
      width={width}
      height={height}
      alt=""
      aria-hidden="true"
    />
  );
}

function QuestCard({
  quest,
  reversed,
  number,
}: {
  quest: PublicActivity;
  reversed: boolean;
  number: string;
}) {
  return (
    <article
      data-reveal
      className={`quests-card${reversed ? " quests-card--reversed" : ""}`}
      aria-labelledby={`quest-${number}-title`}
      data-place-id={quest.id}
    >
      <PlacePhoto
        name={quest.name}
        photos={quest.photos}
        className="quests-card__photo"
      />
      <div className="quests-card__content">
        <p className="quests-card__badge">QUEST {number}</p>
        <h2 id={`quest-${number}-title`} title={quest.name}>
          {quest.name}
        </h2>
        <p className="quests-card__description">
          {quest.summary ??
            quest.activity.experiencesText ??
            "Description not provided"}
        </p>
        <div className="quests-card__bottom">
          <ul className="quests-card__tags" aria-label="Activity details">
            {[
              quest.activity.suggestedDurationText,
              quest.activity.admissionPrice?.text,
              quest.activity.typeText,
            ]
              .filter((detail): detail is string => Boolean(detail))
              .map((detail) => (
                <li key={detail}>
                  <TextDisclosure
                    text={detail}
                    label="Activity detail"
                    className="quests-detail-trigger"
                  />
                </li>
              ))}
          </ul>
          <a
            className="quests-maps brown-button"
            href={quest.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${quest.name} in Google Maps`}
          >
            Open in Google Maps
          </a>
        </div>
      </div>
      {Number(number) % 4 === 2 && (
        <Art name="city-right" width={168} height={168} />
      )}
      {Number(number) % 4 === 0 && (
        <Art name="city-left" width={168} height={168} />
      )}
    </article>
  );
}

export function SideQuestsPage({
  activities,
}: {
  activities: PublicActivity[];
}) {
  const listing = useListing(activities, 4);
  return (
    <main tabIndex={-1} id="main-content" className="quests-main">
      <section className="quests-hero page-hero" aria-labelledby="quests-title">
        <HeroCard
          titleId="quests-title"
          eyebrow="EXPLORE THE CITY & LOCAL CULTURE"
          title="side quests"
          script="Make your time here more than a campus routine."
          subtitle={questIntroduction.join(" ")}
        />
        <Art name="hero-souvenirs" width={200} height={176} />
        <Art name="hero-map" width={236} height={160} />
        <Art name="hero-welcome" width={228} height={208} />
        <Art name="hero-skyline" width={224} height={240} />
      </section>
      <section className="quests-filters" aria-label="Quest filters">
        <div
          className="quests-filters__inner page-container"
          role="group"
          aria-label="Activity categories"
        >
          {questFilters.map((filter) => (
            <button
              className={`quests-filter${listing.facet === (filter === "all quests" ? "all" : filter.replace(" ", "-")) ? " brown-button" : ""}`}
              type="button"
              key={filter}
              onClick={() =>
                listing.setFacet(
                  filter === "all quests" ? "all" : filter.replace(" ", "-"),
                )
              }
              aria-pressed={
                listing.facet ===
                (filter === "all quests" ? "all" : filter.replace(" ", "-"))
              }
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="page-container">
          <ListingToolbar {...listing} label="activities" />
        </div>
      </section>
      <section className="quests-list" aria-label="Activities">
        <div data-reveal-group className="quests-list__pair page-container">
          {listing.items.slice(0, 2).map((quest, index) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              number={String((listing.page - 1) * 4 + index + 1).padStart(
                2,
                "0",
              )}
              reversed={index % 2 === 1}
            />
          ))}
        </div>
        <div
          data-reveal-group
          className="quests-list__pair page-container quests-list__pair--second"
        >
          {listing.items.slice(2).map((quest, index) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              number={String((listing.page - 1) * 4 + index + 3).padStart(
                2,
                "0",
              )}
              reversed={index % 2 === 1}
            />
          ))}
        </div>
        {listing.total === 0 && <EmptyResults reset={listing.reset} />}
        <ListingPagination {...listing} />
      </section>
    </main>
  );
}
