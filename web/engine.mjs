import {orderKey,searchChunks} from './query.mjs?v=2';
export function createQueryEngine(fetchFile) {
  const cache=new Map(),orders=new Map(),inverse=new Map();
  async function get(url,binary=false) {
    if(cache.has(url)){const value=cache.get(url);cache.delete(url);cache.set(url,value);return value;}
    const pending=(async()=>{const r=await fetchFile(url);if(!r.ok)throw Error(`Static file unavailable (${r.status}): ${url}`);return binary?await r.arrayBuffer():await r.json();})();
    cache.set(url,pending);if(cache.size>32)cache.delete(cache.keys().next().value);
    try{return await pending;}catch(e){cache.delete(url);throw e;}
  }
  async function order(base,name,meta) {
    const key=base+'/'+meta.files[name].file;
    if(orders.has(key))return {key,view:orders.get(key)};
    const bytes=await get(key,true);
    if(bytes.byteLength!==meta.words*4)throw Error('Alphabetical index size mismatch');
    const view=new DataView(bytes);orders.set(key,view);if(orders.size>3)orders.delete(orders.keys().next().value);return {key,view};
  }
  async function query(s,progress=()=>{}) {
    const size=Number(s.size);if(!Number.isInteger(size)||size<1||size>500)throw Error('Invalid page size');
    const [index,ui]=await Promise.all([get(s.base+'/index.json'),get(s.uiBase+'/index.json')]);
    if(ui.words!==index.words||ui.code!==index.code||ui.version!==1)throw Error('Alphabetical index does not match snapshot');
    const name=orderKey(s.sort,s.dir),{key,view}=await order(s.uiBase,name,ui),reverse=s.sort==='word'&&s.dir==='desc';
    let total=index.words,page=Math.max(0,Number(s.page)||0),rows;
    if(s.q) {
      const candidates=searchChunks(index.orders.word,s.q,s.mode),matches=[];let done=0;
      for(const ch of candidates) {
        const chunk=await get(s.base+'/'+ch.file);
        chunk.forEach((r,i)=>{if(s.mode==='exact'?r[0]===s.q:r[0].startsWith(s.q))matches.push({id:ch.chunkNumber*index.chunk_size+i,row:r});});
        progress(`Searching ${++done} of ${candidates.length} chunks…`);
      }
      if(!inverse.has(key)) {
        const inv=new Uint32Array(total);for(let i=0;i<total;i++)inv[view.getUint32(i*4,true)]=i;
        inverse.clear();inverse.set(key,inv);
      }
      const inv=inverse.get(key);matches.sort((a,b)=>(inv[a.id]-inv[b.id])*(reverse?-1:1));total=matches.length;
      page=Math.min(page,Math.max(0,Math.ceil(total/size)-1));rows=matches.slice(page*size,(page+1)*size).map(x=>x.row);
    } else {
      page=Math.min(page,Math.max(0,Math.ceil(total/size)-1));const ids=[];
      for(let i=page*size;i<Math.min(total,(page+1)*size);i++){const id=view.getUint32((reverse?total-1-i:i)*4,true);if(id>=total)throw Error('Invalid alphabetical row reference');ids.push(id);}
      const numbers=[...new Set(ids.map(id=>Math.floor(id/index.chunk_size)))];
      const parts=new Map(await Promise.all(numbers.map(async n=>[n,await get(s.base+'/'+index.orders.word[n].file)])));
      rows=ids.map(id=>parts.get(Math.floor(id/index.chunk_size))[id%index.chunk_size]);
    }
    return {rows,total,page,index,collation:ui.collation};
  }
  return {query};
}
