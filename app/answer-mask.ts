import type {Asked,Point} from '@/lib/game';
import {distance} from '@/lib/game';
import {excludedBy,geometricClues} from '@/lib/clues';

// Leaflet tiles move/scale with the map, so the mask stays attached to ground
// during gestures. Sampling includes a cell-sized safety margin at boundaries.
export function answerMask(L:any,map:any,questions:Asked[]){
  const clues=geometricClues(questions);
  const Mask=L.GridLayer.extend({
    createTile(coords:any){
      const tile=document.createElement('canvas');tile.width=128;tile.height=128;
      tile.setAttribute('aria-hidden','true');
      const context=tile.getContext('2d')!;context.fillStyle='rgba(65,72,78,0.62)';
      const step=4;
      const point=(x:number,y:number):Point=>{const p=map.unproject([coords.x*128+x,coords.y*128+y],coords.z);return [p.lat,p.lng];};
      for(let y=0;y<128;y+=step)for(let x=0;x<128;x+=step){
        const candidate=point(x+step/2,y+step/2);
        const margin=Math.max(distance(candidate,point(x,y)),distance(candidate,point(x+step,y+step)));
        if(clues.some(q=>excludedBy(q,candidate,margin)))context.fillRect(x,y,step,step);
      }
      return tile;
    }
  });
  return new Mask({pane:'clueMask',tileSize:128,updateWhenIdle:true,keepBuffer:1,maxZoom:19,noWrap:true});
}
