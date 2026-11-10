import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n";
import { Camera, Circle, CircleCheck, CircleHelp, CircleStop, Play, ScanLine, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

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
  const [savedError, setSavedError] = useState(false);
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
    fetch('/api/v1/model-detections', {signal: controller.signal}).then(r => { if (!r.ok) throw Error(); return r.json() as Promise<Saved[]>; }).then(rows => { setSaved(rows); setSavedError(false); }).catch(() => { if (!controller.signal.aborted) setSavedError(true); });
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
  const statusText = prediction
    ? prediction.decision === "FAIL" ? (tr ? "Hata tespit edildi" : "Defect detected")
      : prediction.decision === "PASS" ? (tr ? "Kusur tespit edilmedi" : "No defect detected")
      : (tr ? "Kontrol gerekli" : "Review needed")
    : (tr ? "Tahmin bekleniyor" : "Waiting for a prediction");
  return <section className="panel camera-panel">
    <div className="camera-panel-header">
      <div className="camera-heading"><span className="camera-heading-icon"><ScanLine size={21} /></span><div><span className="camera-kicker">{tr ? "CANLI KONTROL" : "LIVE INSPECTION"}</span><h2>{tr ? "Bilgisayar kamerası" : "Computer camera"}</h2><p>{tr ? "Görüntüyü başlatın, ardından kayıt almayı seçin." : "Start the camera, then choose whether to record."}</p></div></div>
      <span className={`camera-state ${active ? "online" : ""}`}><span />{active ? (tr ? "Kamera açık" : "Camera on") : (tr ? "Kamera kapalı" : "Camera off")}</span>
    </div>
    <div className="camera-workspace">
      <div className="camera-main">
        <div className="camera-view"><video ref={video} playsInline muted aria-label={tr ? "Canlı kamera görüntüsü" : "Live camera video"} />
          {active && prediction && <svg className="camera-overlay" viewBox={`0 0 ${prediction.width} ${prediction.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">{prediction.detections.map((d, i) => <g key={i}><rect x={d.box[0]} y={d.box[1]} width={d.box[2]-d.box[0]} height={d.box[3]-d.box[1]} fill="none" stroke={d.name === "bottle" ? "#33df8d" : "#ff5555"} strokeWidth="3"/><text x={d.box[0]} y={Math.max(16, d.box[1]-5)} fill="white" stroke="#14252c" strokeWidth="3" paintOrder="stroke" fontSize="16">{label(d.name)} {Math.round(d.confidence*100)}%</text></g>)}</svg>}
          {!active && <div className="camera-placeholder"><span><Camera size={27} /></span><strong>{tr ? "Kamera görüntüsü kapalı" : "Camera feed is off"}</strong><p>{tr ? "Başlamak için kamerayı açın." : "Start the camera to begin."}</p></div>}
          {active && <span className="camera-live-label"><span />LIVE</span>}
        </div>
        <div className="camera-actions">
          <button className="primary camera-primary" disabled={starting} onClick={active ? stop : () => void start()}>{active ? <CircleStop size={17} /> : <Camera size={17} />}{starting ? (tr ? "Kamera açılıyor…" : "Starting camera…") : active ? (tr ? "Kamerayı kapat" : "Stop camera") : (tr ? "Kamerayı aç" : "Start camera")}</button>
          <button className={recording ? "camera-record is-recording" : "camera-record"} disabled={!active} onClick={() => {const next = !recordingRef.current; recordingRef.current = next; setRecording(next);}}>{recording ? <CircleStop size={17} /> : <Circle size={15} />}{recording ? (tr ? "Kaydı durdur" : "Stop recording") : (tr ? "Kaydı başlat" : "Start recording")}</button>
          <span className={`record-indicator ${recording ? "is-recording" : ""}`} aria-live="polite"><span />{recording ? (tr ? "Kayıt açık" : "Recording on") : (tr ? "Kayıt kapalı" : "Recording off")}</span>
        </div>
        {!active && <p className="camera-hint">{tr ? "Kamerayı açmak otomatik olarak kayıt başlatmaz." : "Starting the camera does not start recording."}</p>}
        {error && <p role="alert" className="notice error">{error}</p>}
      </div>
      <aside className="camera-sidebar">
        <div className="camera-result-label"><span>{tr ? "ANLIK MODEL TAHMİNİ" : "LIVE MODEL PREDICTION"}</span><ScanLine size={17}/></div>
        <div className={`camera-result ${prediction?.decision === "FAIL" ? "fail" : prediction?.decision === "PASS" ? "pass" : ""}`} aria-live="polite">
          <span className="camera-result-icon">{prediction?.decision === "FAIL" ? <ShieldAlert size={21}/> : prediction?.decision === "PASS" ? <CircleCheck size={21}/> : <CircleHelp size={21}/>}</span>
          <div><strong>{statusText}</strong><p>{prediction?.defects.length ? prediction.defects.map(label).join(" · ") : !active ? (tr ? "Kamera açıldığında sonuç burada görünür." : "Results will appear when the camera starts.") : (tr ? "Görüntü analiz ediliyor." : "Analyzing the camera feed.")}</p></div>
        </div>
        <div className="camera-divider" />
        <div className="camera-steps"><h3>{tr ? "Nasıl çalışır?" : "How it works"}</h3><div><span>1</span><p>{tr ? "Kamerayı açın ve şişeyi kadraja alın." : "Start the camera and place the bottle in view."}</p></div><div><span>2</span><p>{tr ? "Hataları kaydetmek için kaydı başlatın." : "Start recording to save detected defects."}</p></div><div><span>3</span><p>{tr ? "Yeni şişeden önce mevcut şişeyi kadrajdan çıkarın." : "Remove the bottle before inspecting the next one."}</p></div></div>
        <p className="camera-disclaimer">{tr ? "Yalnızca art arda 3 kez görülen hatalar kaydedilir. Sonuçlar test aşamasındadır." : "Only defects seen in 3 consecutive predictions are saved. Results are experimental."}</p>
      </aside>
    </div>
    <div className="camera-recent"><div><h3>{tr ? "Son kaydedilen tespitler" : "Recently saved detections"}</h3><p>{tr ? "Yalnızca kayıt açıkken oluşan hatalı sonuçlar" : "Defects captured while recording was on"}</p></div><Link to="/history">{tr ? "Tüm kayıtlar" : "All records"} <Play size={12}/></Link></div>
    {savedError ? <p role="alert" className="camera-recent-empty">{tr ? "Kayıtlar alınamadı; bağlantıyı kontrol edin." : "Could not load saved records; check the connection."}</p> : saved.length ? <div className="camera-recent-list">{saved.slice(0, 4).map(item => <div key={item.id}><span className="camera-recent-dot"/><strong>{item.defects.split(",").map(label).join(" · ")}</strong><time>{new Date(item.recordedAt).toLocaleString(tr ? "tr-TR" : "en-US")}</time></div>)}</div> : <p className="camera-recent-empty">{tr ? "Henüz kaydedilmiş tespit yok." : "No saved detections yet."}</p>}
  </section>;
}
