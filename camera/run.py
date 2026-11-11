"""PC webcam/file adapter. Run: python -m camera.run --weights /path/to/best.pt"""
import argparse
import os
import time
from pathlib import Path
from camera.engine import CLASSES,BottleGate,Outbox,observation
from camera.client import Backend


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--weights',required=True)
    parser.add_argument('--source',default='0',help='0 = PC camera; or video path / RTSP URL')
    parser.add_argument('--backend',default='http://127.0.0.1:8080')
    parser.add_argument('--line',default='line-1')
    parser.add_argument('--camera',default='pc-1')
    parser.add_argument('--outbox',default='runtime/camera-outbox.sqlite3')
    parser.add_argument('--no-window',action='store_true')
    parser.add_argument('--max-frames',type=int,default=0)
    args=parser.parse_args()
    if not Path(args.weights).is_file():
        parser.error('A trusted local trained weights file is required; automatic downloads are disabled.')
    if not os.environ.get('QC_INGEST_PASSWORD'):
        parser.error('Set QC_INGEST_PASSWORD through the local environment, not command arguments.')
    os.environ.setdefault('YOLO_CONFIG_DIR',str(Path('runtime/model-config').resolve()))
    import cv2
    from ultralytics import YOLO
    import hashlib
    model=YOLO(args.weights)
    if dict(model.names)!=dict(enumerate(CLASSES)):
        parser.error('Model class order must be bottle, underfill, missing_cap, loose_cap')
    version='pet-'+hashlib.sha256(Path(args.weights).read_bytes()).hexdigest()[:16]
    backend=Backend(args.backend,os.environ['QC_INGEST_PASSWORD'])
    outbox=Outbox(args.outbox)
    try:
        backend.login();backend.deliver(outbox)
    except Exception:
        print('Backend unavailable; committed local events remain in the outbox.')
    cap=cv2.VideoCapture(int(args.source) if args.source.isdigit() else args.source)
    if not cap.isOpened():
        raise SystemExit('Camera/source could not be opened. Check permission and camera selection.')
    gate=BottleGate();frames=0;last_retry=0
    try:
        while True:
            ok,frame=cap.read()
            if not ok:break
            res=model.predict(frame,conf=.25,imgsz=640,verbose=False)[0]
            item=observation([(CLASSES[int(b.cls.item())],float(b.conf.item()),b.xyxy[0].tolist()) for b in res.boxes],version)
            event=gate.observe(item)
            if event:
                event.update(lineCode=args.line,cameraId=args.camera)
                outbox.add(event)
                print('Queued bottle event',event['eventId'])
            if time.monotonic()-last_retry>5:
                try:
                    backend.login();backend.deliver(outbox)
                except Exception:
                    print('Delivery pending; retrying the same event IDs later.')
                last_retry=time.monotonic()
            if not args.no_window:
                cv2.imshow('Nivect PET | q: exit',res.plot())
                if cv2.waitKey(1)&0xff==ord('q'):break
            frames+=1
            if args.max_frames and frames>=args.max_frames:break
    finally:
        cap.release()
        if not args.no_window:cv2.destroyAllWindows()
        outbox.close()
    print(f'{frames} frames inspected; pending events persist on disk.')

if __name__=='__main__':main()
