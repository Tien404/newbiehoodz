"""Split the original Mai vector into fixed-geometry color masks; originals stay unchanged."""
from pathlib import Path
import copy, hashlib, json, xml.etree.ElementTree as ET
app = Path(__file__).resolve().parents[1]
source = app / 'assets/about-us/microphone-mai.svg'
root = ET.parse(source).getroot()
ET.register_namespace('', 'http://www.w3.org/2000/svg')
manifest = []
for index, original in enumerate(list(root)[1:]):
    color = next(n.get('fill') for n in original.iter() if n.get('fill'))
    svg = copy.deepcopy(root)
    svg.set('viewBox', '0 2547 153 246')
    svg.set('height', '328')
    for node in list(svg)[1:]: svg.remove(node)
    svg.append(copy.deepcopy(original))
    target = app / f'public/about-us/microphone-mask-{index}.svg'
    ET.ElementTree(svg).write(target, encoding='utf-8', xml_declaration=True)
    manifest.append({'file': target.name, 'source': 'assets/about-us/microphone-mai.svg', 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'source_group_index': index, 'original_fill': color, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'method': 'Original paths/clips and paint order; extended lower crop to include complete star.'})
(app / 'assets/about-us/microphone-masks.json').write_text(json.dumps(manifest, indent=2)+'\n')
