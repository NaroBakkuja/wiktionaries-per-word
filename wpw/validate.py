"""Validate archived comparison semantics before accepting the new inclusive snapshot."""
import argparse,csv,hashlib,json,sqlite3
from pathlib import Path
from .pipeline import read_json,write_json,sha256,evidence_ids

def legacy(database,en_csv,vi_csv,output):
    c=sqlite3.connect(Path(database).resolve().as_uri()+'?mode=ro',uri=True)
    m=json.loads(c.execute("SELECT value FROM meta WHERE key='manifest'").fetchone()[0]);panel=m['panel']
    assert dict(c.execute('SELECT edition,status FROM sources'))==dict.fromkeys(panel,'complete'),'Incomplete sources'
    report={'status':'passed','method':'Exact archived words, foreign-only counts, and contributing editions; no gloss vocabulary imported','comparisons':{}}
    for lang,path,countfield,idsfield in [('en',en_csv,'raw_count','edition_ids'),('vi',vi_csv,'foreign_count','foreign_edition_ids')]:
        idx=panel.index(lang)
        seen={w:mask for w,mask in c.execute('SELECT word,SUM(1<<edition) FROM presence WHERE lang=? AND edition!=? GROUP BY word',(lang,idx))}
        matched=0;zeros=0;issues=[];oldwords=set()
        with open(path,encoding='utf-8-sig',newline='') as f:
            for r in csv.DictReader(f):
                w=r['word'];oldwords.add(w);mask=seen.get(w,0);ids=';'.join(evidence_ids(mask,panel))
                if mask.bit_count()!=int(r[countfield]) or ids!=r[idsfield]:
                    if len(issues)<20:issues.append({'word':w,'expected_count':r[countfield],'actual_count':mask.bit_count(),'expected_ids':r[idsfield],'actual_ids':ids})
                matched+=1;zeros+=not mask
        extras=set(seen)-oldwords
        if issues or extras:raise AssertionError(f'{lang} legacy mismatch: {issues}, {len(extras)} unexpected observed forms')
        report['comparisons'][lang]={'rows_verified':matched,'zero_foreign_rows':zeros,'positive_foreign_words':len(seen),'comparison_csv_sha256':sha256(path),'unexpected_observed_forms':len(extras)}
    # Only after both historical comparisons pass, test inclusive counts.
    checks=[]
    for w,expected,foreign in [('nước',19,18),('công ty',9,8),('công ti',4,3)]:
        mask=c.execute('SELECT SUM(1<<edition) FROM presence WHERE lang=? AND word=?',('vi',w)).fetchone()[0]
        co=mask.bit_count();fc=co-int(bool(mask&(1<<panel.index('vi'))))
        assert (co,fc)==(expected,foreign),(w,co,fc)
        checks.append(dict(word=w,inclusive_count=co,foreign_only_count=fc,edition_ids=evidence_ids(mask,panel)))
    report['inclusive_vi_sanity']=checks
    report['complete_sources']=len(panel)
    report['source_records']=sum(json.loads(r[0])['records'] for r in c.execute('SELECT report FROM sources'))
    report['excluded']={e:json.loads(r)['excluded'] for e,r in c.execute('SELECT edition,report FROM sources')}
    c.close();write_json(output,report);print(json.dumps(report,ensure_ascii=False,indent=2))

def scores(database,output):
    c=sqlite3.connect(Path(database).resolve().as_uri()+'?mode=ro',uri=True)
    m=json.loads(c.execute("SELECT value FROM meta WHERE key='manifest'").fetchone()[0]);p=m['panel'];n=len(p)
    integrity=c.execute('PRAGMA integrity_check').fetchone()[0];assert integrity=='ok'
    bad=0;rows=0;languages=0;digest=hashlib.sha256();last_lang=None;count_hist={};largest=[]
    for lang,word,mask,count,rank,foreign,records in c.execute('SELECT * FROM scores ORDER BY lang,word'):
        if lang!=last_lang:
            if last_lang is not None:languages+=1
            last_lang=lang
            count_hist=dict(c.execute('SELECT count,COUNT(*) FROM scores WHERE lang=? GROUP BY count',(lang,)))
            expected_ranks={v:1+sum(nn for co,nn in count_hist.items() if co>v) for v in count_hist}
        own=1<<p.index(lang) if lang in p and lang!='simple' else 0
        assert 1<=count<=n and mask.bit_count()==count and mask < 1<<n
        assert rank==expected_ranks[count] and foreign==count-int(bool(mask&own))
        assert records>=count
        digest.update((json.dumps([lang,word,count,rank,mask,foreign,records],ensure_ascii=False,separators=(',',':'))+'\n').encode());rows+=1
    if rows:languages+=1
    report=dict(status='passed',sqlite_integrity=integrity,words=rows,languages=languages,panel=n,canonical_rows_sha256=digest.hexdigest(),range_mask_ties_foreign_records='all rows verified')
    report['largest_languages']=[dict(code=l,words=n) for l,n in c.execute('SELECT code,words FROM languages ORDER BY words DESC LIMIT 10')]
    write_json(output,report);c.close();print(json.dumps(report,indent=2))

def samples(database,checkpoints,retained_database,output):
    # Independent retained raw JSON cross-check. The build itself uses raw archives only.
    source=sqlite3.connect(Path(retained_database).resolve().as_uri()+'?mode=ro&immutable=1',uri=True)
    c=sqlite3.connect(Path(database).resolve().as_uri()+'?mode=ro',uri=True);report=[]
    for p in sorted(Path(checkpoints).glob('*.json')):
        d=read_json(p);e=d['edition']
        if e=='en':continue
        keys=sorted(d['samples']);chosen=sorted(set(keys[::max(1,len(keys)//5)]+(['en'] if 'en' in keys else [])+(['vi'] if 'vi' in keys else [])))
        for code in chosen:
            s=d['samples'][code]
            row=source.execute('SELECT word,lang_code,raw_json FROM entries WHERE edition_id=? AND line_no=?',(e,s['line'])).fetchone();assert row is not None
            obj=json.loads(row[2]);assert (row[0],row[1])==(s['word'],code)==(obj.get('word'),obj.get('lang_code'))
            report.append(dict(edition=e,raw_line=s['line'],word=s['word'],language_code=code,status='matched'))
    write_json(output,dict(status='passed',samples=len(report),method='Archive-built source samples checked against independently retained original JSON rows; no glosses copied',rows=report))
    source.close();c.close();print('SOURCE SAMPLES PASSED',len(report))

if __name__=='__main__':
    p=argparse.ArgumentParser();s=p.add_subparsers(dest='cmd',required=True)
    a=s.add_parser('legacy');a.add_argument('--database',required=True);a.add_argument('--en-csv',required=True);a.add_argument('--vi-csv',required=True);a.add_argument('--output',required=True)
    a=s.add_parser('scores');a.add_argument('--database',required=True);a.add_argument('--output',required=True)
    a=s.add_parser('samples');a.add_argument('--database',required=True);a.add_argument('--checkpoints',required=True);a.add_argument('--retained-database',required=True);a.add_argument('--output',required=True)
    a=vars(p.parse_args());cmd=a.pop('cmd');globals()[cmd](**a)
