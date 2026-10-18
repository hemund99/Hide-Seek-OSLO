"""Entur scheduled networks in the Oslo play area; no realtime service claims."""
import json, urllib.request, datetime, time
URL='https://api.entur.io/journey-planner/v3/graphql'
def query(q):
    req=urllib.request.Request(URL,data=json.dumps({'query':q}).encode(),headers={'Content-Type':'application/json','ET-Client-Name':'hemund-oslo-hide-seek'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req,timeout=90) as r: d=json.load(r)
            break
        except Exception:
            if attempt==3: raise
            time.sleep(2**attempt)
    if d.get('errors'): raise ValueError(d['errors'])
    return d['data']
def inside(q):
    return q.get('latitude') is not None and q.get('longitude') is not None and 59.75<=q['latitude']<=60.05 and 10.45<=q['longitude']<=11.05
lines=query('{lines(transportModes:[tram,bus,rail]){id publicCode name transportMode}}')['lines']
lines=[l for l in lines if (l['id'].startswith('RUT:') and l['transportMode'] in ['tram','bus']) or l['transportMode']=='rail']
output={m:[] for m in ['tram','bus','rail']}
for start in range(0,len(lines),12):
    batch=lines[start:start+12]
    q='{'+''.join('l'+str(i)+':line(id:'+json.dumps(l['id'])+'){journeyPatterns{pointsOnLink{points} quays{id name latitude longitude stopPlace{id name latitude longitude}}}}' for i,l in enumerate(batch))+'}'
    try: data=query(q)
    except Exception:
        data={}
        for i,l in enumerate(batch):
            one='{line(id:'+json.dumps(l['id'])+'){journeyPatterns{pointsOnLink{points} quays{id name latitude longitude stopPlace{id name latitude longitude}}}}}'
            data['l'+str(i)]=query(one)['line']
    for i,line in enumerate(batch):
        patterns=[];seen=set()
        for p in (data.get('l'+str(i)) or {}).get('journeyPatterns',[]):
            if not any(inside(s) for s in p['quays']): continue
            points=(p.get('pointsOnLink') or {}).get('points')
            if not points or points in seen: continue
            seen.add(points)
            patterns.append({'pointsOnLink':{'points':points},'quays':[s for s in p['quays'] if inside(s)]})
        if patterns: output[line['transportMode']].append({**line,'journeyPatterns':patterns})
    print('Fetched',min(start+12,len(lines)),'/',len(lines),flush=True)
for mode,items in output.items():
    assert items,mode
    with open('public/transit-'+mode+'.json','w',encoding='utf8') as f: json.dump({'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':URL,'license':'NLOD','bounds':[59.75,10.45,60.05,11.05],'lines':items},f,ensure_ascii=False,separators=(',',':'))
    print(mode,len(items),'lines')

# Keep the shipped phone assets bounded to the play area.
import runpy
runpy.run_path('scripts/data/compact-networks.py')

# Railway service patterns may contain synthetic station-to-station chords.
# Always replace those with the physical railway network before publishing.
runpy.run_path('scripts/data/refresh-rail-geometry.py', run_name='__main__')
