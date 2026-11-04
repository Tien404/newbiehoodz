/** Optional browser verification: local Playwright + Chrome, no runtime dependency. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.argv[3] ?? "http://127.0.0.1:4173";
const app = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.resolve(app, "../docs/screenshots/lock-in");
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
async function open(width, height, route = "/lock-in") {
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
  assert.deepEqual(await desktop.locator(".lock-card h2").allTextContents(), [
    "Café Name One",
    "Café Name Two",
    "Café Name Three",
    "Café Name Four",
    "Café Name Five",
    "Café Name Six",
  ]);
  assert.equal(await desktop.locator(".lock-card__photo").count(), 6);
  assert.equal(await desktop.locator(".lock-maps[href='/lock-in']").count(), 6);
  assert.equal(
    await desktop.locator(".lock-filter[aria-pressed='true']").innerText(),
    "all",
  );
  assert.equal(
    await desktop.locator("button[aria-disabled='true']").count(),
    7,
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
  assert(fonts.some((face) => face.family === "Lock FreeSans"));
  await desktop.locator(".lock-maps").first().focus();
  assert(
    await desktop
      .locator(".lock-maps")
      .first()
      .evaluate((node) => document.activeElement === node),
  );
  await desktop.keyboard.press("Enter");
  assert.equal(new URL(desktop.url()).pathname, "/lock-in");
  await desktop.locator(".lock-filter").nth(1).focus();
  await desktop.keyboard.press("Enter");
  assert.equal(
    await desktop.locator(".lock-filter[aria-pressed='true']").innerText(),
    "all",
  );
  await desktop.evaluate(() => window.scrollTo(0, 0));
  await desktop.screenshot({ path: `${output}/lock-in-1366x3072.png` });
  results.push({
    check:
      "reference viewport, exact card order, six photos/Maps placeholders, static filters, keyboard links, loaded fonts",
    passed: true,
    fonts,
  });
  await desktop.close();

  for (const width of [320, 375, 768, 901, 1024, 1920, 2560]) {
    const page = await open(width, 900);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
      `Horizontal overflow: ${width}`,
    );
    const rows = await page.locator(".lock-card").evaluateAll((cards) =>
      cards.map((card) => {
        const outer = card.getBoundingClientRect();
        const content = card
          .querySelector(".lock-card__bottom")
          .getBoundingClientRect();
        const photo = card
          .querySelector(".lock-card__photo")
          .getBoundingClientRect();
        const section = card.closest(".lock-listings").getBoundingClientRect();
        return {
          contained:
            content.bottom <= outer.bottom + 1 &&
            content.right <= outer.right + 1 &&
            photo.right <= outer.right &&
            outer.bottom < section.bottom - 40,
          height: outer.height,
        };
      }),
    );
    assert(
      rows.every((row) => row.contained),
      `Card text/CTA overflow: ${width}`,
    );
    assert(
      await page
        .locator(".lock-hero__subtitle")
        .evaluate(
          (node) =>
            node.getBoundingClientRect().bottom <
            node.parentElement.getBoundingClientRect().bottom - 12,
        ),
      `Hero copy overflow: ${width}`,
    );
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    await page.close();
    const capture = await open(width, height);
    await capture.screenshot({
      path: `${output}/lock-in-${width}.png`,
      timeout: 60000,
    });
    results.push({
      check: "responsive overflow, card containment, full-height capture",
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
  ]) {
    const page = await open(1366, height, route);
    assert.equal(
      await page
        .locator("header a", { hasText: "Lock In" })
        .getAttribute("href"),
      "/lock-in",
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
      { reference: "references/canva/lock-in.png", results, errors },
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
