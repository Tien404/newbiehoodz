import assert from "node:assert/strict";
import test from "node:test";
import {
  createPageMetadata,
  getSiteConfig,
  pageSeo,
  pageStructuredData,
} from "../src/lib/seo.ts";

function withSite(env, run) {
  const previous = {
    SITE_URL: process.env.SITE_URL,
    SITE_INDEXABLE: process.env.SITE_INDEXABLE,
  };
  for (const key of Object.keys(previous)) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    run();
  } finally {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("unconfigured SEO publishes no invented origin and stays non-indexable", () =>
  withSite({}, () => {
    assert.equal(getSiteConfig().indexable, false);
    for (const page of Object.keys(pageSeo)) {
      const metadata = createPageMetadata(page);
      assert.equal(metadata.alternates, undefined);
      assert.equal(metadata.openGraph.url, undefined);
      assert.equal(metadata.openGraph.images, undefined);
      assert.equal(metadata.robots.index, false);
      assert.equal(pageStructuredData(page), null);
    }
  }));

test("configured SEO has six unique canonicals, descriptions and factual graph types", () =>
  withSite({ SITE_URL: "https://qa.invalid.test" }, () => {
    const canonicals = [],
      titles = [],
      descriptions = [];
    for (const page of Object.keys(pageSeo)) {
      const metadata = createPageMetadata(page);
      canonicals.push(metadata.alternates.canonical);
      titles.push(metadata.title.absolute);
      descriptions.push(metadata.description);
      assert.equal(metadata.robots.index, true);
      assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
      assert.equal(metadata.twitter.card, "summary");
      assert.equal(
        metadata.openGraph.images[0].url,
        "https://qa.invalid.test/brand/social-card.png",
      );
      const graph = pageStructuredData(page)["@graph"];
      assert.equal(graph[0]["@type"], "WebSite");
      assert.equal(graph[1]["@type"], pageSeo[page].type);
      assert(!JSON.stringify(graph).includes("aggregateRating"));
    }
    for (const values of [canonicals, titles, descriptions])
      assert.equal(new Set(values).size, 6);
  }));

test("preview flag prevents indexing even with a configured canonical origin", () =>
  withSite(
    { SITE_URL: "https://qa.invalid.test", SITE_INDEXABLE: "false" },
    () => {
      assert.equal(getSiteConfig().indexable, false);
      assert.equal(createPageMetadata("home").robots.index, false);
    },
  ));

test("invalid SEO configuration fails instead of emitting misleading URLs", () => {
  for (const SITE_URL of [
    "not a URL",
    "http://qa.invalid.test",
    "https://qa.invalid.test/subpath",
    "https://qa.invalid.test?q=1",
    "https://user:password@qa.invalid.test",
  ])
    assert.throws(() => getSiteConfig({ SITE_URL }));
  assert.throws(() => getSiteConfig({ SITE_INDEXABLE: "true" }));
  assert.throws(() => getSiteConfig({ SITE_INDEXABLE: "yes" }));
});
