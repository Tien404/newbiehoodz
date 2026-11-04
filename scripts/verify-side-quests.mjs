/** Optional local browser verification; Playwright + Chrome, no production dependency. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.argv[3] ?? "http://127.0.0.1:4173";
const app = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.resolve(app, "../docs/screenshots/side-quests");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const results = [];
async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => {
          const r = image.getBoundingClientRect();
          return r.bottom >= 0 && r.top <= innerHeight;
        })
        .map((image) => image.decode()),
    );
  });
}
async function open(width, height, route = "/side-quests") {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  assert.equal((await page.goto(`${base}${route}`)).status(), 200);
  await ready(page);
  return page;
}
try {
  const desktop = await open(1366, 3072);
  assert.deepEqual(
    await desktop.locator(".quests-card__badge").allTextContents(),
    ["QUEST 01", "QUEST 02", "QUEST 03", "QUEST 04"],
  );
  assert.equal(await desktop.locator(".quests-card__photo").count(), 4);
  assert.equal(await desktop.locator(".quests-card--reversed").count(), 2);
  assert.equal(
    await desktop.locator(".quests-maps[href='/side-quests']").count(),
    4,
  );
  assert.equal(
    await desktop.locator(".quests-filter[aria-pressed='true']").innerText(),
    "all quests",
  );
  assert.equal(
    await desktop.locator("button[aria-disabled='true']").count(),
    5,
  );
  assert.deepEqual(
    await desktop.locator(".quests-tracker__stamps li").allTextContents(),
    ["1", "2", "3", "4"],
  );
  assert.equal(
    await desktop.locator(".quests-tracker button,.quests-tracker a").count(),
    0,
  );
  assert.equal(
    await desktop.locator(".quests-tracker__stamps .is-highlighted").count(),
    1,
  );
  assert.equal(
    await desktop
      .locator(".site-shell")
      .evaluate((node) => node.getBoundingClientRect().height),
    3072,
  );
  const fonts = await desktop.evaluate(() =>
    [...document.fonts]
      .filter((face) => face.status === "loaded")
      .map((face) => ({
        family: face.family,
        style: face.style,
        weight: face.weight,
      })),
  );
  assert(
    fonts.some(
      (face) => face.family === "Quests Georgia" && face.weight === "700",
    ),
  );
  const photos = await desktop.locator(".quests-card").evaluateAll((cards) =>
    cards.map((card) => {
      const photo = card
        .querySelector(".quests-card__photo")
        .getBoundingClientRect();
      const title = card.querySelector("h2").getBoundingClientRect();
      return photo.x < title.x;
    }),
  );
  assert.deepEqual(photos, [true, false, true, false]);
  await desktop.locator(".quests-maps").first().focus();
  assert(
    await desktop
      .locator(".quests-maps")
      .first()
      .evaluate((node) => document.activeElement === node),
  );
  await desktop.keyboard.press("Enter");
  assert.equal(new URL(desktop.url()).pathname, "/side-quests");
  await desktop.locator(".quests-filter").nth(1).focus();
  await desktop.keyboard.press("Enter");
  assert.equal(
    await desktop.locator(".quests-filter[aria-pressed='true']").innerText(),
    "all quests",
  );
  await desktop.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await desktop.screenshot({ path: `${output}/side-quests-1366x3072.png` });
  results.push({
    check:
      "reference viewport, ordered alternating cards, placeholders, static filters/tracker, loaded Georgia and keyboard self-links",
    passed: true,
    fonts,
  });
  await desktop.close();

  for (const width of [320, 375, 600, 768, 900, 901, 1024, 1920, 2560]) {
    const page = await open(width, 900);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
      `Horizontal overflow: ${width}`,
    );
    assert(
      await page
        .locator(".quests-hero__description")
        .evaluate(
          (node) =>
            node.getBoundingClientRect().bottom <
            node.closest(".quests-hero").getBoundingClientRect().bottom - 120,
        ),
      `Hero copy exceeds decoration space: ${width}`,
    );
    const contained = await page.locator(".quests-card").evaluateAll((cards) =>
      cards.every((card) => {
        const outer = card.getBoundingClientRect();
        return [
          ...card.querySelectorAll(
            "h2,.quests-card__photo,.quests-card__description,.quests-card__bottom",
          ),
        ].every((node) => {
          const r = node.getBoundingClientRect();
          return (
            r.left >= outer.left &&
            r.right <= outer.right + 1 &&
            r.bottom <= outer.bottom + 1
          );
        });
      }),
    );
    assert(contained, `Card text/photo/CTA exceeds panel: ${width}`);
    assert(
      await page.locator(".quests-tracker__stamps").evaluate((node) => {
        const r = node.getBoundingClientRect();
        return (
          r.right <= innerWidth &&
          r.left >= 0 &&
          [...node.children].every((child) => {
            const box = child.getBoundingClientRect();
            return box.width === box.height;
          })
        );
      }),
      `Tracker circles clipped or stretched: ${width}`,
    );
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    await page.close();
    const capture = await open(width, height);
    await capture.screenshot({
      path: `${output}/side-quests-${width}.png`,
      timeout: 60000,
    });
    results.push({
      check:
        "responsive overflow, card/hero containment and unstretched tracker",
      width,
      height,
      passed: true,
    });
    await capture.close();
  }
  for (const [route, name, height] of [
    ["/", "home", 4008],
    ["/cheatsheet", "cheatsheet", 5376],
    ["/about-us", "about-us", 7680],
    ["/lock-in", "lock-in", 3072],
    ["/local-bites", "local-bites", 3072],
  ]) {
    const page = await open(1366, height, route);
    assert.equal(
      await page
        .locator("header a", { hasText: "Side Quests" })
        .getAttribute("href"),
      "/side-quests",
    );
    await page.screenshot({
      path: `${output}/regression-${name}.png`,
      timeout: 60000,
    });
    results.push({
      check: "existing-page regression and enabled navigation destination",
      route,
      passed: true,
    });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify(
      { reference: "references/canva/side-quests.png", results, errors },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({ checks: results.length, errors, output }, null, 2),
  );
} finally {
  await browser.close();
}
