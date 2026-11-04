"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  markPlacePhotoLoaded,
  preloadPlacePhotos,
} from "@/lib/placePhotoPreload";
import type { PublicPhoto } from "@/lib/validation/publicPlaces";
import "./place-listing.css";

export function PlacePhoto({
  photos,
  name,
  className,
}: {
  photos: PublicPhoto[];
  name: string;
  className: string;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const photo = photos[index];
  const loading = Boolean(
    photo && !failed.includes(photo.id) && loaded !== photo.src,
  );
  const next =
    photos.length > 1 ? photos[(index + 1) % photos.length] : undefined;
  useEffect(() => {
    if (!frame.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible(
          entries.some(
            (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.15,
          ),
        );
      },
      { threshold: 0.15 },
    );
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || loaded !== photo?.src || !next || failed.includes(next.id))
      return;
    let release: (() => void) | undefined;
    const timer = setTimeout(() => {
      release = preloadPlacePhotos([next.src]);
    }, 200);
    return () => {
      clearTimeout(timer);
      release?.();
    };
  }, [visible, loaded, photo?.src, next, failed]);
  return (
    <div
      ref={frame}
      className={`${className} place-photo`}
      aria-busy={loading && visible}
      data-visible={visible}
    >
      {loading && <span className="place-photo__loading" aria-hidden="true" />}
      {photo && !failed.includes(photo.id) ? (
        <Image
          key={photo.id}
          src={photo.src}
          width={photo.width}
          height={photo.height}
          alt={photo.alt ?? name}
          unoptimized
          onLoad={() => {
            markPlacePhotoLoaded(photo.src);
            setLoaded(photo.src);
          }}
          onError={() => setFailed((previous) => [...previous, photo.id])}
        />
      ) : (
        <span className="place-photo__missing">Image unavailable</span>
      )}
      {photos.length > 1 && (
        <div
          role="group"
          className="place-photo__controls"
          aria-label={`Photos of ${name}`}
        >
          <button
            className="brown-button"
            type="button"
            aria-label={`Previous photo of ${name}`}
            onClick={() =>
              setIndex((index + photos.length - 1) % photos.length)
            }
          >
            ‹
          </button>
          <span aria-live="polite">
            {index + 1} / {photos.length}
          </span>
          <button
            className="brown-button"
            type="button"
            aria-label={`Next photo of ${name}`}
            onClick={() => setIndex((index + 1) % photos.length)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
