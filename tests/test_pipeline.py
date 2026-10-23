import collections, gzip, json, sqlite3, tempfile, unittest
from pathlib import Path
from wpw.pipeline import *

class PipelineTests(unittest.TestCase):
    def fixture(self,base,broken=False):
        panel=['en','vi','simple']
        data={
          'en':[{'lang_code':'vi','word':'nước'},{'lang_code':'vi','word':'nước','pos':'verb'},
                {'lang_code':'en','word':'water','translations':[{'lang_code':'vi','word':'ignored'}]},
                {'lang_code':'vi','word':'á'},{'lang_code':'vi','word':'a\u0301'},
                {'lang_code':'vi','word':'A'},{'lang_code':'vi','word':'a'},
                {'title':'x','redirect':'y'},{'lang_code':'unknown','word':'x'}],
          'vi':[{'lang_code':'vi','word':'nước'},{'lang_code':'en','word':'water','senses':[]},
                {'lang_code':'vi','word':'form','senses':[{'form_of':[{'word':'lemma'}]}]}],
          'simple':[{'lang_code':'en','word':'water'},{'lang_code':'en','word':'tie'},
                    {'lang_code':'vi','word':'form'},{'lang_code':'cmn','word':'同'},{'lang_code':'zh','word':'同'}]}
        sources=[];paths={}
        for e,rows in data.items():
            if broken and e=='vi': rows.append({'word':'broken'})
            p=base/f'{e}.jsonl';p.write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in rows),encoding='utf-8')
            counts=dict(collections.Counter(x.get('lang_code','(missing)') for x in rows))
            sources.append(dict(id=e,adapter=ADAPTER,archive_bytes=p.stat().st_size,archive_sha256=sha256(p),expected_records=len(rows),expected_languages=counts,expected_redirects=sum('redirect' in x for x in rows),dump_date='2000-01-01',extraction_date='2000-01-02',retrieval_date='2000-01-03',url='https://example.invalid/'+e))
            paths[e]=str(p)
        m=dict(schema_version=1,adapter_version=ADAPTER,policy_version=POLICY,normalization='none',panel=panel,sources=sources,unassigned_language_codes=['unknown'],snapshot_id='fixture',assembled_on='2000-01-04')
        write_json(base/'manifest.json',m);write_json(base/'paths.json',paths)
        return m
    def test_identity_contract_and_additive_fields(self):
        self.assertEqual(identity({'lang_code':'vi','word':'á','future':{'any':1}}),('vi','á'))
        self.assertIsNone(identity({'title':'x','redirect':'y','pos':'soft-redirect'}))
        for x in [{},[],{'word':'x'},{'word':4,'lang_code':'en'},{'word':'','lang_code':'en'},{'word':'x','lang_code':None}]:
            with self.assertRaises(ValueError):identity(x)
    def test_all_semantics_and_determinism(self):
        with tempfile.TemporaryDirectory() as td:
            b=Path(td);m=self.fixture(b)
            db=b/'presence.sqlite';ingest(b/'manifest.json',b/'paths.json',db,b/'checks')
            # Re-run must resume without counting votes again.
            ingest(b/'manifest.json',b/'paths.json',db,b/'checks')
            results=[]
            for name in ['one.sqlite','two.sqlite']:
                build_scores(db,b/name);c=sqlite3.connect(b/name)
                results.append(c.execute('SELECT * FROM scores ORDER BY lang,word').fetchall());c.close()
            self.assertEqual(results[0],results[1])
            rows={(r[0],r[1]):r for r in results[0]}
            self.assertEqual(rows['vi','nước'][3:7],(2,1,1,3))
            self.assertEqual(rows['vi','form'][3:6],(2,1,1))
            self.assertEqual(rows['vi','a'][4],3) # competition ties 1,1,3
            self.assertEqual(rows['en','water'][3:6],(3,1,2)) # Simple retains independent vote
            for w in ['á','a\u0301','A','a']:self.assertIn(('vi',w),rows)
            self.assertNotIn(('vi','ignored'),rows);self.assertNotIn(('vi','lemma'),rows)
            self.assertIn(('cmn','同'),rows);self.assertIn(('zh','同'),rows)
            self.assertNotIn(('unknown','x'),rows)
            self.assertTrue(all(1<=r[3]<=3 for r in results[0]))
            self.assertEqual(evidence_ids(rows['vi','nước'][2],m['panel']),['en','vi'])
    def test_failure_does_not_become_zero_or_partial_votes(self):
        with tempfile.TemporaryDirectory() as td:
            b=Path(td);self.fixture(b,broken=True);db=b/'p.sqlite'
            with self.assertRaises(ValueError):ingest(b/'manifest.json',b/'paths.json',db,b/'checks')
            c=sqlite3.connect(db)
            self.assertEqual(dict(c.execute('select edition,status from sources')),{'en':'complete','vi':'failed','simple':'unprocessed'})
            self.assertEqual(c.execute('select count(*) from presence where edition=1').fetchone()[0],0);c.close()
            with self.assertRaises(ValueError):build_scores(db,b/'bad.sqlite')
    def test_distribution_guard(self):
        with tempfile.TemporaryDirectory() as td:
            b=Path(td);m=self.fixture(b);m['sources'][0]['expected_languages']['vi']+=1;write_json(b/'manifest.json',m)
            with self.assertRaisesRegex(ValueError,'distribution changed'):ingest(b/'manifest.json',b/'paths.json',b/'p.sqlite',b/'checks')
    def test_checksum_guard(self):
        with tempfile.TemporaryDirectory() as td:
            b=Path(td);m=self.fixture(b);(b/'en.jsonl').write_text('{}\n',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'checksum'):ingest(b/'manifest.json',b/'paths.json',b/'p.sqlite',b/'checks')
    def test_deterministic_gzip(self):
        with tempfile.TemporaryDirectory() as td:
            b=Path(td)
            for n in ['a.gz','b.gz']:
                with DeterministicGzip(b/n) as f:f.write('á\n')
            self.assertEqual((b/'a.gz').read_bytes(),(b/'b.gz').read_bytes())
if __name__=='__main__':unittest.main()
