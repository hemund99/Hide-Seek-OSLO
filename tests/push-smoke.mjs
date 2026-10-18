import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createECDH,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
import webpush from 'web-push';
const temp=fs.mkdtempSync(path.resolve('outputs/push-test-'));
const sql=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')))sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
globalThis.__db={prepare(query){return {bind(...args){return {async first(){return sql.prepare(query).get(...args);},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}};}};}};}};
const keys=webpush.generateVAPIDKeys();globalThis.__env={PUSH_PUBLIC_KEY:keys.publicKey,PUSH_PRIVATE_KEY:keys.privateKey};
function compile(file,name){let source=fs.readFileSync(file,'utf8').replace("import {env} from 'cloudflare:workers';","const env=globalThis.__env;").replace("import {db} from '@/db/raw';","const db=()=>globalThis.__db;").replace("from '@/lib/identity'","from './identity.mjs'").replace("from '@/lib/push'","from './push.mjs'");fs.writeFileSync(path.join(temp,name),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}
compile('lib/push.ts','push.mjs');compile('lib/identity.ts','identity.mjs');compile('app/api/push/route.ts','route.mjs');
const {notifyGame,sendPush,validSubscription}=await import(pathToFileURL(path.join(temp,'push.mjs')));
const {POST,GET}=await import(pathToFileURL(path.join(temp,'route.mjs')));
const client=createECDH('prime256v1');client.generateKeys();
const sub=id=>({endpoint:'https://fcm.googleapis.com/fcm/send/'+id,keys:{p256dh:client.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}});
const h=sub('hider'),s=sub('seeker');
for(const [user,team] of [['h','hide'],['s','seek']])sql.prepare('INSERT INTO members(id,game,user,team) VALUES(?,?,?,?)').run(user,'AAAAAAAAAAAA',user,team);
async function post(user,body,status=200){const r=await POST(new Request('https://local.test/api/push',{method:'POST',headers:{'content-type':'application/json',...(user?{'oai-authenticated-user-id':user}:{})},body:JSON.stringify({game:'AAAAAAAAAAAA',...body})}));assert.equal(r.status,status,await r.clone().text());return r;}
const actualFetch=globalThis.fetch;const sent=[];globalThis.fetch=async(url,options)=>{sent.push({url,options});return new Response('',{status:201});};
try{
 await post('',{op:'subscribe',subscription:s},401);await post('outsider',{op:'subscribe',subscription:s},403);
 assert.equal(validSubscription({...s,endpoint:'https://127.0.0.1/internal'}),false);assert.equal(validSubscription({...s,endpoint:'https://fcm.googleapis.com.evil.test/push'}),false);
 await post('s',{op:'subscribe',subscription:{...s,endpoint:'http://fcm.googleapis.com/push'}},400);
 await post('h',{op:'subscribe',subscription:h});await post('s',{op:'subscribe',subscription:s});await post('s',{op:'subscribe',subscription:h},400);
 const g={id:'AAAAAAAAAAAA',hider:'hide',round:1,questions:[{id:'q1'}]};
 await notifyGame(g,'ask','s');assert.equal(sent.at(-1).url,h.endpoint);assert.equal(sent.length,1);
 assert.equal(sent[0].options.headers['Content-Encoding'],'aes128gcm');assert.ok(sent[0].options.headers.Authorization.includes('vapid'));assert.ok(sent[0].options.body.length>50);
 await notifyGame(g,'answer','h');assert.equal(sent.at(-1).url,s.endpoint);assert.equal(sent.length,2);
 await notifyGame(g,'location','s');assert.equal(sent.length,2);
 await post('s',{op:'test',subscription:h},400);await post('s',{op:'test',subscription:s});assert.equal(sent.length,3);
 await post('s',{op:'remove',endpoint:h.endpoint});assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n,2);
 globalThis.fetch=async()=>new Response('',{status:410});assert.equal(await sendPush(s,{}),false);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n,1);
 const config=await GET(new Request('https://local.test',{headers:{'oai-authenticated-user-id':'s'}}));assert.deepEqual(await config.json(),{publicKey:keys.publicKey});
 console.log('PASS: push permissions, endpoint validation, encrypted requests, correct recipients, test alerts, expired subscriptions and secret filtering.');
}finally{globalThis.fetch=actualFetch;sql.close();if(!temp.startsWith(path.resolve('outputs')+path.sep))throw Error('Unexpected test path');fs.rmSync(temp,{recursive:true,force:true});}
