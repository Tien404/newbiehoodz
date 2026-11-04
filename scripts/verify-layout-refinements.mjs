import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:4174";
const output = new URL(
  "../../docs/screenshots/layout-refinements/",
  import.meta.url,
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [];
const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
try {
  for (const width of [320, 375, 768, 1024, 1366, 1920]) {
    for (const route of [
      "lock-in",
      "local-bites",
      "side-quests",
      "cheatsheet",
    ]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      page.on("pageerror", (error) =>
        errors.push({ route, width, error: error.message }),
      );
      assert.equal((await page.goto(`${base}/${route}`)).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      const metrics = {};
      for (const select of await page.locator("select").all()) {
        assert(
          await select.evaluate((node) => {
            const style = getComputedStyle(node);
            return (
              style.appearance === "none" &&
              parseFloat(style.paddingRight) >= 40 &&
              style.backgroundImage.includes("svg")
            );
          }),
          "Dropdown arrow lacks inset/text clearance",
        );
      }
      if (route === "lock-in") {
        const first = page.locator(".lock-card").first();
        await first.scrollIntoViewIfNeeded();
        const arrow = first.getByRole("button", { name: /Next photo/ });
        await arrow.hover();
        assert.equal(
          await arrow.evaluate(
            (node) => getComputedStyle(node).textDecorationLine,
          ),
          "none",
        );
        const before = await first
          .locator(".place-photo img")
          .getAttribute("src");
        await arrow.click();
        await page.waitForFunction(
          (src) =>
            document
              .querySelector(".lock-card .place-photo img")
              ?.getAttribute("src") !== src,
          before,
        );
        const strip = page.locator(".lock-food-strip"),
          flags = page.locator(".lock-flags");
        metrics.stripMargins = await strip.evaluate((node) => ({
          top: parseFloat(getComputedStyle(node).marginTop),
          bottom: parseFloat(getComputedStyle(node).marginBottom),
        }));
        metrics.flagMargins = await flags.evaluate((node) => ({
          top: parseFloat(getComputedStyle(node).marginTop),
          bottom: parseFloat(getComputedStyle(node).marginBottom),
        }));
        assert(metrics.stripMargins.top < 100 && metrics.flagMargins.top < 100);
      } else if (route === "local-bites") {
        const rows = await page.locator(".bites-eatery").evaluateAll((cards) =>
          cards.map((card) => {
            const image = card
                .querySelector(".place-photo")
                .getBoundingClientRect(),
              box = card.getBoundingClientRect(),
              title = card.querySelector("h3").getBoundingClientRect(),
              meta = card
                .querySelector(".bites-eatery__meta")
                .getBoundingClientRect();
            return {
              imageWidth: image.width,
              imageHeight: image.height,
              cardHeight: box.height,
              titleOffset: title.left - box.left,
              metaOffset: meta.left - box.left,
            };
          }),
        );
        assert(
          rows.every(
            (row) =>
              row.imageWidth > 104 &&
              row.imageHeight > 120 &&
              row.cardHeight >= 184,
          ),
        );
        for (const row of rows) {
          assert(Math.abs(row.titleOffset - rows[0].titleOffset) < 1);
          assert(Math.abs(row.metaOffset - rows[0].metaOffset) < 1);
        }
        const heart = await page
            .locator(".bites-art--eatery-heart")
            .boundingBox(),
          section = await page.locator(".bites-listings").boundingBox();
        assert(
          heart.y >= section.y &&
            heart.y + heart.height < section.y + section.height,
        );
        for (const target of await page
          .locator(".bites-listings a:visible,.bites-listings button:visible")
          .all())
          assert(
            !overlaps(heart, await target.boundingBox()),
            "Heart overlaps an actionable control",
          );
        const order = await page.locator(".bites-order__panel").boundingBox();
        assert(
          order.y - (section.y + section.height) <= 64,
          "Excessive blank space before ordering phrases",
        );
        metrics.rows = rows;
        metrics.orderGap = order.y - (section.y + section.height);
      } else if (route === "side-quests") {
        const cards = await page.locator(".quests-card").evaluateAll((cards) =>
          cards.map((card) => {
            const b = card.getBoundingClientRect();
            return { top: b.top, bottom: b.bottom };
          }),
        );
        const gaps = cards
          .slice(1)
          .map((card, index) => card.top - cards[index].bottom);
        assert(
          gaps.every((gap) => Math.abs(gap - gaps[0]) < 1),
          "Unequal quest row spacing",
        );
        for (const tags of await page.locator(".quests-card__tags").all())
          assert(
            await tags.evaluate((node) => {
              const items = [...node.children],
                boxes = items.map((item) => item.getBoundingClientRect());
              return (
                boxes.every((box) => Math.abs(box.top - boxes[0].top) < 1) &&
                items.every((item) => {
                  const style = getComputedStyle(item);
                  return (
                    style.whiteSpace === "nowrap" &&
                    style.textOverflow === "ellipsis"
                  );
                }) &&
                node.scrollWidth <= node.clientWidth + 1
              );
            }),
            "Activity metadata must share one row with ellipsis and no overflow",
          );
        for (const description of await page
          .locator(".quests-card__description")
          .all())
          assert(
            await description.evaluate(
              (node) => node.scrollHeight <= node.clientHeight + 1,
            ),
            "Activity description remains truncated",
          );
        metrics.cardGaps = gaps;
      } else {
        const panel = await page.locator(".guide-contact__panel").boundingBox(),
          section = await page.locator(".guide-contact").boundingBox(),
          hat = await page.locator(".guide-art--contact-hat").boundingBox(),
          lantern = await page
            .locator(".guide-art--contact-lantern")
            .boundingBox();
        assert(panel.y - section.y <= 128, "Excessive Cheatsheet contact gap");
        assert(
          hat.x < panel.x + 16 &&
            hat.x + hat.width > panel.x &&
            hat.y < panel.y &&
            hat.y + hat.height > panel.y,
        );
        assert(
          lantern.x + lantern.width > panel.x + panel.width - 16 &&
            lantern.x < panel.x + panel.width &&
            lantern.y < panel.y &&
            lantern.y + lantern.height > panel.y,
        );
        metrics.contactGap = panel.y - section.y;
      }
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        `${route} horizontal overflow at ${width}`,
      );
      for (const card of await page
        .locator(".lock-card,.bites-eatery,.quests-card")
        .all()) {
        const box = await card.boundingBox(),
          link = await card.locator("a").boundingBox();
        assert(
          link.x >= box.x - 1 &&
            link.x + link.width <= box.x + box.width + 1 &&
            link.y + link.height <= box.y + box.height + 1,
          "Maps CTA escapes card",
        );
      }
      if (width === 375 || width === 1366) {
        for (const photo of await page.locator(".place-photo").all()) {
          await photo.scrollIntoViewIfNeeded();
          await photo.locator("img").evaluate((image) => image.decode());
        }
        if (route === "cheatsheet") {
          await page.locator(".guide-contact__panel").scrollIntoViewIfNeeded();
          for (const art of await page.locator(".guide-contact img").all())
            await art.evaluate((image) => image.decode());
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: new URL(`${route}-${width}.png`, output).pathname,
          fullPage: true,
        });
      }
      checks.push({ route, width, metrics, passed: true });
      await page.close();
    }
    console.log(`Layout checks passed at ${width}px`);
  }
  assert.deepEqual(errors, []);
  await writeFile(
    new URL(
      "../../data/reports/frontend/layout-refinements.json",
      import.meta.url,
    ),
    JSON.stringify({ base, checks, pageErrors: errors }, null, 2) + "\n",
  );
  console.log("All 24 layout/viewport checks passed.");
} finally {
  await browser.close();
}
