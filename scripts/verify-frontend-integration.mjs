import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { chromium } = await import(process.argv[2] ?? "playwright");
import { selectPlaces, searchKey } from "../src/lib/places.ts";
const base = process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:4173";
const output = new URL(
  "../../docs/screenshots/frontend-integration/",
  import.meta.url,
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [],
  checks = [];
async function open(route, width = 1366, height = 900) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => errors.push({ route, error: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error")
      errors.push({ route, error: message.text() });
  });
  assert.equal((await page.goto(base + route)).status(), 200);
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function loadedCards(page, cardSelector) {
  for (const card of await page.locator(cardSelector).all()) {
    await card.scrollIntoViewIfNeeded();
    await card
      .locator(".place-photo > img")
      .evaluate((image) => image.decode());
  }
}
try {
  for (const [route, file, cardSelector, titleSelector, pageSize] of [
    ["/lock-in", "cafes", ".lock-card", "h2", 6],
    ["/local-bites", "food", ".bites-eatery", "h3", 3],
    ["/side-quests", "activities", ".quests-card", "h2", 4],
  ]) {
    const data = JSON.parse(
      await readFile(
        new URL(`../src/content/places/${file}.json`, import.meta.url),
        "utf8",
      ),
    );
    const expected = selectPlaces(data, "", "name-asc");
    const page = await open(route);
    await loadedCards(page, cardSelector);
    assert.deepEqual(
      await page.locator(`${cardSelector} ${titleSelector}`).allTextContents(),
      expected.slice(0, pageSize).map((p) => p.name),
    );
    const first = page.locator(cardSelector).first();
    if (expected[0].photos.length > 1) {
      const before = await first
        .locator(".place-photo > img")
        .getAttribute("src");
      await first.getByRole("button", { name: /Next photo/ }).click();
      await first
        .locator(".place-photo > img")
        .evaluate((image) => image.decode());
      assert.notEqual(
        await first.locator(".place-photo > img").getAttribute("src"),
        before,
      );
    }
    const seen = [];
    const pages = Math.ceil(data.length / pageSize);
    for (let index = 1; index <= pages; index++) {
      await page.waitForFunction(
        (index) =>
          document
            .querySelector(".listing-pagination p")
            ?.textContent.includes(`Page ${index} of`),
        index,
      );
      const cards = await page.locator(cardSelector).evaluateAll((cards) =>
        cards.map((card) => ({
          id: card.dataset.placeId,
          href: card.querySelector("a").getAttribute("href"),
        })),
      );
      for (const card of cards) {
        assert.equal(
          card.href,
          data.find((place) => place.id === card.id).mapsUrl,
        );
        seen.push(card.id);
      }
      if (index < pages)
        await page.getByRole("button", { name: "Next", exact: true }).click();
    }
    assert.equal(new Set(seen).size, data.length);
    assert.deepEqual(
      seen,
      expected.map((p) => p.id),
    );
    assert(
      await page
        .getByRole("button", { name: "Next", exact: true })
        .isDisabled(),
    );
    const search = page.getByRole("searchbox");
    await search.fill("zzzz-no-matching-place");
    await page.getByText("No places match your search and filters.").waitFor();
    await page
      .getByRole("button", { name: "Clear search and filters" })
      .click();
    assert.equal(await search.inputValue(), "");
    await search.fill(searchKey(data[0].name));
    assert(
      (await page.locator(cardSelector).getAttribute("data-place-id")) ===
        data[0].id ||
        (
          await page
            .locator(cardSelector)
            .evaluateAll((cards) => cards.map((c) => c.dataset.placeId))
        ).includes(data[0].id),
    );
    await search.fill("");
    await page.getByLabel("Sort by").selectOption("name-desc");
    assert.deepEqual(
      await page.locator(`${cardSelector} ${titleSelector}`).allTextContents(),
      selectPlaces(data, "", "name-desc")
        .slice(0, pageSize)
        .map((p) => p.name),
    );
    await page.getByLabel("Sort by").selectOption("price-asc");
    assert.deepEqual(
      await page.locator(`${cardSelector} ${titleSelector}`).allTextContents(),
      selectPlaces(data, "", "price-asc")
        .slice(0, pageSize)
        .map((p) => p.name),
    );
    if (file === "cafes") {
      for (const [label, facet] of [
        ["quiet", "quiet"],
        ["open late", "open-late"],
        ["budget", "budget"],
      ]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        const count = selectPlaces(data, "", "price-asc", facet).length;
        assert(
          (await page.locator(".listing-pagination p").innerText()).startsWith(
            `${count} results`,
          ),
        );
      }
      await page.getByRole("button", { name: "all", exact: true }).click();
      const district = data[0].cafe.district;
      await page.getByLabel("District", { exact: true }).selectOption(district);
      assert(
        (await page.locator(".listing-pagination p").innerText()).startsWith(
          `${data.filter((p) => p.cafe.district === district).length} results`,
        ),
      );
    }
    if (file === "activities") {
      for (const [label, facet] of [
        ["culture", "culture"],
        ["outdoors", "outdoors"],
        ["markets", "markets"],
        ["night out", "night-out"],
      ]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        assert(
          (await page.locator(".listing-pagination p").innerText()).startsWith(
            `${selectPlaces(data, "", "price-asc", facet).length} results`,
          ),
        );
      }
    }
    await page.close();
    const desktop = await open(route, 1366, 3072);
    await loadedCards(desktop, cardSelector);
    await desktop.evaluate(() => window.scrollTo(0, 0));
    await desktop.screenshot({
      path: new URL(`${file}-1366x3072.png`, output).pathname,
    });
    await desktop.screenshot({
      path: new URL(`${file}-desktop-full.png`, output).pathname,
      fullPage: true,
    });
    await desktop.close();
    for (const width of [320, 375, 768, 1024, 1920]) {
      const responsive = await open(route, width, 900);
      assert.equal(
        await responsive.evaluate(() => document.documentElement.scrollWidth),
        width,
        `${route}: overflow at ${width}`,
      );
      for (const card of await responsive.locator(cardSelector).all()) {
        const box = await card.boundingBox();
        const link = await card.locator("a").boundingBox();
        assert(
          link.x >= box.x - 1 &&
            link.x + link.width <= box.x + box.width + 1 &&
            link.y + link.height <= box.y + box.height + 1,
          `${route}: CTA outside card at ${width}`,
        );
      }
      if (width === 375) {
        await loadedCards(responsive, cardSelector);
        await responsive.evaluate(() => window.scrollTo(0, 0));
        await responsive.screenshot({
          path: new URL(`${file}-375-full.png`, output).pathname,
          fullPage: true,
        });
      }
      await responsive.close();
    }
    checks.push({
      route,
      publishedPlaces: data.length,
      publicImages: data.reduce((s, p) => s + p.photos.length, 0),
      allPagesTraversed: pages,
      allMapsHrefsMatched: true,
      search: true,
      sort: true,
      emptyReset: true,
      gallery: true,
      responsiveWidths: [320, 375, 768, 1024, 1920],
    });
    console.log(
      `Passed ${route}: ${data.length} records across ${pages} pages`,
    );
  }
  for (const route of ["/", "/cheatsheet", "/about-us"]) {
    const page = await open(route, 375);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      375,
    );
    await page.close();
    checks.push({ route, rendered: true, overflow: false });
  }
  const navigation = await open("/");
  for (const route of [
    "/lock-in",
    "/local-bites",
    "/side-quests",
    "/cheatsheet",
    "/about-us",
    "/",
  ]) {
    await navigation.locator(`header a[href="${route}"]`).first().click();
    await navigation.waitForURL((url) => url.pathname === route);
    await navigation.locator("#main-content").waitFor();
  }
  await navigation.close();
  checks.push({ headerClientNavigationAcrossAllSixRoutes: true });
  assert.deepEqual(errors, []);
  // Deliberately fail a real image request to exercise graceful recovery.
  const fallback = await browser.newPage({ reducedMotion: "reduce" });
  const data = JSON.parse(
    await readFile(
      new URL("../src/content/places/cafes.json", import.meta.url),
      "utf8",
    ),
  );
  const first = selectPlaces(data, "", "name-asc")[0];
  await fallback.route(
    (url) => url.href === first.photos[0].src,
    (route) => route.abort(),
  );
  await fallback.goto(base + "/lock-in");
  const card = fallback.locator(".lock-card").first();
  await card.scrollIntoViewIfNeeded();
  await card.getByText("Image unavailable").waitFor();
  await card.getByRole("button", { name: /Next photo/ }).click();
  await card.locator(".place-photo > img").evaluate((image) => image.decode());
  await fallback.close();
  checks.push({ missingImageFallbackAndGalleryRecovery: true });
  await writeFile(
    new URL(
      "../../data/reports/frontend/browser-verification.json",
      import.meta.url,
    ),
    JSON.stringify({ base, checks, pageErrors: errors }, null, 2) + "\n",
  );
  console.log("All integration browser checks passed.");
} finally {
  await browser.close();
}
