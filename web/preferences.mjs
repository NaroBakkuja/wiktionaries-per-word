export const PAGE_SIZES=[25,50,100,250,500];
// Existing working-language set, with Vietnamese first. Raw data codes are unchanged.
export const COMMON_LANGUAGES=['vi','en','es','de','fr','fi','tr','ru','ar','zh','cmn','ja','th','sw','cy','ka','ko','hi','pt','it'];
export const DEFAULT_STATE={snapshot:'',lang:'vi',q:'',mode:'prefix',sort:'count',dir:'desc',page:0,size:50};
export function parseState(url,preferredSize=50) {
  const u=new URL(url),s={...DEFAULT_STATE,size:PAGE_SIZES.includes(Number(preferredSize))?Number(preferredSize):50};
  for(const k of Object.keys(s))if(u.searchParams.has(k))s[k]=u.searchParams.get(k);
  s.page=Math.max(0,Math.floor(Number(s.page)||0));if(!Number.isFinite(s.page))s.page=0;
  s.size=PAGE_SIZES.includes(Number(s.size))?Number(s.size):50;
  if(!['word','count','rank'].includes(s.sort))s.sort='count';
  if(!['asc','desc'].includes(s.dir))s.dir='desc';
  if(!['prefix','exact'].includes(s.mode))s.mode='prefix';
  return s;
}
// The UI uses one-based page numbers; URL and worker state remain zero-based.
export function pageTarget(value,total,size,current=0){
  const pages=Math.ceil(total/size),text=String(value).trim();
  if(!/^-?\d+$/.test(text)||!Number.isFinite(Number(text)))return null;
  return Math.max(0,Math.min(Math.max(0,pages-1),Number(text)-1));
}
export function resizedPage(page,oldSize,newSize){return Math.floor(page*oldSize/newSize);}
export function rememberLanguage(recent,code){return [code,...recent.filter(x=>x!==code)].slice(0,6);}
export function languageGroups(languages,recent,current) {
  const byCode=new Map(languages.map(l=>[l.code,l])),used=new Set(),groups=[];
  function add(label,codes){const items=[];for(const code of codes)if(byCode.has(code)&&!used.has(code)){items.push(byCode.get(code));used.add(code);}if(items.length)groups.push({label,items});}
  add('Recent',recent);add('Common',COMMON_LANGUAGES);add('Selected',[current]);return groups;
}
const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
export function searchLanguages(languages,query) {
  const q=fold(query.trim()),common=new Map(COMMON_LANGUAGES.map((c,i)=>[c,i]));
  return languages.filter(l=>!q||[l.code,l.name,...(l.labels||[])].some(t=>fold(t).includes(q))).sort((a,b)=>{
    const score=l=>q&&fold(l.code)===q?-200:q&&fold(l.code).startsWith(q)?-100:(common.get(l.code)??100);
    return score(a)-score(b)||a.name.localeCompare(b.name,'en')||a.code.localeCompare(b.code,'en');
  });
}
