// Python/SQLite BINARY order of valid UTF-8 equals Unicode scalar order, not UTF-16 order.
export function compareWords(a,b){let i=0,j=0;while(i<a.length&&j<b.length){let x=a.codePointAt(i),y=b.codePointAt(j);if(x!==y)return x-y;i+=x>65535?2:1;j+=y>65535?2:1;}return (i<a.length?1:0)-(j<b.length?1:0);}
export function reverseOrder(sort,dir){return sort==='word'?dir==='desc':sort==='rank'?dir==='desc':dir==='asc';}
export function compareRows(a,b,sort,dir){let n=sort==='word'?compareWords(a[0],b[0]):b[1]-a[1]||compareWords(a[0],b[0]);return reverseOrder(sort,dir)?-n:n;}
export function searchChunks(chunks,q,mode){let low=0,high=chunks.length;while(low<high){let mid=(low+high)>>1;if(compareWords(chunks[mid].last,q)<0)low=mid+1;else high=mid;}let out=[];for(let i=low;i<chunks.length;i++){let c=chunks[i];if(compareWords(c.first,q)>0 && !(mode==='prefix'&&c.first.startsWith(q)))break;out.push(c);}return out;}
