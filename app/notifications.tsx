'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
export default function Notifications({game}:{game:string}){
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[supported,setSupported]=useState(true);
 async function post(body:any){const r=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game,...body})});const d:any=await r.json();if(!r.ok)throw Error(d.error);return d;}
 useEffect(()=>{let active=true;setEnabled(false);setMessage('');const ok='serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;setSupported(ok);if(ok)navigator.serviceWorker.getRegistration('/').then(async reg=>{const sub=await reg?.pushManager.getSubscription();if(sub&&active){await post({op:'subscribe',subscription:sub.toJSON()});if(active)setEnabled(true);}}).catch(()=>{if(active)setMessage('Enable notifications to reconnect this phone.');});return()=>{active=false;};},[game]);
 async function enable(){setBusy(true);setMessage('');try{
 // Permission is requested directly from the tap, including on iOS Home Screen.
 if(await Notification.requestPermission()!=='granted')throw Error('Notifications are blocked. Allow them in your browser or phone settings.');
 const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready;
 const r=await fetch('/api/push');const d:any=await r.json();if(!r.ok||!d.publicKey)throw Error(d.error||'Notifications are not configured yet.');
 const key=Uint8Array.from(atob(d.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const sub=await reg.pushManager.getSubscription()??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await post({op:'subscribe',subscription:sub.toJSON()});setEnabled(true);setMessage('Enabled for this game on this phone. Use Test alert to check delivery.');
 }catch(e:any){setMessage(e.message);}finally{setBusy(false);}}
 async function action(test:boolean){setBusy(true);try{const reg=await navigator.serviceWorker.getRegistration('/');const sub=await reg?.pushManager.getSubscription();if(!sub)throw Error('Enable notifications again.');await post(test?{op:'test',subscription:sub.toJSON()}:{op:'remove',endpoint:sub.endpoint});if(!test){await sub.unsubscribe();setEnabled(false);}setMessage(test?'Test alert sent. Check your notifications.':'Notifications disabled on this phone.');}catch(e:any){setMessage(e.message);}finally{setBusy(false);}}
 return <section className="notification-panel"><h3>Game notifications</h3><p>Get alerts for incoming questions, answers and curses, even when your phone is locked.</p><p className="small">iPhone: open in Safari, choose Share → Add to Home Screen, then open that icon and enable notifications. Android: use Chrome and allow notifications.</p>{supported?<div className="row">{enabled?<><Button disabled={busy} onClick={()=>action(true)}>Test alert</Button><Button disabled={busy} variant="outline" onClick={()=>action(false)}>Turn off</Button></>:<Button disabled={busy} onClick={enable}>{busy?'Enabling…':'Enable notifications'}</Button>}</div>:<p>Install from Safari on iPhone, or open in Chrome on Android to enable alerts.</p>}{message&&<p role="status">{message}</p>}</section>;
}
