import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {compareWords,collationFor,compareRows,searchChunks} from '../web/query.mjs';
import {PAGE_SIZES,parseState,resizedPage,rememberLanguage,languageGroups,searchLanguages} from '../web/preferences.mjs';
import {ViewportKeeper} from '../web/viewport.mjs';
import {createQueryEngine} from '../web/engine.mjs';
import {buildLanguage,build} from '../scripts/build_ui_indexes.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const vi=collationFor('vi');assert.equal(vi.locale,'vi');
const alphabet=['a','à','á','ă','â','b','d','đ','e','ê','o','ô','ơ','u','ư'];
assert.deepEqual([...alphabet].reverse().sort(vi.compare),alphabet);
assert(vi.compare('d','đ')<0);assert(vi.compare('ă','â')<0);assert(vi.compare('ô','ơ')<0);
assert.equal(vi.compare('a\u0301','á'),compareWords('a\u0301','á'));
assert.equal(collationFor(' fr').locale,null);
assert.deepEqual(['\u{20000}','\uffff','a'].sort(compareWords),['a','\uffff','\u{20000}']);
let chunks=[{first:'A',last:'a'},{first:'aa',last:'az'},{first:'b',last:'同'}];
assert.equal(searchChunks(chunks,'a','prefix').length,2);assert.equal(searchChunks(chunks,'az','exact').length,1);assert.equal(searchChunks(chunks,'\u{20000}','prefix').length,0);
assert.deepEqual(PAGE_SIZES,[25,50,100,250,500]);
assert.equal(parseState('http://localhost/?size=100&page=3',25).size,100);
assert.equal(parseState('http://localhost/',250).size,250);
assert.equal(parseState('http://localhost/?size=999&page=-3').size,50);
assert.equal(parseState('http://localhost/?size=999&page=-3').page,0);
assert.equal(resizedPage(5,50,100),2);assert.equal(resizedPage(1,100,25),4);
assert.deepEqual(rememberLanguage(['en','vi','fr'],'vi'),['vi','en','fr']);
assert.equal(rememberLanguage(['a','b','c','d','e','f'],'g').length,6);
const languages=[{code:'vi',name:'Vietnamese',labels:['Tiếng Việt']},{code:'en',name:'English'},{code:'fr',name:'French'},{code:'rare',name:'Rare language'},{code:' fr',name:'French raw category'}];
assert.equal(languageGroups(languages,[],'vi')[0].items[0].code,'vi');
assert.equal(languageGroups(languages,['rare'],'vi')[0].label,'Recent');
assert.equal(new Set(languageGroups(languages,['fr','vi'],'rare').flatMap(g=>g.items.map(l=>l.code))).size,4);
assert.equal(searchLanguages(languages,'vi')[0].code,'vi');assert.equal(searchLanguages(languages,'tieng viet')[0].code,'vi');assert.equal(searchLanguages(languages,'raw')[0].code,' fr');
// Page updates preserve the captured viewport; user scrolling and superseded requests win.
function fakeWindow(){return {scrollX:0,scrollY:600,events:new Map(),frames:[],calls:[],addEventListener(n,f){this.events.set(n,f);},removeEventListener(n){this.events.delete(n);},requestAnimationFrame(f){this.frames.push(f);},scrollTo(p){this.calls.push(p);this.scrollY=p.top;},flush(){while(this.frames.length)this.frames.shift()();}};}
const region={style:{},getBoundingClientRect:()=>({height:1200})};
let win=fakeWindow(),keeper=new ViewportKeeper(win,region),ticket=keeper.begin(true);assert.equal(region.style.minHeight,'1200px');
keeper.commit(ticket,()=>{win.scrollY=50;});win.flush();assert.equal(win.scrollY,600);
win=fakeWindow();keeper=new ViewportKeeper(win,region);ticket=keeper.begin(true);win.scrollY=800;win.events.get('scroll')();keeper.commit(ticket,()=>{});win.flush();assert.equal(win.scrollY,800);assert.equal(win.calls.length,0);
win=fakeWindow();keeper=new ViewportKeeper(win,region);const old=keeper.begin(true);const fresh=keeper.begin(true);keeper.commit(old,()=>assert.fail('Stale request rendered'));keeper.commit(fresh,()=>{});win.events.get('wheel')({type:'wheel'});win.flush();assert.equal(win.calls.length,0);
const tempBase=path.resolve(os.tmpdir()),root=fs.mkdtempSync(path.join(tempBase,'wpw-ui-'));
try {
  const words=['á','a\u0301','a','ă','â','b','d','đ','e','ê','o','ô','ơ','u','ư'];
  const rows=words.map((w,i)=>[w,i<9?5:2,0,1,0,1]).sort((a,b)=>compareWords(a[0],b[0]));
  rows.forEach(r=>r[2]=r[1]===5?1:10);
  const src=path.join(root,'snapshots/s/languages/vi');fs.mkdirSync(src,{recursive:true});const listing=[];
  for(let i=0;i<rows.length;i+=2){const part=rows.slice(i,i+2),file=`word-${i/2}.json`,raw=Buffer.from(JSON.stringify(part));fs.writeFileSync(path.join(src,file),raw);listing.push({file,first:part[0][0],last:part.at(-1)[0],rows:part.length,sha256:hash(raw)});}
  fs.writeFileSync(path.join(src,'index.json'),JSON.stringify({code:'vi',words:rows.length,chunk_size:2,orders:{word:listing},coverage:[]}));
  const out=path.join(root,'ui-indexes/s');const first=buildLanguage(root,{path:'snapshots/s'},{id:'vi',code:'vi'},out),second=buildLanguage(root,{path:'snapshots/s'},{id:'vi',code:'vi'},out);assert.deepEqual(first,second);
  fs.writeFileSync(path.join(root,'catalog.json'),JSON.stringify({snapshots:[{id:'s',path:'snapshots/s'}]}));
  fs.writeFileSync(path.join(root,'snapshots/s/languages.json'),JSON.stringify([{id:'vi',code:'vi'}]));
  const baseline={path:'snapshots/s/languages/vi/index.json',bytes:fs.statSync(path.join(src,'index.json')).size,sha256:hash(fs.readFileSync(path.join(src,'index.json')))};
  fs.writeFileSync(path.join(root,'artifact-inventory.json'),JSON.stringify({files:[baseline],words:rows.length,languages:1,canonical_rows_sha256:'fixture'}));
  assert.equal(build(root).rows,rows.length);
  const inventoryFile=path.join(root,'artifact-inventory.json'),inventoryBytes=fs.readFileSync(inventoryFile),inventory=JSON.parse(inventoryBytes);
  assert.deepEqual(inventory.files.find(f=>f.path===baseline.path),baseline);
  assert.equal(inventory.files.filter(f=>f.path.startsWith('ui-indexes/')).length,5);
  assert.equal(inventory.canonical_rows_sha256,'fixture');
  for(const f of inventory.files){const raw=fs.readFileSync(path.join(root,f.path));assert.equal(raw.length,f.bytes);assert.equal(hash(raw),f.sha256);}
  build(root);assert.deepEqual(fs.readFileSync(inventoryFile),inventoryBytes,'Display inventory rebuild is byte deterministic');
  let requests=0;const engine=createQueryEngine(async url=>{requests++;try{const raw=fs.readFileSync(fileURLToPath(url));return {ok:true,json:async()=>JSON.parse(raw),arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};}catch{return {ok:false,status:404};}});
  const base=pathToFileURL(src).href,uiBase=pathToFileURL(path.join(out,'vi')).href;
  async function query(options={}){return engine.query({base,uiBase,q:'',mode:'prefix',sort:'count',dir:'desc',page:0,size:2,...options});}
  for(const sort of ['word','count','rank'])for(const dir of ['asc','desc']) {
    const expected=[...rows].sort((a,b)=>compareRows(a,b,sort,dir,vi.compare));
    for(const size of [1,2,3,25,500]) {
      const seen=[];for(let page=0;page<Math.ceil(rows.length/size);page++)seen.push(...(await query({sort,dir,size,page})).rows);
      assert.deepEqual(seen,expected,`${sort}/${dir}/${size}: globally ordered across every page`);
    }
  }
  const exact=await query({q:'á',mode:'exact'});assert.equal(exact.total,1);assert.equal(exact.rows[0][0],'á');
  const prefix=await query({q:'a',mode:'prefix'});assert.equal(prefix.total,2);assert(prefix.rows.some(r=>r[0]==='a\u0301'));assert(!prefix.rows.some(r=>r[0]==='á'));
  assert.equal((await query({q:'missing'})).total,0);assert.equal((await query({page:999})).page,7);
  const before=requests;await query({});await query({page:1});assert.equal(requests,before,'Paging reuses cached order and source chunks');
} finally {
  const resolved=path.resolve(root);assert(resolved.startsWith(tempBase+path.sep));fs.rmSync(resolved,{recursive:true});
}
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert(ids.has(m[1]),'Missing DOM id '+m[1]);
assert(!app.includes('innerHTML'));assert(!app.slice(app.indexOf('function run('),app.indexOf('worker.onmessage')).includes("$('rows').replaceChildren"));
assert(app.includes('id!==requestId'));assert(html.includes('id="page-size"'));assert(html.includes('id="language-dialog"'));
console.log('PASS: Vietnamese alphabet/diacritics/canonical-form fallback; global tie order in both directions; all page sizes and boundaries; exact/prefix search; URL/preferences/recent languages; viewport preservation and user-scroll cancellation; stale responses; DOM references. No browser launched.');
