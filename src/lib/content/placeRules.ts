import type { CafePlace, OpeningHours, Price } from "@/types/places";

export const cafeFilterPolicy = {
  budgetMaximumVnd: 35_000,
  lateClosingMinute: 21 * 60 + 30,
  quietSourceValues: ["silent", "quiet", "calm"] as const,
} as const;

/** Quiet/Calm/Silent qualify; explicit contradictory noise descriptions do not. */
export function classifyQuiet(noiseDescription: string | null): "yes" | "no" {
  const description = noiseDescription?.trim().toLowerCase();
  if (!description) return "no";
  if (
    /\b(?:noisy|noisier|loud)\b|\bnot(?:\s+always)?\s+(?:quiet|calm|silent)\b/.test(
      description,
    )
  )
    return "no";
  // Accept the owner's standalone spelling "quite", never "quite noisy".
  return description === "quite" ||
    /\b(?:quiet|calm|silent)\b/.test(description)
    ? "yes"
    : "no";
}

/** This rule consumes a reviewed minimum; it does not guess amounts from price prose. */
export function classifyCafeBudget(
  price: Price | null,
): CafePlace["cafe"]["facets"]["budget"] {
  if (price?.amount.kind !== "minimum") return "unknown";
  return price.amount.value <= cafeFilterPolicy.budgetMaximumVnd ? "yes" : "no";
}

/** Closing minutes use the service day: 00:00 next day = 1440, 02:00 = 1560. */
export function classifyCafeOpenLate(
  hours: OpeningHours | null,
  closingMinuteFromOpeningDay: number | null,
): CafePlace["cafe"]["facets"]["openLate"] {
  if (hours?.interpretation === "open-24-7") return "yes";
  if (
    closingMinuteFromOpeningDay === null ||
    !Number.isInteger(closingMinuteFromOpeningDay) ||
    closingMinuteFromOpeningDay < 0
  )
    return "unknown";
  return closingMinuteFromOpeningDay >= cafeFilterPolicy.lateClosingMinute
    ? "yes"
    : "no";
}
