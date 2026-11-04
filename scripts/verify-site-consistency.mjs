import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = process.argv[2];
if (!modulePath) throw new Error("Pass the local Playwright module path.");
const { chromium } = await import(pathToFileURL(resolve(modulePath)).href);
const base = process.argv[3] ?? "http://127.0.0.1:4173";
const output = resolve(process.argv[4] ?? "../docs/screenshots/intro-refresh");
await mkdir(output, { recursive: true });
const routes = [
  "/",
  "/cheatsheet",
  "/about-us",
  "/lock-in",
  "/local-bites",
  "/side-quests",
];
const labels = [
  "Home",
  "Newbie Cheatsheet",
  "About Us",
  "Lock In",
  "Local Bites",
  "Side Quests",
];
const referenceHeights = [4008, 5376, 7680, 3072, 3072, 3072];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
const errors = [];
const signatures = new Map();
const near = (a, b, message) =>
  assert.ok(Math.abs(a - b) < 1, `${message}: ${a} vs ${b}`);
async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => image.getBoundingClientRect().top < innerHeight)
        .map((image) => image.decode().catch(() => {})),
    );
  });
}
// Exercise natural lazy-loading before full-page captures, including offscreen avatars/art.
async function prepareCapture(page) {
  await page.evaluate(async () => {
    for (const image of document.images) {
      if (!image.complete || !image.naturalWidth) {
        image.scrollIntoView({ block: "center" });
        await image.decode();
      }
    }
    scrollTo(0, 0);
  });
  await ready(page);
  assert.equal(
    await page
      .locator("img")
      .evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
    true,
    "all screenshot artwork loaded",
  );
}
async function measure(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        font: css.fontSize,
        family: css.fontFamily,
      };
    };
    const one = (selector) => rect(document.querySelector(selector));
    const hero = document.querySelector(".hero-card");
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      header: one(".site-header"),
      logo: one(".site-header .brand-logo"),
      links: [...document.querySelectorAll(".site-navigation--header a")].map(
        rect,
      ),
      footer: one(".site-footer__inner"),
      footerLogo: one(".site-footer .brand-logo"),
      footerNav: one(".site-navigation--footer"),
      contact: one(".site-footer__contact"),
      signoff: one(".site-footer__signoff"),
      hero: one(".hero-card"),
      title: one(".hero-card__title"),
      eyebrow: one(".hero-card__eyebrow"),
      description: one(".hero-card__description"),
      heroContained:
        !hero ||
        [...hero.children].every((child) => {
          const a = child.getBoundingClientRect();
          const b = hero.getBoundingClientRect();
          return (
            a.left >= b.left &&
            a.right <= b.right + 1 &&
            a.top >= b.top &&
            a.bottom <= b.bottom
          );
        }),
      containers: [
        ...document.querySelectorAll(
          "main .page-container, main .content-container",
        ),
      ].map((element) => ({ class: element.className, ...rect(element) })),
    };
  });
}
for (const width of [320, 375, 600, 768, 1100, 1101, 1366, 1920]) {
  let expected;
  for (const route of routes) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (error) =>
      errors.push({ route, width, message: error.message }),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        errors.push({ route, width, message: message.text() });
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push({
          route,
          width,
          status: response.status(),
          url: response.url(),
        });
    });
    const response = await page.goto(base + route, {
      waitUntil: "networkidle",
    });
    assert.equal(response.status(), 200);
    await ready(page);
    const result = await measure(page);
    assert.equal(result.overflow, false, `${route} overflow at ${width}`);
    assert.equal(
      result.heroContained,
      true,
      `${route} hero containment at ${width}`,
    );
    const contentWidth = Math.min(1216, width - (width <= 600 ? 40 : 48));
    for (const container of result.containers) {
      near(
        container.width,
        contentWidth,
        `${route} container width at ${width}`,
      );
      near(
        container.x,
        (width - contentWidth) / 2,
        `${route} centered gutter at ${width}`,
      );
    }
    if (!expected) expected = result;
    near(
      result.header.height,
      expected.header.height,
      `shared header height ${route}/${width}`,
    );
    near(result.logo.width, 109, "header logo width");
    near(result.logo.x, expected.logo.x, "header logo x");
    near(result.logo.y, expected.logo.y, "header logo y");
    near(
      result.footer.height,
      expected.footer.height,
      `shared footer height ${route}/${width}`,
    );
    near(result.footerLogo.width, 96, "footer logo width");
    assert.equal(result.footerNav.font, expected.footerNav.font);
    assert.equal(result.contact.font, expected.contact.font);
    assert.equal(result.signoff.font, expected.signoff.font);
    result.links.forEach((link, index) => {
      near(link.x, expected.links[index].x, "stable navigation x");
      near(link.y, expected.links[index].y, "stable navigation y");
      near(link.width, expected.links[index].width, "stable navigation width");
    });
    if (route !== "/") {
      near(
        result.hero.width,
        Math.min(936, width - (width <= 600 ? 40 : 48)),
        "shared intro width",
      );
      near(
        parseFloat(result.title.font),
        width <= 600
          ? Math.max(36, Math.min(56, width * 0.09))
          : width <= 1100
            ? Math.max(44, Math.min(68.26, width * 0.06))
            : 68.26,
        "guide intro title scale",
      );
      assert.equal(result.eyebrow.font, width <= 600 ? "13px" : "18.96px");
      assert.equal(
        result.description.font,
        route === "/side-quests"
          ? "18.96px"
          : width <= 600
            ? "21px"
            : "26.55px",
      );
      assert.ok(
        result.hero.height >= (width <= 600 ? 400 : 360),
        "shared guide-card minimum height and content growth",
      );
    }
    await page.mouse.move(0, 0);
    assert.equal(
      await page
        .locator(".site-navigation a")
        .evaluateAll((links) =>
          links.every(
            (link) => getComputedStyle(link).textDecorationLine === "none",
          ),
        ),
      true,
      "navigation underline absent at rest",
    );
    if (width === 1366) {
      for (const selector of [
        ".site-navigation--header a",
        '.site-navigation--header a[aria-current="page"]',
        ".site-navigation--footer a",
      ]) {
        const link = page.locator(selector).first();
        await link.hover();
        assert.ok(
          (
            await link.evaluate(
              (element) => getComputedStyle(element).textDecorationLine,
            )
          ).includes("underline"),
          "navigation underline on hover",
        );
        await page.mouse.move(0, 0);
      }
      const link = page.locator(".site-navigation--header a").first();
      await page.keyboard.press("Tab");
      await link.focus();
      assert.notEqual(
        await link.evaluate(
          (element) => getComputedStyle(element).outlineStyle,
        ),
        "none",
        "keyboard focus remains visible",
      );
      await link.evaluate((element) => element.blur());
    }
    results.push({ route, width, passed: true, ...result });
    signatures.set(`${width}:${route}`, result);
    if ([1366, 375, 768].includes(width)) {
      const name = route === "/" ? "home" : route.slice(1);
      await prepareCapture(page);
      await page.screenshot({
        path: `${output}/${name}-${width}.png`,
        fullPage: true,
      });
      if (width === 1366) {
        for (const [suffix, selector] of [
          ["header", ".site-header"],
          ["footer", ".site-footer"],
          ["hero", "main > section"],
        ]) {
          await page
            .locator(selector)
            .first()
            .screenshot({ path: `${output}/${name}-${suffix}.png` });
        }
        await page.setViewportSize({
          width,
          height: referenceHeights[routes.indexOf(route)],
        });
        await page.evaluate(() => scrollTo(0, 0));
        await ready(page);
        await page.screenshot({
          path: `${output}/${name}-reference-viewport.png`,
        });
      }
    }
    await page.close();
  }
}
// Soft navigation can expose CSS-order and active-pill layout glitches that reloads miss.
for (const width of [1366, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(base, { waitUntil: "networkidle" });
  for (const index of [2, 3, 4, 5, 1, 0]) {
    await page
      .locator(".site-header")
      .getByRole("link", { name: labels[index], exact: true })
      .click();
    await page.waitForURL(base + routes[index]);
    await ready(page);
    const actual = await measure(page);
    const expected = signatures.get(`${width}:${routes[index]}`);
    near(
      actual.header.height,
      expected.header.height,
      "soft-navigation header",
    );
    near(
      actual.footer.height,
      expected.footer.height,
      "soft-navigation footer",
    );
    actual.links.forEach((link, i) =>
      near(link.x, expected.links[i].x, "soft-navigation link position"),
    );
    assert.equal(
      await page.locator('.site-header a[aria-current="page"]').count(),
      1,
    );
  }
  results.push({
    check: "six-route soft navigation and stable shell",
    width,
    passed: true,
  });
  await page.close();
}
for (const width of [1366, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(base + "/about-us", { waitUntil: "networkidle" });
  const buttons = page.locator(".about-team .about-avatar");
  assert.equal(await page.locator(".about-member").count(), 0);
  if (width === 1366)
    near(
      (await buttons.first().boundingBox()).width,
      176,
      "unscaled member wheel",
    );
  const colors = new Set();
  for (let i = 0; i < 6; i++) {
    await buttons.nth(i).focus();
    await buttons.nth(i).press("Enter");
    await page.waitForFunction(
      (index) =>
        document
          .querySelectorAll(".about-avatar")
          [index]?.getAttribute("aria-expanded") === "true",
      i,
    );
    assert.equal(await page.locator(".about-member").count(), 1);
    assert.equal(await buttons.nth(i).getAttribute("aria-expanded"), "true");
    colors.add(
      await page
        .locator(".site-shell")
        .evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue("--footer-background")
            .trim(),
        ),
    );
  }
  assert.ok(colors.size > 1, "member footer theme updates");
  results.push({
    check: "all six avatars selectable, one profile and themed shared footer",
    width,
    passed: true,
  });
  await prepareCapture(page);
  await page.screenshot({
    path: `${output}/about-selected-${width}.png`,
    fullPage: true,
  });
  await page.close();
}
// Home CTAs with established destinations; generic exploration CTAs remain self-links.
{
  const page = await browser.newPage({
    viewport: { width: 1366, height: 900 },
  });
  const targets = [
    [".discovery-card--study .discovery-card__cta", "/lock-in"],
    [".discovery-card--food .discovery-card__cta", "/local-bites"],
    [".discovery-card--activities .discovery-card__cta", "/side-quests"],
    [".discovery-card--cheatsheet .discovery-card__cta", "/cheatsheet"],
    [".home-promotion__cta", "/cheatsheet"],
    [".home-about__cta", "/about-us"],
  ];
  for (const [selector, target] of targets) {
    await page.goto(base, { waitUntil: "networkidle" });
    const link = page.locator(selector);
    assert.equal(await link.getAttribute("href"), target);
    await link.focus();
    await link.press("Enter");
    await page.waitForURL(base + target);
    assert.equal(await page.locator("main h1").count(), 1);
  }
  await page.goto(base, { waitUntil: "networkidle" });
  for (const selector of [".home-hero__cta", ".home-welcome__cta"]) {
    const link = page.locator(selector);
    assert.equal(await link.getAttribute("href"), "/");
    await link.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await link.click();
    near(
      await page.evaluate(() => scrollY),
      before,
      "unresolved generic CTA preserves scroll",
    );
  }
  results.push({
    check:
      "six Home CTA destinations and keyboard navigation; two generic links remain unresolved",
    passed: true,
  });
  await page.close();
}
assert.deepEqual(errors, []);
await writeFile(
  `${output}/verification.json`,
  JSON.stringify({ results, errors }, null, 2) + "\n",
);
console.log(
  `${results.length} checks passed; no browser errors. Screenshots: ${output}`,
);
await browser.close();
