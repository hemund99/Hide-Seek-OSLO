import {authenticatedUserKey} from '@/lib/identity';
import {db} from '@/db/raw';
import {pushConfig,validSubscription,sendPush} from '@/lib/push';
export const dynamic='force-dynamic';
export async function GET(r:Request){if(!await authenticatedUserKey(r))return Response.json({error:'Sign in first.'},{status:401});return Response.json({publicKey:pushConfig().publicKey??null},{headers:{'Cache-Control':'no-store'}});}
export async function POST(r:Request){try{
 const user=await authenticatedUserKey(r);if(!user)return Response.json({error:'Sign in first.'},{status:401});
 if(r.headers.get('origin')&&r.headers.get('origin')!==new URL(r.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
 const text=await r.text();if(text.length>5000)throw Error('Request too large.');const b=JSON.parse(text);
 const m=await db().prepare('SELECT id FROM members WHERE game=? AND user=?').bind(b.game,user).first();if(!m)return Response.json({error:'Join this game first.'},{status:403});
 if(b.op==='remove'){await db().prepare('DELETE FROM push_subscriptions WHERE endpoint=? AND user=?').bind(b.endpoint,user).run();return Response.json({ok:true});}
 if(b.op!=='subscribe'&&b.op!=='test')throw Error('Unknown notification action.');
 if(!validSubscription(b.subscription))throw Error('This browser push service is unsupported. Try Safari, Chrome or Firefox.');
 if(!pushConfig().privateKey)throw Error('Push notifications are not configured yet.');
 if(b.op==='test'){const owned=await db().prepare('SELECT endpoint FROM push_subscriptions WHERE endpoint=? AND user=? AND game=?').bind(b.subscription.endpoint,user,b.game).first();if(!owned)throw Error('Enable notifications first.');const sent=await sendPush(b.subscription,{title:'Notifications are ready',body:'Questions and answers will alert this phone.',url:'/?game='+b.game,tag:'oslo-test'});if(!sent)throw Error('Subscription expired. Enable notifications again.');return Response.json({ok:true});}
 const owned=await db().prepare('SELECT user FROM push_subscriptions WHERE endpoint=?').bind(b.subscription.endpoint).first<{user:string}>();if(owned&&owned.user!==user)throw Error('This browser subscription belongs to another account. Disable browser notifications and try again.');
 const count=await db().prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user=?').bind(user).first<{n:number}>();if(!owned&&(count?.n??0)>=10)throw Error('Too many registered devices. Disable notifications on an old device.');
 await db().prepare('INSERT INTO push_subscriptions(endpoint,game,user,subscription) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET game=excluded.game,subscription=excluded.subscription').bind(b.subscription.endpoint,b.game,user,JSON.stringify(b.subscription)).run();return Response.json({ok:true});
 }catch(e:any){return Response.json({error:e.message||'Could not enable notifications.'},{status:400});}}
