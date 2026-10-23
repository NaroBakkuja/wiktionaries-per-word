// Build display-only row permutations from frozen word chunks. No raw data or scores are changed.
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {collationFor} from '../web/query.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function write(p,d){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');}
export function buildLanguage(root,snapshot,lang,output) {
  const src=path.join(root,snapshot.path,'languages',lang.id),indexBytes=fs.readFileSync(path.join(src,'index.json')),index=JSON.parse(indexBytes),words=[],counts=[];
  const dest=path.join(output,lang.id);
  if(fs.existsSync(path.join(dest,'index.json'))) {
    const previous=read(path.join(dest,'index.json'));
    if(previous.version!==1||previous.source_index_sha256!==sha(indexBytes)||previous.icu!==process.versions.icu||previous.node!==process.version)throw Error('Existing index belongs to another source/runtime');
    for(const f of Object.values(previous.files)){const bytes=fs.readFileSync(path.join(dest,f.file));if(sha(bytes)!==f.sha256)throw Error('Existing index checksum mismatch');}
    return previous;
  }
  for(const part of index.orders.word) {
    const raw=fs.readFileSync(path.join(src,part.file));if(sha(raw)!==part.sha256)throw Error('Frozen source chunk checksum mismatch');
    for(const row of JSON.parse(raw)){words.push(row[0]);counts.push(row[1]);}
  }
  if(words.length!==index.words)throw Error('Source word count mismatch');
  const collation=collationFor(lang.code),ids=Array.from({length:words.length},(_,i)=>i);ids.sort((a,b)=>collation.compare(words[a],words[b]));
  const meta={version:1,code:lang.code,words:words.length,source_index_sha256:sha(indexBytes),node:process.version,icu:process.versions.icu,collation:{locale:collation.locale,options:collation.options,fallback:'Unicode scalar order'},files:{}};
  fs.mkdirSync(dest,{recursive:true});
  for(const name of ['word','count-desc','count-asc']) {
    const sorted=name==='word'?ids:[...ids].sort((a,b)=>name==='count-desc'?counts[b]-counts[a]:counts[a]-counts[b]);
    const bytes=Buffer.allocUnsafe(sorted.length*4);sorted.forEach((id,i)=>bytes.writeUInt32LE(id,i*4));
    const file=name+'.u32';fs.writeFileSync(path.join(dest,file),bytes);meta.files[name]={file,bytes:bytes.length,sha256:sha(bytes)};
  }
  write(path.join(dest,'index.json'),meta);return meta;
}
export function build(root) {
  const catalog=read(path.join(root,'catalog.json')),report={version:1,rows:0,languages:0,locale_languages:0,unicode_fallback_languages:0,index_bytes:0,node:process.version,icu:process.versions.icu,snapshots:[]};
  for(const snapshot of catalog.snapshots) {
    const languages=read(path.join(root,snapshot.path,'languages.json')),output=path.join(root,'ui-indexes',snapshot.id);fs.mkdirSync(output,{recursive:true});
    for(let i=0;i<languages.length;i++) {
      const meta=buildLanguage(root,snapshot,languages[i],output);report.rows+=meta.words;report.languages++;report[meta.collation.locale?'locale_languages':'unicode_fallback_languages']++;report.index_bytes+=meta.words*12;
      if(i%250===0)console.log('Alphabetical index',i,languages[i].code,languages[i].words);
    }
    report.snapshots.push(snapshot.id);
  }
  write(path.join(root,'ui-indexes','build-report.json'),report);
  // Refresh only the supplemental display entries in the inventory.
  const inventoryPath=path.join(root,'artifact-inventory.json');
  if(fs.existsSync(inventoryPath)) {
    const inventory=read(inventoryPath),files=inventory.files.filter(f=>!f.path.startsWith('ui-indexes/'));
    function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else{const bytes=fs.readFileSync(file);files.push({path:path.relative(root,file).split(path.sep).join('/'),bytes:bytes.length,sha256:sha(bytes)});}}}
    visit(path.join(root,'ui-indexes'));files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
    inventory.files=files;inventory.total_bytes=files.reduce((sum,f)=>sum+f.bytes,0);write(inventoryPath,inventory);
  }
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))) {
  const arg=process.argv.indexOf('--root');if(arg<0)throw Error('Use --root PATH');console.log(JSON.stringify(build(path.resolve(process.argv[arg+1])),null,2));
}
