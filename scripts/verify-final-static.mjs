import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pagePaths } from "../src/content/navigation.ts";
import { pageSeo } from "../src/lib/seo.ts";
const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:4174";
const origin = process.env.VERIFY_SITE_URL;
const indexable = Boolean(origin) && process.env.VERIFY_INDEXABLE !== "false";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [];
const output = new URL("../../docs/screenshots/final-qa/", import.meta.url);
await mkdir(output, { recursive: true });
try {
  for (const width of [320, 375, 768, 1024, 1366, 1920])
    for (const [key, route] of Object.entries(pagePaths)) {
      const height =
        width === 1366
          ? ({ home: 4008, cheatsheet: 5376, "about-us": 7680 }[key] ?? 3072)
          : 900;
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: "reduce",
        hasTouch: width <= 375,
      });
      page.on("pageerror", (error) =>
        errors.push({ route, width, error: error.message }),
      );
      assert.equal((await page.goto(base + route)).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.title(), pageSeo[key].title);
      assert.equal(
        await page.locator('meta[name="description"]').getAttribute("content"),
        pageSeo[key].description,
      );
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.getByRole("main").count(), 1);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        `${route}: horizontal overflow at${width}`,
      );
      const robots = await page
        .locator('meta[name="robots"]')
        .getAttribute("content");
      assert(
        indexable
          ? robots.includes("index") && !robots.includes("noindex")
          : robots.includes("noindex"),
      );
      assert.equal(
        await page.locator('meta[property="og:title"]').getAttribute("content"),
        pageSeo[key].title,
      );
      assert.equal(
        await page.locator('meta[name="twitter:card"]').getAttribute("content"),
        "summary",
      );
      if (origin) {
        assert.equal(
          new URL(
            await page.locator('link[rel="canonical"]').getAttribute("href"),
          ).href,
          new URL(route, origin).href,
        );
        const graph = JSON.parse(
          await page
            .locator('script[type="application/ld+json"]')
            .textContent(),
        )["@graph"];
        assert.equal(graph[1]["@type"], pageSeo[key].type);
      } else {
        assert.equal(await page.locator('link[rel="canonical"]').count(), 0);
        assert.equal(
          await page.locator('script[type="application/ld+json"]').count(),
          0,
        );
      }
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      assert.equal(
        await page.evaluate(() => document.activeElement?.id),
        "main-content",
        "Skip link must focus main content",
      );
      await page.evaluate(() => document.activeElement?.blur());
      const links = await page.locator("a[href]").evaluateAll((links) =>
        links.map((link) => ({
          href: link.getAttribute("href"),
          target: link.target,
          rel: link.rel,
        })),
      );
      for (const link of links) {
        assert(link.href && !link.href.startsWith("javascript:"));
        if (link.href.startsWith("#"))
          assert.equal(
            await page.locator(`[id="${link.href.slice(1)}"]`).count(),
            1,
          );
        if (link.href.startsWith("/") && !link.href.startsWith("//"))
          assert(
            Object.values(pagePaths).includes(link.href.split("#")[0] || "/"),
          );
        if (link.target === "_blank") assert(link.rel.includes("noopener"));
      }
      assert.equal(
        await page.locator(".site-footer__contact a").getAttribute("href"),
        "mailto:newbiehoodzzz@gmail.com",
      );
      if (width === 1366 || width === 375) {
        for (const image of await page.locator("img").all()) {
          if (!(await image.isVisible())) continue;
          await image.scrollIntoViewIfNeeded();
          await image.evaluate((image) => image.decode());
          assert(
            await image.evaluate(
              (image) => image.naturalWidth > 0 && image.hasAttribute("alt"),
            ),
          );
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: new URL(`${key}-${width}.png`, output).pathname,
          fullPage: true,
        });
      }
      assert.equal((await page.reload()).status(), 200);
      await page.locator("#main-content").waitFor();
      checks.push({
        route,
        width,
        metadata: true,
        directAndRefresh: true,
        links: links.length,
        passed: true,
      });
      await page.close();
    }
  const request = await browser.newContext();
  const sitemap = await (
    await request.request.get(base + "/sitemap.xml")
  ).text();
  const robots = await (await request.request.get(base + "/robots.txt")).text();
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, origin ? 6 : 0);
  assert(
    indexable ? robots.includes("Allow: /") : robots.includes("Disallow: /"),
  );
  if (origin) assert(robots.includes(new URL("/sitemap.xml", origin).href));
  assert.equal(
    (await request.request.get(base + "/definitely-not-a-site-route")).status(),
    404,
  );
  await request.close();
  assert.deepEqual(errors, []);
  await writeFile(
    new URL(
      `../../data/reports/final-qa/static-${origin ? "configured" : "unconfigured"}.json`,
      import.meta.url,
    ),
    JSON.stringify(
      {
        base,
        testOrigin: origin ?? null,
        indexable,
        checks,
        pageErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Final static QA: ${checks.length} route/viewport cases passed; sitemap and robots matched configuration.`,
  );
} finally {
  await browser.close();
}
