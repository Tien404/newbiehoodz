// Optional local provenance audit; not a dependency of the standalone frontend tests.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activityClassificationSchema } from "../src/lib/validation/placeSchemas.ts";
const classifications = JSON.parse(
  readFileSync(
    new URL("../../docs/data/ACTIVITY_CLASSIFICATION.json", import.meta.url),
    "utf8",
  ),
).records;
const sources = JSON.parse(
  readFileSync(
    new URL("../../docs/data/evidence/updated/records.json", import.meta.url),
    "utf8",
  ),
).filter((record) => record.category === "activities");
assert.equal(classifications.length, 38);
assert.equal(
  new Set(classifications.map((item) => item.source_ref)).size,
  sources.length,
);
for (const source of sources) {
  const item = classifications.find(
    (item) => item.source_ref === source.source_ref,
  );
  assert.equal(item.workbook_sha256, source.workbook_sha256);
  activityClassificationSchema.parse(item.classification);
}
console.log("38 activity source classifications and workbook hashes match.");
