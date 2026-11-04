// Build-time public projection only: never uploads, modifies ingestion data, or loads credentials.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { placeCatalogSchema } from "../src/lib/validation/placeSchemas.ts";
import { publicPlaceSchema } from "../src/lib/validation/publicPlaces.ts";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.dirname(app);
const read = async (name) =>
  JSON.parse(await readFile(path.join(root, name), "utf8"));
const catalog = placeCatalogSchema.parse(
  await read("data/processed/full/final/catalog.json"),
);
const manifest = await read("data/processed/image-manifest.json");
const report = await read("data/reports/cloudinary-upload-report.json");
assert.equal(report.finalRemoteReconciliation.status, "passed");
assert.equal(report.manifestFingerprint, manifest.manifestFingerprint);
const ids = new Set(catalog.places.map((place) => place.id));
const photos = new Map();
let excluded = 0;
for (const image of manifest.images) {
  if (
    !ids.has(image.placeId) ||
    !["uploaded-verified", "skipped-unchanged-verified"].includes(
      image.uploadStatus,
    ) ||
    ![
      "owner-confirmed-folder",
      "automatically-resolved-strong-source-evidence",
    ].includes(image.mappingEvidence.status) ||
    image.verification?.originalBytes !== "sha256-matched" ||
    image.verification.original.sha256 !== image.sha256 ||
    image.remote?.publicId !== image.cloudinaryPublicId ||
    image.verification.variants.length !== 3
  ) {
    excluded++;
    continue;
  }
  assert.equal(image.imageId, `img_${image.sha256}`);
  const variant = image.verification.variants.find(
    (item) => item.requestedWidth === 640,
  );
  assert(variant && variant.url.includes(`/${image.cloudinaryPublicId}`));
  const list = photos.get(image.placeId) ?? [];
  list.push({
    id: image.imageId,
    src: variant.url,
    width: variant.width,
    height: variant.height,
    alt: image.alt ?? null,
    order: image.imageOrder,
  });
  photos.set(image.placeId, list);
}
const result = catalog.places.map((place) => {
  // Do not turn a deterministic browsing sequence into an approved source/gallery order.
  const images = (photos.get(place.id) ?? []).sort(
    (a, b) =>
      (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id),
  );
  const {
    sourceIds,
    editorialStatus,
    images: draftImages,
    coverAssetId,
    ...publicFields
  } = place;
  void sourceIds;
  void editorialStatus;
  void draftImages;
  void coverAssetId;
  return publicPlaceSchema.parse({ ...publicFields, photos: images });
});
const output = path.join(app, "src/content/places");
await mkdir(output, { recursive: true });
const counts = {};
for (const [category, filename] of [
  ["cafe", "cafes"],
  ["food", "food"],
  ["activity", "activities"],
]) {
  const records = result.filter((place) => place.category === category);
  await writeFile(
    path.join(output, filename + ".json"),
    JSON.stringify(records) + "\n",
  );
  counts[filename] = {
    places: records.length,
    images: records.reduce((sum, place) => sum + place.photos.length, 0),
    missingImages: records.filter((place) => !place.photos.length).length,
  };
}
await mkdir(path.join(root, "data/reports/frontend"), { recursive: true });
await writeFile(
  path.join(root, "data/reports/frontend/public-data-validation.json"),
  JSON.stringify(
    {
      counts,
      excludedImages: excluded,
      totalPublishedPlaces: result.length,
      totalPublishedImages: result.reduce((sum, p) => sum + p.photos.length, 0),
      unapprovedOrdersPreservedAsNull: result
        .flatMap((p) => p.photos)
        .filter((p) => p.order === null).length,
      publicationAuthorization:
        "Owner requested frontend integration on 2026-11-04; canonical editorial/order/rights fields remain unchanged",
      sourceCatalog: "data/processed/full/final/catalog.json",
      sourceManifest: "data/processed/image-manifest.json",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(counts));
