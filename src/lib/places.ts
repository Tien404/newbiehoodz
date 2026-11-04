import type { PublicPlace } from "./validation/publicPlaces";

export type SortOrder = "name-asc" | "name-desc" | "price-asc" | "price-desc";
export function vndLabel(text: string | null | undefined): string {
  if (!text) return "Price not provided";
  return /\bVND\b|VNĐ|₫|đ/i.test(text) || text.trim().toLowerCase() === "free"
    ? text
    : `${text} VND`;
}
export function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi")
    .replace(/\s+/g, " ")
    .trim();
}
export function minimumPrice(place: PublicPlace): number | null {
  const price =
    place.category === "cafe"
      ? place.cafe.minimumDrinkPrice
      : place.category === "food"
        ? place.food.pricePerPerson
        : place.activity.admissionPrice;
  if (!price || price.amount.kind === "unparsed") return null;
  return price.amount.kind === "range" ? price.amount.min : price.amount.value;
}
export function selectPlaces<T extends PublicPlace>(
  places: readonly T[],
  query: string,
  sort: SortOrder,
  facet = "all",
  district = "",
): T[] {
  const terms = searchKey(query).split(" ").filter(Boolean);
  return places
    .filter((place) => {
      const haystack = searchKey(
        [
          place.name,
          place.englishName,
          place.address,
          place.summary,
          place.category === "food" ? place.food.recommendedDishText : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (!terms.every((term) => haystack.includes(term))) return false;
      if (place.category === "cafe") {
        if (district && place.cafe.district !== district) return false;
        const facets = place.cafe.facets;
        if (
          facet !== "all" &&
          !(facet === "quiet"
            ? facets.quiet === "yes"
            : facet === "open-late"
              ? facets.openLate === "yes"
              : facet === "budget"
                ? facets.budget === "yes"
                : false)
        )
          return false;
      }
      if (
        place.category === "activity" &&
        facet !== "all" &&
        (place.activity.classification.status !== "reviewed" ||
          !place.activity.classification.values.some(
            (value) => value === facet,
          ))
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sort.startsWith("price")) {
        const first = minimumPrice(a),
          second = minimumPrice(b);
        if (first === null || second === null)
          return first === second
            ? a.id.localeCompare(b.id)
            : first === null
              ? 1
              : -1;
        comparison = (first - second) * (sort === "price-desc" ? -1 : 1);
      } else
        comparison =
          a.name.trim().localeCompare(b.name.trim(), "vi", {
            sensitivity: "base",
            numeric: true,
          }) * (sort === "name-desc" ? -1 : 1);
      return comparison || a.id.localeCompare(b.id);
    });
}
export function pageSlice<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.max(1, Math.min(pages, Math.trunc(requestedPage) || 1));
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pages,
    total: items.length,
  };
}
