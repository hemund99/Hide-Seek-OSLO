import webpush from 'web-push';
import {env} from 'cloudflare:workers';
import {db} from '@/db/raw';
import type {Game} from './game';
export function pushConfig(){const e=env as unknown as Record<string,string>;return {publicKey:e.PUSH_PUBLIC_KEY,privateKey:e.PUSH_PRIVATE_KEY,subject:'https://oslo-hide-seek.hemund99.chatgpt.site'};}
export function validSubscription(s:any){
 try{const u=new URL(s.endpoint);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&s.endpoint.length<2048&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h))&&/^[A-Za-z0-9_-]{87}$/.test(s.keys.p256dh)&&/^[A-Za-z0-9_-]{22}$/.test(s.keys.auth);}catch{return false;}
}
export async function sendPush(subscription:any,payload:object){
 if(!validSubscription(subscription))throw Error('Unsupported push subscription.');
 const config=pushConfig();if(!config.publicKey||!config.privateKey)throw Error('Push notifications are not configured yet.');
 const request=webpush.generateRequestDetails(subscription,JSON.stringify(payload),{vapidDetails:config,TTL:300,urgency:'high'});
 const r=await fetch(request.endpoint,{method:'POST',headers:request.headers as HeadersInit,body:new Uint8Array(request.body!),redirect:'error',signal:AbortSignal.timeout(6000)});
 if(r.status===404||r.status===410){await db().prepare('DELETE FROM push_subscriptions WHERE endpoint=?').bind(subscription.endpoint).run();return false;}
 if(!r.ok)throw Error('Push provider rejected delivery ('+r.status+').');return true;
}
export async function notifyGame(g:Game,op:string,actor:string){
 if(!['ask','thermoEnd','answer','veto'].includes(op))return;
 const question=op==='ask'||op==='thermoEnd';
 const rows=await db().prepare('SELECT p.subscription FROM push_subscriptions p JOIN members m ON m.game=p.game AND m.user=p.user WHERE p.game=? AND p.user<>? AND '+(question?'m.team=?':'m.team<>?')).bind(g.id,actor,g.hider).all<{subscription:string}>();
 const title=question?(op==='thermoEnd'?'Thermometer ready to answer':'New question received'):'Answer received';
 // Lock-screen payloads contain no GPS positions, answers, or private card data.
 const payload={title,body:'Open OSLO / Hide + Seek to view the '+(question?'question.':'answer.'),url:'/?game='+g.id,tag:g.id+'-'+g.round+'-'+g.questions.at(-1)?.id+'-'+op};
 for(let i=0;i<rows.results.length;i+=10)await Promise.allSettled(rows.results.slice(i,i+10).map(async row=>{try{await sendPush(JSON.parse(row.subscription),payload);}catch{console.error('Push delivery failed; game action remains saved.');}}));
}
