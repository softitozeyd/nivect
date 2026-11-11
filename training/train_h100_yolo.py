"""One YOLO11m model; independent capture-group development validation; camera export."""
from pathlib import Path
from collections import Counter
import argparse,csv,hashlib,json,math,os,sys,shutil,zipfile

CLASSES=['bottle','underfill','missing_cap','loose_cap']

def audit(root):
    rows=list(csv.DictReader((root/'manifest.csv').open(encoding='utf-8')))
    counts=Counter();groups={};hashes={};boxes={s:Counter() for s in ['train','val']}
    for r in rows:
        s=r['split'];assert s in boxes
        assert groups.setdefault(r['capture_group'],s)==s,'A capture/augmentation group crosses splits'
        p=(root/r['image']).resolve();label=(root/r['label']).resolve()
        assert p.is_relative_to(root.resolve()) and label.is_relative_to(root.resolve())
        digest=hashlib.sha256(p.read_bytes()).hexdigest();assert digest==r['image_sha256']
        assert hashes.setdefault(digest,s)==s,'Duplicate crosses splits'
        assert hashlib.sha256(label.read_bytes()).hexdigest()==r['label_sha256']
        ids=[]
        for line in label.read_text().splitlines():
            c,*coords=line.split();c=int(c);v=list(map(float,coords));assert c in range(4) and len(v)==4
            assert all(math.isfinite(x) and 0<=x<=1 for x in v) and v[2]>0 and v[3]>0
            assert v[0]-v[2]/2>=-1e-7 and v[0]+v[2]/2<=1+1e-7
            assert v[1]-v[3]/2>=-1e-7 and v[1]+v[3]/2<=1+1e-7
            ids.append(c);boxes[s][c]+=1
        if r['annotation_scope']=='neck_only':assert s=='train' and set(ids)=={2}
        else:assert ids.count(0)==1
        assert not (2 in ids and 3 in ids)
        counts[s]+=1
    assert counts['train'] and counts['val']
    assert all(boxes[s][i]>0 for s in boxes for i in range(4))
    return dict(counts),{s:{CLASSES[i]:c[i] for i in range(4)} for s,c in boxes.items()}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--data',type=Path,required=True)
    ap.add_argument('--output',type=Path);ap.add_argument('--epochs',type=int,default=80)
    ap.add_argument('--batch',type=int,default=16);ap.add_argument('--audit-only',action='store_true')
    args=ap.parse_args();root=args.data.resolve();counts,box_counts=audit(root)
    print('Data audit passed:',counts,box_counts,flush=True)
    print(f'1000 augmented images are training-only. Validation: {counts["val"]} images from a separate capture day.',flush=True)
    print('Validation is small development validation, not final field accuracy. Final trial must use new camera images.',flush=True)
    if args.audit_only:return
    if args.output is None:ap.error('--output required')
    import torch,yaml
    os.environ.setdefault('YOLO_CONFIG_DIR',str(root/'runtime-config'))
    import ultralytics
    from ultralytics import YOLO
    assert torch.cuda.is_available(),'Colab GPU secin.'
    gpu=torch.cuda.get_device_name(0);print('GPU:',gpu,flush=True)
    if torch.cuda.get_device_capability(0)[0]>=8:torch.set_float32_matmul_precision('high')
    args.output.mkdir(parents=True,exist_ok=False)
    config=yaml.safe_load((root/'data.yaml').read_text());config['path']=str(root)
    runtime=args.output/'runtime-data.yaml';runtime.write_text(yaml.safe_dump(config,sort_keys=False))
    weight=root/'weights/yolo11m.pt';source=json.loads((root/'weights/source.json').read_text())
    assert hashlib.sha256(weight.read_bytes()).hexdigest()==source['sha256']
    model=YOLO(str(weight))
    model.train(data=str(runtime),epochs=args.epochs,imgsz=960,batch=args.batch,device=0,
        seed=42,deterministic=True,workers=2,cache=False,amp=True,
        patience=20,cos_lr=True,freeze=10,
        project=str(args.output),name='run',exist_ok=False,
        mosaic=.5,close_mosaic=10,scale=.5,translate=.10,degrees=5,
        fliplr=.5,flipud=0,hsv_h=.01,hsv_s=.35,hsv_v=.35)
    best=Path(model.trainer.save_dir)/'weights/best.pt'
    trained=YOLO(str(best));assert [trained.names[i] for i in range(4)]==CLASSES
    result=trained.val(data=str(runtime),split='val',imgsz=960,device=0,
        project=str(args.output),name='development_validation',exist_ok=False,plots=True)
    card={'architecture':'YOLO11m','classes':CLASSES,'data_counts':counts,'box_counts':box_counts,
        'validation_metrics_development_only':result.results_dict,'validation_images':counts['val'],
        'checkpoint_selection':'best uses this small development validation set; not an independent test result',
        'final_test':'new live camera/video images required; no old 9-image test claim',
        'physical_bottle_identity_independence':'unknown across dates',
        'annotation_standard':'underfill = lower 80% bottle-body ROI whenever low-fill condition is labeled; source spatial boxes normalized, originals retained',
        'weights_sha256':hashlib.sha256(best.read_bytes()).hexdigest(),
        'manifest_sha256':hashlib.sha256((root/'manifest.csv').read_bytes()).hexdigest(),
        'ultralytics':ultralytics.__version__,'torch':torch.__version__,'gpu':gpu,
        'epochs_requested':args.epochs,'freeze_first_layers':10,'field_approved':False}
    (args.output/'model-card.json').write_text(json.dumps(card,indent=2,default=float),encoding='utf-8')
    export=args.output/'VisionQC-Kamera-Paketi';export.mkdir()
    shutil.copyfile(best,export/'best.pt')
    for file in ['camera_test.py','requirements.txt','KAMERA-TR.md','BASLAT.cmd']:shutil.copyfile(root/file,export/file)
    shutil.copyfile(args.output/'model-card.json',export/'model-card.json')
    archive=args.output/'VisionQC-Kamera-Paketi.zip'
    with zipfile.ZipFile(archive,'w') as z:
        for p in sorted(export.iterdir()):z.write(p,arcname='VisionQC-Kamera-Paketi/'+p.name,
            compress_type=zipfile.ZIP_STORED if p.suffix=='.pt' else zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(archive) as z:assert z.testzip() is None
    print('BEST:',best,flush=True);print('CAMERA_ZIP:',archive,flush=True)

if __name__=='__main__':main()
