"""Clip route geometry to the Oslo map area and deduplicate local patterns."""
import json
from polyline import decode, encode
def inside(p):return 5975000<=p[0]<=6005000 and 1045000<=p[1]<=1105000
for mode in ['tram','bus','rail']:
    path='public/transit-'+mode+'.json';data=json.load(open(path,encoding='utf8'))
    for line in data['lines']:
        patterns=[];seen=set()
        for pattern in line['journeyPatterns']:
            if not pattern.get('pointsOnLink'):
                patterns.append(pattern)
                continue
            points=decode(pattern['pointsOnLink']['points']);segments=[];segment=[]
            for i,p in enumerate(points):
                keep=inside(p) or (i>0 and inside(points[i-1])) or (i+1<len(points) and inside(points[i+1]))
                if keep:segment.append(p)
                elif segment:segments.append(segment);segment=[]
            if segment:segments.append(segment)
            for segment in segments:
                if len(segment)<2:continue
                code=encode(segment)
                stops={q['stopPlace']['id']:q for q in pattern['quays'] if q.get('stopPlace')}
                key=(code,tuple(sorted(stops)))
                if key in seen:continue
                seen.add(key);patterns.append({'pointsOnLink':{'points':code},'quays':list(stops.values())})
        line['journeyPatterns']=patterns
    with open(path,'w',encoding='utf8') as f:json.dump(data,f,ensure_ascii=False,separators=(',',':'))
    print(mode,len(json.dumps(data)), 'bytes')
