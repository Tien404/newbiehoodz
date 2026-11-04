import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:4174";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const routes = [
  "/",
  "/cheatsheet",
  "/about-us",
  "/lock-in",
  "/local-bites",
  "/side-quests",
];
const results = [],
  errors = [];
const instrument = () => {
  window.__reveals = [];
  window.__observedReveals = 0;
  const NativeObserver = window.IntersectionObserver;
  window.IntersectionObserver = class extends NativeObserver {
    observe(target) {
      if (target.matches("[data-reveal]")) window.__observedReveals++;
      return super.observe(target);
    }
  };
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (frames, options) {
    if (this.matches("[data-reveal]"))
      window.__reveals.push({
        element: this,
        initialTop: this.getBoundingClientRect().top,
        frames,
        options,
      });
    return animate.call(this, frames, options);
  };
};
try {
  for (const width of [375, 1366])
    for (const route of routes) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "no-preference",
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(instrument);
      assert.equal((await page.goto(base + route)).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => window.__observedReveals > 0);
      await page.waitForFunction(() =>
        window.__reveals.some(
          (reveal) => reveal.element.dataset.reveal === "intro",
        ),
      );
      const intro = await page.evaluate(
        () =>
          window.__reveals.find(
            (reveal) => reveal.element.dataset.reveal === "intro",
          ).options,
      );
      assert.equal(intro.delay, 300);
      assert.equal(intro.duration, 720);
      const index = await page
        .locator("[data-reveal]")
        .evaluateAll((nodes) =>
          nodes.findIndex(
            (node) => node.getBoundingClientRect().top > innerHeight + 32,
          ),
        );
      assert(index >= 0);
      const target = page.locator("[data-reveal]").nth(index);
      const original = await target.boundingBox();
      await target.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (element) =>
          window.__reveals.some((reveal) => reveal.element === element),
        await target.elementHandle(),
      );
      const animation = await target.evaluate((node) => {
        const reveal = window.__reveals.find(
          (reveal) => reveal.element === node,
        );
        return {
          frames: reveal.frames,
          duration: reveal.options.duration,
          delay: reveal.options.delay,
        };
      });
      assert.equal(animation.duration, 720);
      assert(animation.delay >= 180 && animation.delay <= 540);
      assert.equal(animation.frames[0].translate, "0 16px");
      await target.evaluate((node) =>
        Promise.all(
          node
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
        ),
      );
      const final = await target.boundingBox();
      assert(
        Math.abs(original.width - final.width) < 1 &&
          Math.abs(original.height - final.height) < 1,
      );
      assert.equal(
        await target.evaluate((node) => getComputedStyle(node).opacity),
        "1",
      );
      const count = await target.evaluate(
        (node) =>
          window.__reveals.filter((reveal) => reveal.element === node).length,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await target.scrollIntoViewIfNeeded();
      assert.equal(
        await target.evaluate(
          (node) =>
            window.__reveals.filter((reveal) => reveal.element === node).length,
        ),
        count,
        "Read content should not replay",
      );
      // A preference change immediately removes any in-flight reveal effects.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(() =>
        [...document.querySelectorAll("[data-reveal]")].every(
          (node) => node.getAnimations().length === 0,
        ),
      );
      const reducedCount = await page.evaluate(() => window.__reveals.length);
      await page.locator("[data-reveal]").last().scrollIntoViewIfNeeded();
      assert.equal(
        await page.evaluate(() => window.__reveals.length),
        reducedCount,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
      );
      results.push({
        route,
        width,
        animation,
        reducedMotionChange: true,
        passed: true,
      });
      await page.close();
      console.log(`Scroll reveal passed: ${route} ${width}px`);
    }
  for (const route of routes) {
    const page = await browser.newPage({
      javaScriptEnabled: false,
      viewport: { width: 375, height: 900 },
    });
    assert.equal((await page.goto(base + route)).status(), 200);
    assert(
      await page
        .locator("[data-reveal]")
        .evaluateAll(
          (nodes) =>
            nodes.length > 0 &&
            nodes.every((node) => getComputedStyle(node).opacity === "1"),
        ),
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      375,
    );
    results.push({ route, javaScriptDisabled: true, passed: true });
    await page.close();
  }
  const keyboard = await browser.newPage({
    viewport: { width: 1366, height: 900 },
    reducedMotion: "no-preference",
  });
  await keyboard.addInitScript(instrument);
  await keyboard.goto(base + "/lock-in");
  await keyboard.waitForFunction(() => window.__observedReveals > 0);
  const card = keyboard.locator(".lock-card").first();
  await card.scrollIntoViewIfNeeded();
  await keyboard.waitForFunction(() =>
    window.__reveals.some((reveal) => reveal.element.matches(".lock-card")),
  );
  await card.locator("a").focus();
  assert.equal(
    await card.evaluate((node) => node.getAnimations().length),
    0,
    "Keyboard focus must cancel reveal immediately",
  );
  await keyboard.evaluate(() => window.scrollTo(0, 0));
  const observedBefore = await keyboard.evaluate(
    () => window.__observedReveals,
  );
  await keyboard
    .locator(".site-header")
    .getByRole("link", { name: "About Us", exact: true })
    .click();
  await keyboard.waitForURL("**/about-us");
  await keyboard.waitForFunction(
    (before) => window.__observedReveals > before,
    observedBefore,
  );
  const value = keyboard.locator(".about-value").first();
  await value.scrollIntoViewIfNeeded();
  await keyboard.waitForFunction(
    (element) => window.__reveals.some((reveal) => reveal.element === element),
    await value.elementHandle(),
  );
  results.push({ keyboardFocus: true, clientNavigation: true, passed: true });
  await keyboard.close();
  assert.deepEqual(errors, []);
  await writeFile(
    new URL("../../data/reports/frontend/scroll-reveal.json", import.meta.url),
    JSON.stringify({ results, pageErrors: errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
