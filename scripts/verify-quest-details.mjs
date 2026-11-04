import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:4174";
const route = process.env.DETAIL_TEST_ROUTE ?? "side-quests";
const food = route === "local-bites";
const output = new URL(
  "../../docs/screenshots/quest-details/",
  import.meta.url,
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [];
try {
  for (const width of [320, 375, 768, 1024, 1366, 1920]) {
    const touch = width <= 375;
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      hasTouch: touch,
      reducedMotion: "reduce",
    });
    page.on("pageerror", (error) => errors.push(error.message));
    assert.equal((await page.goto(`${base}/${route}`)).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator(food ? ".bites-eatery" : ".quests-card").first();
    const triggers = food
      ? page.locator(".bites-eatery__tag")
      : card.locator(".quests-detail-trigger");
    const first = triggers.nth(0),
      second = triggers.nth(1);
    await first.scrollIntoViewIfNeeded();
    const before = await card.boundingBox();
    const open = async (trigger) => {
      if (touch) await trigger.tap();
      else await trigger.click();
      const panel = page.locator(".text-disclosure-popover:popover-open");
      await panel.waitFor({ state: "visible" });
      await page.waitForFunction(() =>
        document.activeElement?.matches(".text-disclosure-popover"),
      );
      return panel;
    };
    let panel = await open(first);
    assert.equal(
      await panel.locator("p").textContent(),
      (await first.textContent()).trim(),
    );
    const after = await card.boundingBox();
    assert.deepEqual(after, before, "Popover must not move or resize its card");
    let bounds = await panel.boundingBox();
    assert(
      bounds.x >= 15 &&
        bounds.x + bounds.width <= width - 15 &&
        bounds.y >= 15 &&
        bounds.y + bounds.height <= 885,
      "Popover escapes viewport",
    );
    if (width === 375 || width === 1366) {
      await card
        .locator(".place-photo img")
        .evaluate((image) => image.decode().catch(() => {}));
      await page.screenshot({
        path: new URL(`${route}-${width}.png`, output).pathname,
      });
    }
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(":popover-open").count(), 0);
    assert(
      await first.evaluate((node) => document.activeElement === node),
      "Escape must restore invoker focus",
    );
    await first.focus();
    await page.keyboard.press("Enter");
    await page.locator(".text-disclosure-popover:popover-open").waitFor();
    await page
      .getByRole("button", {
        name: food ? "Close food detail" : "Close activity detail",
        exact: true,
      })
      .click();
    assert.equal(await page.locator(":popover-open").count(), 0);
    await open(first);
    panel = await open(second);
    assert.equal(await page.locator(":popover-open").count(), 1);
    assert.equal(
      await panel.locator("p").textContent(),
      (await second.textContent()).trim(),
    );
    await page.mouse.click(4, 4);
    assert.equal(
      await page.locator(":popover-open").count(),
      0,
      "Outside click should dismiss",
    );
    await open(first);
    await page.evaluate(() => window.scrollBy(0, 32));
    await page.waitForFunction(() => !document.querySelector(":popover-open"));
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
    checks.push({ width, touch, passed: true });
    await page.close();
    console.log(`${route} detail checks passed: ${width}px`);
  }
  assert.deepEqual(errors, []);
  await writeFile(
    new URL(
      `../../data/reports/frontend/${food ? "food" : "quest"}-details.json`,
      import.meta.url,
    ),
    JSON.stringify({ checks, pageErrors: errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
