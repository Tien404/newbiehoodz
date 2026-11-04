import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { selectPlaces } from "../src/lib/places.ts";
const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:4174";
const fixture = await readFile(
  new URL("../public/brand/logo.png", import.meta.url),
);
const categories = [
  ["lock-in", "cafes", 6],
  ["local-bites", "food", 3],
  ["side-quests", "activities", 4],
];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [];
const instrument = () => {
  window.__warmed = [];
  window.__warmPeak = 0;
  const NativeImage = window.Image;
  window.Image = function (...args) {
    const image = new NativeImage(...args);
    window.__warmed.push(image);
    return image;
  };
  window.Image.prototype = NativeImage.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "src",
  );
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    ...descriptor,
    set(value) {
      descriptor.set.call(this, value);
      if (window.__warmed.includes(this) && this.fetchPriority === "low")
        window.__warmPeak = Math.max(
          window.__warmPeak,
          window.__warmed.filter(
            (image) =>
              image.fetchPriority === "low" && image.src && !image.complete,
          ).length,
        );
    },
  });
};
try {
  for (const [route, file, size] of categories) {
    const records = JSON.parse(
      await readFile(
        new URL(`../src/content/places/${file}.json`, import.meta.url),
      ),
    );
    for (const width of [375, 1366]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      await page.addInitScript(instrument);
      page.on("pageerror", (error) => errors.push(error.message));
      // Tiny local response: exercise request scheduling without downloading a photo collection.
      await page.route("https://res.cloudinary.com/**", (route) =>
        route.fulfill({ status: 200, contentType: "image/png", body: fixture }),
      );
      await page.goto(`${base}/${route}`);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.evaluate(
          () =>
            window.__warmed.filter((image) => image.fetchPriority === "low")
              .length,
        ),
        0,
      );
      const photo = page.locator(".place-photo").first();
      const source = await photo.locator("img").getAttribute("src");
      const record = records.find((record) => record.photos[0]?.src === source);
      assert(record?.photos.length > 1);
      await photo.scrollIntoViewIfNeeded();
      await photo.locator("img").evaluate((image) => image.decode());
      await page.waitForFunction(
        (source) =>
          window.__warmed.some(
            (image) => image.src === source && image.complete,
          ),
        record.photos[1].src,
      );
      assert.equal(
        await page.evaluate(() =>
          window.__warmed
            .filter((image) => image.fetchPriority === "low")
            .some(
              (image) => !image.src.startsWith("https://res.cloudinary.com/"),
            ),
        ),
        false,
      );
      const visible = await page.locator(".place-photo").evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const b = node.getBoundingClientRect();
            return b.top < innerHeight && b.bottom > 0;
          })
          .map((node) => node.querySelector("img")?.src),
      );
      const permitted = records
        .filter((record) => visible.includes(record.photos[0]?.src))
        .map((record) => record.photos[1]?.src);
      const warmed = await page.evaluate(() =>
        window.__warmed
          .filter((image) => image.fetchPriority === "low")
          .map((image) => image.src),
      );
      assert(
        warmed.every((source) => permitted.includes(source)),
        "Offscreen or distant gallery image was speculatively requested",
      );
      await photo.getByRole("button", { name: /^Next photo/ }).click();
      assert.equal(
        await photo.locator("img").getAttribute("src"),
        record.photos[1].src,
      );
      if (record.photos[2])
        await page.waitForFunction(
          (source) => window.__warmed.some((image) => image.src === source),
          record.photos[2].src,
        );
      await photo.getByRole("button", { name: /^Previous photo/ }).click();
      assert.equal(await photo.locator("img").getAttribute("src"), source);
      const next = page.getByRole("button", { name: "Next", exact: true });
      await next.scrollIntoViewIfNeeded();
      const expected = selectPlaces(records, "", "name-asc")
        .slice(size, size + 2)
        .flatMap((record) => (record.photos[0] ? [record.photos[0].src] : []));
      await next.focus();
      await page.waitForFunction(
        (sources) =>
          sources.every((source) =>
            window.__warmed.some(
              (image) => image.src === source && image.complete,
            ),
          ),
        expected,
      );
      assert(await page.evaluate(() => window.__warmPeak <= 2));
      const urls = await page.evaluate(() =>
        window.__warmed
          .filter((image) => image.fetchPriority === "low")
          .map((image) => image.src),
      );
      assert.equal(
        new Set(urls).size,
        urls.length,
        "Duplicate speculative request",
      );
      await next.click();
      assert(
        await page
          .getByRole("status")
          .getByText(/Page 2 of/)
          .isVisible(),
      );
      checks.push({
        route,
        width,
        visibleGalleryNextOnly: true,
        nextPageCovers: expected.length,
        deduplicated: true,
        passed: true,
      });
      await page.close();
      console.log(`Place photo warmup passed: ${route} ${width}px`);
    }
  }
  for (const connection of [
    { saveData: true, effectiveType: "4g" },
    { saveData: false, effectiveType: "2g" },
  ]) {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.addInitScript(instrument);
    await page.addInitScript(
      (connection) =>
        Object.defineProperty(navigator, "connection", {
          configurable: true,
          value: connection,
        }),
      connection,
    );
    await page.route("https://res.cloudinary.com/**", (route) =>
      route.fulfill({ contentType: "image/png", body: fixture }),
    );
    await page.goto(`${base}/lock-in`);
    await page.evaluate(() => document.fonts.ready);
    const photo = page.locator(".place-photo").first();
    await photo.scrollIntoViewIfNeeded();
    await photo.locator("img").evaluate((image) => image.decode());
    await page.getByRole("button", { name: "Next", exact: true }).focus();
    await page.waitForTimeout(300);
    assert.equal(
      await page.evaluate(
        () =>
          window.__warmed.filter((image) => image.fetchPriority === "low")
            .length,
      ),
      0,
    );
    checks.push({ connection, skipped: true, passed: true });
    await page.close();
  }
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.addInitScript(instrument);
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Lock In", exact: true })
    .hover();
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(
      () =>
        window.__warmed.filter((image) => image.fetchPriority === "low").length,
    ),
    0,
  );
  checks.push({ routeArtworkPreloaderRemoved: true, passed: true });
  await page.close();
  assert.deepEqual(errors, []);
  await writeFile(
    new URL(
      "../../data/reports/frontend/place-photo-preload.json",
      import.meta.url,
    ),
    JSON.stringify(
      {
        checks,
        pageErrors: errors,
        imageResponses:
          "local PNG fixture; no Cloudinary collection downloaded for this test",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
