"""Census candidate input bytes for human review; does not approve a new source manifest."""
import argparse,collections,gzip,hashlib,json
from pathlib import Path
from .pipeline import ADAPTER,identity,sha256,write_json

def inspect(archive,output):
    path=Path(archive);counts=collections.Counter();redirects=0;errors=[];samples={};line_no=0;h=hashlib.sha256();error_count=0
    opener=gzip.open if path.suffix=='.gz' else open
    with opener(path,'rb') as f:
        for line_no,line in enumerate(f,1):
            h.update(line)
            try:obj=json.loads(line);pair=identity(obj)
            except Exception as exc:
                error_count+=1
                if len(errors)<50:errors.append(dict(line=line_no,error=str(exc)))
                continue
            if pair is None:redirects+=1;counts['(missing)']+=1
            else:
                lang,word=pair;counts[lang]+=1
                if lang not in samples:samples[lang]=dict(word=word,line=line_no)
    write_json(output,dict(adapter=ADAPTER,review_required=True,archive_sha256=sha256(path),archive_bytes=path.stat().st_size,raw_sha256=h.hexdigest(),expected_records=line_no,expected_languages=dict(counts),expected_redirects=redirects,invalid_records=error_count,error_samples=errors,language_samples=samples))
    if error_count:raise SystemExit(f'{error_count} invalid records: candidate is incompatible')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--archive',required=True);p.add_argument('--output',required=True);a=p.parse_args();inspect(a.archive,a.output)
