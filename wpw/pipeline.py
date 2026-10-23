"""Offline Kaikki JSONL -> distinct presences -> ranked snapshots. Python 3.11+."""
from __future__ import annotations
import argparse, collections, csv, gzip, hashlib, io, json, os, platform, shutil, sqlite3, sys, time
from pathlib import Path
VERSION = '0.1.0'
ADAPTER = 'kaikki-jsonl-v1'
POLICY = 'exact-inclusive-v1'

def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))

def write_json(path, value):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n', encoding='utf-8', newline='\n')

def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(8 << 20), b''): h.update(b)
    return h.hexdigest()

def validate_manifest(m):
    if m['schema_version'] != 1 or m['adapter_version'] != ADAPTER or m['policy_version'] != POLICY:
        raise ValueError('Unsupported manifest/adapter/policy version')
    p = m['panel']; ids = [s['id'] for s in m['sources']]
    if not p or len(p) != len(set(p)) or len(p) > 52 or ids != p:
        raise ValueError('Sources must occur once each, in exact panel order (at most 52 editions for exact browser integer masks)')
    for s in m['sources']:
        for k in ['archive_sha256', 'archive_bytes', 'expected_records', 'expected_languages', 'expected_redirects', 'dump_date', 'extraction_date', 'retrieval_date', 'url']:
            if k not in s: raise ValueError(f'Missing source field {k}: {s["id"]}')
        if s.get('adapter') != ADAPTER: raise ValueError('Unsupported source adapter')
    if m.get('normalization') != 'none': raise ValueError('Unsupported normalization')
    return m

def identity(obj):
    """Only top-level word/lang_code identify entries; never recurse into translations/forms."""
    if not isinstance(obj, dict): raise ValueError('Each JSONL record must be an object')
    if 'word' not in obj and 'lang_code' not in obj and isinstance(obj.get('title'), str) and isinstance(obj.get('redirect'), str):
        return None
    for k in ('lang_code', 'word'):
        if not isinstance(obj.get(k), str) or not obj[k]: raise ValueError(f'Missing/invalid required entry field {k}')
        if '\x00' in obj[k] or any(0xD800 <= ord(c) <= 0xDFFF for c in obj[k]):
            raise ValueError(f'Invalid Unicode/NUL in {k}')
    return obj['lang_code'], obj['word']

def connect(path):
    c = sqlite3.connect(path)
    c.execute('PRAGMA journal_mode=DELETE')
    c.execute('PRAGMA synchronous=NORMAL')
    c.execute('PRAGMA cache_size=-131072')
    c.execute('PRAGMA temp_store=FILE')
    return c

def initialize(c, m):
    c.executescript("""
    CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sources(edition TEXT PRIMARY KEY,status TEXT NOT NULL,report TEXT);
    CREATE TABLE IF NOT EXISTS presence(lang TEXT NOT NULL,word TEXT NOT NULL,edition INTEGER NOT NULL,
        records INTEGER NOT NULL,first_line INTEGER NOT NULL,
        PRIMARY KEY(lang,word,edition)) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS language_labels(lang TEXT,label TEXT,edition INTEGER,
        PRIMARY KEY(lang,label,edition)) WITHOUT ROWID;
    """)
    serialized = json.dumps(m, ensure_ascii=False, sort_keys=True)
    old = c.execute("SELECT value FROM meta WHERE key='manifest'").fetchone()
    if old and old[0] != serialized: raise ValueError('Database belongs to a different frozen manifest')
    c.execute("INSERT OR IGNORE INTO meta VALUES('manifest',?)", (serialized,))
    for s in m['sources']: c.execute('INSERT OR IGNORE INTO sources VALUES(?,?,NULL)', (s['id'],'unprocessed'))
    c.commit()

def ingest(manifest, paths, database, checkpoint):
    m = validate_manifest(read_json(manifest)); paths = read_json(paths)
    c = connect(database); initialize(c,m); checkpoint = Path(checkpoint); checkpoint.mkdir(parents=True,exist_ok=True)
    for idx,s in enumerate(m['sources']):
        e=s['id']; state=c.execute('SELECT status FROM sources WHERE edition=?',(e,)).fetchone()[0]
        if state=='complete': print(e,'already complete',flush=True); continue
        path=Path(paths[e]); t=time.monotonic()
        report=dict(edition=e,adapter=ADAPTER,status='processing')
        c.execute('UPDATE sources SET status=?,report=NULL WHERE edition=?',('processing',e)); c.commit()
        try:
            if path.stat().st_size != s['archive_bytes'] or sha256(path) != s['archive_sha256']:
                raise ValueError('Archive size/checksum does not match frozen manifest')
            counts=collections.Counter(); excluded=collections.Counter(); batch={}; labels=set(); line_no=0; rawhash=hashlib.sha256(); samples={}
            # All changes for this source commit together; an interrupted/failed source never contributes partial votes.
            c.execute('DELETE FROM presence WHERE edition=?',(idx,)); c.execute('DELETE FROM language_labels WHERE edition=?',(idx,))
            def flush():
                c.executemany('INSERT INTO presence VALUES(?,?,?,?,?) ON CONFLICT(lang,word,edition) DO UPDATE SET records=records+excluded.records,first_line=MIN(first_line,excluded.first_line)',
                              ((l,w,idx,n,line) for (l,w),(n,line) in sorted(batch.items())))
                batch.clear()
            opener=gzip.open if path.suffix=='.gz' else open
            with opener(path,'rb') as f:
                for line_no,line in enumerate(f,1):
                    rawhash.update(line)
                    try: obj=json.loads(line); pair=identity(obj)
                    except Exception as exc: raise ValueError(f'{e} line {line_no}: {exc}') from exc
                    if pair is None: counts['(missing)']+=1; excluded['unscoped_redirect']+=1; continue
                    lang,word=pair; counts[lang]+=1
                    if lang in m.get('unassigned_language_codes',['unknown']):
                        excluded['unassigned_language']+=1; continue
                    label=obj.get('lang')
                    if isinstance(label,str) and label: labels.add((lang,label,idx))
                    if lang not in samples: samples[lang]=dict(line=line_no,word=word,lang_code=lang)
                    if pair in batch: batch[pair][0]+=1
                    else: batch[pair]=[1,line_no]
                    if len(batch)>=50000: flush()
                    if line_no % 500000 == 0:
                        print(e,line_no,'records',round(time.monotonic()-t,1),'seconds',flush=True)
            flush()
            if line_no != s['expected_records']: raise ValueError(f'Record count changed: {line_no} != {s["expected_records"]}')
            if dict(counts) != s['expected_languages']:
                diff={k:[s['expected_languages'].get(k,0),counts.get(k,0)] for k in set(counts)|set(s['expected_languages']) if counts.get(k,0)!=s['expected_languages'].get(k,0)}
                raise ValueError(f'Language distribution changed: {str(diff)[:3000]}')
            if excluded['unscoped_redirect'] != s['expected_redirects']: raise ValueError('Redirect distribution changed')
            if s.get('raw_sha256') and rawhash.hexdigest()!=s['raw_sha256']: raise ValueError('Raw-stream checksum changed')
            c.executemany('INSERT OR IGNORE INTO language_labels VALUES(?,?,?)',sorted(labels))
            report.update(status='complete',records=line_no,archive_sha256=s['archive_sha256'],raw_sha256=rawhash.hexdigest(),languages=dict(counts),excluded=dict(excluded),samples=samples)
            c.execute('UPDATE sources SET status=?,report=? WHERE edition=?',('complete',json.dumps(report,ensure_ascii=False,sort_keys=True),e)); c.commit()
            write_json(checkpoint/f'{e}.json',report)
            print(e,'COMPLETE',line_no,round(time.monotonic()-t,1),'seconds',flush=True)
        except BaseException as exc:
            c.rollback(); report.update(status='failed',error=str(exc))
            c.execute('UPDATE sources SET status=?,report=? WHERE edition=?',('failed',json.dumps(report),e));c.commit()
            write_json(checkpoint/f'{e}.json',report);c.close();raise
    c.close()

def build_scores(database, output, allow_partial=False):
    output=Path(output)
    if output.exists(): raise ValueError('Refusing to overwrite snapshot database; choose a new path')
    c=connect(database);m=json.loads(c.execute("SELECT value FROM meta WHERE key='manifest'").fetchone()[0])
    statuses=dict(c.execute('SELECT edition,status FROM sources'))
    complete=all(v=='complete' for v in statuses.values())
    if not complete and not allow_partial:
        c.close(); raise ValueError('Incomplete coverage; refusing final snapshot')
    out=connect(output)
    out.executescript("""
    CREATE TABLE scores(lang TEXT NOT NULL,word TEXT NOT NULL,edition_mask INTEGER NOT NULL,
      count INTEGER NOT NULL,tied_rank INTEGER NOT NULL,foreign_only_count INTEGER NOT NULL,
      record_count INTEGER NOT NULL,PRIMARY KEY(lang,word)) WITHOUT ROWID;
    CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE sources(edition TEXT PRIMARY KEY,status TEXT NOT NULL,report TEXT);
    CREATE TABLE languages(code TEXT PRIMARY KEY,words INTEGER NOT NULL,labels_json TEXT NOT NULL);
    """)
    out.execute('ATTACH DATABASE ? AS derived',(str(Path(database).resolve()),))
    own='CASE lang '+' '.join("WHEN '"+e.replace("'","''")+"' THEN "+str(1<<i) for i,e in enumerate(m['panel']) if e!='simple')+' ELSE 0 END'
    out.execute(f"""
    INSERT INTO scores
    SELECT lang,word,mask,n,RANK() OVER(PARTITION BY lang ORDER BY n DESC),
           n-CASE WHEN (mask & ({own}))!=0 THEN 1 ELSE 0 END,records
    FROM (SELECT lang,word,SUM(1<<edition) AS mask,COUNT(*) AS n,SUM(records) AS records
          FROM derived.presence GROUP BY lang,word)
    """)
    out.execute('CREATE INDEX scores_rank ON scores(lang,count DESC,word)')
    for lang,n in out.execute('SELECT lang,COUNT(*) FROM scores GROUP BY lang').fetchall():
        labels=[x[0] for x in c.execute('SELECT DISTINCT label FROM language_labels WHERE lang=? ORDER BY label',(lang,))]
        out.execute('INSERT INTO languages VALUES(?,?,?)',(lang,n,json.dumps(labels,ensure_ascii=False)))
    for row in c.execute('SELECT * FROM sources'): out.execute('INSERT INTO sources VALUES(?,?,?)',row)
    out.executemany('INSERT INTO meta VALUES(?,?)', [('manifest',json.dumps(m,ensure_ascii=False,sort_keys=True)),('coverage','complete' if complete else 'partial; scores are observed lower bounds'),('pipeline_version',VERSION),('sqlite_version',sqlite3.sqlite_version)])
    out.commit();out.close();c.close()

class DeterministicGzip:
    def __init__(self,path): self.path=Path(path)
    def __enter__(self):
        self.raw=self.path.open('wb'); self.gz=gzip.GzipFile(filename='',mode='wb',fileobj=self.raw,mtime=0,compresslevel=6)
        self.text=io.TextIOWrapper(self.gz,encoding='utf-8',newline='');return self.text
    def __exit__(self,*args): self.text.close();self.raw.close()

def evidence_ids(mask,panel): return [e for i,e in enumerate(panel) if mask & (1<<i)]

def main():
    p=argparse.ArgumentParser(description=__doc__); sub=p.add_subparsers(dest='cmd',required=True)
    a=sub.add_parser('ingest');a.add_argument('--manifest',required=True);a.add_argument('--paths',required=True);a.add_argument('--database',required=True);a.add_argument('--checkpoints',required=True)
    a=sub.add_parser('score');a.add_argument('--database',required=True);a.add_argument('--output',required=True);a.add_argument('--allow-partial',action='store_true')
    a=p.parse_args()
    if a.cmd=='ingest':ingest(a.manifest,a.paths,a.database,a.checkpoints)
    elif a.cmd=='score':build_scores(a.database,a.output,a.allow_partial)
if __name__=='__main__':main()
