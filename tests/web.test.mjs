import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {compareWords,compareRows,reverseOrder,searchChunks} from '../web/query.mjs';
let words=['a','A','á','a\u0301','同','\u{20000}','\uffff'];assert.deepEqual(words.sort(compareWords),['A','a','a\u0301','á','同','\uffff','\u{20000}']);
let chunks=[{first:'A',last:'a'},{first:'aa',last:'az'},{first:'b',last:'同'}];assert.equal(searchChunks(chunks,'a','prefix').length,2);assert.equal(searchChunks(chunks,'az','exact').length,1);assert.equal(searchChunks(chunks,'z','prefix').length,1);assert.equal(searchChunks(chunks,'\u{20000}','prefix').length,0);
let rows=[['a',3,1],['b',3,1],['c',1,3]];assert.deepEqual([...rows].sort((a,b)=>compareRows(a,b,'count','desc')),rows);assert.deepEqual([...rows].sort((a,b)=>compareRows(a,b,'rank','desc')),[...rows].reverse());assert.equal(reverseOrder('count','desc'),false);
// Offline worker execution against small static files, no browser process.
let files={'/index.json':{words:3,chunk_size:2,orders:{word:[{file:'w0',first:'a',last:'b'},{file:'w1',first:'c',last:'c'}],count:[{file:'w0'},{file:'w1'}]}},'/w0':rows.slice(0,2),'/w1':rows.slice(2)};
let outputs=[],requested=[];let context={compareRows,reverseOrder,searchChunks,Map,self:{postMessage:x=>outputs.push(x)},fetch:async url=>{requested.push(url);return {ok:url in files,status:404,json:async()=>files[url]};}};
vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../web/worker.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,''),context);
async function query(s){outputs=[];await context.self.onmessage({data:{base:'',q:'',page:0,size:2,sort:'count',dir:'desc',mode:'prefix',...s}});return JSON.parse(JSON.stringify(outputs.at(-1)));}
let first=await query({});assert.deepEqual(first.rows,rows.slice(0,2));let next=await query({page:1});assert.deepEqual(next.rows,[rows[2]]);let rev=await query({dir:'asc'});assert.deepEqual(rev.rows,[rows[2],rows[1]]);let exact=await query({q:'b',mode:'exact'});assert.deepEqual(exact.rows,[rows[1]]);assert.equal(exact.total,1);let missing=await query({q:'missing'});assert.equal(missing.total,0);let all=await query({q:'',sort:'word',dir:'desc'});assert.deepEqual(all.rows,[rows[2],rows[1]]);
// DOM/source contract: references exist, dynamic data uses textContent, and no analytics or upstream fetch endpoint.
let html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');let ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(let m of app.matchAll(/\$\('([^']+)'\)/g))assert(ids.has(m[1]),'Missing DOM id '+m[1]);assert(!app.includes('innerHTML'));assert(!/fetch\(['"]https?:/.test(app));assert(html.includes('<dialog'));assert(html.includes('aria-live="polite"'));
console.log('PASS: Unicode ordering, global chunk pagination/reversal, exact/prefix selection, worker execution, DOM contract, safe text insertion. No rendered browser verification.');
