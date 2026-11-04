/** Optional local browser verification; requires Playwright and Chrome, not a runtime dependency. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.argv[3] ?? "http://127.0.0.1:4173";
const app = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.resolve(app, "../docs/screenshots/local-bites");
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
async function open(width, height, route = "/local-bites") {
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
  assert.deepEqual(await desktop.locator(".bites-dish h3").allTextContents(), [
    "Pho",
    "Banh mi",
    "Com tam",
    "Banh xeo",
  ]);
  assert.deepEqual(
    await desktop.locator(".bites-eatery h3").allTextContents(),
    ["Eatery Name One", "Eatery Name Two", "Eatery Name Three"],
  );
  assert.deepEqual(
    await desktop.locator(".bites-phrase h3").allTextContents(),
    ["Không cay", "Cho mình một phần", "Tính tiền"],
  );
  assert.equal(await desktop.locator(".bites-eatery__photo").count(), 3);
  assert.equal(await desktop.locator(".bites-dish img").count(), 4);
  assert.equal(
    await desktop.getByText("dish photo", { exact: true }).count(),
    0,
  );
  assert.equal(
    await desktop.locator(".bites-maps[href='/local-bites']").count(),
    3,
  );
  assert.equal(await desktop.locator("main button").count(), 0);
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
      (face) => face.family === "Bites Noto Sans" && face.weight === "700",
    ),
  );
  assert.equal(await desktop.locator(".bites-noto").textContent(), "ộ");
  await desktop.locator(".bites-maps").first().focus();
  assert(
    await desktop
      .locator(".bites-maps")
      .first()
      .evaluate((node) => node === document.activeElement),
  );
  await desktop.keyboard.press("Enter");
  assert.equal(new URL(desktop.url()).pathname, "/local-bites");
  await desktop.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await desktop.screenshot({ path: `${output}/local-bites-1366x3072.png` });
  results.push({
    check:
      "reference viewport, supplied copy/order, photos, no inferred controls, keyboard self-links and Noto glyph",
    passed: true,
    fonts,
  });
  await desktop.close();

  for (const width of [320, 375, 700, 701, 768, 1000, 1024, 1920, 2560]) {
    const page = await open(width, 900);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
      `Horizontal overflow: ${width}`,
    );
    assert(
      await page
        .locator(".bites-hero__subtitle")
        .evaluate(
          (node) =>
            node.getBoundingClientRect().bottom <=
            node.parentElement.getBoundingClientRect().bottom - 12,
        ),
      `Hero copy exceeds panel: ${width}`,
    );
    const rows = await page.locator(".bites-eatery").evaluateAll((eateries) =>
      eateries.map((eatery) => {
        const outer = eatery.getBoundingClientRect();
        return [
          ...eatery.querySelectorAll(
            "h3,.bites-eatery__address,.bites-eatery__photo,.bites-eatery__meta,.bites-maps",
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
    assert(rows.every(Boolean), `Eatery content exceeds row: ${width}`);
    assert(
      await page
        .locator(".bites-phrases")
        .evaluate(
          (node) =>
            node.getBoundingClientRect().bottom <
            node.parentElement.getBoundingClientRect().bottom - 12,
        ),
      `Phrase content exceeds panel: ${width}`,
    );
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    await page.close();
    const capture = await open(width, height);
    await capture.screenshot({
      path: `${output}/local-bites-${width}.png`,
      timeout: 60000,
    });
    results.push({
      check: "responsive overflow and hero/eatery/phrase containment",
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
  ]) {
    const page = await open(1366, height, route);
    assert.equal(
      await page
        .locator("header a", { hasText: "Local Bites" })
        .getAttribute("href"),
      "/local-bites",
    );
    await page.screenshot({
      path: `${output}/regression-${name}.png`,
      timeout: 60000,
    });
    results.push({
      check: "existing-page regression and new navigation destination",
      route,
      passed: true,
    });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify(
      { reference: "references/canva/local-bites.png", results, errors },
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
