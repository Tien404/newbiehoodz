"""Check generated metadata artifacts without requiring the real production domain."""
import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from PIL import Image
parser = argparse.ArgumentParser(); parser.add_argument('--origin'); args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
class Head(HTMLParser):
    def __init__(self): super().__init__(); self.meta={}; self.links={}; self.structured=[]; self.in_json=False
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=='meta': self.meta[attrs.get('name',attrs.get('property'))]=attrs.get('content')
        if tag=='link': self.links[attrs.get('rel')]=attrs.get('href')
        if tag=='script' and attrs.get('type')=='application/ld+json': self.in_json=True
    def handle_data(self,data):
        if self.in_json:self.structured.append(json.loads(data))
    def handle_endtag(self,tag):
        if tag=='script':self.in_json=False
results=[]; descriptions=set()
for route,file in [('/', 'index.html'),('/cheatsheet','cheatsheet.html'),('/about-us','about-us.html'),('/lock-in','lock-in.html'),('/local-bites','local-bites.html'),('/side-quests','side-quests.html')]:
    content=(root/'out'/file).read_text(); head=Head(); head.feed(content); descriptions.add(head.meta['description']); assert head.meta['twitter:card']=='summary'
    if args.origin:
        expected=urljoin(args.origin,route); assert head.links['canonical'].rstrip('/')==expected.rstrip('/'); assert 'noindex' not in head.meta['robots']; assert len(head.structured)==1
        assert head.meta['og:image']==urljoin(args.origin,'/brand/social-card.png'); assert head.meta['og:image:width']=='600'; assert head.meta['og:image:height']=='315'
    else:
        assert 'canonical' not in head.links and not head.structured; assert 'noindex' in head.meta['robots']; assert 'seo-validation.invalid.test' not in content
    results.append({'route':route,'passed':True})
assert len(descriptions)==6
assert Image.open(root/'out/brand/social-card.png').size==(600,315)
xml=(root/'out/sitemap.xml').read_text(); assert xml.count('<loc>')==(6 if args.origin else 0)
robots=(root/'out/robots.txt').read_text(); assert ('Allow: /' if args.origin else 'Disallow: /') in robots
report={'testOrigin':args.origin,'pages':results,'socialImageDimensions':[600,315],'sitemapRoutes':xml.count('<loc>'),'passed':True}
(root.parent/f'data/reports/final-qa/seo-export-{"configured" if args.origin else "unconfigured"}.json').write_text(json.dumps(report,indent=2)+'\n');print('Exported SEO passed:', 'configured test origin' if args.origin else 'no-domain preparation build')
