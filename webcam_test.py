"""VisionQC PET - webcam canli test.

Kurulum:   pip install ultralytics opencv-python
Calistir:  python webcam_test.py --weights best.pt
Tuslar:    q = cik, s = o anki kareyi kaydet (snapshots/ klasorune)
"""
import argparse
import time
from collections import Counter, deque
from pathlib import Path

import cv2
from ultralytics import YOLO

NAMES = ["bottle", "underfill", "missing_cap", "loose_cap"]
DEFECTS = {1, 2, 3}

ap = argparse.ArgumentParser()
ap.add_argument("--weights", default="best.pt")
ap.add_argument("--source", default="0", help="kamera numarasi (0,1,..) veya video dosyasi yolu")
ap.add_argument("--conf", type=float, default=0.25)
ap.add_argument("--imgsz", type=int, default=960, help="egitimdeki boyut 960; CPU'da yavassa 640 dene")
ap.add_argument("--smooth", type=int, default=5, help="karar icin son N karenin cogunlugu (titremeyi azaltir)")
ap.add_argument("--no-window", action="store_true", help="pencere acma (test icin)")
ap.add_argument("--max-frames", type=int, default=0, help="0 = sinirsiz")
args = ap.parse_args()

model = YOLO(args.weights)
source = int(args.source) if args.source.isdigit() else args.source
cap = cv2.VideoCapture(source)
if not cap.isOpened():
    raise SystemExit(f"Kaynak acilamadi: {args.source}. Baska kamera numarasi dene (--source 1).")

history = deque(maxlen=args.smooth)
snap_dir = Path("snapshots")
n, t_prev, fps = 0, time.time(), 0.0

while True:
    ok, frame = cap.read()
    if not ok:
        break
    res = model.predict(frame, conf=args.conf, imgsz=args.imgsz, verbose=False)[0]
    classes = {int(c) for c in res.boxes.cls.tolist()}

    if 0 not in classes:
        verdict = "NO BOTTLE"
    elif classes & DEFECTS:
        verdict = "DEFECT: " + ",".join(NAMES[i] for i in sorted(classes & DEFECTS))
    else:
        verdict = "OK"
    history.append(verdict)
    shown = Counter(history).most_common(1)[0][0]       # son N karenin cogunlugu

    vis = res.plot()
    color = (0, 160, 0) if shown == "OK" else (0, 0, 220) if shown.startswith("DEFECT") else (120, 120, 120)
    cv2.rectangle(vis, (0, 0), (vis.shape[1], 46), color, -1)
    cv2.putText(vis, f"{shown}   {fps:4.1f} FPS", (10, 32), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)

    n += 1
    now = time.time(); fps = 0.9 * fps + 0.1 / max(now - t_prev, 1e-6) if n > 1 else 1 / max(now - t_prev, 1e-6); t_prev = now
    if args.no_window:
        if args.max_frames and n >= args.max_frames:
            break
        continue
    cv2.imshow("VisionQC PET (q: cik, s: kaydet)", vis)
    key = cv2.waitKey(1) & 0xFF
    if key == ord("q"):
        break
    if key == ord("s"):
        snap_dir.mkdir(exist_ok=True)
        p = snap_dir / f"snap_{int(time.time())}.jpg"
        cv2.imwrite(str(p), vis); print("kaydedildi:", p)
    if args.max_frames and n >= args.max_frames:
        break

cap.release()
cv2.destroyAllWindows()
print(f"{n} kare islendi.")
