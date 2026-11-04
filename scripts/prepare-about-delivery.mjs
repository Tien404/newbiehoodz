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
  await readFile(path.join(app, "assets/about-us/manifest.json"), "utf8"),
);
const scalable = ["story-paper.svg", "scallop-mask.svg"];
const temporary = await mkdtemp(path.join(tmpdir(), "newbie-about-us-art-"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const item of manifest) {
    if (scalable.includes(item.file)) continue;
    const width = item.pixel_box[2] * 2;
    const height = item.pixel_box[3] * 2;
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const svg = await readFile(path.join(app, "assets/about-us", item.file));
    await page.setContent(
      `<html><body style="margin:0"><img alt="" style="display:block;width:${width}px;height:${height}px" src="data:image/svg+xml;base64,${svg.toString("base64")}"></body></html>`,
    );
    await page.locator("img").evaluate((image) => image.decode());
    await page.screenshot({
      path: path.join(temporary, item.file.replace(".svg", ".png")),
      omitBackground: true,
    });
    await page.close();
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
output = app / 'public/about-us'
output.mkdir(parents=True, exist_ok=True)
records = []
for source in json.loads((app / 'assets/about-us/manifest.json').read_text()):
    name = source['file']
    if name in scalable:
        shutil.copyfile(app / 'assets/about-us' / name, output / name)
    else:
        name = name.replace('.svg', '.webp')
        im = Image.open(temporary / source['file'].replace('.svg', '.png')).convert('RGBA')
        im.save(output / name, 'WEBP', lossless=True, method=6)
        (output / source['file']).unlink(missing_ok=True)
    records.append({'file': name, 'source_derivative': 'assets/about-us/' + source['file'], 'source_sha256': source['source_sha256'], 'sha256': hashlib.sha256((output/name).read_bytes()).hexdigest(), 'delivery': 'original SVG' if name.endswith('.svg') else 'lossless WebP rendered from isolated original artwork at 2x'})
(output / 'manifest.json').write_text(json.dumps(records, indent=2) + '\\n')
print('Prepared', len(records), 'About Us delivery assets.')
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
