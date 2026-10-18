"""Regression: railway tracks must not become station-to-station chords."""
import importlib.util
import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path('scripts/data').resolve()))
from polyline import decode, encode

spec=importlib.util.spec_from_file_location('rail_geometry', 'scripts/data/refresh-rail-geometry.py')
rail=importlib.util.module_from_spec(spec)
spec.loader.exec_module(rail)

points=[(5991000,1075000),(5991100,1074900),(5991200,1074500)]
assert decode(encode(points))==points
assert rail.clip_segment((59.9,10.4),(59.9,10.6))==((59.9,10.45),(59.9,10.6))
assert rail.clip_segment((59.0,10.0),(59.1,10.1)) is None
# Leaving and re-entering the area must produce separate paths, not a connector.
paths=list(rail.clipped_paths([(59.9,10.6),(60.1,10.6),(60.1,10.8),(59.9,10.8)]))
assert len(paths)==2

data=json.loads(Path('public/transit-rail.json').read_text(encoding='utf8'))
geometry=data['geometry']
assert geometry['provider']=='Bane NOR' and geometry['license']=='NLOD'
assert geometry['source']=='https://wfs.geonorge.no/skwms1/wfs.banenettverk'
vertices=[]
for path in geometry['paths']:
    assert path['id'].startswith('banelenke.')
    points=decode(path['points'])
    assert len(points)>=2
    assert all(5975000<=lat<=6005000 and 1045000<=lng<=1105000 for lat,lng in points)
    vertices.extend(points)
assert len(vertices)>10000, 'Track curves were replaced with sparse station connections'
for name,lat,lng in [('Oslo S',59.910,10.754),('Nationaltheatret',59.915,10.731),('Skøyen',59.922,10.679)]:
    nearest=min(math.hypot((a/1e5-lat)*111200,(b/1e5-lng)*55800) for a,b in vertices)
    assert nearest<200, (name,nearest)
assert len(data['lines'])==26, 'Entur station and service metadata lost'
assert all('pointsOnLink' not in p for line in data['lines'] for p in line['journeyPatterns']), 'Synthetic railway chords must not be shipped'
print('PASS: Bane NOR track geometry, curves, clipping, station coverage and removal of synthetic service chords')
