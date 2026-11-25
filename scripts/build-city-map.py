"""Render published ROB RUN geometry as a locally served SVG city plan.

Only JSON geometry is read; no third-party website JavaScript is executed.
"""
import json
import re
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://robrun.fun/js/data-start-en.js'
raw = urllib.request.urlopen(SOURCE, timeout=30).read().decode()
source = json.JSONDecoder().raw_decode(raw[raw.index('{'):])[0]
bounds = dict(minX=-730, maxX=700, minZ=-280, maxZ=700)
width = 1200
scale = (width - 40) / (bounds['maxX'] - bounds['minX'])
height = (bounds['maxZ'] - bounds['minZ']) * scale + 40
# Local visual styling. Every coastline, road and building path is source geometry.
colors = {
    'sea': '#17363e', 'sand': '#817350', 'ground': '#3c4b3d',
    'decor': '#586347', 'road_outline': '#1c2426', 'road_main': '#8b9290',
    'road_minor': '#737b77', 'road_side': '#636d65', 'marking': '#e3d6a3',
    'monorail': '#a89e96', 'pool': '#4cabc1', 'buildings': '#c4ae88',
}
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
       '<title>Looty Bay · ROB RUN</title>',
       '<desc>Stadtplan aus veröffentlichten ROB-RUN-Spielgeometrien. Küsten, Straßen und Gebäude aus robrun.fun; Spielmaterial © Kefir. Eigene Darstellung für SICK CLAN.</desc>',
       f'<rect width="{width}" height="{height}" fill="#17363e"/>',
       f'<g transform="matrix({scale} 0 0 {scale} {20-bounds["minX"]*scale} {20+bounds["maxZ"]*scale})">']
counts = {}
for layer in source['layers']:
    kind, path = layer['kind'], layer['d']
    if kind not in colors:
        continue
    if re.search(r'[^MLZ0-9eE.,+\s-]', path):
        raise ValueError('Unexpected geometry format')
    svg.append(f'<path fill="{colors[kind]}" d="{escape(path)}"/>')
    counts[kind] = counts.get(kind, 0) + 1
svg.extend(['</g>', '</svg>'])
(ROOT / 'assets/looty-bay-map.svg').write_text('\n'.join(svg) + '\n')
file = ROOT / 'data/map-city.json'
city = json.loads(file.read_text())
city.update(bounds=bounds, width=width, height=height, image='assets/looty-bay-map.svg',
            attribution='Stadtplan und Positionen aus veröffentlichten ROB-RUN-Spielgeometrien · Datenquelle Voorhu / robrun.fun · Spielmaterial © Kefir · Darstellung SICK CLAN.')
file.write_text(json.dumps(city, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(dict(width=width, height=height, layers=counts)))
