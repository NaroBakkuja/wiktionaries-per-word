import {PAGE_SIZES,parseState,resizedPage,rememberLanguage,languageGroups,searchLanguages} from './preferences.mjs?v=2';
import {ViewportKeeper} from './viewport.mjs?v=2';
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString();
const readPreference=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const storePreference=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let state=parseState(location.href,readPreference('wpw.pageSize',50));
let recent=readPreference('wpw.recentLanguages',[]);if(!Array.isArray(recent))recent=[];
recent=recent.filter(x=>typeof x==='string').slice(0,6);
let catalog,manifest,languages=[],selected,base,currentIndex,generation=0,requestId=0,pendingView,total=0;
const viewport=new ViewportKeeper(window,$('results-region'));
const worker=new Worker('worker.js?v=2',{type:'module'});
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function save(){const u=new URL(location.href);for(const[k,v]of Object.entries(state))u.searchParams.set(k,v);history.replaceState(null,'',u);}
async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`Cannot load static file: ${url}`);return r.json();}
function error(e){viewport.cancel();$('results-region').removeAttribute('aria-busy');$('status').textContent=e.message||String(e);$('previous').disabled=true;$('next').disabled=true;}
function download(id,url){const a=$(id);a.href=url;a.setAttribute('download','');}
function languageLabel(l){const code=l.code===l.code.trim()?l.code:JSON.stringify(l.code);return `${l.name} · ${code}`;}
function populateLanguages(){
  const groups=languageGroups(languages,recent,state.lang);
  const nodes=groups.map(g=>{const group=node('optgroup');group.label=g.label;for(const l of g.items){const o=node('option',languageLabel(l));o.value=l.code;group.append(o);}return group;});
  const all=node('option','All languages…');all.value='';nodes.push(all);$('language').replaceChildren(...nodes);$('language').value=state.lang;
}
function chooseLanguage(code){
  if(!languages.some(l=>l.code===code))return;
  state.lang=code;state.page=0;recent=rememberLanguage(recent,code);storePreference('wpw.recentLanguages',recent);populateLanguages();run();
}
function filterLanguages(){
  const matches=searchLanguages(languages,$('language-search').value);
  $('language-results').replaceChildren(...matches.map(l=>{const o=node('option',`${languageLabel(l)} (${fmt(l.words)} forms)`);o.value=l.code;return o;}));
  $('language-results').value=matches.some(l=>l.code===state.lang)?state.lang:(matches[0]?.code??'');
  $('language-match-count').textContent=`${fmt(matches.length)} language codes`;$('choose-language').disabled=!matches.length;
}
async function loadSnapshot(){
  const g=++generation;++requestId;viewport.cancel();
  try {
    const snap=catalog.snapshots.find(s=>s.id===state.snapshot)||catalog.snapshots[0];state.snapshot=snap.id;base=new URL(snap.path+'/',location.href).href;
    const [m,ls]=await Promise.all([json(base+'manifest.json'),json(base+'languages.json')]);if(g!==generation)return;
    manifest=m;languages=ls;if(!ls.some(l=>l.code===state.lang))state.lang=ls.some(l=>l.code==='vi')?'vi':ls[0].code;
    populateLanguages();$('snapshot').value=snap.id;$('query').value=state.q;$('mode').value=state.mode;$('page-size').value=String(state.size);
    $('dates-note').textContent=`Assembled ${m.assembled_on}. ${m.source_date_note}`;
    $('coverage-note').textContent=`${m.panel.length} editions · ${m.coverage==='complete'?'All source extractions processed':'Incomplete coverage: counts are lower bounds'}. Own edition included. Search preserves exact spelling.`;
    download('download-full',base+'downloads/full-scores.csv.gz');download('download-sqlite',base+'downloads/full-scores.sqlite.gz');download('download-full-evidence',base+'downloads/full-evidence.csv.gz');run();
  } catch(e){error(e);}
}
function run({paging=false}={}){
  try {
    selected=languages.find(l=>l.code===state.lang);if(!selected)throw Error('Choose an entry language.');
    pendingView=viewport.begin(paging);$('status').textContent='Loading results…';$('results-region').setAttribute('aria-busy','true');
    // Keep the previous rows in place. Clearing them here collapses the page and moves the viewport.
    $('previous').disabled=true;$('next').disabled=true;save();
    worker.postMessage({...state,id:++requestId,base:base+'languages/'+selected.id,uiBase:new URL(`ui-indexes/${state.snapshot}/${selected.id}`,location.href).href});
    for(const th of document.querySelectorAll('[data-column]')){const active=th.dataset.column===state.sort;th.setAttribute('aria-sort',active?(state.dir==='asc'?'ascending':'descending'):'none');th.querySelector('span').textContent=active?(state.dir==='asc'?' ↑':' ↓'):'';}
  }catch(e){error(e);}
}
worker.onmessage=({data:d})=>{
  if(d.id!==requestId)return;
  if(d.error){error(d.error);return;}
  if(d.progress){$('status').textContent=d.progress;return;}
  total=d.total;state.page=d.page;currentIndex=d.index;
  viewport.commit(pendingView,()=>render(d.rows,d.collation));
};
worker.onerror=()=>error('The results worker could not load. Refresh this page and try again.');
function contributors(mask,panel=manifest.panel){return panel.filter((e,i)=>Math.floor(mask/2**i)%2===1);}
function render(rows,collation){
  save();$('results-region').removeAttribute('aria-busy');$('language-title').textContent=languageLabel(selected);
  $('status').textContent=`${fmt(total)} ${state.q?'matching forms':'forms'} · ${fmt(selected.words)} in this language.${state.q?' Ranks are unchanged by search.':''}`;
  $('sort-note').textContent=collation.locale?`Alphabetical order: ${selected.name} (${collation.locale}). Score ties stay A–Z.`:'Unicode order: no supported locale for this code. Score ties stay ascending.';
  const displayed={language:selected,manifest,index:currentIndex,base};
  $('rows').replaceChildren(...rows.map(r=>{const tr=node('tr');tr.append(node('td',r[0]),node('td',r[1]),node('td',fmt(r[2])));const td=node('td'),b=node('button',contributors(r[3]).join(' · '));b.className='edition-button';b.title='View contributing editions';b.onclick=()=>details(r,displayed);td.append(b);tr.append(td);return tr;}));
  $('page-status').textContent=total?`${fmt(state.page*state.size+1)}–${fmt(Math.min(total,(state.page+1)*state.size))} of ${fmt(total)}`:'No matching direct entries observed';
  $('previous').disabled=state.page===0;$('next').disabled=(state.page+1)*state.size>=total;
  $('source-rows').replaceChildren(...manifest.sources.map(s=>{const cv=currentIndex.coverage.find(x=>x.edition===s.id),tr=node('tr');for(const text of [s.id,s.dump_date,s.extraction_date,s.retrieval_date,cv.status,cv.entry_records===null?'Unknown':fmt(cv.entry_records)])tr.append(node('td',text));return tr;}));
  download('download-language',base+'downloads/'+selected.id+'-scores.csv.gz');download('download-evidence',base+'downloads/'+selected.id+'-evidence.csv.gz');download('detail-download',base+'downloads/'+selected.id+'-evidence.csv.gz');
}
function details(r,context){
  const selected=context.language,manifest=context.manifest,currentIndex=context.index;
  download('detail-download',context.base+'downloads/'+selected.id+'-evidence.csv.gz');
  $('evidence-title').textContent=r[0];$('evidence-summary').textContent=`Entry language ${selected.code} · ${r[1]} editions · tied rank ${fmt(r[2])} · foreign-only comparison ${r[4]}.`;
  const present=contributors(r[3],manifest.panel);$('evidence-list').replaceChildren(...manifest.sources.map(s=>{const div=node('div');div.className='evidence-row';const cv=currentIndex.coverage.find(x=>x.edition===s.id);if(present.includes(s.id)){const a=node('a',s.id+' ↗');a.href=`https://${s.id}.wiktionary.org/wiki/${encodeURIComponent(r[0])}`;a.target='_blank';a.rel='noopener noreferrer';div.append(a,node('span',`Direct entry observed · dump ${s.dump_date}`));}else div.append(node('strong',s.id),node('span',cv.status==='complete'?'Not observed in this extraction':'Unknown: '+cv.status));return div;}));$('evidence').showModal();
}
$('close-dialog').onclick=()=>$('evidence').close();
$('search').onclick=()=>{state.q=$('query').value;state.mode=$('mode').value;state.page=0;run();};
$('query').onkeydown=e=>{if(e.key==='Enter')$('search').click();};
$('mode').onchange=()=>$('search').click();
$('language').onchange=()=>{if($('language').value)chooseLanguage($('language').value);else{$('language').value=state.lang;$('language-search').value='';filterLanguages();$('language-dialog').showModal();$('language-search').focus({preventScroll:true});}};
$('language-search').oninput=filterLanguages;
$('choose-language').onclick=()=>{const code=$('language-results').value;if(code){$('language-dialog').close();chooseLanguage(code);}};
$('language-results').ondblclick=()=>$('choose-language').click();
$('language-search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('choose-language').click();}};
$('close-language').onclick=()=>$('language-dialog').close();
$('snapshot').onchange=()=>{state.snapshot=$('snapshot').value;state.page=0;loadSnapshot();};
$('page-size').replaceChildren(...PAGE_SIZES.map(n=>{const o=node('option',String(n));o.value=String(n);return o;}));
$('page-size').onchange=()=>{const size=Number($('page-size').value);state.page=resizedPage(state.page,state.size,size);state.size=size;storePreference('wpw.pageSize',size);run();};
for(const b of document.querySelectorAll('[data-sort]'))b.onclick=()=>{const key=b.dataset.sort;state.dir=state.sort===key?(state.dir==='asc'?'desc':'asc'):(key==='count'?'desc':'asc');state.sort=key;state.page=0;run();};
$('previous').onclick=()=>{state.page--;run({paging:true});};$('next').onclick=()=>{state.page++;run({paging:true});};
window.onpopstate=()=>{state=parseState(location.href,readPreference('wpw.pageSize',50));loadSnapshot();};
json('catalog.json').then(c=>{catalog=c;$('snapshot').replaceChildren(...c.snapshots.map(s=>{const o=node('option',s.label);o.value=s.id;return o;}));return loadSnapshot();}).catch(error);
