"""Prepare standalone About Us artwork from immutable Canva SVG."""
from pathlib import Path
import copy
import hashlib
import json
import re
import xml.etree.ElementTree as ET

APP = Path(__file__).resolve().parents[1]
SOURCE = APP.parent / "references/canva/about-us.svg"
OUT = APP / "assets/about-us"
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
    if name in {"story-paper", "scallop-mask"}:
        svg.set("preserveAspectRatio", "none")
    defs = ET.SubElement(svg, f"{{{SVG}}}defs")
    for ref in sorted(needed):
        defs.append(copy.deepcopy(ids[ref]))
    svg.extend(nodes)
    ET.ElementTree(svg).write(OUT / f"{name}.svg", encoding="utf-8", xml_declaration=True)
    manifest.append({"file": f"{name}.svg", "root_child_indices_zero_based": list(indices), "pixel_box": pixel_box, "method": "Original artwork paths/images and referenced clips/masks only; no page copy or controls."})

vector("scallop-mask", range(1144, 1184), (0, 1644, 1366, 44))
vector("hero-flowers", [422, 497, 498, 499], (0, 668, 1366, 100))
for name,index,box in [
 ("pink",518,(612,100,64,64)), ("green",520,(960,168,64,64)),
 ("blue",519,(68,372,64,64)), ("purple",506,(1232,440,64,64)),
]: vector("hero-flower-"+name,[index],box)
for i,index,box in [
 (1,505,(-12,588,108,108)),(2,501,(100,560,144,168)),
 (3,502,(432,632,108,84)),(4,503,(736,612,108,84)),
 (5,504,(980,608,108,108)),(6,500,(1192,560,168,168)),
]: vector("hero-butterflies-"+str(i),[index],box)
vector("story-paper", [*range(522,578), *range(662,718)], (152,916,1040,532))
vector("story-heart-right", range(578,662), (824,820,200,176))
vector("story-heart-left", range(718,802), (320,820,200,176))
vector("story-trumpet", [1122], (1000,800,116,128))
vector("story-piano", [1118], (40,1304,232,188))
vector("story-rabbit", [1115], (1192,1332,104,152))
vector("story-cat", [1116], (1072,1352,124,136))
vector("story-sheep", [1117], (940,1360,140,132))
vector("story-music-left", [1119,1120,1121], (0,1216,120,116))
vector("story-music-right", range(1123,1141), (1108,916,260,500))
vector("story-star-trail", [1141], (0,768,276,456))
vector("values-stickers", [*range(1251,1259), *range(1672,1688)], (36,1660,188,244))
vector("values-exclaim", range(1267,1273), (1024,1584,232,228))
vector("stars-left", range(1241,1251), (0,2192,304,88))
vector("stars-right", range(1259,1267), (1108,2216,256,76))
vector("team-music-left", range(2308,2317), (0,2344,128,616))
vector("team-music-right", range(2317,2326), (1176,2344,192,504))
# Each original overview avatar consists of an image branch and its outline branch.
for ident,pair,box in [
 ("mai",(8,9),(172,2620,176,176)), ("bao-lan",(6,7),(280,2424,176,176)),
 ("yen-nhi",(4,5),(476,2308,176,176)), ("hoang-lan",(2,3),(696,2308,176,176)),
 ("quynh-nhu",(0,1),(892,2420,176,176)), ("khoi-nguyen",(10,11),(996,2608,176,176)),
]:
 node=copy.deepcopy(root[1695]); container=node[0][0]
 for i in reversed(range(len(container))):
  if i not in pair: container.remove(container[i])
 vector("avatar-"+ident,[1695],box,[node])
for ident,bg,portrait,mic,y in [
 ("mai",2326,[2337,2338],range(2327,2337),3072),
 ("bao-lan",2677,[2877,2878],range(2879,2889),3840),
 ("yen-nhi",3061,[3068,3069],range(3420,3430),4608),
 ("hoang-lan",3450,[3455,3456],range(3791,3801),5376),
 ("quynh-nhu",3820,[3823,3824],range(4167,4177),6144),
 ("khoi-nguyen",4197,[4206,4207],range(4548,4558),6912),
]:
 vector("gradient-"+ident,[bg],(0,y,1366,768))
 vector("portrait-"+ident,portrait,(128,y+40,384,352))
 vector("microphone-"+ident,mic,(0,y+324,204,316))
vector("profile-stars-left", range(2658,2668), (8,3124,308,88))
vector("profile-stars-right", range(2668,2677), (1064,3132,300,76))

for item in manifest:
    item["sha256"] = hashlib.sha256((OUT / item["file"]).read_bytes()).hexdigest()
    item["source_sha256"] = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Extracted {len(manifest)} standalone About Us assets. Original reference unchanged.")
