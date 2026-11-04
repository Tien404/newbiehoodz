import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  placeDataBundleSchema,
  publishableCatalogSchema,
} from "../src/lib/validation/placeSchemas.ts";

const example = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../src/content/samples/places.sample.json", import.meta.url),
    ),
    "utf8",
  ),
);
const copy = () => structuredClone(example);

test("source-backed examples survive a JSON round trip", () => {
  const parsed = placeDataBundleSchema.parse(copy());
  assert.deepEqual(
    placeDataBundleSchema.parse(JSON.parse(JSON.stringify(parsed))),
    parsed,
  );
  assert.deepEqual(
    parsed.catalog.places.map((place) => place.category),
    ["cafe", "food", "activity"],
  );
});

test("draft examples are not publication-ready", () => {
  assert.equal(
    publishableCatalogSchema.safeParse(example.catalog).success,
    false,
  );
});

const invalidCases = [
  [
    "duplicate place ID",
    (data) => {
      data.catalog.places[1].id = data.catalog.places[0].id;
    },
  ],
  [
    "duplicate slug",
    (data) => {
      data.catalog.places[1].slug = data.catalog.places[0].slug;
    },
  ],
  [
    "category-specific fields on another category",
    (data) => {
      data.catalog.places[1].cafe = data.catalog.places[0].cafe;
    },
  ],
  [
    "removed Wi-Fi filter field",
    (data) => {
      data.catalog.places[0].cafe.facets.wifi = "yes";
    },
  ],
  [
    "inverted numeric price interval",
    (data) => {
      data.catalog.places[1].food.pricePerPerson.amount = {
        kind: "range",
        min: 150000,
        max: 50000,
      };
    },
  ],
  [
    "missing gallery asset",
    (data) => {
      data.catalog.assets.shift();
    },
  ],
  [
    "noncontiguous image order",
    (data) => {
      data.catalog.places[0].images[0].order = 9;
    },
  ],
  [
    "duplicate image inside a gallery",
    (data) => {
      data.catalog.places[0].images[1].assetId =
        data.catalog.places[0].images[0].assetId;
    },
  ],
  [
    "cover from a different place",
    (data) => {
      data.catalog.places[0].coverAssetId =
        data.catalog.places[1].images[0].assetId;
    },
  ],
  [
    "asset ID/hash mismatch",
    (data) => {
      data.catalog.assets[0].sha256 = "0".repeat(64);
    },
  ],
  [
    "Drive folder used as website delivery URL",
    (data) => {
      data.catalog.assets[0].delivery = {
        src: "https://drive.google.com/drive/folders/source",
        width: 100,
        height: 100,
      };
    },
  ],
  [
    "missing Excel provenance",
    (data) => {
      data.provenance.sources.shift();
    },
  ],
  [
    "owner-excluded source entering catalogue",
    (data) => {
      data.provenance.sources[0].inclusion = "exclude-by-owner";
      data.provenance.sources[0].ownerDecision = "Owner omitted this venue";
    },
  ],
  [
    "cell outside its source row",
    (data) => {
      data.provenance.sources[0].row += 1;
    },
  ],
  [
    "mapping references nonexistent raw cell",
    (data) => {
      data.provenance.sources[0].fieldMappings.name.cells = ["Z20"];
    },
  ],
  [
    "missing original image provenance",
    (data) => {
      data.provenance.assets.shift();
    },
  ],
  [
    "invented free badge for unparsed admission",
    (data) => {
      data.catalog.places[2].activity.budgetTier = "free";
    },
  ],
  [
    "blank required name",
    (data) => {
      data.catalog.places[0].name = "  ";
    },
  ],
  [
    "non-Maps URL for Maps action",
    (data) => {
      data.catalog.places[0].mapsUrl = "javascript:alert(1)";
    },
  ],
];

for (const [description, mutate] of invalidCases) {
  test(`rejects ${description}`, () => {
    const data = copy();
    mutate(data);
    assert.equal(placeDataBundleSchema.safeParse(data).success, false);
  });
}

test("unknown optional facts and reviewed classification with no matching bucket stay distinct", () => {
  const data = copy();
  data.catalog.places[2].activity.classification = {
    status: "reviewed",
    values: [],
  };
  assert.equal(placeDataBundleSchema.safeParse(data).success, true);
});
