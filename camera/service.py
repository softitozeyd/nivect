"""Local inference service for the VisionQC browser camera. No images are saved."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
import cv2
import numpy as np
import torch
from ultralytics import YOLO

parser = argparse.ArgumentParser()
parser.add_argument('--weights', required=True, type=Path)
parser.add_argument('--port', type=int, default=8765)
args = parser.parse_args()
model = YOLO(str(args.weights))
expected = ['bottle', 'underfill', 'missing_cap', 'loose_cap']
if model.task != 'detect' or [model.names[i] for i in sorted(model.names)] != expected:
    raise SystemExit('Expected bottle, underfill, missing_cap, loose_cap model.')
device = '0' if torch.cuda.is_available() else 'cpu'
inference_lock = Lock()
allowed = {'http://localhost:5197', 'http://127.0.0.1:5197'}

class Handler(BaseHTTPRequestHandler):
    def headers_for(self, status):
        self.send_response(status)
        origin = self.headers.get('Origin', '')
        if origin in allowed: self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Vary', 'Origin')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
    def do_OPTIONS(self):
        if self.headers.get('Origin') not in allowed:
            self.send_response(403); self.end_headers(); return
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    def do_POST(self):
        if self.path != '/predict' or self.headers.get('Origin') not in allowed:
            self.headers_for(403); self.wfile.write(b'{}'); return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 2_000_000: raise ValueError('Invalid image size')
            frame = cv2.imdecode(np.frombuffer(self.rfile.read(size), np.uint8), cv2.IMREAD_COLOR)
            if frame is None: raise ValueError('Invalid image')
            h, w = frame.shape[:2]
            with inference_lock:
                result = model.predict(frame, imgsz=960, conf=.15, device=device, verbose=False, max_det=30)[0]
            detections = [{'name': expected[int(c)], 'confidence': float(p), 'box': [float(v) for v in xy]}
                for c, p, xy in zip(result.boxes.cls.tolist(), result.boxes.conf.tolist(), result.boxes.xyxy.tolist())]
            bottles = [d for d in detections if d['name'] == 'bottle']
            decision, defects = 'REVIEW', []
            if len(bottles) == 1 and bottles[0]['confidence'] >= .5:
                x, y, a, b = bottles[0]['box']
                if min(x, w-a) >= .01*w and min(y, h-b) >= .01*h:
                    candidates = [d for d in detections if d['name'] != 'bottle' and x-.1*(a-x) <= (d['box'][0]+d['box'][2])/2 <= a+.1*(a-x) and y-.1*(b-y) <= (d['box'][1]+d['box'][3])/2 <= b+.1*(b-y)]
                    defects = sorted(set(d['name'] for d in candidates if d['confidence'] >= .35))
                    decision = 'FAIL' if defects else 'REVIEW' if candidates else 'PASS'
            payload = {'decision': decision, 'defects': defects, 'detections': detections, 'width': w, 'height': h, 'device': device}
            self.headers_for(200); self.wfile.write(json.dumps(payload).encode())
        except Exception as exc:
            self.headers_for(400); self.wfile.write(json.dumps({'error': str(exc)}).encode())
    def log_message(self, fmt, *values): pass

print(f'VisionQC model ready on 127.0.0.1:{args.port}; device={device}', flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
