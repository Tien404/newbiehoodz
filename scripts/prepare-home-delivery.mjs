/** Optional asset preparation: requires Playwright/Chrome and Python/Pillow, not a runtime dependency. */
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.argv[2] ?? "playwright");
const python = process.argv[3] ?? "python3";
const app = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(
  await readFile(path.join(app, "assets/home/manifest.json"), "utf8"),
);
const scalable = [
  "welcome-paper.svg",
  "welcome-heart.svg",
  "promotion-decoration.svg",
];
const temporary = await mkdtemp(path.join(tmpdir(), "newbie-home-art-"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (const item of manifest) {
    if (scalable.includes(item.file)) continue;
    await page.setViewportSize({
      width: item.pixel_box[2],
      height: item.pixel_box[3],
    });
    await page.goto(
      new URL(`../assets/home/${item.file}`, import.meta.url).href,
    );
    await page.screenshot({
      path: path.join(temporary, item.file.replace(".svg", ".png")),
      omitBackground: true,
    });
  }
  execFileSync(
    python,
    [
      "-c",
      `
from pathlib import Path
from PIL import Image
import json, hashlib, shutil, sys
app, temporary = Path(sys.argv[1]), Path(sys.argv[2])
scalable = set(json.loads(sys.argv[3]))
output = app / 'public/home'
output.mkdir(parents=True, exist_ok=True)
records = []
for source in json.loads((app / 'assets/home/manifest.json').read_text()):
    name = source['file']
    if name in scalable:
        shutil.copyfile(app / 'assets/home' / name, output / name)
    else:
        name = name.replace('.svg', '.webp')
        im = Image.open(temporary / source['file'].replace('.svg', '.png')).convert('RGBA')
        im.save(output / name, 'WEBP', lossless=True, method=6)
        (output / source['file']).unlink(missing_ok=True)
    records.append({'file': name, 'source_derivative': 'assets/home/' + source['file'], 'source_sha256': source['source_sha256'], 'sha256': hashlib.sha256((output/name).read_bytes()).hexdigest(), 'delivery': 'original SVG' if name.endswith('.svg') else 'lossless WebP rendered from isolated original artwork at 2x'})
(output / 'manifest.json').write_text(json.dumps(records, indent=2) + '\\n')
print('Prepared', len(records), 'Home delivery assets.')
`,
      app,
      temporary,
      JSON.stringify(scalable),
    ],
    { stdio: "inherit" },
  );
} finally {
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
