// Exact identity/search still use Unicode scalar order. Display collation never merges rows.
export function compareWords(a,b) {
  let i=0,j=0;
  while(i<a.length&&j<b.length) {
    const x=a.codePointAt(i),y=b.codePointAt(j);
    if(x!==y)return x-y;
    i+=x>65535?2:1;j+=y>65535?2:1;
  }
  return (i<a.length?1:0)-(j<b.length?1:0);
}
export function collationFor(code) {
  let collator=null;
  try {
    if(Intl.Collator.supportedLocalesOf([code],{localeMatcher:'lookup'}).length) {
      collator=new Intl.Collator(code,{usage:'sort',sensitivity:'variant',numeric:false,ignorePunctuation:false,localeMatcher:'lookup'});
    }
  } catch {} // Unstandardized upstream codes retain a deterministic Unicode fallback.
  return {
    locale:collator?.resolvedOptions().locale??null,
    options:collator?.resolvedOptions()??null,
    compare:(a,b)=>(collator?.compare(a,b)||compareWords(a,b))
  };
}
export function compareRows(a,b,sort,dir,wordCompare=compareWords) {
  if(sort==='word')return wordCompare(a[0],b[0])*(dir==='desc'?-1:1);
  const delta=sort==='rank'?a[2]-b[2]:a[1]-b[1];
  return delta*(dir==='desc'?-1:1)||wordCompare(a[0],b[0]);
}
export function orderKey(sort,dir) {
  return sort==='word'?'word':(sort==='rank'?(dir==='asc'?'count-desc':'count-asc'):`count-${dir}`);
}
export function searchChunks(chunks,q,mode) {
  let low=0,high=chunks.length;
  while(low<high){const mid=(low+high)>>1;if(compareWords(chunks[mid].last,q)<0)low=mid+1;else high=mid;}
  const out=[];
  for(let i=low;i<chunks.length;i++) {
    const c=chunks[i];
    if(compareWords(c.first,q)>0&&!(mode==='prefix'&&c.first.startsWith(q)))break;
    out.push({...c,chunkNumber:i});
  }
  return out;
}
