import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n";

type Detection = { name: string; confidence: number; box: number[] };
type Prediction = { decision: "PASS" | "FAIL" | "REVIEW"; defects: string[]; detections: Detection[]; width: number; height: number; device: string };
type Saved = { id: number; defects: string; recordedAt: string };
const names: Record<string, string> = { bottle: "Şişe", underfill: "Eksik dolum", missing_cap: "Kapak yok", loose_cap: "Gevşek kapak" };

export function CameraPanel() {
  const { language } = useLanguage();
  const tr = language === "tr";
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const session = useRef(0);
  const recordingRef = useRef(false);
  const pendingWrite = useRef<AbortController | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [version, setVersion] = useState(0);
  function stop() {
    session.current++;
    recordingRef.current = false;
    pendingWrite.current?.abort();
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setActive(false); setStarting(false); setRecording(false); setPrediction(null);
  }
  useEffect(() => () => { session.current++; recordingRef.current = false; pendingWrite.current?.abort(); stream.current?.getTracks().forEach(track => track.stop()); }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/model-detections', {signal: controller.signal}).then(r => { if (!r.ok) throw Error(); return r.json() as Promise<Saved[]>; }).then(setSaved).catch(() => {});
    return () => controller.abort();
  }, [version]);
  async function start() {
    setError(""); setStarting(true);
    const id = ++session.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({video: { facingMode: "environment" }, audio: false});
      if (id !== session.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      if (!video.current) { media.getTracks().forEach(track => track.stop()); return; }
      video.current.srcObject = media;
      await video.current.play();
      setActive(true); setStarting(false);
      let failures = 0, clear = 0, latched = false;
      const canvas = document.createElement('canvas');
      while (id === session.current && stream.current) {
        const v = video.current;
        if (!v || !v.videoWidth) { await new Promise(r => setTimeout(r, 200)); continue; }
        const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
        canvas.width = Math.round(v.videoWidth * scale); canvas.height = Math.round(v.videoHeight * scale);
        canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .8));
        if (!blob || id !== session.current) break;
        const response = await fetch('http://127.0.0.1:8765/predict', {method: 'POST', headers: {'Content-Type': 'image/jpeg'}, body: blob, signal: AbortSignal.timeout(30000)});
        if (!response.ok) throw new Error('model');
        const result = await response.json() as Prediction;
        if (id !== session.current) break;
        setPrediction(result);
        const hasBottle = result.detections.some(d => d.name === 'bottle');
        clear = hasBottle ? 0 : clear + 1;
        if (clear >= 3) latched = false;
        failures = result.decision === 'FAIL' ? failures + 1 : 0;
        if (recordingRef.current && failures >= 3 && !latched) {
          latched = true;
          const abort = new AbortController(); pendingWrite.current = abort;
          const write = await fetch('/api/v1/model-detections', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({defects: result.defects}), signal: abort.signal});
          pendingWrite.current = null;
          if (!write.ok) { latched = false; throw new Error('save'); }
          setVersion(v => v + 1);
        }
        await new Promise(r => setTimeout(r, 250));
      }
    } catch (e) {
      if (id !== session.current) return;
      if (e instanceof DOMException && e.name === 'AbortError' && !recordingRef.current) { return; }
      const message = e instanceof Error ? e.message : '';
      stop();
      setError(message === 'save' ? (tr ? 'Kayıt veritabanına yazılamadı.' : 'Could not save the record.') : message === 'model' || e instanceof TypeError ? (tr ? 'Model servisine bağlanılamadı. Kamera servisini başlatın.' : 'Cannot connect to model service. Start the camera service.') : (tr ? 'Kamera açılamadı veya model bağlantısı kesildi. Kamera iznini kontrol edin.' : 'Camera or model connection failed. Check camera permissions.'));
    }
  }
  const label = (name: string) => tr ? names[name] || name : name.replaceAll('_', ' ');
  return <section className="panel camera-panel">
    <div className="panel-heading"><div><h2>{tr ? 'Bilgisayar kamerası' : 'Computer camera'}</h2><p>{tr ? 'Akış bilgisayarınızda işlenir. Kayıt yalnızca siz başlatınca yapılır.' : 'Video is processed locally. Recording starts only when you enable it.'}</p></div></div>
    <div className="camera-actions">
      <button className="primary" disabled={starting} onClick={active ? stop : () => void start()}>{starting ? (tr ? 'Kamera açılıyor…' : 'Starting camera…') : active ? (tr ? 'Kamerayı kapat' : 'Stop camera') : (tr ? 'Kamerayı aç' : 'Start camera')}</button>
      <button disabled={!active} onClick={() => {const next = !recordingRef.current; recordingRef.current = next; setRecording(next);}}>{recording ? (tr ? 'Kaydı durdur' : 'Stop recording') : (tr ? 'Kaydı başlat' : 'Start recording')}</button>
      <strong aria-live="polite">{recording ? (tr ? 'Kayıt açık' : 'Recording on') : (tr ? 'Kayıt kapalı' : 'Recording off')}</strong>
    </div>
    <div className="camera-view"><video ref={video} playsInline muted aria-label={tr ? 'Canlı kamera görüntüsü' : 'Live camera video'} />{active && prediction && <svg className="camera-overlay" viewBox={`0 0 ${prediction.width} ${prediction.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">{prediction.detections.map((d, i) => <g key={i}><rect x={d.box[0]} y={d.box[1]} width={d.box[2]-d.box[0]} height={d.box[3]-d.box[1]} fill="none" stroke={d.name === 'bottle' ? '#33df8d' : '#ff5555'} strokeWidth="3"/><text x={d.box[0]} y={Math.max(16, d.box[1]-5)} fill="white" stroke="#14252c" strokeWidth="3" paintOrder="stroke" fontSize="16">{label(d.name)} {Math.round(d.confidence*100)}%</text></g>)}</svg>}{!active && <p>{tr ? 'Kamera kapalı' : 'Camera off'}</p>}</div>
    {error && <p role="alert" className="notice error">{error}</p>}
    <p aria-live="polite">{prediction ? `${tr ? 'Model tahmini' : 'Model prediction'}: ${prediction.decision === 'FAIL' ? (tr ? 'Hatalı' : 'Defect') : prediction.decision === 'PASS' ? (tr ? 'Kusur tespit edilmedi' : 'No defect detected') : (tr ? 'Kontrol gerekli' : 'Review needed')}${prediction.defects.length ? ' · ' + prediction.defects.map(label).join(', ') : ''}` : (tr ? 'Tahmin bekleniyor.' : 'Waiting for a prediction.')}</p>
    <p className="info-note">{tr ? 'Yalnızca üç ardışık tahminde görülen hatalar kaydedilir. Yeni şişeyi saymak için şişeyi bir süre kadrajdan çıkarın. Bu yöntem kesin ürün sayımı sağlamaz; eşikler test aşamasındadır.' : 'Only defects detected in three consecutive predictions are saved. Remove the bottle briefly before the next product. This is not precise counting; thresholds are experimental.'}</p>
    <h3>{tr ? 'Kaydedilen model tespitleri' : 'Saved model detections'}</h3>
    {saved.length ? <ul>{saved.slice(0, 10).map(item => <li key={item.id}>{new Date(item.recordedAt).toLocaleString(tr ? 'tr-TR' : 'en-US')} · {item.defects.split(',').map(label).join(', ')}</li>)}</ul> : <p>{tr ? 'Henüz kayıt yok.' : 'No saved detections yet.'}</p>}
  </section>;
}
