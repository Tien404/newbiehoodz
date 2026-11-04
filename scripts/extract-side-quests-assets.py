"""Prepare standalone Side Quests artwork from immutable Canva SVG."""
from pathlib import Path
import copy
import hashlib
import json
import re
import xml.etree.ElementTree as ET

APP = Path(__file__).resolve().parents[1]
SOURCE = APP.parent / "references/canva/side-quests.svg"
OUT = APP / "assets/side-quests"
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

def vector(name, indices, pixel_box, selected_nodes=None):
    nodes = [copy.deepcopy(n) for n in selected_nodes] if selected_nodes is not None else [copy.deepcopy(root[i]) for i in indices]
    needed = set().union(*(refs(n) for n in nodes))
    pending = list(needed)
    while pending:
        for ref in refs(ids[pending.pop()]):
            if ref not in needed:
                needed.add(ref)
                pending.append(ref)
    x, y, w, h = pixel_box
    svg = ET.Element(f"{{{SVG}}}svg", {"viewBox": " ".join(str(v * .75) for v in pixel_box), "width": str(w), "height": str(h)})
    if name in {"scallop-mask"}:
        svg.set("preserveAspectRatio", "none")
    defs = ET.SubElement(svg, f"{{{SVG}}}defs")
    for ref in sorted(needed):
        defs.append(copy.deepcopy(ids[ref]))
    svg.extend(nodes)
    ET.ElementTree(svg).write(OUT / f"{name}.svg", encoding="utf-8", xml_declaration=True)
    manifest.append({"file": f"{name}.svg", "root_child_indices_zero_based": list(indices), "pixel_box": pixel_box, "method": "Original artwork paths/images and referenced clips/masks only; no page copy or controls."})

vector("scallop-mask", range(578,618), (0,2626,1366,40))
vector("hero-map", [262], (1068,144,236,160))
vector("hero-welcome", [263], (0,532,228,208))
vector("hero-souvenirs", [264], (76,144,200,176))
vector("hero-skyline", [265], (1144,492,224,240))
vector("city-right", [447], (1232,1376,168,168))
vector("city-left", [576], (-32,2144,168,168))
vector("lotus-left", [902], (280,2920,112,152))
vector("lotus-right", [903], (1000,2924,116,152))
for item in manifest:
    item["sha256"] = hashlib.sha256((OUT / item["file"]).read_bytes()).hexdigest()
    item["source_sha256"] = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Extracted {len(manifest)} original Side Quests assets; references unchanged.")
