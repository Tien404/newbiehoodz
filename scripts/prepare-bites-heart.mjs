// Recover the original full heart paths; remove only Canva's rectangular frame clips.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const require = createRequire(
  new URL("../../scripts/images/package.json", import.meta.url),
);
const sharp = require("sharp");
const app = new URL("../", import.meta.url);
const original = await readFile(
  new URL("assets/local-bites/eatery-heart.svg", app),
  "utf8",
);
const frameClips = ["54a95f1d30", "46c67f9f43", "513c42bf0f", "74ba9e2c95"];
let recovered = original;
for (const id of frameClips)
  recovered = recovered.replaceAll(` clip-path="url(#${id})"`, "");
await writeFile(
  new URL("assets/local-bites/eatery-heart-full.svg", app),
  recovered,
);
const webp = await sharp(Buffer.from(recovered), { density: 144 })
  .webp({ lossless: true })
  .toBuffer();
await writeFile(
  new URL("public/local-bites/eatery-heart-full.webp", app),
  webp,
);
const digest = (value) => createHash("sha256").update(value).digest("hex");
await writeFile(
  new URL("assets/local-bites/eatery-heart-full.json", app),
  JSON.stringify(
    {
      source: "references/canva/local-bites.svg",
      isolatedSource: "assets/local-bites/eatery-heart.svg",
      sourceSha256: digest(
        await readFile(new URL("../references/canva/local-bites.svg", app)),
      ),
      isolatedSourceSha256: digest(original),
      removedRectangularFrameClips: frameClips,
      retained:
        "Original heart fill/outline paths, transforms and shape clips; original Canva and cropped derivative unchanged",
      delivery: "public/local-bites/eatery-heart-full.webp",
      deliverySha256: digest(webp),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Recovered complete original heart from SVG; references unchanged.",
);
