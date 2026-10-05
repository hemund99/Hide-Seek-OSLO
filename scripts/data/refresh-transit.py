import urllib.request,json,datetime
q='{lines(transportModes:[metro]){id publicCode name journeyPatterns{id name pointsOnLink{points length} quays{id name latitude longitude stopPlace{id name latitude longitude}}}}}'
r=urllib.request.Request('https://api.entur.io/journey-planner/v3/graphql',data=json.dumps({'query':q}).encode(),headers={'Content-Type':'application/json','ET-Client-Name':'oslo-hide-seek-companion'})
d=json.load(urllib.request.urlopen(r,timeout=60))
assert 'errors' not in d,d
lines=[l for l in d['data']['lines'] if l['id'].startswith('RUT:')]
# Use only patterns connecting the advertised termini. Depot trips and special
# short workings must not add misleading line numbers to regular station labels.
for line in lines:
    termini=set(line['name'].split(' - '))
    regular=[p for p in line['journeyPatterns'] if p['quays'] and
             {p['quays'][0]['name'],p['quays'][-1]['name']}==termini]
    assert len(termini)==2 and regular, 'Review changed route: '+line['name']
    line['journeyPatterns']=regular
json.dump({'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'https://api.entur.io/journey-planner/v3/graphql','license':'NLOD','lines':lines},open('public/transit.json','w'),ensure_ascii=False)
print('Saved',len(lines),'lines,',sum(len(l['journeyPatterns']) for l in lines),'route patterns')
