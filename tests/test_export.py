import csv,gzip,json,sqlite3,tempfile,unittest
from pathlib import Path
import test_pipeline
from wpw.pipeline import ingest,build_scores,read_json,sha256
from wpw.export import export

class ExportTests(unittest.TestCase):
    def test_exports_are_complete_and_byte_reproducible(self):
        with tempfile.TemporaryDirectory() as td:
            b=Path(td);test_pipeline.PipelineTests().fixture(b);ingest(b/'manifest.json',b/'paths.json',b/'p.sqlite',b/'checks');build_scores(b/'p.sqlite',b/'s.sqlite')
            for name in ['first','second']:export(b/'s.sqlite',b/'p.sqlite',b/name,Path(__file__).resolve().parents[1]/'web',2)
            a=read_json(b/'first/artifact-inventory.json');z=read_json(b/'second/artifact-inventory.json');self.assertEqual(a,z)
            base=b/'first/snapshots/fixture'
            with gzip.open(base/'downloads/full-scores.csv.gz','rt',encoding='utf-8',newline='') as f:rows=list(csv.DictReader(f))
            self.assertEqual(len(rows),a['words']);self.assertEqual(len({(x['language_code'],x['word']) for x in rows}),len(rows))
            langs=read_json(base/'languages.json')
            for lang in langs:
                d=base/'languages'/lang['id'];m=read_json(d/'index.json');word=[];count=[]
                for order,target in [('word',word),('count',count)]:
                    for item in m['orders'][order]:
                        rr=read_json(d/item['file']);self.assertEqual(item['sha256'],sha256(d/item['file']));target.extend(rr)
                self.assertEqual(word,sorted(word,key=lambda x:x[0]));self.assertEqual(count,sorted(word,key=lambda x:(-x[1],x[0])))
                self.assertEqual(len(word),lang['words'])
            vi=next(x for x in langs if x['code']=='vi');coverage=read_json(base/'languages'/vi['id']/'index.json')['coverage'];self.assertTrue(all(x['status']=='complete' for x in coverage))
if __name__=='__main__':unittest.main()
