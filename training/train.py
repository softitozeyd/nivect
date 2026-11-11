"""Train only after a reviewed, physically independent dataset split is supplied.

Example: python training/train.py --data data/pet/data.yaml --manifest data/pet/manifest.csv
Manifest columns: image,split,bottle_id,session_id (image relative to manifest directory).
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
from datetime import datetime,timezone

CLASSES=['bottle','underfill','missing_cap','loose_cap']


def audit_manifest(path):
    root=path.parent.resolve()
    rows=list(csv.DictReader(path.read_text().splitlines()))
    if not rows or not {'image','split','bottle_id','session_id'}<=rows[0].keys():
        raise ValueError('Manifest requires image,split,bottle_id,session_id')
    groups={};seen={};counts={s:0 for s in ('train','val','test')};images=set()
    for row in rows:
        split=row['split']
        if split not in counts:raise ValueError('Invalid split')
        image=(root/row['image']).resolve()
        if not image.is_relative_to(root) or not image.is_file():raise ValueError('Image escapes dataset or is missing')
        if image in images:raise ValueError('Duplicate image path in manifest')
        images.add(image)
        for key in ('bottle_id','session_id'):
            if not row[key].strip():raise ValueError('Physical bottle and session identifiers are required')
            group=(key,row[key]);prior=groups.setdefault(group,split)
            if prior!=split:raise ValueError(f'{key} occurs in multiple splits')
        digest=hashlib.sha256(image.read_bytes()).hexdigest()
        if digest in seen and seen[digest]!=split:raise ValueError('Identical image crosses split boundary')
        seen[digest]=split;counts[split]+=1
    if not all(counts.values()):raise ValueError('All three splits must be nonempty')
    return counts,images


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--data',type=Path,required=True)
    ap.add_argument('--manifest',type=Path,required=True)
    ap.add_argument('--checkpoint',type=Path,required=True,help='Trusted local pretrained checkpoint; no automatic download')
    ap.add_argument('--device',default='0')
    ap.add_argument('--epochs',type=int,default=80)
    ap.add_argument('--batch',type=int,default=8)
    ap.add_argument('--output',type=Path,default=Path('runtime/training'))
    args=ap.parse_args()
    counts,images=audit_manifest(args.manifest)
    if not args.checkpoint.is_file():ap.error('Trusted local checkpoint is required')
    import yaml
    import os
    os.environ.setdefault('YOLO_CONFIG_DIR',str(Path('runtime/model-config').resolve()))
    import ultralytics
    from ultralytics import YOLO
    data=yaml.safe_load(args.data.read_text())
    names=data['names'];names=list(names.values()) if isinstance(names,dict) else names
    if names!=CLASSES:ap.error('Dataset must use the canonical PET class order')
    # Enforce the audited manifest as the actual training input, instead of trusting unrelated YAML paths.
    args.output.mkdir(parents=True,exist_ok=True)
    manifest_rows=list(csv.DictReader(args.manifest.read_text().splitlines()))
    for split in counts:
        paths=[str((args.manifest.parent/r['image']).resolve()) for r in manifest_rows if r['split']==split]
        for path in paths:
            label=Path(path.replace('/images/','/labels/')).with_suffix('.txt')
            if not label.is_file():raise ValueError('YOLO label missing: '+label.name)
        (args.output/f'{split}.txt').write_text('\n'.join(paths)+'\n')
    prepared={s:str((args.output/f'{s}.txt').resolve()) for s in counts}
    prepared['names']=CLASSES
    dataset=args.output/'audited-data.yaml';dataset.write_text(yaml.safe_dump(prepared))
    model=YOLO(str(args.checkpoint))
    model.train(data=str(dataset),epochs=args.epochs,imgsz=960,batch=args.batch,device=args.device,
                seed=42,deterministic=True,workers=4,patience=20,project=str(args.output),name='pet',exist_ok=False)
    best=Path(model.trainer.save_dir)/'weights/best.pt'
    result=YOLO(str(best)).val(data=str(dataset),split='test',imgsz=960,device=args.device)
    card=dict(createdAt=datetime.now(timezone.utc).isoformat(),classes=CLASSES,counts=counts,
              datasetManifestSha256=hashlib.sha256(args.manifest.read_bytes()).hexdigest(),
              weightsSha256=hashlib.sha256(best.read_bytes()).hexdigest(),ultralytics=ultralytics.__version__,
              testMetrics=result.results_dict,fieldApproved=False)
    (best.parent.parent/'model-card.json').write_text(json.dumps(card,indent=2))
    print('Training complete. Field approval is still required:',best)

if __name__=='__main__':main()
