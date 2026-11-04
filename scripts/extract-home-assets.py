"""Prepare standalone Home artwork from immutable Canva SVG."""
from pathlib import Path
import copy
import hashlib
import json
import re
import xml.etree.ElementTree as ET

APP = Path(__file__).resolve().parents[1]
SOURCE = APP.parent / "references/canva/home.svg"
OUT = APP / "assets/home"
OUT.mkdir(parents=True, exist_ok=True)
SVG = "http://www.w3.org/2000/svg"
XLINK = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG)
ET.register_namespace("xlink", XLINK)
root = ET.parse(SOURCE).getroot()
ids = {n.get("id"): n for n in root.iter() if n.get("id")}
manifest = []

def refs(n):
    return set(re.findall(r"url\(#([^)]+)\)", ET.tostring(n, encoding="unicode")))

def vector(name, indices, pixel_box):
    nodes = [copy.deepcopy(root[i]) for i in indices]
    needed = set().union(*(refs(n) for n in nodes))
    pending = list(needed)
    while pending:
        for ref in refs(ids[pending.pop()]):
            if ref not in needed:
                needed.add(ref)
                pending.append(ref)
    x, y, w, h = pixel_box
    svg = ET.Element(f"{{{SVG}}}svg", {"viewBox": " ".join(str(v * .75) for v in pixel_box), "width": str(w), "height": str(h)})
    if name in {"welcome-paper", "promotion-decoration"}:
        svg.set("preserveAspectRatio", "none")
    defs = ET.SubElement(svg, f"{{{SVG}}}defs")
    for ref in sorted(needed):
        defs.append(copy.deepcopy(ids[ref]))
    svg.extend(nodes)
    ET.ElementTree(svg).write(OUT / f"{name}.svg", encoding="utf-8", xml_declaration=True)
    manifest.append({"file": f"{name}.svg", "root_child_indices_zero_based": list(indices), "pixel_box": pixel_box, "method": "Original artwork paths/images and referenced clips/masks only; no page copy or controls."})

vector("hero-background", [*range(3, 117), 120, 121, *range(125, 131)], (0, 86, 1366, 682))
vector("hero-line-top-right", range(122, 125), (1100, 86, 268, 312))
vector("hero-line-bottom-left", range(273, 276), (-4, 456, 268, 312))
vector("hero-butterfly", range(270, 273), (888, 560, 160, 176))
vector("welcome-flowers", [277, 418, 419], (0, 768, 1366, 768))
vector("welcome-butterfly", range(438, 443), (1092, 736, 296, 288))
vector("welcome-paper", [333], (384, 908, 600, 596))
vector("welcome-heart", [*range(278, 333), *range(334, 418)], (572, 804, 216, 180))
vector("study", [758, *range(759, 1016)], (108, 1808, 180, 152))
vector("food", range(1037, 1380), (408, 1796, 200, 144))
vector("activities", range(1397, 1403), (740, 1804, 184, 128))
vector("cheatsheet", range(1426, 1445), (1116, 1800, 164, 140))
for name, idx, x in [("study", 664, 40), ("food", 689, 368), ("activities", 713, 696), ("cheatsheet", 736, 1024)]:
    vector(f"pattern-{name}", [idx], (x, 1716, 308, 556))
for name, indices, box in [
    ("study", range(1016, 1020), (232, 1720, 80, 48)),
    ("food", range(1033, 1037), (548, 1720, 80, 48)),
    ("activities", range(1393, 1397), (876, 1720, 80, 48)),
    ("cheatsheet", range(1422, 1426), (1204, 1720, 80, 48)),
]:
    vector(f"tape-{name}", indices, box)
vector("promotion-decoration", [1458, 1578], (0, 2360, 1366, 824))

vector("market-clipped", [1720], (940, 3184, 488, 664))
vector("tower-clipped", [1880], (0, 3184, 168, 664))
vector("saigon-collage", [1719, 1882], (1000, 3184, 366, 200))

for item in manifest:
    item["sha256"] = hashlib.sha256((OUT / item["file"]).read_bytes()).hexdigest()
    item["source_sha256"] = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Extracted {len(manifest)} standalone Home assets. Original reference unchanged.")
