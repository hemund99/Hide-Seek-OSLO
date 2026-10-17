"""Regression: special/depot patterns must not leak into regular line labels."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'public/transit.json').read_text(encoding='utf-8'))
stations={}
for line in data['lines']:
    ends=set(line['name'].split(' - '))
    assert line['journeyPatterns']
    for pattern in line['journeyPatterns']:
        assert {pattern['quays'][0]['name'],pattern['quays'][-1]['name']}==ends
        for quay in pattern['quays']:
            stations.setdefault(quay['name'],set()).add(line['publicCode'])
for station, expected in {
    'Avløs':{'3'}, 'Mortensrud':{'3'}, 'Sinsen':{'4','5'},
    'Ryen':{'1','4'}, 'Manglerud':{'1','4'}, 'Sognsvann':{'5'},
    'Løren':{'4'}, 'Hasle':{'5'}, 'Østerås':{'2'},
    'Frognerseteren':{'1'}, 'Jernbanetorget':set('12345'),
}.items():
    assert stations[station]==expected,(station,stations[station],expected)
print('PASS: regular routes and 11 station-to-line regressions')
