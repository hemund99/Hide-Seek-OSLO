import type {Point} from './game';
export type GpsFix={point:Point;accuracy:number;capturedAt:number};
export function captureGps():Promise<GpsFix>{
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('GPS is unavailable in this browser. Open the site in Safari or Chrome.'));return;}
    navigator.geolocation.getCurrentPosition(position=>{
      if(!Number.isFinite(position.coords.accuracy)||position.coords.accuracy>100){reject(new Error('GPS accuracy is too low. Move outside and try again (100 m accuracy or better is needed).'));return;}
      if(Date.now()-position.timestamp>60000){reject(new Error('GPS returned an old position. Try again.'));return;}
      resolve({point:[position.coords.latitude,position.coords.longitude],accuracy:position.coords.accuracy,capturedAt:position.timestamp});
    },error=>reject(new Error(error.code===1?'Location permission was denied. Allow location access in your browser settings, then try again.':'Could not get a GPS position. Move outside and try again.')),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  });
}
