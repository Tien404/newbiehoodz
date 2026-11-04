"use client";

import { useEffect, useRef, useState } from "react";
import { preloadPlacePhotos } from "@/lib/placePhotoPreload";
import type { PublicPlace } from "@/lib/validation/publicPlaces";
import { pageSlice, selectPlaces, type SortOrder } from "@/lib/places";
import "./place-listing.css";

export function useListing<T extends PublicPlace>(
  places: readonly T[],
  size: number,
) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("name-asc");
  const [facet, setFacet] = useState("all");
  const [district, setDistrict] = useState("");
  const [requestedPage, setPage] = useState(1);
  const filtered = selectPlaces(places, query, sort, facet, district);
  const result = pageSlice(filtered, requestedPage, size);
  const nextPhotoSources =
    result.page < result.pages
      ? pageSlice(filtered, result.page + 1, size)
          .items.slice(0, 2)
          .flatMap((place) => (place.photos[0] ? [place.photos[0].src] : []))
      : [];
  return {
    ...result,
    nextPhotoSources,
    query,
    sort,
    facet,
    district,
    setPage,
    setQuery: (value: string) => {
      setQuery(value);
      setPage(1);
    },
    setSort: (value: SortOrder) => {
      setSort(value);
      setPage(1);
    },
    setFacet: (value: string) => {
      setFacet(value);
      setPage(1);
    },
    setDistrict: (value: string) => {
      setDistrict(value);
      setPage(1);
    },
    reset: () => {
      setQuery("");
      setSort("name-asc");
      setFacet("all");
      setDistrict("");
      setPage(1);
    },
  };
}
export function ListingToolbar({
  query,
  sort,
  setQuery,
  setSort,
  label,
}: {
  query: string;
  sort: SortOrder;
  setQuery: (value: string) => void;
  setSort: (value: SortOrder) => void;
  label: string;
}) {
  return (
    <div className="listing-toolbar">
      <label>
        Search {label}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, address or keyword"
        />
      </label>
      <label>
        Sort by
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOrder)}
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </label>
    </div>
  );
}
export function ListingPagination({
  page,
  pages,
  total,
  setPage,
  nextPhotoSources,
}: {
  page: number;
  pages: number;
  total: number;
  setPage: (value: number) => void;
  nextPhotoSources: readonly string[];
}) {
  const release = useRef<(() => void) | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stop = () => {
    clearTimeout(timer.current);
    release.current?.();
    release.current = undefined;
  };
  const warm = () => {
    stop();
    release.current = preloadPlacePhotos(nextPhotoSources);
  };
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      release.current?.();
    },
    [nextPhotoSources],
  );
  return (
    <nav
      className="listing-pagination page-container"
      aria-label="Listing pages"
    >
      <button
        className="brown-button"
        type="button"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <p role="status">
        {total} results · Page {page} of {pages}
      </p>
      <button
        className="brown-button"
        type="button"
        disabled={page === pages}
        onClick={() => setPage(page + 1)}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            stop();
            timer.current = setTimeout(warm, 150);
          }
        }}
        onPointerLeave={stop}
        onFocus={warm}
        onBlur={stop}
        onPointerDown={warm}
      >
        Next
      </button>
    </nav>
  );
}
export function EmptyResults({ reset }: { reset: () => void }) {
  return (
    <div className="listing-empty page-container" role="status">
      <p>No places match your search and filters.</p>
      <button className="brown-button" type="button" onClick={reset}>
        Clear search and filters
      </button>
    </div>
  );
}
