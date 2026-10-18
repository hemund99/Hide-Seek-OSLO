"""Use surveyed railway alignments instead of scheduled stop-to-stop chords."""
import datetime
import json
from pathlib import Path
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from polyline import encode

SOURCE = 'https://wfs.geonorge.no/skwms1/wfs.banenettverk'
BOUNDS = [59.75, 10.45, 60.05, 11.05]
NS = {'app': 'http://skjema.geonorge.no/SOSI/produktspesifikasjon/Banenettverk/1.0',
      'gml': 'http://www.opengis.net/gml/3.2'}

def clip_segment(a, b, bounds=BOUNDS):
    """Clip an individual segment; never join separate entries into the area."""
    south, west, north, east = bounds
    start, end = 0.0, 1.0
    dy, dx = b[0] - a[0], b[1] - a[1]
    for p, q in [(-dx, a[1]-west), (dx, east-a[1]),
                 (-dy, a[0]-south), (dy, north-a[0])]:
        if p == 0:
            if q < 0: return None
        else:
            ratio = q / p
            if p < 0: start = max(start, ratio)
            else: end = min(end, ratio)
            if start > end: return None
    return (a[0]+start*dy, a[1]+start*dx), (a[0]+end*dy, a[1]+end*dx)

def clipped_paths(points):
    current = []
    for a, b in zip(points, points[1:]):
        clipped = clip_segment(a, b)
        if clipped is None:
            if len(current) > 1: yield current
            current = []
            continue
        a, b = [tuple(round(v*100000) for v in point) for point in clipped]
        if current and current[-1] != a:
            if len(current) > 1: yield current
            current = []
        if not current: current.append(a)
        if current[-1] != b: current.append(b)
    if len(current) > 1: yield current

def build_geometry(xml):
    root = ET.fromstring(xml)
    paths, seen = [], set()
    features = root.findall('.//app:Banelenke', NS)
    if len(features) >= 5000: raise ValueError('WFS response may be truncated')
    for feature in features:
        # In-use lines with passenger traffic; omit planned and freight-only links.
        if feature.findtext('.//app:banestatus', namespaces=NS) != 'I': continue
        if feature.findtext('.//app:baneformål', namespaces=NS) != 'B': continue
        for line in feature.findall('.//gml:LineString', NS):
            if line.get('srsName') != 'urn:ogc:def:crs:OGC:1.3:CRS84':
                raise ValueError('Unexpected railway coordinate order')
            raw = [float(v) for v in line.findtext('gml:posList', namespaces=NS).split()]
            points = [(lat, lng) for lng, lat in zip(raw[::2], raw[1::2])]
            for path in clipped_paths(points):
                key = tuple(path)
                if key in seen or tuple(reversed(path)) in seen: continue
                seen.add(key)
                paths.append({'id':feature.get('{'+NS['gml']+'}id'),
                              'name':feature.findtext('.//app:banenavn', namespaces=NS),
                              'points':encode(path)})
    if not paths: raise ValueError('No operational passenger railway geometry returned')
    return {'source':SOURCE, 'provider':'Bane NOR', 'license':'NLOD',
            'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'bounds':BOUNDS, 'paths':paths}

def main():
    params={'service':'WFS','version':'2.0.0','request':'GetFeature',
            'typeNames':'app:Banelenke','srsName':'urn:ogc:def:crs:OGC:1.3:CRS84',
            'bbox':'10.45,59.75,11.05,60.05,urn:ogc:def:crs:OGC:1.3:CRS84','count':'5000'}
    with urllib.request.urlopen(SOURCE+'?'+urllib.parse.urlencode(params), timeout=90) as response:
        geometry=build_geometry(response.read())
    path=Path('public/transit-rail.json')
    data=json.loads(path.read_text(encoding='utf8'))
    data['geometry']=geometry
    # Line metadata and stops remain from Entur. Never ship their synthetic chords.
    for line in data['lines']:
        for pattern in line['journeyPatterns']: pattern.pop('pointsOnLink', None)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',',':')), encoding='utf8')
    print('Saved',len(geometry['paths']),'Bane NOR railway paths')

if __name__ == '__main__': main()
