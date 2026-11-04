"""Authoring-only Home backdrop delivery optimization; preserve all originals."""
import hashlib
import json
import re
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
root = Path(__file__).resolve().parents[1]
source = root / 'public/home/hero-background.webp'
destination = root / 'public/home/hero-background-delivery.webp'
tokens = (root / 'src/styles/tokens.css').read_text()
background = re.search(r'--color-cream-panel:\s*(#[a-fA-F0-9]{6})', tokens)[1]
original = Image.open(source).convert('RGBA')
composite = Image.alpha_composite(Image.new('RGBA', original.size, background), original).convert('RGB')
composite.save(destination, format='WEBP', quality=100, method=6)
delivered = Image.open(destination).convert('RGB')
assert delivered.size == original.size
stats = ImageStat.Stat(ImageChops.difference(composite, delivered))
mean = sum(stats.mean) / 3
assert mean < 0.5
report = {'source': 'public/home/hero-background.webp', 'delivery': 'public/home/hero-background-delivery.webp', 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'deliverySha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'sourceBytes': source.stat().st_size, 'deliveryBytes': destination.stat().st_size, 'size': original.size, 'compositedAgainst': background, 'webpQuality': 100, 'lossless': False, 'meanChannelErrorOutOf255': mean, 'note': 'Maximum-quality RGB delivery variant on the actual static Home background color; original RGBA asset retained. Recreate if that CSS background color changes.'}
(root / 'assets/home/hero-background-delivery.json').write_text(json.dumps(report, indent=2)+'\n')
(root.parent / 'data/reports/final-qa/home-background-optimization.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
