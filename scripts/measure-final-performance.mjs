import { writeFile } from "node:fs/promises";
const { chromium } = await import(process.argv[2] ?? "playwright");
const base = process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:4174";
const routes = process.env.PERF_ROUTES?.split(",") ?? [
  "/",
  "/cheatsheet",
  "/about-us",
  "/lock-in",
  "/local-bites",
  "/side-quests",
];
const runs = Number(process.env.PERF_RUNS ?? 1);
const profiles =
  process.env.PERF_PROFILES === "mobile" ? ["mobile"] : ["desktop", "mobile"];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const profile of profiles)
    for (const route of routes)
      for (let run = 1; run <= runs; run++) {
        const page = await browser.newPage({
          viewport:
            profile === "mobile"
              ? { width: 375, height: 812 }
              : { width: 1366, height: 900 },
          deviceScaleFactor: profile === "mobile" ? 2 : 1,
          reducedMotion: "no-preference",
        });
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Emulation.setCPUThrottlingRate", {
          rate: profile === "mobile" ? 4 : 1,
        });
        if (profile === "mobile")
          await cdp.send("Network.emulateNetworkConditions", {
            offline: false,
            latency: 150,
            downloadThroughput: 1600000 / 8,
            uploadThroughput: 750000 / 8,
            connectionType: "cellular4g",
          });
        const requests = new Map();
        const failures = [];
        cdp.on("Network.responseReceived", ({ requestId, type, response }) =>
          requests.set(requestId, {
            type,
            url: response.url,
            status: response.status,
            bytes: 0,
          }),
        );
        cdp.on(
          "Network.loadingFinished",
          ({ requestId, encodedDataLength }) => {
            if (requests.has(requestId))
              requests.get(requestId).bytes = encodedDataLength;
          },
        );
        cdp.on("Network.loadingFailed", ({ errorText, canceled }) => {
          if (!canceled) failures.push(errorText);
        });
        await page.addInitScript(() => {
          window.__perf = { lcp: null, cls: 0, longTasks: [] };
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              window.__perf.lcp = {
                value: entry.startTime,
                tag: entry.element?.tagName,
                selector: entry.element?.className ?? "",
              };
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (!entry.hadRecentInput) window.__perf.cls += entry.value;
          }).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              window.__perf.longTasks.push(entry.duration);
          }).observe({ type: "longtask", buffered: true });
        });
        let navigationError = null;
        try {
          await page.goto(base + route, { waitUntil: "load", timeout: 90000 });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(2500);
        } catch (error) {
          navigationError = error.message.split("\n")[0];
        }
        const metrics = await page.evaluate(() => ({
          ...window.__perf,
          fcp:
            performance.getEntriesByName("first-contentful-paint")[0]
              ?.startTime ?? null,
          navigation: performance.getEntriesByType("navigation")[0]?.toJSON(),
        }));
        const responses = [...requests.values()];
        const result = {
          profile,
          route,
          run,
          fcpMs: metrics.fcp,
          lcpMs: metrics.lcp?.value ?? null,
          lcpElement: metrics.lcp,
          cls: metrics.cls,
          observedLongTaskBlockingMs: metrics.longTasks.reduce(
            (sum, duration) => sum + Math.max(0, duration - 50),
            0,
          ),
          requestCount: responses.length,
          transferredBytes: responses.reduce(
            (sum, response) => sum + response.bytes,
            0,
          ),
          fontBytes: responses
            .filter((response) => response.type === "Font")
            .reduce((sum, response) => sum + response.bytes, 0),
          documentBytes: responses
            .filter((response) => response.type === "Document")
            .reduce((sum, response) => sum + response.bytes, 0),
          responses: responses.map((response) => ({
            ...response,
            url: response.url.replace(base, ""),
          })),
          failures,
          navigationError,
        };
        results.push(result);
        console.log(
          `${profile} ${route} #${run}: FCP=${Math.round(result.fcpMs)}ms LCP=${Math.round(result.lcpMs)}ms CLS=${result.cls.toFixed(3)} bytes=${result.transferredBytes}`,
        );
        await page.close();
      }
  await writeFile(
    new URL(
      `../../data/reports/final-qa/${process.env.PERF_OUTPUT ?? "performance"}.json`,
      import.meta.url,
    ),
    JSON.stringify(
      {
        base,
        runs,
        note: "Local uncompressed static server, cold browser cache, Chrome lab measurements; mobile 375x812 DPR2 CPU4x, 1.6Mbps down/750Kbps up/150ms latency. Desktop1366x900 DPR1 unthrottled. Motion enabled. Cross-origin requests included via CDP. Long-task metric is not Lighthouse TBT; no field INP measured.",
        results,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
