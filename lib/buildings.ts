import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
// Draw geographic building polygons from CARTO's public OpenStreetMap vector tiles.
export function buildingTiles(L:any,onError:()=>void){
 const layer=L.gridLayer({pane:'buildings',tileSize:256,minZoom:14,maxNativeZoom:14,maxZoom:19,keepBuffer:1});
 layer.createTile=function(coords:any,done:any){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.style.width='256px';canvas.style.height='256px';
  fetch(`https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/${coords.z}/${coords.x}/${coords.y}.mvt`,{signal:AbortSignal.timeout(15000)})
   .then(r=>{if(!r.ok)throw new Error('Tile unavailable');return r.arrayBuffer();})
   .then(bytes=>{const buildings=new VectorTile(new PbfReader(new Uint8Array(bytes))).layers.building;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#263239';ctx.globalAlpha=.82;if(buildings)for(let i=0;i<buildings.length;i++){const feature=buildings.feature(i);if(feature.type!==3)continue;ctx.beginPath();for(const ring of feature.loadGeometry()){ring.forEach((p,j)=>{const x=p.x*512/feature.extent,y=p.y*512/feature.extent;if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();}ctx.fill('evenodd');}done(null,canvas);})
   .catch(()=>{onError();done(null,canvas);});
  return canvas;
 };
 return layer;
}
