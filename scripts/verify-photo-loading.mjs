import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:4174";
const fixture = await readFile(
  new URL("../public/brand/logo.png", import.meta.url),
);
const output = new URL(
  "../../docs/screenshots/photo-loading/",
  import.meta.url,
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [];
try {
  for (const route of ["lock-in", "local-bites", "side-quests"])
    for (const width of [375, 1366]) {
      let releaseFirst, releaseNext;
      const firstGate = new Promise((resolve) => {
        releaseFirst = resolve;
      });
      const nextGate = new Promise((resolve) => {
        releaseNext = resolve;
      });
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "no-preference",
      });
      page.on("pageerror", (error) => errors.push(error.message));
      let blockNext = "";
      await page.route("https://res.cloudinary.com/**", async (request) => {
        await firstGate;
        if (request.request().url() === blockNext) await nextGate;
        await request.fulfill({ contentType: "image/png", body: fixture });
      });
      await page.goto(`${base}/${route}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      const photo = page.locator(".place-photo").first(),
        loading = photo.locator(".place-photo__loading");
      await loading.waitFor();
      assert.equal(
        await photo.evaluate(
          (node) =>
            getComputedStyle(
              node.querySelector(".place-photo__loading"),
              "::after",
            ).animationName,
        ),
        "none",
        "Offscreen loader must not animate",
      );
      await photo.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (node) =>
          getComputedStyle(
            node.querySelector(".place-photo__loading"),
            "::after",
          ).animationName === "place-photo-shimmer",
        await photo.elementHandle(),
      );
      assert.equal(await photo.getAttribute("aria-busy"), "true");
      const before = await photo.boundingBox();
      // Loading state has no pointer interception: gallery controls remain reachable.
      assert.equal(
        await loading.evaluate((node) => getComputedStyle(node).pointerEvents),
        "none",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await photo.evaluate(
          (node) =>
            getComputedStyle(
              node.querySelector(".place-photo__loading"),
              "::after",
            ).animationName,
        ),
        "none",
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.screenshot({
        path: new URL(`${route}-${width}.png`, output).pathname,
      });
      const dataFile = {
        "lock-in": "cafes",
        "local-bites": "food",
        "side-quests": "activities",
      }[route];
      const records = JSON.parse(
        await readFile(
          new URL(`../src/content/places/${dataFile}.json`, import.meta.url),
        ),
      );
      const initialSource = await photo.locator("img").getAttribute("src");
      const record = records.find(
        (record) => record.photos[0]?.src === initialSource,
      );
      assert(record?.photos.length > 1);
      blockNext = record.photos[1].src;
      releaseFirst();
      await page.waitForFunction(
        (node) => node.getAttribute("aria-busy") === "false",
        await photo.elementHandle(),
      );
      assert.equal(await loading.count(), 0);
      const after = await photo.boundingBox();
      assert.equal(after.width, before.width);
      assert.equal(after.height, before.height);
      await photo.getByRole("button", { name: /^Next photo/ }).click();
      await loading.waitFor();
      assert.equal(await photo.getAttribute("aria-busy"), "true");
      releaseNext();
      await page.waitForFunction(
        (node) => node.getAttribute("aria-busy") === "false",
        await photo.elementHandle(),
      );
      assert.equal(await loading.count(), 0);
      assert.equal(await photo.locator("img").getAttribute("src"), blockNext);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
      );
      checks.push({
        route,
        width,
        initialAndGalleryLoading: true,
        reducedMotion: true,
        offscreenIdle: true,
        fixedGeometry: true,
        passed: true,
      });
      await page.close();
      console.log(`Photo loading passed: ${route} ${width}px`);
    }
  for (const route of ["lock-in", "local-bites", "side-quests"]) {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.route("https://res.cloudinary.com/**", (request) =>
      request.abort(),
    );
    await page.goto(`${base}/${route}`);
    const photo = page.locator(".place-photo").first();
    await photo.scrollIntoViewIfNeeded();
    await photo.getByText("Image unavailable", { exact: true }).waitFor();
    assert.equal(await photo.getAttribute("aria-busy"), "false");
    assert.equal(await photo.locator(".place-photo__loading").count(), 0);
    checks.push({ route, errorFallback: true, passed: true });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    new URL("../../data/reports/frontend/photo-loading.json", import.meta.url),
    JSON.stringify(
      {
        checks,
        pageErrors: errors,
        imageResponses:
          "held/released local PNG fixtures and intentional failures; no real image collection downloaded",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
