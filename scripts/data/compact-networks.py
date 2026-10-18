"""Clip route geometry to the Oslo map area and deduplicate local patterns."""
import json
def decode(s):
    i=0;lat=0;lng=0;out=[]
    while i<len(s):
        delta=[]
        for _ in range(2):
            value=0;shift=0
            while True:
                b=ord(s[i])-63;i+=1;value|=(b&31)<<shift;shift+=5
                if b<32:break
            delta.append(~(value>>1) if value&1 else value>>1)
        lat+=delta[0];lng+=delta[1];out.append((lat,lng))
    return out
def encode(points):
    previous=(0,0);out=[]
    for point in points:
        for v,p in zip(point,previous):
            delta=v-p;n=~(delta<<1) if delta<0 else delta<<1
            while n>=32:out.append(chr((32|(n&31))+63));n>>=5
            out.append(chr(n+63))
        previous=point
    return ''.join(out)
def inside(p):return 5975000<=p[0]<=6005000 and 1045000<=p[1]<=1105000
for mode in ['tram','bus','rail']:
    path='public/transit-'+mode+'.json';data=json.load(open(path,encoding='utf8'))
    for line in data['lines']:
        patterns=[];seen=set()
        for pattern in line['journeyPatterns']:
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
