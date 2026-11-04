import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:3000";
const output = new URL("../../docs/screenshots/ui-feedback/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [];
try {
  for (const width of [320, 375, 768, 1366, 1920]) {
    for (const route of ["lock-in", "local-bites", "side-quests"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on("pageerror", (error) => errors.push(error.message));
      assert.equal((await page.goto(`${base}/${route}`)).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      if (route === "lock-in") {
        for (const card of await page.locator(".lock-card").all()) {
          if ((await card.getAttribute("class")).includes("lock-card--3"))
            break;
          await card.scrollIntoViewIfNeeded();
          const photo = card.locator(".place-photo > img");
          await photo.evaluate((image) => image.decode());
          const before = await photo.getAttribute("src");
          await card.getByRole("button", { name: /Next photo/ }).click();
          await page.waitForFunction(
            ({ id, src }) =>
              document
                .querySelector(`[data-place-id="${id}"] .place-photo > img`)
                ?.getAttribute("src") !== src,
            { id: await card.getAttribute("data-place-id"), src: before },
          );
          await photo.evaluate((image) => image.decode());
          assert.notEqual(await photo.getAttribute("src"), before);
          assert(
            await card.evaluate(
              (node) =>
                Number(
                  getComputedStyle(node.querySelector(".place-photo__controls"))
                    .zIndex,
                ) >
                Number(
                  getComputedStyle(node.querySelector(".lock-art")).zIndex,
                ),
            ),
          );
        }
        if (width === 1366) {
          await page
            .locator(".lock-listings__row--first")
            .screenshot({ path: new URL("lock-cards.png", output).pathname });
          await page.locator(".lock-food-strip").scrollIntoViewIfNeeded();
          const strip = await page.locator(".lock-food-strip").boundingBox();
          await page.screenshot({
            path: new URL("lock-strip.png", output).pathname,
            clip: { x: 0, y: strip.y - 60, width, height: 180 },
          });
          await page.locator("footer").scrollIntoViewIfNeeded();
          const footer = await page.locator("footer").boundingBox();
          await page.screenshot({
            path: new URL("lock-footer.png", output).pathname,
            clip: { x: 0, y: footer.y - 90, width, height: 180 },
          });
        }
      } else if (route === "local-bites") {
        for (const tag of await page.locator(".bites-eatery__tag").all()) {
          const error = await tag.evaluate((node) => {
            const box = node.getBoundingClientRect(),
              text = node.firstElementChild.getBoundingClientRect();
            return Math.abs(
              (box.top + box.bottom - text.top - text.bottom) / 2,
            );
          });
          assert(error < 1, "Dish label is not vertically centered");
        }
        await page.getByRole("searchbox").fill("no-matching-ui-feedback-123");
        await page
          .getByText("No places match your search and filters.")
          .waitFor();
        await page
          .getByRole("button", { name: "Clear search and filters" })
          .click();
        await page.locator(".bites-eatery").first().waitFor();
        if (width === 1366) {
          for (const photo of await page
            .locator(".bites-eatery__photo")
            .all()) {
            await photo.scrollIntoViewIfNeeded();
            await photo.locator("img").evaluate((image) => image.decode());
          }
          await page.locator(".bites-listings").scrollIntoViewIfNeeded();
          await page.locator(".bites-listings").screenshot({
            path: new URL("bites-desktop.png", output).pathname,
          });
        }
      } else {
        await page.getByRole("searchbox").fill("Coopmart");
        await page.waitForFunction(
          () =>
            document.querySelectorAll(".quests-card").length === 1 &&
            document
              .querySelector(".quests-card h2")
              ?.textContent.includes("Coopmart"),
        );
        const free = page
          .locator(".quests-card__tags li")
          .filter({ hasText: /^Free$/ });
        assert.equal(await free.count(), 1);
        assert(
          await free.evaluate((node) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            const style = getComputedStyle(node);
            return (
              node.getBoundingClientRect().width <=
              range.getBoundingClientRect().width +
                parseFloat(style.paddingLeft) +
                parseFloat(style.paddingRight) +
                1
            );
          }),
          "Free badge has unused fixed-width space",
        );
        if (width === 1366) {
          const card = page.locator(".quests-card");
          await card.scrollIntoViewIfNeeded();
          await card
            .locator("img")
            .first()
            .evaluate((image) => image.decode());
          await card.screenshot({
            path: new URL("quest-free.png", output).pathname,
          });
        }
      }
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
      );
      checks.push({ route, width, passed: true });
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(
    new URL(
      "../../data/reports/frontend/ui-feedback-verification.json",
      import.meta.url,
    ),
    JSON.stringify({ base, checks, pageErrors: errors }, null, 2) + "\n",
  );
  console.log(
    "Passed 15 viewport/route checks: gallery layering, centered dish labels, compact Free badge, search and overflow.",
  );
} finally {
  await browser.close();
}
