"use client";

import { vndLabel } from "@/lib/places";
import { TextDisclosure } from "@/components/ui/TextDisclosure";
import { HeroCard } from "@/components/ui/HeroCard";
import Image from "next/image";
import { PlacePhoto } from "@/components/ui/PlacePhoto";
import {
  EmptyResults,
  ListingPagination,
  ListingToolbar,
  useListing,
} from "@/components/ui/ListingControls";
import type { PublicFood } from "@/lib/validation/publicPlaces";
import { firstDishes, orderingPhrases } from "@/content/local-bites";
import "./local-bites.css";

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
      className={`bites-art bites-art--${name} ${className}`}
      src={`/local-bites/${name}.webp`}
      width={width}
      height={height}
      alt={alt}
      aria-hidden={alt ? undefined : true}
    />
  );
}

export function LocalBitesPage({ places }: { places: PublicFood[] }) {
  const listing = useListing(places, 3);
  return (
    <main tabIndex={-1} id="main-content" className="bites-main">
      <section className="bites-hero page-hero" aria-labelledby="bites-title">
        <HeroCard
          eyebrow="LOCAL FOOD FOR NEWCOMERS"
          titleId="bites-title"
          title="local bites"
          subtitle={
            <>
              Start your Vietnamese food journey with dishes that are easy to
              love.
            </>
          }
        />
        <Art name="hero-noodles" width={276} height={236} />
        <Art name="hero-rolls" width={228} height={188} />
        <Art name="hero-sandwich" width={192} height={200} />
        <Art name="flags-left" width={260} height={160} />
        <Art name="flags-right" width={268} height={168} />
        <Art name="hero-star" width={148} height={148} />
      </section>
      <section className="bites-intro" aria-labelledby="bites-dishes-title">
        <div className="bites-food-strip" aria-hidden="true" />
        <div className="bites-intro__heading">
          <p className="bites-eyebrow">NEWBIE MUST-TRIES</p>
          <h2 id="bites-dishes-title">start with these</h2>
        </div>
        <div data-reveal-group className="bites-dishes page-container">
          {firstDishes.map((dish) => (
            <article data-reveal className="bites-dish" key={dish.id}>
              <Art
                name={`dish-${dish.id}`}
                width={256}
                height={256}
                alt={`Illustration of ${dish.name}`}
              />
              <h3>{dish.name}</h3>
              <p>{dish.description}</p>
            </article>
          ))}
        </div>
        <Art name="stamp" width={228} height={124} />
      </section>
      <section
        className="bites-listings"
        aria-labelledby="bites-eateries-title"
      >
        <div className="bites-listings__heading">
          <p className="bites-eyebrow">WHERE TO EAT</p>
          <h2 id="bites-eateries-title">tried &amp; tasty spots</h2>
        </div>
        <div className="page-container">
          <ListingToolbar {...listing} label="food places" />
        </div>
        <div data-reveal-group className="bites-eateries page-container">
          {listing.items.map((eatery, index) => (
            <article
              key={eatery.id}
              data-reveal
              className={`bites-eatery bites-eatery--${index + 1}`}
              aria-labelledby={`bites-eatery-${index}`}
              data-place-id={eatery.id}
            >
              <PlacePhoto
                name={eatery.name}
                photos={eatery.photos}
                className="bites-eatery__photo"
              />
              <div className="bites-eatery__content">
                <h3 id={`bites-eatery-${index}`} title={eatery.name}>
                  {eatery.name}
                </h3>
                <p className="bites-eatery__address">{eatery.address}</p>
                <div className="bites-eatery__meta">
                  <TextDisclosure
                    className="bites-eatery__tag"
                    label="Food detail"
                    text={
                      eatery.food.recommendedDishText ??
                      eatery.food.diningTypeText ??
                      "Food"
                    }
                  />
                  <p>{vndLabel(eatery.food.pricePerPerson?.text)}</p>
                </div>
              </div>
              <a
                className="bites-maps brown-button"
                href={eatery.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${eatery.name} in Google Maps`}
              >
                Open in Google Maps
              </a>
            </article>
          ))}
        </div>
        {listing.total === 0 && <EmptyResults reset={listing.reset} />}
        <ListingPagination {...listing} />
        <Art
          name="eatery-heart-full"
          className="bites-art--eatery-heart"
          width={152}
          height={144}
        />
      </section>
      <section className="bites-order" aria-labelledby="bites-order-title">
        <div data-reveal className="bites-order__panel page-container">
          <h2 id="bites-order-title" className="bites-eyebrow">
            HOW TO ORDER LIKE A LOCAL
          </h2>
          <div className="bites-phrases">
            {orderingPhrases.map((phrase) => (
              <div key={phrase.id} className="bites-phrase">
                <h3 lang="vi">
                  {phrase.id === "portion" ? (
                    <>
                      Cho mình m<span className="bites-noto">ộ</span>t phần
                    </>
                  ) : (
                    phrase.vietnamese
                  )}
                </h3>
                <p>{phrase.english}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
