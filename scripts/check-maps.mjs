import { readFile, writeFile, mkdir } from "node:fs/promises";
const root = new URL("../../", import.meta.url);
const places = JSON.parse(
  await readFile(
    new URL("data/processed/full/final/catalog.json", root),
    "utf8",
  ),
).places;
const results = [];
let next = 0;
const allowed = (url) =>
  url.protocol === "https:" &&
  [
    "maps.app.goo.gl",
    "maps.google.com",
    "google.com",
    "www.google.com",
    "consent.google.com",
    "www.google.com.vn",
  ].includes(url.hostname);
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (;;) {
      const index = next++;
      if (index >= places.length) return;
      const place = places[index];
      let current = new URL(place.mapsUrl);
      const row = {
        id: place.id,
        sourceUrl: place.mapsUrl,
        result: "inconclusive",
        status: null,
        redirects: 0,
      };
      try {
        for (let hop = 0; hop < 7; hop++) {
          if (!allowed(current)) {
            row.result = "unexpected-redirect-host";
            break;
          }
          const response = await fetch(current, {
            redirect: "manual",
            signal: AbortSignal.timeout(15000),
            headers: {
              "User-Agent":
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
            },
          });
          row.status = response.status;
          await response.body?.cancel();
          const location = response.headers.get("location");
          if (response.status >= 300 && response.status < 400 && location) {
            current = new URL(location, current);
            row.redirects++;
            continue;
          }
          row.result =
            response.ok && current.hostname !== "consent.google.com"
              ? "reachable"
              : [404, 410].includes(response.status)
                ? "broken"
                : "inconclusive";
          row.finalHost = current.hostname;
          break;
        }
      } catch {
        row.result = "network-unconfirmed";
      }
      results.push(row);
      if (results.length % 50 === 0)
        console.log(`Maps checked: ${results.length}/${places.length}`);
    }
  }),
);
results.sort((a, b) => a.id.localeCompare(b.id));
const counts = {};
for (const row of results) counts[row.result] = (counts[row.result] ?? 0) + 1;
await mkdir(new URL("data/reports/frontend/", root), { recursive: true });
await writeFile(
  new URL("data/reports/frontend/maps-link-checks.json", root),
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      counts,
      limitations:
        "HTTP reachability does not establish geographic/business accuracy. Source URLs are not replaced or fabricated.",
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(counts));
