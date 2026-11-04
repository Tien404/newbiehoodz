"use client";

import { vndLabel } from "@/lib/places";
import { HeroCard } from "@/components/ui/HeroCard";
import Image from "next/image";
import { PlacePhoto } from "@/components/ui/PlacePhoto";
import {
  EmptyResults,
  ListingPagination,
  ListingToolbar,
  useListing,
} from "@/components/ui/ListingControls";
import type { PublicCafe } from "@/lib/validation/publicPlaces";
import { studyFilters } from "@/content/lock-in";
import "./lock-in.css";

function Art({
  name,
  width,
  height,
  className = "",
}: {
  name: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <Image
      className={`lock-art lock-art--${name} ${className}`}
      src={`/lock-in/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
    />
  );
}

function CafeCard({ cafe, index }: { cafe: PublicCafe; index: number }) {
  return (
    <article
      data-reveal
      className={`lock-card lock-card--${index + 1}`}
      aria-labelledby={`lock-cafe-${index}`}
      data-place-id={cafe.id}
    >
      <PlacePhoto
        photos={cafe.photos}
        name={cafe.name}
        className="lock-card__photo"
      />
      <div className="lock-card__content">
        <h2 id={`lock-cafe-${index}`} title={cafe.name}>
          {cafe.name}
        </h2>
        <p className="lock-card__address">{cafe.address}</p>
        <ul className="lock-card__tags" aria-label="Amenities">
          {[
            cafe.cafe.facets.quiet === "yes" ? "quiet" : null,
            cafe.cafe.airConditioning === "yes" ? "AC" : null,
            cafe.cafe.facets.openLate === "yes" ? "late" : null,
            cafe.cafe.facets.budget === "yes" ? "budget" : null,
          ]
            .filter(Boolean)
            .map((tag) => (
              <li key={tag} data-amenity={tag}>
                {tag}
              </li>
            ))}
        </ul>
        <div className="lock-card__bottom">
          <p className="lock-card__details">
            <span className="lock-card__price">
              {vndLabel(cafe.cafe.minimumDrinkPrice?.text)}
            </span>
            <span aria-hidden="true"> · </span>
            {cafe.openingHours?.text ?? "Hours not provided"}
          </p>
          <a
            className="lock-maps brown-button"
            href={cafe.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${cafe.name} in Google Maps`}
          >
            Open in Google Maps
          </a>
        </div>
      </div>
      {index < 2 && <Art name="paperclip" width={52} height={68} />}
      {index === 0 && <Art name="coffee-cups" width={112} height={100} />}
      {index === 1 && <Art name="matcha" width={80} height={88} />}
      {(index === 2 || index === 3) && (
        <Art name="red-tape" width={88} height={56} />
      )}
    </article>
  );
}

export function LockInPage({ cafes }: { cafes: PublicCafe[] }) {
  const listing = useListing(cafes, 6);
  const districts = [...new Set(cafes.map((cafe) => cafe.cafe.district))].sort(
    (a, b) => a.localeCompare(b, "vi", { numeric: true }),
  );
  return (
    <main tabIndex={-1} id="main-content" className="lock-main">
      <section className="lock-hero page-hero" aria-labelledby="lock-title">
        <HeroCard
          titleId="lock-title"
          eyebrow="CAFÉS & STUDY SPACES"
          title="lock in"
          subtitle={
            <>
              Find a spot that fits how you study — then open it straight in
              Google
              <br className="lock-desktop-break" /> Maps.
            </>
          }
        />
        <Art name="hero-heart" width={164} height={152} />
        <Art name="hero-star" width={148} height={148} />
        <Art name="hero-sun" width={144} height={144} />
        <Art name="hero-laptop" width={192} height={132} />
        <Art name="hero-coffee" width={92} height={100} />
        <Art name="hero-study" width={244} height={188} />
      </section>
      <section className="lock-filters" aria-labelledby="lock-filter-title">
        <div className="lock-filters__inner page-container">
          <h2 id="lock-filter-title">FILTER BY</h2>
          <div className="lock-filters__row">
            <div
              className="lock-filters__chips"
              role="group"
              aria-label="Study café filters"
            >
              {studyFilters.map((filter) => (
                <button
                  key={filter}
                  data-filter={filter}
                  type="button"
                  onClick={() =>
                    listing.setFacet(
                      filter === "all" ? "all" : filter.replace(" ", "-"),
                    )
                  }
                  aria-pressed={listing.facet === filter.replace(" ", "-")}
                  className={`lock-filter${listing.facet === filter.replace(" ", "-") ? " brown-button" : ""}`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <select
              className="lock-district"
              aria-label="District"
              value={listing.district}
              onChange={(event) => listing.setDistrict(event.target.value)}
            >
              <option value="">All districts</option>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
          <ListingToolbar {...listing} label="cafés" />
        </div>
      </section>
      <section
        className="lock-listings"
        aria-label="Study cafés"
        data-empty={listing.total === 0}
      >
        <div
          data-reveal-group
          className="lock-listings__row page-container lock-listings__row--first"
        >
          {listing.items.slice(0, 2).map((cafe, index) => (
            <CafeCard key={cafe.id} cafe={cafe} index={index} />
          ))}
        </div>
        {listing.items.length > 2 && (
          <div className="lock-food-strip" aria-hidden="true" />
        )}
        <div
          data-reveal-group
          className="lock-listings__row page-container lock-listings__row--second"
        >
          {listing.items.slice(2, 4).map((cafe, index) => (
            <CafeCard key={cafe.id} cafe={cafe} index={index + 2} />
          ))}
        </div>
        {listing.items.length > 4 && (
          <div className="lock-flags">
            <Art name="fish-flags" width={356} height={40} />
          </div>
        )}
        <div
          data-reveal-group
          className="lock-listings__row page-container lock-listings__row--third"
        >
          {listing.items.slice(4, 6).map((cafe, index) => (
            <CafeCard key={cafe.id} cafe={cafe} index={index + 4} />
          ))}
        </div>
        {listing.total === 0 && <EmptyResults reset={listing.reset} />}
        <ListingPagination {...listing} />
        <Art name="red-doodles" width={96} height={80} />
        <Art name="edge-heart" width={64} height={64} />
        <Art name="chalkboard" width={96} height={116} />
        <Art name="star-trail" width={80} height={96} />
        <Art name="flowers" width={180} height={180} />
      </section>
    </main>
  );
}
