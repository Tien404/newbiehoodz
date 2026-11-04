"""Create lossless WOFF2 delivery derivatives; retain supplied font originals.
Authoring only: requires fonttools[woff] (including brotli), not needed by npm build.
"""
import hashlib
import json
import re
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
styles = list((root / "src").rglob("*.css"))
sources = sorted({url for path in styles for url in re.findall(r'url\("(/fonts/[^"()]+\.(?:ttf|otf))"\)', path.read_text())})
manifest_path = root / "public/fonts/manifest.json"
manifest = json.loads(manifest_path.read_text())
records = []
for source_url in sources:
    source = root / "public" / source_url.lstrip("/")
    destination = source.with_suffix(".woff2")
    original = TTFont(source, recalcTimestamp=False)
    original.flavor = "woff2"
    original.save(destination)
    delivered = TTFont(destination)
    assert original.getBestCmap() == delivered.getBestCmap()
    assert original["hmtx"].metrics == delivered["hmtx"].metrics
    assert original["head"].unitsPerEm == delivered["head"].unitsPerEm
    entry = {"file": str(destination.relative_to(root / "public")), "derivedFrom": str(source.relative_to(root / "public")), "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(), "format": "woff2", "sourceBytes": source.stat().st_size, "deliveryBytes": destination.stat().st_size, "verification": "Unicode cmap, horizontal glyph metrics and unitsPerEm match original"}
    records.append(entry)
    for path in styles:
        text = path.read_text()
        pattern = f'url("{source_url}") format("{"opentype" if source.suffix == ".otf" else "truetype"}")'
        destination_url = "/" + destination.relative_to(root / "public").as_posix()
        replacement = f'url("{destination_url}") format("woff2"), {pattern}'
        # Keep the source fallback and avoid duplicate derivative entries on rerun.
        if replacement not in text:
            path.write_text(text.replace(pattern, replacement))
    manifest = [entry for entry in manifest if entry["file"] != records[-1]["file"]]
    manifest.append(records[-1])
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
report = {"fonts": records, "originalBytes": sum(record["sourceBytes"] for record in records), "woff2Bytes": sum(record["deliveryBytes"] for record in records)}
(root.parent / "data/reports/final-qa/font-optimization.json").write_text(json.dumps(report, indent=2) + "\n")
print(f'{len(records)} fonts: {report["originalBytes"]} source bytes -> {report["woff2Bytes"]} WOFF2 bytes. Originals unchanged.')
