import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  classifyCafeBudget,
  classifyCafeOpenLate,
  classifyQuiet,
} from "../src/lib/content/placeRules.ts";
import {
  activityClassificationSchema,
  cafeFilterKeySchema,
} from "../src/lib/validation/placeSchemas.ts";

test("budget includes 35K and excludes larger reviewed minimums", () => {
  const minimum = (value) => ({
    text: String(value),
    currency: "VND",
    amount: { kind: "minimum", value },
  });
  assert.equal(classifyCafeBudget(minimum(35000)), "yes");
  assert.equal(classifyCafeBudget(minimum(35001)), "no");
  assert.equal(classifyCafeBudget(null), "unknown");
  assert.equal(
    classifyCafeBudget({
      text: "30k",
      currency: "VND",
      amount: { kind: "unparsed" },
    }),
    "unknown",
  );
});

test("late opening includes 21:30, service-day midnight and 24/7", () => {
  const hours = { text: "Source schedule", interpretation: "unparsed" };
  assert.equal(classifyCafeOpenLate(hours, 1289), "no");
  assert.equal(classifyCafeOpenLate(hours, 1290), "yes");
  assert.equal(classifyCafeOpenLate(hours, 1440), "yes");
  assert.equal(classifyCafeOpenLate(hours, 1560), "yes");
  assert.equal(
    classifyCafeOpenLate({ text: "24/7", interpretation: "open-24-7" }, null),
    "yes",
  );
  assert.equal(classifyCafeOpenLate(hours, null), "unknown");
  assert.equal(classifyCafeOpenLate(hours, Infinity), "unknown");
});

test("silent, quiet and calm receive a marker without treating quite noisy as quiet", () => {
  for (const value of [
    "silent",
    " Silent ",
    "SILENT",
    "Quiet",
    "Calm",
    "quite",
    "Generally calm",
    "Relatively quiet",
    "Quiet, calming music",
  ])
    assert.equal(classifyQuiet(value), "yes");
  for (const value of [
    null,
    "",
    "Moderate",
    "not silent",
    "not quiet",
    "not always quiet",
    "quite noisy",
    "Quiet during daytime; noisier during live performances",
  ])
    assert.equal(classifyQuiet(value), "no");
});

test("removed amenity filters are rejected", () => {
  assert.equal(cafeFilterKeySchema.safeParse("wifi").success, false);
  assert.equal(cafeFilterKeySchema.safeParse("power-sockets").success, false);
});

test("published activity classifications validate independently of private workbooks", () => {
  const activities = JSON.parse(
    readFileSync(
      new URL("../src/content/places/activities.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(activities.length, 38);
  assert.equal(
    new Set(activities.map((place) => place.id)).size,
    activities.length,
  );
  for (const place of activities)
    activityClassificationSchema.parse(place.activity.classification);
});
