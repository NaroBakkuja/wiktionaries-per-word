"""Finalize a private local bundle. Never publishes or contacts GitHub."""
import argparse,hashlib,json,platform,shutil,sqlite3,subprocess,sys,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from wpw.pipeline import read_json,write_json,sha256

def package(root,archive):
    root=Path(root);archive=Path(archive);repo=Path(__file__).resolve().parents[1]
    if archive.exists():raise ValueError('Refusing to overwrite existing bundle')
    inventory=read_json(root/'artifact-inventory.json')
    expected=read_json(repo/'validation/full-scores.json')
    assert inventory['canonical_rows_sha256']==expected['canonical_rows_sha256']
    # Verify the exporter inventory before refreshing documentation and final web source.
    for f in inventory['files']:
        p=root/f['path'];assert p.stat().st_size==f['bytes'] and sha256(p)==f['sha256'],f['path']
    for p in (repo/'web').iterdir():
        if p.is_file():shutil.copyfile(p,root/p.name)
    for p in [repo/'LICENSE.md',repo/'docs/METHODOLOGY.md',repo/'docs/REBUILDING.md',repo/'docs/VALIDATION.md']:
        shutil.copyfile(p,root/'documentation'/p.name)
    (root/'validation').mkdir(exist_ok=True)
    for p in (repo/'validation').glob('*.json'):
        if p.name != 'delivery.json':shutil.copyfile(p,root/'validation'/p.name)
    files=[]
    for p in sorted(root.rglob('*')):
        if p.is_file() and p.name!='artifact-inventory.json':files.append(dict(path=p.relative_to(root).as_posix(),bytes=p.stat().st_size,sha256=sha256(p)))
    inventory['files']=files;inventory['total_bytes']=sum(f['bytes'] for f in files);write_json(root/'artifact-inventory.json',inventory)
    archive.parent.mkdir(parents=True,exist_ok=True)
    catalog=read_json(root/'catalog.json');snapshot=next(x for x in catalog['snapshots'] if x['id']==catalog['default_snapshot'])
    stamp=tuple(map(int,read_json(root/snapshot['path']/'manifest.json')['assembled_on'].split('-')))+(0,0,0)
    with zipfile.ZipFile(archive,'w',allowZip64=True,compresslevel=6) as z:
        for p in sorted(root.rglob('*')):
            if not p.is_file():continue
            info=zipfile.ZipInfo(p.relative_to(root).as_posix(),date_time=stamp);info.compress_type=zipfile.ZIP_STORED if p.suffix=='.gz' else zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
            with z.open(info,'w',force_zip64=True) as dst,p.open('rb') as src:shutil.copyfileobj(src,dst,8<<20)
    with zipfile.ZipFile(archive) as z:
        bad=z.testzip();assert bad is None,bad
    result=dict(status='locally_staged_private_not_published',archive=archive.name,archive_bytes=archive.stat().st_size,archive_sha256=sha256(archive),zip_crc_check='passed',artifact_files=len(files),uncompressed_staged_bytes=inventory['total_bytes'],words=inventory['words'],raw_language_codes=inventory['languages'],canonical_rows_sha256=inventory['canonical_rows_sha256'])
    write_json(repo/'validation/delivery.json',result);write_json(archive.with_suffix('.json'),result);print(json.dumps(result,indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--archive',required=True);a=p.parse_args();package(a.root,a.archive)
