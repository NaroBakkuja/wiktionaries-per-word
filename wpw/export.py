"""Export deterministic downloadable data and static, globally ordered chunks."""
import argparse,csv,gzip,hashlib,json,shutil,sqlite3
from pathlib import Path
from .pipeline import read_json,write_json,sha256,DeterministicGzip,evidence_ids

HEADER=['language_code','word','count','tied_rank','foreign_only_count','edition_ids','edition_mask','record_count']
EVIDENCE=['language_code','word','edition_id','first_raw_line','record_count']

def export(scores,presence,output,web,chunk_size=2000):
    root=Path(output)
    if root.exists() and any(root.iterdir()):raise ValueError('Output must be new/empty')
    root.mkdir(parents=True,exist_ok=True)
    c=sqlite3.connect(Path(scores).resolve().as_uri()+'?mode=ro',uri=True)
    p=sqlite3.connect(Path(presence).resolve().as_uri()+'?mode=ro',uri=True)
    meta=dict(c.execute('SELECT * FROM meta'));m=json.loads(meta['manifest']);panel=m['panel'];sid=m['snapshot_id']
    for f in Path(web).iterdir():
        if f.is_file():shutil.copyfile(f,root/f.name)
    for name in ['LICENSE.md','docs/METHODOLOGY.md','docs/REBUILDING.md']:
        source=Path(web).resolve().parent/name
        if source.exists():
            dest=root/'documentation'/Path(name).name;dest.parent.mkdir(exist_ok=True);shutil.copyfile(source,dest)
    base=root/'snapshots'/sid;base.mkdir(parents=True)
    dl=base/'downloads';dl.mkdir(); chunks=base/'languages';chunks.mkdir()
    manifest=dict(m);manifest['coverage']=meta['coverage'];manifest['sources_status']=[dict(edition=e,status=s) for e,s in c.execute('SELECT edition,status FROM sources ORDER BY edition')]
    write_json(base/'manifest.json',manifest)
    processing=[]
    for edition,status,report in c.execute('SELECT * FROM sources ORDER BY edition'):
        detail=json.loads(report) if report else {};detail.pop('samples',None)
        processing.append(dict(edition=edition,status=status,detail=detail))
    write_json(base/'processing-report.json',processing)
    source_coverage=[(e,status,json.loads(report).get('languages',{}) if report else {}) for e,status,report in c.execute('SELECT * FROM sources ORDER BY edition')]
    languages=[];globalhash=hashlib.sha256();total=0
    with DeterministicGzip(dl/'full-scores.csv.gz') as allfile, DeterministicGzip(dl/'full-evidence.csv.gz') as alle:
        aw=csv.writer(allfile,lineterminator='\n');aw.writerow(HEADER)
        ew=csv.writer(alle,lineterminator='\n');ew.writerow(EVIDENCE)
        for index,(code,n,labels) in enumerate(c.execute('SELECT * FROM languages ORDER BY code')):
            lid=f'l{index:05d}';ldir=chunks/lid;ldir.mkdir()
            labelrow=p.execute('SELECT label FROM language_labels WHERE lang=? AND edition=? ORDER BY label LIMIT 1',(code,panel.index('en') if 'en' in panel else -1)).fetchone()
            names=json.loads(labels);name=labelrow[0] if labelrow else (names[0] if names else code)
            lang=dict(code=code,name=name,id=lid,words=n,labels=names)
            lm=dict(code=code,words=n,chunk_size=chunk_size,orders={},downloads=dict(scores=f'../../downloads/{lid}-scores.csv.gz',evidence=f'../../downloads/{lid}-evidence.csv.gz'))
            for order,sql in [('word','word'),('count','count DESC,word')]:
                part=[];listing=[];partno=0
                def flush():
                    nonlocal partno,part
                    path=ldir/f'{order}-{partno:05d}.json'
                    # Compact payload contains no glosses: word,count,rank,mask,foreign,record_count.
                    path.write_text(json.dumps(part,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
                    listing.append(dict(file=path.name,rows=len(part),first=part[0][0],last=part[-1][0],sha256=sha256(path),bytes=path.stat().st_size))
                    part=[];partno+=1
                with DeterministicGzip(dl/f'{lid}-scores.csv.gz') if order=='word' else _Null() as lf:
                    lw=csv.writer(lf,lineterminator='\n') if lf else None
                    if lw:lw.writerow(HEADER)
                    for w,co,rank,mask,foreign,records in c.execute(f'SELECT word,count,tied_rank,edition_mask,foreign_only_count,record_count FROM scores WHERE lang=? ORDER BY {sql}',(code,)):
                        row=[w,co,rank,mask,foreign,records];part.append(row)
                        if lw:
                            cr=[code,w,co,rank,foreign,';'.join(evidence_ids(mask,panel)),mask,records];lw.writerow(cr);aw.writerow(cr)
                            globalhash.update((json.dumps([code]+row,ensure_ascii=False,separators=(',',':'))+'\n').encode());total+=1
                        if len(part)==chunk_size:flush()
                    if part:flush()
                lm['orders'][order]=listing
            with DeterministicGzip(dl/f'{lid}-evidence.csv.gz') as ef:
                lw=csv.writer(ef,lineterminator='\n');lw.writerow(EVIDENCE)
                for w,edition,records,line in p.execute('SELECT word,edition,records,first_line FROM presence WHERE lang=? ORDER BY word,edition',(code,)):
                    er=[code,w,panel[edition],line,records];lw.writerow(er);ew.writerow(er)
            # Per-edition absence means unobserved in a processed extraction, never linguistic absence.
            lm['coverage']=[]
            for e,status,language_counts in source_coverage:
                count=language_counts.get(code) if status=='complete' else None
                if status=='complete':count=count or 0
                lm['coverage'].append(dict(edition=e,status=status,entry_records=count))
            write_json(ldir/'index.json',lm);languages.append(lang)
            if index%100==0:print('export',index,code,n,flush=True)
    write_json(base/'languages.json',languages)
    # SQLite carries explicit language codes, masks, tied ranks, source reports and provenance.
    with open(scores,'rb') as src,open(dl/'full-scores.sqlite.gz','wb') as raw:
        with gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0,compresslevel=6) as dst:shutil.copyfileobj(src,dst,8<<20)
    write_json(root/'catalog.json',dict(snapshots=[dict(id=sid,path=f'snapshots/{sid}',label=sid)],default_snapshot=sid))
    inventory=[]
    for f in sorted(root.rglob('*')):
        if f.is_file():inventory.append(dict(path=f.relative_to(root).as_posix(),bytes=f.stat().st_size,sha256=sha256(f)))
    report=dict(snapshot_id=sid,languages=len(languages),words=total,canonical_rows_sha256=globalhash.hexdigest(),total_bytes=sum(x['bytes'] for x in inventory),files=inventory)
    write_json(root/'artifact-inventory.json',report)
    c.close();p.close();print('EXPORT COMPLETE',len(languages),total,report['total_bytes'],flush=True)

class _Null:
    def __enter__(self):return None
    def __exit__(self,*a):pass
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--scores',required=True);a.add_argument('--presence',required=True);a.add_argument('--output',required=True);a.add_argument('--web',default='web');a.add_argument('--chunk-size',type=int,default=2000)
    x=a.parse_args();export(x.scores,x.presence,x.output,x.web,x.chunk_size)
