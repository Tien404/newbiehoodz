/** Optional authoring dependency: Playwright + Chrome; no runtime dependency. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.argv[3] ?? "http://localhost:3000";
const output = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/screenshots/about-avatar-consistency",
);
await mkdir(output, { recursive: true });
const artworkMeasurements = JSON.parse(
  await readFile(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../assets/about-us/avatar-measurements.json",
    ),
    "utf8",
  ),
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ids = [
  "mai",
  "bao-lan",
  "yen-nhi",
  "hoang-lan",
  "quynh-nhu",
  "khoi-nguyen",
];
const errors = [],
  results = [];
async function open(width, height = 900) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  assert.equal(
    (
      await page.goto(`${base}/about-us`, { waitUntil: "networkidle" })
    ).status(),
    200,
  );
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function select(page, id, key = false) {
  const button = page.locator(`.about-avatar--${id}`);
  if (key) {
    await button.focus();
    await button.press("Enter");
  } else await button.click();
  await page.waitForFunction(
    (id) =>
      document.querySelector(".about-member")?.getAttribute("data-member") ===
      id,
    id,
  );
}
async function geometry(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height };
    };
    return {
      wheel: rect(".about-team__avatars"),
      frame: rect(".about-member"),
      portrait: rect(".about-member__portrait-slot"),
      microphone: rect(".about-member__microphone.is-selected"),
      footer: rect(".site-footer"),
      copy: rect(".about-member__copy"),
      scroll: scrollY,
    };
  });
}
function near(a, b, message) {
  assert(Math.abs(a - b) <= 1, `${message}: ${a} vs ${b}`);
}
async function stableAndUsable(page, baseline, width) {
  const current = await geometry(page);
  for (const slot of [
    "wheel",
    "frame",
    "portrait",
    "microphone",
    "footer",
    "copy",
  ]) {
    for (const prop of ["x", "y", "width", "height"].filter(
      (prop) => slot !== "copy" || prop !== "height",
    )) {
      near(
        current[slot][prop],
        baseline[slot][prop],
        `${width} ${slot}.${prop}`,
      );
    }
  }
  near(current.scroll, baseline.scroll, `${width} switch scroll`);
  assert.equal(await page.locator(".about-avatar").count(), 6);
  assert.equal(
    await page.locator('.about-avatar[aria-expanded="true"]').count(),
    1,
  );
  assert.equal(await page.locator(".about-member").count(), 1);
  assert.equal(await page.locator(".about-team__heading").count(), 0);
  assert.equal(
    await page
      .locator(".about-team")
      .evaluate((node) => node.getBoundingClientRect().height),
    0,
  );
  const topology = await page.locator(".about-avatar").evaluateAll((buttons) =>
    buttons.map((button) => {
      const r = button.getBoundingClientRect();
      return { x: r.x, y: r.y };
    }),
  );
  if (width >= 1200) {
    assert(
      topology.every((p, i) => i === 0 || p.y > topology[i - 1].y),
      "six ordered inverse-C rows",
    );
    near(topology[0].x, topology[5].x, "inverse-C endpoints");
    near(topology[1].x, topology[4].x, "inverse-C shoulders");
    near(topology[2].x, topology[3].x, "inverse-C spine");
    assert(
      topology[0].x < topology[1].x && topology[1].x < topology[2].x,
      "inverse-C opens left",
    );
  } else {
    assert.equal(
      await page
        .locator(".about-team__avatars")
        .evaluate((node) => getComputedStyle(node).transitionDuration),
      "0s",
    );
    assert.equal(
      await page
        .locator(".about-avatar")
        .first()
        .evaluate((node) => getComputedStyle(node).transitionDuration),
      "0s",
    );
    if (width < 768) {
      near(topology[0].y, topology[2].y, "phone grid first row");
      near(topology[3].y, topology[5].y, "phone grid second row");
      assert(topology[3].y > topology[0].y, "phone grid restored");
    }
  }
  near(
    await page
      .locator(".about-member__backgrounds")
      .evaluate((node) => node.getBoundingClientRect().top + scrollY),
    current.frame.y - 44,
    "profile surface fills scallop gaps",
  );
  assert.equal(await page.locator(".site-footer").count(), 1);
  assert.equal(await page.locator(".about-member__microphone").count(), 1);
  assert(
    await page.evaluate(() => {
      const layers = [
        ...document.querySelectorAll(".about-member__microphone-layer"),
      ];
      window.savedDecorations ??= layers;
      const values = document
        .querySelector(".about-values")
        .getBoundingClientRect();
      return (
        layers.length === 10 &&
        layers.every(
          (layer, i) =>
            layer === window.savedDecorations[i] &&
            getComputedStyle(layer).maskImage.includes("microphone-mask-"),
        ) &&
        [
          ...document.querySelectorAll(
            ".about-art--stars-left, .about-art--stars-right",
          ),
        ].every((node) => getComputedStyle(node).display === "none") &&
        [...document.querySelectorAll(".about-value")].every(
          (node) => node.getBoundingClientRect().bottom <= values.bottom - 28,
        )
      );
    }),
    "fixed mask nodes, no duplicate star strip, values copy clear of lower edge",
  );
  assert(
    await page.evaluate(() => {
      const frame = document
        .querySelector(".about-member")
        .getBoundingClientRect();
      const bio = document
        .querySelector(".about-member__bio")
        .getBoundingClientRect();
      return (
        bio.bottom < frame.bottom &&
        document.documentElement.scrollWidth <= innerWidth &&
        [...document.querySelectorAll(".about-avatar")].every((button, i) => {
          if (button !== window.savedAvatars[i]) return false;
          const r = button.getBoundingClientRect();
          return (
            r.width >= 44 &&
            r.x >= 0 &&
            r.right <= innerWidth &&
            [0.3, 0.5, 0.7].every((x) =>
              [0.3, 0.5, 0.7].every((y) =>
                button.contains(
                  document.elementFromPoint(
                    r.x + r.width * x,
                    r.y + r.height * y,
                  ),
                ),
              ),
            )
          );
        }) &&
        [
          ...document.querySelectorAll(".about-member__portrait.is-selected"),
        ].every((image) => image.complete && image.naturalWidth > 0)
      );
    }),
    `${width} artwork, text, preserved nodes, hit areas and overflow`,
  );
  const circles = await page.evaluate((measurements) => {
    function visibleCircle(image) {
      const source = measurements.find((item) =>
        image.src.endsWith(item.file.replace("public", "")),
      );
      const rect = image.getBoundingClientRect();
      const [width, height] = source.canvas;
      const [left, top, right, bottom] = source.bounds;
      const factor = Math.min(rect.width / width, rect.height / height);
      return {
        x:
          rect.x +
          (rect.width - width * factor) / 2 +
          ((left + right) / 2) * factor,
        y:
          rect.y +
          (rect.height - height * factor) / 2 +
          ((top + bottom) / 2) * factor,
        diameter: Math.max(right - left, bottom - top) * factor,
      };
    }
    const portrait = visibleCircle(
      document.querySelector(".about-member__portrait.is-selected"),
    );
    const slot = document
      .querySelector(".about-member__portrait-slot")
      .getBoundingClientRect();
    const wheels = [...document.querySelectorAll(".about-avatar")].map(
      (button) => {
        const circle = visibleCircle(button.querySelector("img"));
        const r = button.getBoundingClientRect();
        return {
          circle,
          center: { x: r.x + r.width / 2, y: r.y + r.height / 2 },
          diameter: (r.width * 334) / 352,
        };
      },
    );
    window.portraitDiameters ??= {};
    window.portraitDiameters[innerWidth] ??= portrait.diameter;
    return {
      portrait,
      center: { x: slot.x + slot.width / 2, y: slot.y + slot.height / 2 },
      diameter: window.portraitDiameters[innerWidth],
      wheels,
    };
  }, artworkMeasurements);
  near(
    circles.portrait.x,
    circles.center.x,
    "visible portrait horizontal center",
  );
  near(
    circles.portrait.y,
    circles.center.y,
    "visible portrait vertical center",
  );
  near(
    circles.portrait.diameter,
    circles.diameter,
    "same visible portrait diameter for every member",
  );
  for (const { circle, center, diameter } of circles.wheels) {
    near(circle.x, center.x, "visible wheel-avatar horizontal center");
    near(circle.y, center.y, "visible wheel-avatar vertical center");
    near(circle.diameter, diameter, "same visible wheel-avatar diameter");
  }
  return current;
}
try {
  const reference = await open(1366, 7680);
  assert.equal(await reference.locator(".about-member").count(), 0);
  assert.deepEqual(
    await reference.locator(".about-value__tagline").allTextContents(),
    ["A new city. Your neighbourhood.", "Help you find your own Saigon."],
  );
  await reference.screenshot({
    path: `${output}/about-us-reference-1366x7680.png`,
  });
  await reference.close();
  for (const width of [
    320, 375, 600, 767, 768, 901, 1024, 1199, 1200, 1366, 1920, 2560,
  ]) {
    const page = await open(width);
    await page.evaluate(() => {
      window.savedAvatars = [...document.querySelectorAll(".about-avatar")];
    });
    await select(page, "mai");
    await page.waitForTimeout(1100);
    const baseline = await geometry(page);
    await stableAndUsable(page, baseline, width);
    for (const id of ids.slice(1)) {
      await select(page, id);
      await page.waitForTimeout(470);
      await stableAndUsable(page, baseline, width);
      if (width === 1366)
        await page.screenshot({ path: `${output}/profile-${id}.png` });
    }
    await select(page, "mai", true);
    await page.waitForTimeout(470);
    assert.equal(
      await page.evaluate(() =>
        document.activeElement?.classList.contains("about-avatar--mai"),
      ),
      true,
    );
    await stableAndUsable(page, baseline, width);
    if ([320, 375, 768, 1024, 1366, 1920, 2560].includes(width))
      await page.screenshot({ path: `${output}/selected-${width}.png` });
    results.push({
      check:
        "six persistent selectable members; stable wheel/artwork/footer/copy anchors and scroll; keyboard focus; contained text; no overflow",
      width,
      geometry: baseline,
      passed: true,
    });
    if (width === 1366) {
      const fonts = await page.evaluate(() =>
        [...document.fonts]
          .filter((face) => face.status === "loaded")
          .map((face) => `${face.family}/${face.style}/${face.weight}`),
      );
      assert(fonts.includes("Bookmania/italic/400"));
      assert(fonts.includes("Bookmania/italic/700"));
      const head = page
        .locator(".about-member__microphone-layer--head")
        .first();
      const startColor = await head.evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      );
      await select(page, "yen-nhi");
      await page.waitForTimeout(80);
      const middleColor = await head.evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      );
      await page.screenshot({
        path: `${output}/decoration-color-transition.png`,
      });
      await page.waitForTimeout(450);
      const endColor = await head.evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      );
      assert(
        startColor !== middleColor && middleColor !== endColor,
        "continuous decoration color transition without geometry replacement",
      );
      await stableAndUsable(page, baseline, width);
      results.push({
        check:
          "one fixed microphone/note shape; continuous color transition; persistent mask nodes; no duplicate decorative strip",
        passed: true,
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const selector of [
        ".about-avatar",
        ".about-team__avatars",
        ".about-member__portrait",
        ".about-member__microphone",
        ".about-member__microphone-layer",
        ".about-member__gradient",
      ]) {
        assert.equal(
          await page
            .locator(selector)
            .first()
            .evaluate((node) => getComputedStyle(node).transitionDuration),
          "0s",
        );
      }
      results.push({
        check:
          "supplied italic fonts loaded; reduced-motion wheel/artwork/theme transitions disabled",
        passed: true,
      });
    }
    await page.close();
  }
  const motion = await open(1366);
  await motion.evaluate(() => {
    window.savedAvatars = [...document.querySelectorAll(".about-avatar")];
  });
  await motion.locator(".about-team").scrollIntoViewIfNeeded();
  const start = await motion.locator(".about-avatar--mai").boundingBox();
  await select(motion, "mai");
  await motion.waitForTimeout(120);
  const mid = await motion.locator(".about-avatar--mai").boundingBox();
  await motion.screenshot({ path: `${output}/motion-in-progress.png` });
  await motion.waitForTimeout(1000);
  const end = await motion.locator(".about-avatar--mai").boundingBox();
  assert(
    start.width > mid.width && mid.width > end.width,
    "wheel visibly shrinks through intermediate frames",
  );
  assert(
    start.x < mid.x && mid.x < end.x,
    "wheel moves right through intermediate frames",
  );
  near(end.width, 88, "final native avatar size");
  for (const width of [375, 1024, 1920, 1366]) {
    await motion.setViewportSize({ width, height: 900 });
    await motion.waitForTimeout(800);
    await motion
      .locator(".about-member")
      .evaluate((node) =>
        node.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    const baseline = await geometry(motion);
    await select(motion, "yen-nhi");
    await motion.waitForTimeout(470);
    await stableAndUsable(motion, baseline, width);
    await select(motion, "mai");
    await motion.waitForTimeout(470);
  }
  results.push({
    check:
      "first-selection intermediate animation; selected layout remains stable after breakpoint resizing",
    passed: true,
  });
  await motion.close();
  const race = await browser.newPage({
    viewport: { width: 1366, height: 900 },
  });
  await race.route("**/portrait-bao-lan.webp", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1600));
    await route.continue();
  });
  await race.goto(`${base}/about-us`, { waitUntil: "domcontentloaded" });
  await race.locator(".about-avatar--bao-lan").click();
  await race.locator(".about-avatar--yen-nhi").dispatchEvent("click");
  await race.waitForFunction(
    () =>
      document.querySelector(".about-member")?.getAttribute("data-member") ===
      "yen-nhi",
  );
  await race.waitForTimeout(1800);
  assert.equal(
    await race.locator(".about-member").getAttribute("data-member"),
    "yen-nhi",
  );
  results.push({
    check: "rapid member requests with delayed portrait: last selection wins",
    passed: true,
  });
  await race.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify(
      { reference: "references/canva/about-us-2.png", results, errors },
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
