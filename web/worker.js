import {compareRows,reverseOrder,searchChunks} from './query.mjs';
let cache=new Map();
async function json(url){if(cache.has(url))return cache.get(url);let r=await fetch(url);if(!r.ok)throw Error(`Static file unavailable (${r.status}): ${url}`);let d=await r.json();cache.set(url,d);if(cache.size>8)cache.delete(cache.keys().next().value);return d;}
self.onmessage=async({data:s})=>{try{let index=await json(s.base+'/index.json');let rows,total=index.words,page=s.page;
 if(s.q){let candidates=searchChunks(index.orders.word,s.q,s.mode);rows=[];let done=0;for(let ch of candidates){let chunk=await json(s.base+'/'+ch.file);for(let r of chunk)if(s.mode==='exact'?r[0]===s.q:r[0].startsWith(s.q))rows.push(r);self.postMessage({progress:`Searching ${++done} of ${candidates.length} candidate chunks…`});}rows.sort((a,b)=>compareRows(a,b,s.sort,s.dir));total=rows.length;page=Math.min(page,Math.max(0,Math.ceil(total/s.size)-1));rows=rows.slice(page*s.size,(page+1)*s.size);
 }else{page=Math.min(page,Math.max(0,Math.ceil(total/s.size)-1));let reverse=reverseOrder(s.sort,s.dir),order=s.sort==='word'?'word':'count',parts=index.orders[order];rows=[];for(let k=page*s.size;k<Math.min(total,(page+1)*s.size);k++){let offset=reverse?total-1-k:k;let part=parts[Math.floor(offset/index.chunk_size)];let chunk=await json(s.base+'/'+part.file);rows.push(chunk[offset%index.chunk_size]);}}
 self.postMessage({rows,total,page,index});
 }catch(e){self.postMessage({error:e.message});}};
