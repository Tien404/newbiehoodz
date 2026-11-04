"""Extract only shell artwork; sources are never modified. Requires Pillow."""
from pathlib import Path
import base64
import copy
import hashlib
import io
import json
import re
import xml.etree.ElementTree as ET
from PIL import Image

APP = Path(__file__).resolve().parents[1]
SOURCE = APP.parent / "references/canva"
OUTPUT = APP / "public/brand"
SVG = "http://www.w3.org/2000/svg"
XLINK = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG)
ET.register_namespace("xlink", XLINK)
OUTPUT.mkdir(parents=True, exist_ok=True)
manifest = []

home = ET.parse(SOURCE / "home.svg").getroot()
images = list(home.iter(f"{{{SVG}}}image"))
def decode(index):
    return Image.open(io.BytesIO(base64.b64decode(images[index - 1].get(f"{{{XLINK}}}href").split(",", 1)[1])))
mask = decode(1).convert("L")
logo = decode(21).convert("RGBA")
logo.putalpha(mask)
bounds = mask.getbbox()
logo = logo.crop(bounds)
logo.save(OUTPUT / "logo.png", optimize=True)
manifest.append({"file": "logo.png", "source": "home.svg", "images": [21, 1], "crop": bounds, "size": logo.size, "method": "Colored embedded PNG with original grayscale mask as alpha; crop transparent margins only."})

root = ET.parse(SOURCE / "newbie-cheatsheet.svg").getroot()
ids = {node.get("id"): node for node in root.iter() if node.get("id")}
def references(node):
    return set(re.findall(r"url\(#([^)]+)\)", ET.tostring(node, encoding="unicode")))
def extract(filename, indices, viewbox):
    nodes = [copy.deepcopy(root[index]) for index in indices]
    needed = set().union(*(references(node) for node in nodes))
    pending = list(needed)
    while pending:
        for ref in references(ids[pending.pop()]):
            if ref not in needed:
                needed.add(ref)
                pending.append(ref)
    x, y, width, height = viewbox
    svg = ET.Element(f"{{{SVG}}}svg", {"viewBox": f"{x} {y} {width} {height}", "width": str(width), "height": str(height)})
    defs = ET.SubElement(svg, f"{{{SVG}}}defs")
    for ref in sorted(needed):
        defs.append(copy.deepcopy(ids[ref]))
    svg.extend(nodes)
    ET.ElementTree(svg).write(OUTPUT / filename, encoding="utf-8", xml_declaration=True)
    manifest.append({"file": filename, "source": "newbie-cheatsheet.svg", "root_child_indices_zero_based": list(indices), "viewBox": viewbox, "method": "Original paths and recursively referenced clip definitions only; no page text or background included."})
extract("lotus.svg", range(4336, 4356), (868, 3818, 110, 68))
extract("star.svg", range(4356, 4358), (110, 3831, 48, 50))
extract("footer-scallops.svg", range(4074, 4114), (0, 3840, 1024.5, 28))
for item in manifest:
    item["sha256"] = hashlib.sha256((OUTPUT / item["file"]).read_bytes()).hexdigest()
    item["source_sha256"] = hashlib.sha256((SOURCE / item["source"]).read_bytes()).hexdigest()
(OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("Extracted logo, lotus, star and footer scallop strip; originals unchanged.")
