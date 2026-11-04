import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { publicPlaceSchema } from "../src/lib/validation/publicPlaces.ts";
const placeIds = new Set(),
  imageIds = new Set();
let count = 0;
for (const [file, category] of [
  ["cafes", "cafe"],
  ["food", "food"],
  ["activities", "activity"],
]) {
  const places = JSON.parse(
    await readFile(
      new URL(`../src/content/places/${file}.json`, import.meta.url),
      "utf8",
    ),
  );
  for (const raw of places) {
    const place = publicPlaceSchema.parse(raw);
    assert.equal(place.category, category);
    assert(!placeIds.has(place.id));
    placeIds.add(place.id);
    for (const photo of place.photos) {
      assert(!imageIds.has(photo.id));
      imageIds.add(photo.id);
    }
    const approved = place.photos
      .filter((photo) => photo.order !== null)
      .map((photo) => photo.order);
    assert.equal(new Set(approved).size, approved.length);
    count++;
  }
}
console.log(
  `Public content valid: ${count} places, ${imageIds.size} unique verified-delivery image references. No private fields accepted.`,
);
