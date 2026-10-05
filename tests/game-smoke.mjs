// API-state tests use SQLite and a controlled clock; no deployed data is touched.
import ts from 'typescript';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
fs.writeFileSync(path.join(temp,'game.mjs'),compile(fs.readFileSync('lib/game.ts','utf8')));
fs.writeFileSync(path.join(temp,'route.mjs'),compile(fs.readFileSync('app/api/game/route.ts','utf8').replace("import {db} from '@/db/raw';","const db=()=>globalThis.__osloDb;").replace("from '@/lib/game'","from './game.mjs'")));
const {POST,GET}=await import(path.join(temp,'route.mjs'));
let time=1800000000000;const actualNow=Date.now;Date.now=()=>time;
let state;
async function post(op,args={},user='host',expected=200){const req=new Request('https://local.test/api/game',{method:'POST',headers:{'Content-Type':'application/json',...(user?{'oai-authenticated-user-id':user}:{})},body:JSON.stringify({op,id:state?.game.id,version:state?.version,...args})});const r=await POST(req);const d=await r.json();assert.equal(r.status,expected,JSON.stringify(d));if(d.game)state=d;return d;}
async function read(user,id=state.game.id,expected=200){const r=await GET(new Request('https://local.test/api/game?id='+id,{headers:user?{'oai-authenticated-user-id':user}:{}}));assert.equal(r.status,expected);return r.json();}
try{
 await post('create',{name:'Integration test',teams:['Hiders','Seekers'],hideMinutes:1});const id=state.game.id;const [hider,seeker]=state.game.teams;
 await post('join',{team:seeker.id},'seeker');await read('outsider',id,403);await read('',id,401);
 await post('hand',{text:'Secret bonus card'},'host');assert.equal((await read('seeker')).game.privateHand,'');assert.equal((await read('host')).game.privateHand,'Secret bonus card');
 await post('mark',{mark:{kind:'boundary',points:[[59.8,10.5],[59.8,11],[60,11]],label:'Area'}},'host');
 await post('mark',{mark:{kind:'exclude',points:[[59.9,10.7],[59.9,10.8],[60,10.8]],label:'Eliminated'}},'seeker');assert.equal((await read('host')).game.marks.length,1);
 await post('location',{location:{point:[59.91,10.75],accuracy:8}},'host',403);
 await post('location',{location:{point:[59.91,10.75],accuracy:8}},'seeker');assert.equal((await read('host')).locations.length,1);
 await post('start',{},'seeker',403);await post('start');assert.equal(state.game.phase,'hiding');time+=60001;
 await post('ask',{questionId:'radar-0',start:[59.91,10.75],distance:500},'seeker');const first=state.game.questions.at(-1);await post('ask',{questionId:'radar-1',start:[59.91,10.75],distance:1000},'seeker',400);
 await post('answer',{question:first.id,answer:'No'},'seeker',403);time+=310000;await post('answer',{question:first.id,answer:'No'});assert.equal(state.game.questions[0].late,true);assert.equal(state.game.deducted,10000);
 await post('ask',{questionId:'radar-0',start:[59.91,10.75],distance:500},'seeker',400);
 await post('ask',{questionId:'radar-0',start:[59.91,10.75],distance:500,repeat:true},'seeker');assert.equal(state.game.questions.at(-1).repeat,2);
 const stale=state.version-1;await post('answer',{question:state.game.questions.at(-1).id,answer:'Yes',version:stale},'host',409);
 const deadline=state.game.questions.at(-1).deadline;await post('pause');time+=60000;await post('resume');assert.equal(state.game.questions.at(-1).deadline,deadline+60000);
 await post('answer',{question:state.game.questions.at(-1).id,answer:'Yes'});
 await post('ask',{questionId:'thermometer-0',start:[59.91,10.75],distance:1000},'seeker');assert.equal(state.game.questions.at(-1).status,'travelling');
 await post('thermoEnd',{question:state.game.questions.at(-1).id,end:[59.9101,10.75]},'seeker',400);
 await post('thermoEnd',{question:state.game.questions.at(-1).id,end:[59.93,10.75]},'seeker');await post('answer',{question:state.game.questions.at(-1).id,answer:'Hotter'});
 await post('catch',{bonus:5});assert.equal(state.game.scores.length,1);assert.equal(state.game.scores[0].bonus,5);
 await post('settings',{hider:seeker.id,hideMinutes:1,rules:'Test rules',houseTentacle:false});await post('start');assert.equal(state.game.round,2);assert.equal(state.game.questions.length,0);assert.equal(state.game.marks.length,1);
 console.log('PASS: membership, roles, hider privacy, GPS guards, shared boundaries, round transitions, question lock, late penalties, repeats, stale writes, pause/resume, thermometer distance, scoring and resets.');
}finally{Date.now=actualNow;sqlite.close();fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__osloDb;}
