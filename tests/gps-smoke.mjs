import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync('lib/gps.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {captureGps}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
const mock=value=>Object.defineProperty(globalThis,'navigator',{configurable:true,value});
const position=(accuracy=5,timestamp=Date.now())=>({coords:{latitude:59.91,longitude:10.75,accuracy},timestamp});
try{
 mock({geolocation:{getCurrentPosition(success,_error,options){assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,true);assert.equal(options.timeout,20000);success(position());}}});
 const fix=await captureGps();assert.deepEqual(fix.point,[59.91,10.75]);assert.equal(fix.accuracy,5);
 mock({});await assert.rejects(captureGps(),/unavailable/);
 mock({geolocation:{getCurrentPosition(_success,error){error({code:1});}}});await assert.rejects(captureGps(),/permission was denied/);
 mock({geolocation:{getCurrentPosition(_success,error){error({code:3});}}});await assert.rejects(captureGps(),/Could not get a GPS/);
 mock({geolocation:{getCurrentPosition(success){success(position(101));}}});await assert.rejects(captureGps(),/accuracy is too low/);
 mock({geolocation:{getCurrentPosition(success){success(position(5,Date.now()-61000));}}});await assert.rejects(captureGps(),/old position/);
 console.log('PASS: fresh GPS capture, permission denial, timeout, poor accuracy and stale fixes.');
}finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
