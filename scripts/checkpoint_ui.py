"""Update a static explorer without changing frozen snapshot data or archives."""
import argparse,hashlib,json,shutil
from pathlib import Path

def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()
def read(path):return json.loads(path.read_text(encoding='utf-8'))
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf-8')
def record(root,path):return dict(path=path.relative_to(root).as_posix(),bytes=path.stat().st_size,sha256=digest(path))

def update(root,checkpoint,verify=False):
    root=Path(root).resolve();checkpoint=Path(checkpoint).resolve()
    repo=Path(__file__).resolve().parents[1]
    baseline_path=checkpoint/'artifact-inventory.json'
    baseline=read(baseline_path)
    # The snapshot tree is never a destination for this script.
    preserved=[f for f in baseline['files'] if f['path'].startswith('snapshots/')]
    for i,f in enumerate(preserved):
        p=(root/f['path']).resolve()
        if not p.is_relative_to(root/'snapshots'):raise ValueError('Unsafe inventory path')
        if p.stat().st_size!=f['bytes']:raise ValueError('Changed frozen file: '+f['path'])
        if verify and digest(p)!=f['sha256']:raise ValueError('Changed frozen hash: '+f['path'])
        if verify and i and i%10000==0:print(f'Verified {i} frozen files',flush=True)
    protected=read(checkpoint/'protected-data.json')
    for f in protected:
        p=Path(f['path'])
        if p.stat().st_size!=f['bytes'] or digest(p)!=f['sha256']:raise ValueError('Changed full download: '+str(p))
    for p in (repo/'web').iterdir():
        if p.is_file():shutil.copyfile(p,root/p.name)
    for name in ['METHODOLOGY.md','REBUILDING.md','VALIDATION.md']:
        shutil.copyfile(repo/'docs'/name,root/'documentation'/name)
    report=repo/'validation/ui-pagination-v2.json'
    if report.exists():shutil.copyfile(report,root/'validation'/report.name)
    overlay=dict(version='explorer-v2',baseline_inventory_sha256=digest(baseline_path),
        frozen_files=len(preserved),frozen_files_sha256_verified=verify,
        canonical_rows_sha256=baseline['canonical_rows_sha256'],
        full_download_checksums='unchanged',original_private_zip='unchanged; contains the original explorer',
        display_indexes=read(root/'ui-indexes/build-report.json'))
    write(root/'ui-overlay.json',overlay)
    files=list(preserved)
    for p in sorted(root.rglob('*')):
        if not p.is_file() or p.name=='artifact-inventory.json' or p.is_relative_to(root/'snapshots'):continue
        files.append(record(root,p))
    inventory={**baseline,'files':sorted(files,key=lambda f:f['path'])}
    inventory['total_bytes']=sum(f['bytes'] for f in files)
    write(root/'artifact-inventory.json',inventory)
    write(checkpoint/'ui-overlay.json',overlay)
    print(json.dumps(dict(status='updated',files=len(files),bytes=inventory['total_bytes'],**overlay),indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--checkpoint',required=True);p.add_argument('--verify-frozen',action='store_true');a=p.parse_args()
    update(a.root,a.checkpoint,a.verify_frozen)
