"""Prepare standalone Local Bites artwork from immutable Canva SVG."""
from pathlib import Path
import copy
import hashlib
import json
import re
import xml.etree.ElementTree as ET

APP = Path(__file__).resolve().parents[1]
SOURCE = APP.parent / "references/canva/local-bites.svg"
OUT = APP / "assets/local-bites"
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

vector("scallop-mask", range(389,429), (0,675,1366,40))
vector("hero-star", [387,388], (80,532,148,148))
vector("hero-noodles", [527], (104,112,276,236))
vector("hero-sandwich", [528], (1024,444,192,200))
vector("hero-rolls", [531], (1108,148,228,188))
vector("flags-left", range(497,527), (192,228,260,160))
vector("flags-right", [530], (900,228,268,168))
vector("dish-pho", [534,535,582], (84,1028,256,256))
vector("dish-banh-mi", [546,547,583], (396,1028,256,256))
vector("dish-com-tam", [558,559,584], (712,1028,256,256))
vector("dish-banh-xeo", [570,571,585], (1024,1028,256,256))
vector("food-strip", [*range(588,622),627,628], (68,804,1228,88))
vector("street-food-left", [586,587,624,625,626], (0,804,72,88))
vector("street-food-right", [622,623,629,630,631], (1296,804,72,88))
vector("stamp", [632], (8,1412,228,124))
vector("eatery-heart", [903,904], (1132,2204,152,144))
for item in manifest:
    item["sha256"] = hashlib.sha256((OUT / item["file"]).read_bytes()).hexdigest()
    item["source_sha256"] = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Extracted {len(manifest)} original Local Bites assets; references unchanged.")
