// API-state tests use SQLite and a controlled clock; no deployed data is touched.
import ts from 'typescript';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'oslo-game-test-'));
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const raw={
 prepare(sql){
  return {bind(...values){return {
   async first(){return sqlite.prepare(sql).get(...values)||null;},
   async all(){return {results:sqlite.prepare(sql).all(...values)};},
   async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}
  };}};
 },
 async batch(stmts){return Promise.all(stmts.map(s=>s.run()));}
};
globalThis.__osloDb=raw;
function compile(src){return ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;}
fs.writeFileSync(path.join(temp,'identity.mjs'),compile(fs.readFileSync('lib/identity.ts','utf8')));
fs.writeFileSync(path.join(temp,'game.mjs'),compile(fs.readFileSync('lib/game.ts','utf8')));
fs.writeFileSync(path.join(temp,'clues.mjs'),compile(fs.readFileSync('lib/clues.ts','utf8').replace("from './game'","from './game.mjs'")));
fs.writeFileSync(path.join(temp,'transit.mjs'),compile(fs.readFileSync('lib/transit.ts','utf8')));
fs.writeFileSync(path.join(temp,'route.mjs'),compile(fs.readFileSync('app/api/game/route.ts','utf8').replace("import {db} from '@/db/raw';","const db=()=>globalThis.__osloDb;").replace("from '@/lib/game'","from './game.mjs'").replace("from '@/lib/identity'","from './identity.mjs'").replace("from '@/lib/clues'","from './clues.mjs'").replace("from '@/lib/transit'","from './transit.mjs'").replace("import {notifyGame} from '@/lib/push';","const notifyGame=async()=>{};")));
const {POST,GET}=await import(pathToFileURL(path.join(temp,'route.mjs')).href);
const photos=new Map();
globalThis.__osloBucket={async put(key,bytes,options){photos.set(key,{body:bytes,httpMetadata:options.httpMetadata});},async get(key){return photos.get(key);}};
fs.writeFileSync(path.join(temp,'photo-route.mjs'),compile(fs.readFileSync('app/api/photo/route.ts','utf8').replace("import {db} from '@/db/raw';","const db=()=>globalThis.__osloDb;").replace("import {env} from 'cloudflare:workers';","const env={BUCKET:globalThis.__osloBucket};").replace("from '@/lib/identity'","from './identity.mjs'")));
const photoRoute=await import(pathToFileURL(path.join(temp,'photo-route.mjs')).href);
let time=1800000000000;const actualNow=Date.now;Date.now=()=>time;
let state;
const gps=(point=[59.91,10.75])=>({point,accuracy:5,capturedAt:time});
async function post(op,args={},user='host',expected=200){const req=new Request('https://local.test/api/game',{method:'POST',headers:{'Content-Type':'application/json',...(user?{'oai-authenticated-user-id':user}:{})},body:JSON.stringify({op,id:state?.game.id,version:state?.version,...args})});const r=await POST(req);const d=await r.json();assert.equal(r.status,expected,JSON.stringify(d));if(d.game)state=d;return d;}
async function read(user,id=state.game.id,expected=200){const r=await GET(new Request('https://local.test/api/game?id='+id,{headers:user?{'oai-authenticated-user-id':user}:{}}));assert.equal(r.status,expected);return r.json();}
try{
 const {authenticatedUserKey}=await import(pathToFileURL(path.join(temp,'identity.mjs')).href);
 const legacy=new Request('https://local.test/api/game',{headers:{'oai-authenticated-user-email':'Player@example.com'}});
 const key=await authenticatedUserKey(legacy);
 assert.ok(key.startsWith('legacy-email:'));
 assert.equal(key,await authenticatedUserKey(new Request('https://local.test',{headers:{'oai-authenticated-user-email':'player@example.com'}})));
 assert.equal(await authenticatedUserKey(new Request('https://local.test',{headers:{'oai-authenticated-user-id':'stable-id','oai-authenticated-user-email':'player@example.com'}})),'stable-id');
 assert.equal(await authenticatedUserKey(new Request('https://local.test')),null);
 const legacyCreate=await POST(new Request('https://local.test/api/game',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-email':'player@example.com'},body:JSON.stringify({op:'create',name:'Legacy session',teams:['A','B'],hideMinutes:30})}));
 assert.equal(legacyCreate.status,200);const legacyGame=await legacyCreate.json();
 const legacyRead=await GET(new Request('https://local.test/api/game?id='+legacyGame.game.id,{headers:legacy.headers}));assert.equal(legacyRead.status,200);
 await post('create',{name:'Integration test',teams:['Hiders','Seekers'],hideMinutes:1});assert.deepEqual(state.game.networks,{metro:true,tram:false,bus:false,rail:false});const id=state.game.id;const [hider,seeker]=state.game.teams;
 await post('settings',{hider:hider.id,hideMinutes:1,rules:'Test',networks:{metro:'yes'}},'host',400);
 await post('settings',{hider:hider.id,hideMinutes:1,rules:'Test',networks:{metro:true,tram:true,bus:true,rail:false}});assert.equal(state.game.networks.tram,true);
 await post('join',{team:seeker.id},'seeker');await read('outsider',id,403);await read('',id,401);
 const legacyState=JSON.parse(sqlite.prepare('SELECT state FROM games WHERE id=?').get(id).state);legacyState.privateHand='Secret bonus card';legacyState.cards=[{id:'old-card',name:'Historical card',type:'time',minutes:7}];sqlite.prepare('UPDATE games SET state=? WHERE id=?').run(JSON.stringify(legacyState),id);assert.equal((await read('seeker')).game.privateHand,'');assert.equal((await read('host')).game.privateHand,'Secret bonus card');
 await post('mark',{mark:{kind:'boundary',points:[[59.8,10.5],[59.8,11],[60,11]],label:'Area'}},'host');
 await post('mark',{mark:{kind:'exclude',points:[[59.9,10.7],[59.9,10.8],[60,10.8]],label:'Eliminated'}},'seeker');assert.equal((await read('host')).game.marks.length,1);
 await post('location',{location:{point:[59.91,10.75],accuracy:8}},'host',403);
 await post('location',{location:{point:[59.91,10.75],accuracy:8}},'seeker');assert.equal((await read('host')).locations.length,1);
 await post('start',{},'seeker',403);await post('start');assert.equal(state.game.phase,'hiding');time+=60001;
 await post('curse',{title:'Seeker cannot cast',minutes:0},'seeker',403);
 await post('curse',{title:'Solve the challenge',effect:'Find the matching landmark.',minutes:0,blocks:false});
 const firstCurse=state.game.curses[0];assert.equal(firstCurse.blocks,true);assert.equal(firstCurse.requiresClear,true);assert.equal(firstCurse.end,0);
 await post('curse',{title:'Wait one minute',minutes:1});const timedCurse=state.game.curses.at(-1);
 time+=60001;
 const {activeCurses,questionsBlocked}=await import(pathToFileURL(path.join(temp,'game.mjs')).href);
 assert.equal(activeCurses(state.game,time).length,2);assert.equal(questionsBlocked(state.game,time),true);
 await post('ask',{questionId:'photo-0'},'seeker',400);
 await post('clearCurse',{curse:firstCurse.id},'seeker');
 await post('ask',{questionId:'radar-0',gps:gps(),distance:500},'seeker',400);
 await post('clearCurse',{curse:timedCurse.id},'seeker');
 await post('clearCurse',{curse:timedCurse.id},'seeker',400);
 assert.equal(questionsBlocked(state.game,time),false);
 await post('addCard',{name:'Retired card',type:'time',minutes:1},'host',400);
 await post('ask',{questionId:'radar-0',start:[59.91,10.75],distance:500},'seeker',400);
 await post('ask',{questionId:'radar-0',gps:{...gps(),capturedAt:time-60001},distance:500},'seeker',400);
 await post('ask',{questionId:'radar-0',gps:{...gps(),accuracy:101},distance:500},'seeker',400);
 await post('ask',{questionId:'radar-0',gps:gps(),distance:500},'seeker');const first=state.game.questions.at(-1);await post('ask',{questionId:'radar-1',gps:gps(),distance:1000},'seeker',400);
 await post('answer',{question:first.id,answer:'Maybe near the station'},'host',400);
 await post('answer',{question:first.id,answer:'No'},'seeker',403);time+=310000;await post('answer',{question:first.id,answer:'No'});assert.equal(state.game.questions[0].late,true);assert.equal(state.game.deducted,10000);
 await post('ask',{questionId:'radar-0',gps:gps(),distance:500},'seeker');assert.equal(state.game.questions.at(-1).repeat,2);
 const stale=state.version-1;await post('answer',{question:state.game.questions.at(-1).id,answer:'Yes',version:stale},'host',409);
 const deadline=state.game.questions.at(-1).deadline;await post('pause');time+=60000;await post('resume');assert.equal(state.game.questions.at(-1).deadline,deadline+60000);
 await post('answer',{question:state.game.questions.at(-1).id,answer:'Yes'});
 await post('ask',{questionId:'thermometer-0',gps:gps(),distance:1000},'seeker');assert.equal(state.game.questions.at(-1).status,'travelling');
 await post('curse',{title:'Freeze the journey',minutes:0});await post('thermoEnd',{question:state.game.questions.at(-1).id,gps:gps([59.93,10.75])},'seeker',400);await post('clearCurse',{curse:state.game.curses[0].id},'seeker');
 await post('thermoEnd',{question:state.game.questions.at(-1).id,gps:gps([59.9101,10.75])},'seeker',400);
 await post('thermoEnd',{question:state.game.questions.at(-1).id,gps:gps([59.93,10.75])},'seeker');await post('answer',{question:state.game.questions.at(-1).id,answer:'Hotter'});
 assert.equal(state.game.questions.at(-1).outcome,'hotter');
 assert.equal(state.game.questions.at(-1).startAccuracy,5);
 assert.equal(state.game.questions.at(-1).endAccuracy,5);
 for(const questionId of ['matching-0','measuring-0']){
  await post('ask',{questionId},'seeker',400);
  await post('ask',{questionId,gps:gps()},'seeker');
  assert.deepEqual(state.game.questions.at(-1).start,[59.91,10.75]);
  await post('answer',{question:state.game.questions.at(-1).id,outcome:questionId.startsWith('matching')?'no':'closer',answer:'Additional context'});
 }
 await post('ask',{questionId:'photo-0'},'seeker');
 const image=new Uint8Array([137,80,78,71,13,10,26,10]);
 const upload=await photoRoute.POST(new Request('https://local.test/api/photo?id='+id,{method:'POST',headers:{'Content-Type':'image/png','oai-authenticated-user-id':'host'},body:image}));assert.equal(upload.status,200);const {key:photoKey}=await upload.json();
 await post('answer',{question:state.game.questions.at(-1).id,answer:'Photo attached',photo:photoKey});
 assert.equal((await read('seeker')).game.questions.at(-1).photo,photoKey);
 const download=await photoRoute.GET(new Request('https://local.test/api/photo?key='+encodeURIComponent(photoKey),{headers:{'oai-authenticated-user-id':'seeker'}}));assert.equal(download.status,200);assert.equal(download.headers.get('Content-Type'),'image/png');assert.deepEqual(new Uint8Array(await download.arrayBuffer()),image);
 const forbidden=await photoRoute.GET(new Request('https://local.test/api/photo?key='+encodeURIComponent(photoKey),{headers:{'oai-authenticated-user-id':'outsider'}}));assert.equal(forbidden.status,403);
 const seekerUpload=await photoRoute.POST(new Request('https://local.test/api/photo?id='+id,{method:'POST',headers:{'Content-Type':'image/png','oai-authenticated-user-id':'seeker'},body:image}));assert.equal(seekerUpload.status,400);
 const {excludedBy,geometricClues,clueVisual,stationRadius}=await import(pathToFileURL(path.join(temp,'clues.mjs')).href);
 const radar={category:'Radar',status:'answered',start:[59.91,10.75],distance:500,startAccuracy:20,answer:'Yes'};
 assert.equal(excludedBy(radar,[59.91,10.75]),false);
 assert.equal(excludedBy(radar,[60,10.75]),true);
 assert.equal(clueVisual(radar).label,'HIT');
 const miss={...radar,outcome:'no',answer:'See notes'};
 assert.equal(excludedBy(miss,[59.91,10.75]),true);
 assert.equal(excludedBy(miss,[60,10.75]),false);
 assert.equal(clueVisual(miss).label,'MISS');
 assert.equal(excludedBy({...miss,startAccuracy:600},[59.91,10.75]),false);
 assert.equal(excludedBy({...radar,answer:'Yes, maybe'},[60,10.75]),false);
 for(const status of ['waiting','vetoed','travelling'])assert.equal(excludedBy({...radar,status},[60,10.75]),false);
 const warmer={category:'Thermometer',status:'answered',outcome:'hotter',start:[59.91,10.75],end:[59.93,10.75],startAccuracy:10,endAccuracy:10};
 assert.equal(excludedBy(warmer,[59.90,10.75]),true);
 assert.equal(excludedBy(warmer,[59.94,10.75]),false);
 assert.equal(excludedBy(warmer,[59.92,10.75]),false);
 assert.equal(excludedBy({...warmer,outcome:'colder'},[59.94,10.75]),true);
 assert.equal(excludedBy({...warmer,outcome:'null'},[59.94,10.75]),false);
 assert.equal(geometricClues([radar,warmer,{...radar,status:'vetoed'},{...radar,answer:'Null'}]).length,2);
 assert.ok(stationRadius(10)<stationRadius(12)&&stationRadius(12)<stationRadius(16));
 console.log('PASS: GPS requirements/freshness/accuracy, explicit outcomes, radar hit/miss, thermometer hemispheres and uncertainty margins.');
 const withOldBonus=JSON.parse(sqlite.prepare('SELECT state FROM games WHERE id=?').get(id).state);withOldBonus.cards=[{id:'legacy-bonus',type:'time',minutes:7}];sqlite.prepare('UPDATE games SET state=? WHERE id=?').run(JSON.stringify(withOldBonus),id);
 await post('catch',{bonus:5});assert.equal(state.game.scores.length,1);assert.equal(state.game.scores[0].bonus,5);
 await post('settings',{hider:seeker.id,hideMinutes:1,rules:'Test rules',houseTentacle:false});await post('start');assert.equal(state.game.round,2);assert.equal(state.game.cards.length,0);assert.equal(state.game.questions.length,0);assert.equal(state.game.marks.length,1);
 console.log('PASS: direct curses, explicit clearing after timer expiry, stacked locks, thermometer locking, physical-deck scoring and seeker photo evidence access.');
 console.log('PASS: membership, roles, hider privacy, GPS guards, shared boundaries, round transitions, question lock, late penalties, repeats, stale writes, pause/resume, thermometer distance, scoring and resets.');
}finally{Date.now=actualNow;sqlite.close();fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__osloDb;delete globalThis.__osloBucket;}
