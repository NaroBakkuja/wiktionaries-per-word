import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createQueryEngine} from '../web/engine.mjs';
import {collationFor,compareRows} from '../web/query.mjs';
const root=path.resolve(process.argv[2]),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const cat=read(path.join(root,'catalog.json')),snap=cat.snapshots[0],snapshot=path.join(root,snap.path),langs=read(path.join(snapshot,'languages.json'));
let requests=0;
const engine=createQueryEngine(async url=>{requests++;try{const raw=fs.readFileSync(fileURLToPath(url));return {ok:true,json:async()=>JSON.parse(raw),arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};}catch{return {ok:false,status:404};}});
async function query(code,options={}){const lang=langs.find(l=>l.code===code);return engine.query({base:pathToFileURL(path.join(snapshot,'languages',lang.id)).href,uiBase:pathToFileURL(path.join(root,'ui-indexes',snap.id,lang.id)).href,q:'',mode:'prefix',sort:'count',dir:'desc',page:0,size:50,...options});}
for(const [word,count,rank,foreign] of [['nước',19,1,18],['công ty',9,452,8],['công ti',4,5788,3]]){const d=await query('vi',{q:word,mode:'exact'});assert.equal(d.total,1);assert.deepEqual(d.rows[0].slice(0,3),[word,count,rank]);assert.equal(d.rows[0][4],foreign);}
const en=await query('en',{q:'February',mode:'exact'});assert.equal(en.rows[0][1],21);assert.equal(en.rows[0][4],20);
for(const code of ['vi','en','fr'])for(const sort of ['word','count','rank'])for(const dir of ['asc','desc']) {
  const comparator=collationFor(code).compare;
  const a=await query(code,{sort,dir,page:39}),b=await query(code,{sort,dir,page:40});const combined=[...a.rows,...b.rows];
  assert.equal(new Set(combined.map(r=>r[0])).size,100);
  assert(combined.every((r,i)=>i===0||compareRows(combined[i-1],r,sort,dir,comparator)<=0),`${code}/${sort}/${dir} global boundary`);
}
for(const size of [25,50,100,250,500]){const d=await query('vi',{size});assert.equal(d.rows.length,size);assert.equal(d.rows[0][0],'nước');}
const a=await query('vi',{q:'công ',sort:'count',dir:'asc',size:500}),b=await query('vi',{q:'công ',sort:'count',dir:'desc',size:500});
assert.deepEqual(new Set(a.rows.map(r=>r[0])),new Set(b.rows.map(r=>r[0])));
for(const d of [a,b])assert(d.rows.every(r=>r[0].startsWith('công ')));
const report={status:'passed',checks:['VI/EN counts and ranks unchanged','Vietnamese/French/English global ordering across row 2000 in all six sort modes','all five page sizes','exact and prefix search','alphabetical ties in both score directions'],static_requests:requests,rendered_browser:false};
console.log(JSON.stringify(report,null,2));
