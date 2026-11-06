"""Private loopback inference service. No weights means explicitly NOT READY."""
import hashlib
import io
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
from camera.engine import CLASSES, observation

model=None
model_version=None
model_error=None
lock=threading.Lock()


def load_model():
    global model,model_version,model_error
    model=None
    model_version=None
    model_error=None
    weights=os.environ.get('QC_MODEL_PATH','')
    if not weights:
        model_error='Eğitilmiş PET modeli henüz tanımlanmadı.'
        return
    path=Path(weights)
    if not path.is_file() or path.suffix.lower() not in {'.pt','.onnx'}:
        model_error='Model dosyası bulunamadı veya desteklenmiyor.'
        return
    try:
        os.environ.setdefault('YOLO_CONFIG_DIR',str(Path('runtime/model-config').resolve()))
        from ultralytics import YOLO
        candidate=YOLO(str(path))
        if dict(candidate.names)!=dict(enumerate(CLASSES)):
            raise ValueError('Model classes do not match the PET schema')
        model=candidate
        model_version='pet-'+hashlib.sha256(path.read_bytes()).hexdigest()[:16]
    except Exception:
        model_error='Model yüklenemedi. Bağımlılıkları, dosyayı ve PET sınıf sırasını kontrol edin.'


@asynccontextmanager
async def lifespan(app):
    await run_in_threadpool(load_model)
    yield

app=FastAPI(title='Nivect local vision',version='1.0.0',lifespan=lifespan,docs_url=None,redoc_url=None,openapi_url=None)

@app.get('/health')
def health():
    return dict(status='ok',modelReady=model is not None,modelVersion=model_version,
                device=os.environ.get('QC_MODEL_DEVICE','cpu'),message=model_error,
                classes=CLASSES,minimumConfidence=float(os.environ.get('QC_MINIMUM_CONFIDENCE','.65')))


def infer_image(raw):
    if model is None:
        raise HTTPException(503,'PET model is not loaded')
    try:
        im=Image.open(io.BytesIO(raw))
        if im.format!='JPEG' or im.width*im.height>4_000_000:
            raise ValueError('Unsupported frame')
        im=im.convert('RGB')
    except (UnidentifiedImageError,ValueError,OSError,Image.DecompressionBombError):
        raise HTTPException(400,'Invalid JPEG frame')
    with lock:
        output=model.predict(im,conf=.25,imgsz=640,device=os.environ.get('QC_MODEL_DEVICE','cpu'),verbose=False)[0]
    detections=[(CLASSES[int(b.cls.item())],float(b.conf.item()),b.xyxy[0].tolist()) for b in output.boxes]
    return observation(detections,model_version)

@app.post('/infer')
async def infer(request: Request):
    if request.headers.get('content-type','').split(';')[0]!='image/jpeg':
        raise HTTPException(415,'image/jpeg required')
    # Stream bounded input; don't allocate an unbounded request body.
    data=bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data)>2*1024*1024:
            raise HTTPException(413,'Frame too large')
    return await run_in_threadpool(infer_image,bytes(data))
