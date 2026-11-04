"""Prepare standalone Cheatsheet artwork from immutable Canva SVG."""
from pathlib import Path
import copy
import hashlib
import json
import re
import xml.etree.ElementTree as ET

APP = Path(__file__).resolve().parents[1]
SOURCE = APP.parent / "references/canva/newbie-cheatsheet.svg"
OUT = APP / "assets/cheatsheet"
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
    if name == "weather-background":
        svg.set("preserveAspectRatio", "none")
    defs = ET.SubElement(svg, f"{{{SVG}}}defs")
    for ref in sorted(needed):
        defs.append(copy.deepcopy(ids[ref]))
    svg.extend(nodes)
    ET.ElementTree(svg).write(OUT / f"{name}.svg", encoding="utf-8", xml_declaration=True)
    manifest.append({"file": f"{name}.svg", "root_child_indices_zero_based": list(indices), "pixel_box": pixel_box, "method": "Original artwork paths/images and referenced clips/masks only; no page copy or controls."})

vector("hero-hat", [509], (1000, 120, 268, 268))
vector("hero-child", [511], (24, 228, 368, 504))
vector("hero-heart", [438, 439], (1096, 604, 68, 64))
vector("hero-scallops", range(398, 438), (0, 676, 1366, 40))
vector("street-star", range(700, 702), (976, 804, 92, 88))
vector("street-bag", [702], (1152, 820, 152, 152))
vector("street-scooter", [703], (868, 752, 344, 240))
vector("street-fruit", [704], (1128, 868, 104, 104))
vector("app-phone", range(1431, 1442), (1116, 1576, 84, 128))
vector("app-heart", [1442, 1443], (1004, 1572, 80, 76))
vector("app-lantern", range(1444, 1460), (1256, 1616, 64, 104))
vector("app-grocery", [1594], (800, 1900, 124, 124))
vector("app-zalo", [1703], (1188, 1888, 144, 144))
vector("app-rider", [1704], (348, 1884, 144, 144))
vector("app-drinks", [1705], (1036, 2024, 244, 244))
vector("app-map", [1841], (348, 2136, 164, 176))
vector("student-card", [2824], (64, 2596, 448, 276))
vector("student-star", [2112, 2113], (68, 2904, 88, 88))
vector("student-lotus", range(2114, 2132), (356, 2904, 128, 100))
vector("weather-background", [2869], (0, 3072, 1366, 768))
vector("weather-sun-cloud", range(3740, 3746), (1092, 3104, 212, 140))
vector("weather-umbrella", range(3746, 3766), (940, 3112, 124, 144))
vector("weather-rain", range(3766, 3772), (1184, 3228, 84, 48))
vector("phrase-lotus", range(3969, 3989), (1072, 3876, 176, 128))
vector("phrase-lantern", range(3989, 4005), (1248, 3900, 68, 108))
vector("phrase-hat", range(4005, 4053), (948, 3900, 112, 112))
vector("phrase-heart", [4053, 4054], (880, 3880, 76, 72))
vector("contact-hat", range(4277, 4320), (64, 4672, 136, 144))
vector("contact-lantern", range(4320, 4336), (1192, 4676, 84, 144))

for item in manifest:
    item["sha256"] = hashlib.sha256((OUT / item["file"]).read_bytes()).hexdigest()
    item["source_sha256"] = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Extracted {len(manifest)} standalone Cheatsheet assets. Original reference unchanged.")
