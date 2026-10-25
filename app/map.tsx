'use client';
import {useEffect,useRef,useState} from 'react';
import type {Game,Point} from '@/lib/game';
import {clueVisual,geometricClues,stationRadius} from '@/lib/clues';
import {defaultNetworks,networkModes,networkInfo,type NetworkMode} from '@/lib/transit';
import {answerMask} from './answer-mask';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Crosshair,MapPin,Pentagon,Undo2,Ruler,Layers,Check,X,Search,Plus,Minus,ArrowUpRight,TrainFront,TramFront,BusFront,Route,Eye,EyeOff,MousePointer2,ChevronRight} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './map-ui.css';

const lineColors:Record<string,string>={'1':'#159bb9','2':'#ee7435','3':'#955c9e','4':'#245da5','5':'#479947'};
const networkIcons={metro:TrainFront,tram:TramFront,bus:BusFront,rail:Route};
type Stop={id:string;name:string;latitude:number;longitude:number;lines:string[];mode:NetworkMode};
type MapProps={game:Game|null;locations:any[];act:(op:string,b?:any)=>Promise<any>;hider:boolean;host:boolean;theme?:'dark'|'light'};
function decode(s:string):Point[]{let i=0,lat=0,lng=0;const result:Point[]=[];while(i<s.length){const read=()=>{let shift=0,r=0,b;do{b=s.charCodeAt(i++)-63;r|=(b&31)<<shift;shift+=5;}while(b>=32);return r&1?~(r>>1):r>>1;};lat+=read();lng+=read();result.push([lat/1e5,lng/1e5]);}return result;}

function Compass({small=false}:{small?:boolean}){
 return <svg className={small?'map-compass small':'map-compass'} viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="20" stroke="currentColor" strokeOpacity=".2"/><circle cx="24" cy="24" r="13" stroke="currentColor" strokeOpacity=".12" strokeDasharray="2 4"/><path d="M24 3V8M24 40V45M3 24H8M40 24H45" stroke="currentColor" strokeOpacity=".4"/><path d="M24 10L30 30L24 26L18 30Z" fill="var(--primary, #ff815a)"/><path d="M24 26L30 30L24 38L18 30Z" fill="currentColor" opacity=".45"/><circle cx="24" cy="24" r="2" fill="var(--surface, #121f2c)"/></svg>;
}

export default function GameMap({game,locations,act,hider,host,theme='dark'}:MapProps){
 const container=useRef<HTMLDivElement>(null),map=useRef<any>(null),leaf=useRef<any>(null),overlay=useRef<any>(null),draftLayer=useRef<any>(null),transit=useRef<any>(null),base=useRef<any>(null);
 const networkLayers=useRef<Partial<Record<NetworkMode,any>>>({});
 const reducedMotion=useRef(false);
 const [ready,setReady]=useState(false),[tool,setTool]=useState('pan'),[points,setPoints]=useState<Point[]>([]),[label,setLabel]=useState('Ruled out'),[radius,setRadius]=useState(1000),[error,setError]=useState('');
 const [stationSearch,setStationSearch]=useState(''),[stations,setStations]=useState<Stop[]>([]),[stamp,setStamp]=useState(''),[plan,setPlan]=useState(true),[showExclusions,setShowExclusions]=useState(true),[layersOpen,setLayersOpen]=useState(false);
 const [visibleNetworks,setVisibleNetworks]=useState<Record<NetworkMode,boolean>>({metro:true,tram:true,bus:true,rail:true});
 const [networkCounts,setNetworkCounts]=useState<Partial<Record<NetworkMode,number>>>({});
 const [viewport,setViewport]=useState({lat:59.925,lng:10.75,zoom:12});
 const current=useRef({tool,visibleNetworks});current.current={tool,visibleNetworks};
 const enabled=game?.networks??defaultNetworks;
 const enabledModes=networkModes.filter(mode=>enabled[mode]);
 const visibleCount=enabledModes.filter(mode=>visibleNetworks[mode]).length;

 useEffect(()=>{
  let canceled=false,resizeObserver:ResizeObserver|undefined;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionChange=()=>{reducedMotion.current=media.matches;};motionChange();media.addEventListener('change',motionChange);
  import('leaflet').then(mod=>{
   if(canceled||!container.current)return;
   const L=mod.default;leaf.current=L;
   const m=L.map(container.current,{zoomControl:false,zoomAnimation:!media.matches,fadeAnimation:!media.matches,markerZoomAnimation:!media.matches}).setView([59.925,10.75],12);map.current=m;
   L.control.scale({imperial:false,position:'bottomleft'}).addTo(m);
   base.current=L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png',{attribution:'&copy; <a href="https://www.kartverket.no/">Kartverket</a>',maxZoom:19,maxNativeZoom:18}).on('tileerror',()=>setError('Map tiles could not load. Check your connection.')).addTo(m);
   overlay.current=L.layerGroup().addTo(m);draftLayer.current=L.layerGroup().addTo(m);transit.current=L.layerGroup().addTo(m);
   m.createPane('clueMask');m.getPane('clueMask')!.style.zIndex='440';m.getPane('clueMask')!.style.pointerEvents='none';
   m.createPane('metroStations');m.getPane('metroStations')!.style.zIndex='450';
   m.on('click',(e:any)=>{if(current.current.tool!=='pan')setPoints(x=>[...x,[e.latlng.lat,e.latlng.lng] as Point]);});
   m.on('moveend zoomend',()=>{const p=m.getCenter();setViewport({lat:p.lat,lng:p.lng,zoom:m.getZoom()});});
   resizeObserver=new ResizeObserver(()=>m.invalidateSize({pan:false}));resizeObserver.observe(container.current);setReady(true);
  });
  return()=>{canceled=true;resizeObserver?.disconnect();media.removeEventListener('change',motionChange);map.current?.remove();map.current=null;};
 },[]);

 const networkKey=JSON.stringify(enabled);
 useEffect(()=>{
  if(!ready||!map.current)return;
  let canceled=false;const L=leaf.current,m=map.current;transit.current.clearLayers();networkLayers.current={};setStations([]);setNetworkCounts({});setStamp('');
  const networks=JSON.parse(networkKey),markers:any[]=[],allStops:Stop[]=[],dates:string[]=[];
  const controller=new AbortController(),railCredit='Railway geometry: &copy; <a href="https://www.banenor.no/">Bane NOR</a> (NLOD)';
  const resize=()=>markers.forEach(({marker,target,mode,group})=>{const radius=stationRadius(m.getZoom())*(mode==='bus'?.7:1);marker.setRadius(radius);target.setRadius(Math.max(12,radius));if(mode==='bus'&&m.getZoom()<14){group.removeLayer(marker);group.removeLayer(target);}else{group.addLayer(marker);group.addLayer(target);}});
  m.on('zoomend',resize);
  networkModes.filter(mode=>networks[mode]).forEach(mode=>{const group=L.layerGroup();networkLayers.current[mode]=group;if(current.current.visibleNetworks[mode])transit.current.addLayer(group);});
  Promise.all(networkModes.filter(mode=>networks[mode]).map(async mode=>{
   try{
    const r=await fetch(mode==='metro'?'/transit.json?v=regular-stations-2':'/transit-'+mode+'.json?v=rail-tracks-2',{signal:controller.signal});if(!r.ok)throw Error();
    const d:any=await r.json();if(canceled)return;
    dates.push(d.fetchedAt.slice(0,10));setStamp([...dates].sort()[0]);
    const places=new Map<string,any>(),group=networkLayers.current[mode];
    if(mode==='rail'){
     if(!d.geometry?.paths?.length)throw Error('Railway track geometry is missing.');
     m.attributionControl.addAttribution(railCredit);
     d.geometry.paths.forEach((path:any)=>L.polyline(decode(path.points),{color:networkInfo.rail.color,weight:3.5,opacity:.9,interactive:false}).addTo(group));
    }
    d.lines.forEach((line:any)=>{const seen=new Set();line.journeyPatterns.forEach((jp:any)=>{
     if(mode!=='rail'&&jp.pointsOnLink?.points&&!seen.has(jp.pointsOnLink.points)){seen.add(jp.pointsOnLink.points);L.polyline(decode(jp.pointsOnLink.points),{color:mode==='metro'?(lineColors[line.publicCode]||networkInfo[mode].color):networkInfo[mode].color,weight:mode==='bus'?2:3.5,opacity:mode==='bus'?.55:.9,interactive:false}).addTo(group);}
     jp.quays.forEach((q:any)=>{const stop=q.stopPlace||q;if(!places.has(stop.id))places.set(stop.id,{...stop,lines:new Set()});places.get(stop.id).lines.add(line.publicCode);});
    });});
    places.forEach(stop=>{
     const lines=([...stop.lines] as string[]).sort(),node=document.createElement('div');node.textContent=stop.name+' · '+networkInfo[mode].label+' '+lines.join(', ');
     const marker=L.circleMarker([stop.latitude,stop.longitude],{pane:'metroStations',radius:stationRadius(m.getZoom())*(mode==='bus'?.7:1),color:networkInfo[mode].color,weight:2,fillColor:'#f9fcff',fillOpacity:1,interactive:false}).addTo(group);
     const target=L.circleMarker([stop.latitude,stop.longitude],{pane:'metroStations',radius:12,stroke:false,fillOpacity:0}).bindTooltip(node,{direction:'top',offset:[0,-8]}).bindPopup(node.cloneNode(true) as HTMLElement).addTo(group);
     target.getElement()?.setAttribute('aria-label',node.textContent!);markers.push({marker,target,mode,group});allStops.push({...stop,id:mode+':'+stop.id,lines,mode});
    });
    resize();setStations([...allStops]);setNetworkCounts(counts=>({...counts,[mode]:places.size}));
   }catch{if(!canceled)setError(networkInfo[mode].label+' network could not load. Reload to retry.');}
  }));
  return()=>{canceled=true;controller.abort();m.off('zoomend',resize);m.attributionControl.removeAttribution(railCredit);};
 },[ready,networkKey]);

 useEffect(()=>{if(!ready||!map.current)return;networkModes.forEach(mode=>{const group=networkLayers.current[mode];if(group){if(visibleNetworks[mode])transit.current.addLayer(group);else transit.current.removeLayer(group);}});},[ready,visibleNetworks,networkKey]);

 useEffect(()=>{
  if(!ready||!map.current)return;
  const L=leaf.current,group=overlay.current;group.clearLayers();const labelStack=new Map<string,number>();
  (game?.marks||[]).forEach(mark=>{
   const opts={color:mark.kind==='boundary'?(theme==='dark'?'#a1c5d9':'#173f59'):mark.kind==='exclude'?'#87959f':'#ff815a',fillColor:'#475569',fillOpacity:mark.kind==='exclude'?.32:.04,weight:2,dashArray:mark.kind==='boundary'?'8 6':undefined};
   let layer;if(mark.kind==='circle')layer=L.circle(mark.points[0],{...opts,radius:mark.radius});else if(mark.kind==='pin')layer=L.circleMarker(mark.points[0],{...opts,radius:7,fillOpacity:1});else layer=L.polygon(mark.points,opts);
   const node=document.createElement('div');node.textContent=mark.label;layer.bindTooltip(node).addTo(group);
  });
  locations.forEach(l=>{const t=game?.teams.find(x=>x.id===l.team);if(!t)return;const stale=Date.now()-l.updated>90000;L.circle(l.location.point,{radius:l.location.accuracy,color:t.color,weight:1,fillOpacity:.07,opacity:stale?.3:.7}).addTo(group);const text=document.createElement('div');text.textContent=t.name+' · '+(stale?'last seen ':'updated ')+Math.floor((Date.now()-l.updated)/1000)+'s ago';L.circleMarker(l.location.point,{radius:9,color:'#fff',weight:3,fillColor:t.color,fillOpacity:stale?.4:1}).bindTooltip(text).addTo(group);});
  game?.questions.forEach(q=>{const visual=clueVisual(q),label=document.createElement('div');label.textContent=q.category==='Radar'?'RADAR '+visual.label+' · '+q.title:'THERMOMETER · '+visual.label;if(q.category==='Radar'&&q.start&&q.distance){const key=q.start.join(','),stack=q.status==='answered'?(labelStack.get(key)||0):0;if(q.status==='answered')labelStack.set(key,stack+1);L.circle(q.start,{radius:q.distance,color:visual.color,weight:3,fillOpacity:.06,dashArray:q.status==='answered'?undefined:'6 5'}).bindTooltip(label,{permanent:q.status==='answered',direction:'center',offset:[0,stack*38],className:'map-clue-label clue-'+visual.tone}).addTo(group);}if(q.start&&q.end){L.polyline([q.start,q.end],{color:visual.color,weight:4,dashArray:'6 4'}).bindTooltip(label,{permanent:q.status==='answered',className:'map-clue-label clue-'+visual.tone}).addTo(group);L.circleMarker(q.start,{radius:5,color:visual.color}).bindTooltip('GPS start').addTo(group);L.circleMarker(q.end,{radius:7,color:visual.color,fillOpacity:1}).bindTooltip('GPS end').addTo(group);}});
 },[ready,game,locations,theme]);

 useEffect(()=>{if(!ready||!map.current)return;const L=leaf.current;draftLayer.current.clearLayers();points.forEach(p=>L.circleMarker(p,{radius:5,color:'#ff815a'}).addTo(draftLayer.current));if(points.length>1)(tool==='measure'?L.polyline(points,{color:'#ff815a'}):L.polygon(points,{color:'#ff815a',fillOpacity:.12})).addTo(draftLayer.current);if(tool==='circle'&&points[0])L.circle(points[0],{radius,color:'#ff815a',fillOpacity:.1}).addTo(draftLayer.current);},[ready,points,tool,radius]);
 useEffect(()=>{if(!ready||!map.current)return;base.current.setUrl('https://cache.kartverket.no/v1/wmts/1.0.0/'+(theme==='light'&&plan?'topo':'topograatone')+'/default/webmercator/{z}/{y}/{x}.png');},[plan,ready,theme]);
 const clueKey=JSON.stringify(game?.questions??[]),provenClues=geometricClues(game?.questions??[]).length;
 useEffect(()=>{if(!ready||!map.current||hider||!showExclusions||!provenClues)return;const layer=answerMask(leaf.current,map.current,JSON.parse(clueKey)).addTo(map.current);return()=>{layer.remove();};},[ready,hider,showExclusions,clueKey,provenClues]);

 const choose=(t:string)=>{map.current?.closePopup();setTool(t);setPoints([]);setLayersOpen(false);setLabel(t==='boundary'?'Game boundary':t==='exclude'?'Ruled out':'Map note');};
 function navigate(point:Point,zoom:number){if(!map.current)return;map.current.flyTo(point,zoom,{animate:!reducedMotion.current,duration:.8});}
 function selectStop(stop:Stop){setVisibleNetworks(n=>({...n,[stop.mode]:true}));navigate([stop.latitude,stop.longitude],16);setStationSearch('');}
 async function save(){try{await act('mark',{mark:{kind:tool,points:tool==='circle'||tool==='pin'?points.slice(0,1):points,radius,label}});setPoints([]);setTool('pan');}catch{}}
 const matches=stationSearch.trim()?stations.filter(s=>s.name.toLowerCase().includes(stationSearch.trim().toLowerCase())).slice(0,6):[];
 const tools=[{id:'pan',Icon:MousePointer2,title:'Pan map'},...(!hider&&game?[{id:'exclude',Icon:Pentagon,title:'Cross out area'},{id:'circle',Icon:Crosshair,title:'Radius circle'},{id:'pin',Icon:MapPin,title:'Add note'}]:[]),{id:'measure',Icon:Ruler,title:'Measure distance'},...(host&&game&&['lobby','finished'].includes(game.phase)?[{id:'boundary',Icon:Pentagon,title:'Game boundary'}]:[])];

 return <div className={'map-wrap field-map tool-'+tool} data-map-theme={theme}>
  <div ref={container} className="leaflet-map" aria-label="Interactive Oslo game map"/>
  {!ready&&<div className="map-initializing" role="status"><Compass/><span>Opening Oslo…</span></div>}
  <div className="map-heading" aria-hidden="true"><Compass/><div><span>YOUR FIELD OF PLAY</span><b>Oslo<span className="map-city-dot">.</span></b></div></div>
  <div className="map-search">
   <Search size={18} aria-hidden="true"/>
   <input aria-label="Find a transit stop" aria-controls={stationSearch?'map-search-results':undefined} autoComplete="off" placeholder="Find a station or stop" value={stationSearch} onChange={e=>setStationSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setStationSearch('');if(e.key==='Enter'&&matches[0]){e.preventDefault();selectStop(matches[0]);}}}/>
   {stationSearch?<button className="map-search-clear" aria-label="Clear stop search" onClick={()=>setStationSearch('')}><X size={16}/></button>:<span className="map-search-shortcut" aria-hidden="true"><MapPin size={14}/></span>}
   {stationSearch&&<div className="map-search-results" id="map-search-results"><div className="map-result-heading">TRANSIT STOPS <span>{matches.length?matches.length+' matches':''}</span></div>{matches.length?matches.map(stop=>{const Icon=networkIcons[stop.mode];return <button key={stop.id} onClick={()=>selectStop(stop)}><span className="map-result-icon" style={{color:networkInfo[stop.mode].color}}><Icon size={18}/></span><span><b>{stop.name}</b><small>{networkInfo[stop.mode].label} · {stop.lines.join(' · ')}</small></span><ArrowUpRight size={16}/></button>;}):<p>{stations.length?'No stops found. Try another name.':'Loading enabled transport networks…'}</p>}</div>}
  </div>

  <div className="map-layer-control">
   <button className={'map-layer-trigger '+(layersOpen?'is-open':'')} aria-expanded={layersOpen} aria-controls="map-layer-panel" onClick={()=>{setLayersOpen(!layersOpen);setStationSearch('');}}><Layers size={18}/><span>Layers</span><i>{visibleCount}</i></button>
   {layersOpen&&<section id="map-layer-panel" className="map-layer-panel" aria-label="Map layers"><div className="map-panel-heading"><span>MAKE IT YOUR MAP</span><button aria-label="Close map layers" onClick={()=>setLayersOpen(false)}><X size={16}/></button></div><h3>Transport networks</h3><p>Show or hide the networks in this game.</p>
    <div className="map-network-list">{enabledModes.map(mode=>{const Icon=networkIcons[mode];return <button key={mode} className={visibleNetworks[mode]?'is-on':''} aria-pressed={visibleNetworks[mode]} aria-label={'Show '+networkInfo[mode].label+' on map'} onClick={()=>setVisibleNetworks(n=>({...n,[mode]:!n[mode]}))}><span className="map-network-icon" style={{color:networkInfo[mode].color}}><Icon size={19}/></span><span><b>{networkInfo[mode].label}</b><small>{networkCounts[mode]===undefined?'Loading…':networkCounts[mode]+' stops'}{mode==='bus'&&viewport.zoom<14?' · zoom in':''}</small></span><span className="map-toggle-track" style={visibleNetworks[mode]?{background:networkInfo[mode].color}:undefined}><i/></span></button>;})}{!enabledModes.length&&<p>No transport networks selected for this game.</p>}</div>
    {theme==='light'?<div className="map-basemap"><span>BASE MAP</span><div><button aria-pressed={plan} onClick={()=>setPlan(true)}>Topographic</button><button aria-pressed={!plan} onClick={()=>setPlan(false)}>Greyscale</button></div></div>:<div className="map-night-note"><span className="map-night-dot"/><span>Night map <small>Routes in full colour</small></span></div>}
    <div className="map-data-note"><span>Scheduled routes{stamp?' · '+stamp:''}</span><a href="https://ruter.no/om-oss/prosjekter-og-innovasjon/det-store-t-baneloftet" target="_blank" rel="noreferrer">Check planned closures <ArrowUpRight size={13}/></a></div>
   </section>}
  </div>

  <div className="map-orientation"><span>N</span><Compass small/><button aria-label="Return to Oslo map overview" title="Return to Oslo overview" onClick={()=>navigate([59.925,10.75],12)}><Crosshair size={18}/></button></div>
  <div className="map-zoom" aria-label="Map zoom"><button aria-label="Zoom in" disabled={!ready||viewport.zoom>=19} onClick={()=>map.current?.zoomIn(1,{animate:!reducedMotion.current})}><Plus size={20}/></button><span aria-hidden="true"/><button aria-label="Zoom out" disabled={!ready||viewport.zoom<=map.current?.getMinZoom()} onClick={()=>map.current?.zoomOut(1,{animate:!reducedMotion.current})}><Minus size={20}/></button></div>

  {!hider&&provenClues>0&&<button className={'map-exclusions '+(showExclusions?'is-on':'')} aria-pressed={showExclusions} onClick={()=>setShowExclusions(!showExclusions)} title="Areas ruled out by radar and thermometer answers. GPS uncertainty remains clear.">{showExclusions?<Eye size={16}/>:<EyeOff size={16}/>}<span>Ruled-out areas</span><b>{provenClues}</b></button>}
  <div className="map-tool-dock" role="toolbar" aria-label="Map drawing tools">{tools.map(({id,Icon,title})=><button key={id} aria-label={title} aria-pressed={tool===id} title={title} className={tool===id?'is-active':''} onClick={()=>choose(id)}><Icon size={19}/><span>{title}</span></button>)}</div>
  {tool!=='pan'&&<div className="map-draw-panel"><div className="map-panel-heading"><span>{tool==='measure'?'DISTANCE TOOL':tool==='boundary'?'GAME BOUNDARY':'FIELD NOTES'}</span><button onClick={()=>choose('pan')} aria-label="Close drawing"><X size={17}/></button></div><h3>{tool==='measure'?'Follow your route.':tool==='exclude'?'Narrow the search.':tool==='boundary'?'Set your playing field.':tool==='circle'?'Drop a radius.':'Leave a map note.'}</h3><p>{tool==='measure'?'Tap points on the map to measure.':tool==='exclude'||tool==='boundary'?'Tap around the area. Add at least 3 points.':'Tap a position on the map to begin.'}</p>
   {tool==='measure'&&points.length>1&&<div className="map-measurement"><strong>{(points.slice(1).reduce((sum,p,i)=>sum+map.current.distance(points[i],p),0)/1000).toFixed(2)}<small>km</small></strong><span>Straight-line segments</span></div>}
   {tool!=='measure'&&<><Input aria-label="Map annotation label" value={label} onChange={e=>setLabel(e.target.value)}/>{tool==='circle'&&<label className="map-radius-label">Radius in metres<Input type="number" min="1" max="500000" value={radius} onChange={e=>setRadius(Number(e.target.value))}/></label>}</>}
   <div className="map-draw-actions"><Button variant="outline" disabled={!points.length} onClick={()=>setPoints(p=>p.slice(0,-1))}><Undo2 size={16}/>Undo</Button>{tool!=='measure'?<Button disabled={points.length<(['exclude','boundary'].includes(tool)?3:1)||tool==='circle'&&(!Number.isFinite(radius)||radius<1||radius>500000)} onClick={save}><Check size={16}/>Save note</Button>:<span>{points.length} points</span>}</div>
  </div>}

  <div className="map-coordinate-readout" aria-hidden="true"><span>MAP CENTRE</span>{viewport.lat.toFixed(3)}° N <i/> {viewport.lng.toFixed(3)}° E <ChevronRight size={11}/><span>Z{viewport.zoom}</span></div>
  {error&&<div className="map-error" role="status"><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss map message"><X size={16}/></button></div>}
 </div>;
}
