"""Prepare standalone Lock In artwork from immutable Canva SVG."""
from pathlib import Path
import copy
import hashlib
import json
import re
import xml.etree.ElementTree as ET

APP = Path(__file__).resolve().parents[1]
SOURCE = APP.parent / "references/canva/lock-in.svg"
OUT = APP / "assets/lock-in"
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

vector("scallop-mask", range(580,620), (0,918,1366,40))
vector("hero-heart", [379,380], (60,148,164,152))
vector("hero-star", [381,382], (80,532,148,148))
vector("hero-sun", [383,384], (1132,520,144,144))
vector("hero-coffee", range(493,507), (856,348,92,100))
vector("hero-laptop", [507,509,510,511], (324,320,192,132))
vector("hero-study", [508], (988,152,244,188))
vector("paperclip", [767], (80,1008,52,68))
vector("coffee-cups", [768], (560,1136,112,100))
vector("matcha", [770], (1212,1136,80,88))
vector("red-doodles", range(771,774), (1248,948,96,80))
vector("edge-heart", range(774,777), (20,1440,64,64))
vector("food-strip", [*range(973,1013),*range(1021,1073)], (0,1588,1366,80))
vector("red-tape", range(1013,1017), (592,1732,88,56))
vector("star-trail", range(1073,1090), (1272,2120,80,96))
vector("chalkboard", [1090], (16,2056,96,116))
vector("flowers", [1473], (56,2624,180,180))
vector("fish-flags", [1474], (488,2324,356,40))
for item in manifest:
    item["sha256"] = hashlib.sha256((OUT / item["file"]).read_bytes()).hexdigest()
    item["source_sha256"] = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Extracted {len(manifest)} isolated Lock In assets; original reference unchanged.")
