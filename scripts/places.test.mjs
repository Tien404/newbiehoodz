import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  searchKey,
  selectPlaces,
  pageSlice,
  vndLabel,
} from "../src/lib/places.ts";
import {
  publicPlaceSchema,
  cloudinaryDeliverySchema,
} from "../src/lib/validation/publicPlaces.ts";
const load = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../src/content/places/${name}.json`, import.meta.url),
    ),
  ).map((row) => publicPlaceSchema.parse(row));
const cafes = load("cafes"),
  food = load("food"),
  activities = load("activities");

test("published counts and verified image counts reconcile", () => {
  assert.deepEqual(
    [cafes.length, food.length, activities.length],
    [245, 75, 38],
  );
  assert.deepEqual(
    [cafes, food, activities].map((rows) =>
      rows.reduce((sum, p) => sum + p.photos.length, 0),
    ),
    [982, 152, 285],
  );
  assert.equal(
    new Set(
      [...cafes, ...food, ...activities].flatMap((p) =>
        p.photos.map((photo) => photo.id),
      ),
    ).size,
    1419,
  );
});
test("Vietnamese search normalizes combining accents, đ, case and whitespace", () => {
  assert.equal(searchKey("  ĐẶNG   Văn LÂM "), "dang van lam");
  for (const place of [cafes[0], food[0], activities[0]]) {
    const rows = [...cafes, ...food, ...activities];
    assert(
      selectPlaces(rows, searchKey(place.name), "name-asc").some(
        (row) => row.id === place.id,
      ),
    );
  }
  assert.equal(
    selectPlaces(cafes, "zzzz-no-matching-place", "name-asc").length,
    0,
  );
});
test("café facets combine with exact district and search without guessing unknown values", () => {
  for (const facet of ["quiet", "budget", "open-late"]) {
    const key = facet === "open-late" ? "openLate" : facet;
    const expected = cafes.filter((p) => p.cafe.facets[key] === "yes");
    assert.equal(
      selectPlaces(cafes, "", "name-asc", facet).length,
      expected.length,
    );
  }
  const district = cafes[0].cafe.district;
  assert(
    selectPlaces(cafes, "", "name-asc", "all", district).every(
      (p) => p.cafe.district === district,
    ),
  );
});
test("activity filters preserve multiple memberships and unclassified entries in all", () => {
  assert.deepEqual(
    ["culture", "outdoors", "markets", "night-out"].map(
      (facet) => selectPlaces(activities, "", "name-asc", facet).length,
    ),
    [27, 9, 4, 13],
  );
  assert.equal(selectPlaces(activities, "", "name-asc").length, 38);
});
test("numeric prices sort without coercing conditional prose; unknown prices remain last", () => {
  const sorted = selectPlaces(activities, "", "price-desc");
  const firstUnknown = sorted.findIndex(
    (p) =>
      !p.activity.admissionPrice ||
      p.activity.admissionPrice.amount.kind === "unparsed",
  );
  assert(
    sorted
      .slice(firstUnknown)
      .every(
        (p) =>
          !p.activity.admissionPrice ||
          p.activity.admissionPrice.amount.kind === "unparsed",
      ),
  );
  assert.deepEqual(
    selectPlaces(food, "", "name-asc").map((p) => p.id),
    [...selectPlaces(food, "", "name-desc")].reverse().map((p) => p.id),
  );
});
test("pagination reaches every record once and clamps empty and out-of-range pages", () => {
  for (const [rows, size] of [
    [cafes, 6],
    [food, 3],
    [activities, 4],
  ]) {
    const sorted = selectPlaces(rows, "", "name-asc");
    const ids = [];
    for (let page = 1; page <= Math.ceil(rows.length / size); page++)
      ids.push(...pageSlice(sorted, page, size).items.map((p) => p.id));
    assert.equal(ids.length, rows.length);
    assert.equal(new Set(ids).size, rows.length);
    assert.equal(
      pageSlice(rows, 99999, size).page,
      Math.ceil(rows.length / size),
    );
  }
  assert.deepEqual(pageSlice([], 4, 6), {
    items: [],
    page: 1,
    pages: 1,
    total: 0,
  });
});
test("public contract rejects private provenance and unsafe delivery hosts", () => {
  assert.equal(
    publicPlaceSchema.safeParse({ ...cafes[0], sourceIds: ["private"] })
      .success,
    false,
  );
  assert.equal(
    cloudinaryDeliverySchema.safeParse("https://example.com/image/upload/a")
      .success,
    false,
  );
  assert.equal(
    cloudinaryDeliverySchema.safeParse("javascript:alert(1)").success,
    false,
  );
  assert.equal(cloudinaryDeliverySchema.safeParse("not a URL").success, false);
  assert.equal(
    cloudinaryDeliverySchema.safeParse(
      "https://res.cloudinary.com/test/image/upload/unassigned/hash.jpg",
    ).success,
    false,
  );
  assert(
    [...cafes, ...food, ...activities].every(
      (place) =>
        place.photos.every((photo) => photo.order === null) ||
        place.name === "Phúc Long",
    ),
  );
});
test("source currency is explicit without inventing missing amounts", () => {
  assert.equal(vndLabel("35K"), "35K VND");
  assert.equal(vndLabel("35,000 VND"), "35,000 VND");
  assert.equal(vndLabel(null), "Price not provided");
  assert.equal(vndLabel("Free"), "Free");
});
test("alphabetical sorting ignores incidental source padding without rewriting names", () => {
  const fixtures = [
    { ...activities[0], name: "  Z place  ", id: "z" },
    { ...activities[0], name: "A place", id: "a" },
  ];
  assert.deepEqual(
    selectPlaces(fixtures, "", "name-asc").map((p) => p.name),
    ["A place", "  Z place  "],
  );
  assert.deepEqual(
    selectPlaces(fixtures, "", "name-desc").map((p) => p.name),
    ["  Z place  ", "A place"],
  );
});
