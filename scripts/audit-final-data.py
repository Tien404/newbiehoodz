"""Read-only reconciliation and bounded HTTP HEAD checks; no credentials or uploads."""
import concurrent.futures
import hashlib
import json
import time
import urllib.error
import urllib.request
from pathlib import Path
root = Path(__file__).resolve().parents[1]
workspace = root.parent
out = workspace / 'data/reports/final-qa'
manifest = json.loads((workspace / 'data/processed/image-manifest.json').read_text())
images = {image['imageId']: image for image in manifest['images']}
assert len(images) == len(manifest['images'])
counts = {}
photos = []
places = []
seen = set()
for file, category in [('cafes', 'lock-in'), ('food', 'local-bites'), ('activities', 'side-quests')]:
    path = root / f'src/content/places/{file}.json'
    records = json.loads(path.read_text())
    counts[category] = {'places': len(records), 'photos': sum(len(record['photos']) for record in records), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    for place in records:
        places.append(place)
        for photo in place['photos']:
            assert photo['id'] not in seen
            seen.add(photo['id'])
            image = images[photo['id']]
            assert image['uploadStatus'] in ('uploaded-verified', 'skipped-unchanged-verified')
            assert image['placeId'] == place['id']
            if image.get('category'): assert image['category'] == category
            assert image['remote']['publicId'] == image['cloudinaryPublicId']
            assert f"/v{image['remote']['version']}/{image['cloudinaryPublicId']}" in photo['src']
            variant = next(variant for variant in image['verification']['variants'] if variant['url'] == photo['src'])
            assert photo['width'] == variant['width'] and photo['height'] == variant['height']
            assert photo['order'] == image['imageOrder']
            assert '/unassigned/' not in photo['src']
            photos.append({'id': photo['id'], 'url': photo['src']})
mapped = {image['imageId'] for image in manifest['images'] if image.get('placeId')}
assert mapped == seen

def head(item):
    started = time.monotonic()
    for attempt in range(3):
        try:
            request = urllib.request.Request(item['url'], method='HEAD', headers={'User-Agent': 'Newbiehood-Final-QA/1.0', 'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8'})
            with urllib.request.urlopen(request, timeout=25) as response:
                return {'id': item['id'], 'status': response.status, 'contentType': response.headers.get('Content-Type'), 'contentLength': response.headers.get('Content-Length'), 'finalUrl': response.url, 'elapsedMs': round((time.monotonic()-started)*1000), 'attempts': attempt+1}
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                return {'id': item['id'], 'status': error.code, 'error': 'HTTP error', 'attempts': attempt+1}
        except Exception as error:
            if attempt == 2: return {'id': item['id'], 'status': None, 'error': type(error).__name__, 'attempts': attempt+1}
        time.sleep(0.5 * (2 ** attempt))

report = {'counts': counts, 'publicPhotos': len(photos), 'verifiedManifestAssets': len(images), 'unassignedExcluded': len(images)-len(mapped), 'exactMappedSetMatch': True, 'checks': []}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    for index, result in enumerate(executor.map(head, photos), 1):
        report['checks'].append(result)
        if index % 100 == 0: print(f'Photo HEAD checks: {index}/{len(photos)}', flush=True)
report['passed'] = sum(row.get('status') == 200 and str(row.get('contentType', '')).startswith('image/') for row in report['checks'])
report['failedOrBlocked'] = [row for row in report['checks'] if row.get('status') != 200 or not str(row.get('contentType', '')).startswith('image/')]
(out / 'data-images.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(f"Public images reachable: {report['passed']}/{len(photos)}; unresolved: {len(report['failedOrBlocked'])}", flush=True)
maps = [{'id': place['id'], 'url': place['mapsUrl']} for place in places]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    checks = list(executor.map(head, maps))
(out / 'maps.json').write_text(json.dumps({'count': len(checks), 'checks': checks, 'note': 'HEAD/redirect reachability only; no geographic pin accuracy or interactive map usability claim'}, ensure_ascii=False, indent=2)+'\n')
print(f"Maps reachable: {sum(row.get('status') == 200 for row in checks)}/{len(checks)}", flush=True)
