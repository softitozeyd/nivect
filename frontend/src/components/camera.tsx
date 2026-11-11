import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n";
import { Camera, Circle, CircleCheck, CircleHelp, CircleStop, Play, ScanLine, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductAccumulator } from "../services/product-accumulator";
import { useProductionSession } from "../services/production";

type Detection = { name: string; confidence: number; box: number[] };
type Prediction = { decision: "PASS" | "FAIL" | "REVIEW"; defects: string[]; detections: Detection[]; width: number; height: number; device: string };
type Saved = { id: number; defects: string; recordedAt: string; sessionId?: number | null; productNumber?: number | null };
const names: Record<string, string> = { bottle: "Şişe", underfill: "Eksik dolum", missing_cap: "Kapak yok", loose_cap: "Gevşek kapak", uncertain: "Kararsız sonuç" };

export function CameraPanel() {
  const { language } = useLanguage();
  const tr = language === "tr";
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const session = useRef(0);
  const recordingRef = useRef(false);
  const pendingWrite = useRef<AbortController | null>(null);
  const writeDone = useRef<Promise<void> | null>(null);
  const activeSessionId = useRef<number | null>(null);
  const nextProductNumber = useRef(1);
  const accumulator = useRef(new ProductAccumulator());
  const { production, sessionLoading, sessionError, startSession, stopSession, setProduction } = useProductionSession();
  const [sessionBusy, setSessionBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [cameraAspect, setCameraAspect] = useState("4 / 3");
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
    accumulator.current.reset();
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
      const canvas = document.createElement('canvas');
      while (id === session.current && stream.current) {
        const v = video.current;
        if (!v || !v.videoWidth) { await new Promise(r => setTimeout(r, 200)); continue; }
        const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
        canvas.width = Math.round(v.videoWidth * scale); canvas.height = Math.round(v.videoHeight * scale);
        canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob || id !== session.current) break;
        const response = await fetch('http://127.0.0.1:8765/predict', {method: 'POST', headers: {'Content-Type': 'image/png'}, body: blob, signal: AbortSignal.timeout(30000)});
        if (!response.ok) throw new Error('model');
        const result = await response.json() as Prediction;
        if (id !== session.current) break;
        setPrediction(result);
        if (recordingRef.current && activeSessionId.current !== null) {
          const product = accumulator.current.observe(result);
          if (product) {
            const sessionId = activeSessionId.current;
            const eventId = crypto.randomUUID();
            const expectedProductNumber = nextProductNumber.current;
            const abort = new AbortController(); pendingWrite.current = abort;
            const writeProduct = async () => {
              let lastError: unknown;
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  const response = await fetch(`/api/v1/production-sessions/${sessionId}/products`, {
                    method: "POST", headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({eventId, expectedProductNumber, ...product}), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(8000)])
                  });
                  if (!response.ok) { if (response.status < 500) throw new Error("save"); throw new Error("retry"); }
                  const body = await response.json() as {session: import("../services/production").ProductionSession};
                  nextProductNumber.current = body.session.totalCount + 1;
                  setProduction(body.session); setVersion(v => v + 1); return;
                } catch (error) {
                  if (abort.signal.aborted || (error instanceof Error && error.message === "save")) throw error;
                  lastError = error;
                }
              }
              throw lastError || new Error("save");
            };
            const write = writeProduct(); writeDone.current = write;
            try { await write; } finally { writeDone.current = null; pendingWrite.current = null; }
          }
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
  async function toggleRecording() {
    if (sessionBusy) return;
    setSessionBusy(true); setError("");
    try {
      if (recordingRef.current) {
        recordingRef.current = false; setRecording(false); accumulator.current.reset();
        if (writeDone.current) await writeDone.current;
        if (activeSessionId.current !== null) await stopSession(activeSessionId.current);
        activeSessionId.current = null;
      } else {
        const cameraSession = session.current;
        const current = await startSession();
        if (cameraSession !== session.current || !stream.current) return;
        activeSessionId.current = current.id; nextProductNumber.current = current.totalCount + 1; accumulator.current.reset(); recordingRef.current = true; setRecording(true);
      }
    } catch { recordingRef.current = false; setRecording(false); setError(tr ? "Oturum veya kayıt işlemi başarısız. Bağlantıyı kontrol edin; tekrar denemeden önce oturum durumuna bakın." : "Session or recording failed. Check the connection and session status before retrying."); }
    finally { setSessionBusy(false); }
  }
  async function closeOpenSession() {
    if (!production?.active || sessionBusy) return;
    setSessionBusy(true); setError("");
    try { await stopSession(production.id); activeSessionId.current = null; }
    catch { setError(tr ? "Oturum kapatılamadı." : "Could not close session."); }
    finally { setSessionBusy(false); }
  }
  const label = (name: string) => tr ? names[name] || name : name.replaceAll('_', ' ');
  const statusText = prediction
    ? prediction.decision === "FAIL" ? (tr ? "Hata tespit edildi" : "Defect detected")
      : prediction.decision === "PASS" ? (tr ? "Kusur tespit edilmedi" : "No defect detected")
      : !prediction.detections.some(d => d.name === "bottle") ? (tr ? "Şişe bekleniyor" : "Waiting for a bottle") : prediction.detections.filter(d => d.name === "bottle").length > 1 ? (tr ? "Birden fazla şişe · sayılmadı" : "Multiple bottles · not counted") : (tr ? "Kararsız · ayrılacak" : "Uncertain · reject")
    : (tr ? "Tahmin bekleniyor" : "Waiting for a prediction");
  return <section className="panel camera-panel">
    <div className="camera-panel-header">
      <div className="camera-heading"><span className="camera-heading-icon"><ScanLine size={21} /></span><div><span className="camera-kicker">{tr ? "CANLI KONTROL" : "LIVE INSPECTION"}</span><h2>{tr ? "Bilgisayar kamerası" : "Computer camera"}</h2><p>{tr ? "Görüntüyü başlatın, ardından kayıt almayı seçin." : "Start the camera, then choose whether to record."}</p></div></div>
      <span className={`camera-state ${active ? "online" : ""}`}><span />{active ? (tr ? "Kamera açık" : "Camera on") : (tr ? "Kamera kapalı" : "Camera off")}</span>
    </div>
    <div className="camera-workspace">
      <div className="camera-main">
        <div className="camera-view" style={{aspectRatio: cameraAspect}}><video ref={video} onLoadedMetadata={(e) => { const v = e.currentTarget; if (v.videoWidth && v.videoHeight) setCameraAspect(`${v.videoWidth} / ${v.videoHeight}`); }} playsInline muted aria-label={tr ? "Canlı kamera görüntüsü" : "Live camera video"} />
          {active && prediction && <svg className="camera-overlay" viewBox={`0 0 ${prediction.width} ${prediction.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">{prediction.detections.map((d, i) => <g key={i}><rect x={d.box[0]} y={d.box[1]} width={d.box[2]-d.box[0]} height={d.box[3]-d.box[1]} fill="none" stroke={d.name === "bottle" ? "#33df8d" : "#ff5555"} strokeWidth="3"/><text x={d.box[0]} y={Math.max(16, d.box[1]-5)} fill="white" stroke="#14252c" strokeWidth="3" paintOrder="stroke" fontSize="16">{label(d.name)} {Math.round(d.confidence*100)}%</text></g>)}</svg>}
          {!active && <div className="camera-placeholder"><span><Camera size={27} /></span><strong>{tr ? "Kamera görüntüsü kapalı" : "Camera feed is off"}</strong><p>{tr ? "Başlamak için kamerayı açın." : "Start the camera to begin."}</p></div>}
          {active && <span className="camera-live-label"><span />LIVE</span>}
        </div>
        <div className="camera-actions">
          <button className="primary camera-primary" disabled={starting} onClick={active ? stop : () => void start()}>{active ? <CircleStop size={17} /> : <Camera size={17} />}{starting ? (tr ? "Kamera açılıyor…" : "Starting camera…") : active ? (tr ? "Kamerayı kapat" : "Stop camera") : (tr ? "Kamerayı aç" : "Start camera")}</button>
          <button className={recording ? "camera-record is-recording" : "camera-record"} disabled={!active || sessionBusy || sessionLoading || sessionError} onClick={() => void toggleRecording()}>{recording ? <CircleStop size={17} /> : <Circle size={15} />}{recording ? (tr ? "Kaydı durdur" : "Stop recording") : (tr ? "Kaydı başlat" : "Start recording")}</button>
          <span className={`record-indicator ${recording ? "is-recording" : ""}`} aria-live="polite"><span />{recording ? (tr ? "Kayıt açık" : "Recording on") : (tr ? "Kayıt kapalı" : "Recording off")}</span>
        </div>
        {sessionError && <p role="alert">{tr ? "Üretim oturumu alınamadı; kayıt başlatılamaz." : "Cannot load the production session; recording is unavailable."}</p>}
        {production?.active && !recording && <div className="session-open-note"><span>{tr ? `Oturum #${production.id} açık; kayıt durmuş durumda.` : `Session #${production.id} is open; recording is paused.`}</span><button disabled={sessionBusy} onClick={() => void closeOpenSession()}>{tr ? "Oturumu bitir" : "End session"}</button></div>}
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
        <p className="camera-disclaimer">{tr ? "Şişe kadrajdan çıkınca sayılır. Kararsız sonuçlar ayrılacak ürün sayılır. Test amaçlıdır." : "A bottle is counted after leaving the frame. Uncertain results are marked for rejection. This is experimental."}</p>
      </aside>
    </div>
    <div className="production-counters" aria-label={tr ? "Üretim oturumu sayaçları" : "Production session counters"}>
      <div className="production-counters-heading"><strong>{tr ? "Üretim oturumu" : "Production session"}{production ? ` #${production.id}` : ""}</strong><span>{production?.active ? (tr ? "Açık" : "Open") : production ? (tr ? "Tamamlandı" : "Ended") : (tr ? "Henüz oturum yok" : "No session yet")}</span></div>
      <div className="production-counter-grid"><div><small>{tr ? "Toplam" : "Total"}</small><strong>{production?.totalCount ?? "—"}</strong></div><div><small>{tr ? "Uygun" : "Pass"}</small><strong>{production?.passCount ?? "—"}</strong></div><div><small>{tr ? "Hatalı" : "Defective"}</small><strong>{production?.defectCount ?? "—"}</strong></div><div><small>{tr ? "Kararsız · ayrılacak" : "Uncertain · reject"}</small><strong>{production?.uncertainCount ?? "—"}</strong></div></div>
      <p>{tr ? "Yerel kamera denemesi: şişeleri tek tek gösterip kadrajdan çıkarın. Sayım gerçek bant sensörü yerine geçmez." : "Local camera trial: present bottles one at a time and remove each from view. This is not a production sensor."}</p>
    </div>
    <div className="camera-recent"><div><h3>{tr ? "Son kaydedilen tespitler" : "Recently saved detections"}</h3><p>{tr ? "Kayıt sırasında oluşan hatalı ve kararsız sonuçlar" : "Defects and uncertain results captured while recording was on"}</p></div><Link to="/history">{tr ? "Tüm kayıtlar" : "All records"} <Play size={12}/></Link></div>
    {savedError ? <p role="alert" className="camera-recent-empty">{tr ? "Kayıtlar alınamadı; bağlantıyı kontrol edin." : "Could not load saved records; check the connection."}</p> : saved.length ? <div className="camera-recent-list">{saved.slice(0, 4).map(item => <div key={item.id}><span className="camera-recent-dot"/><strong>{item.productNumber ? `${tr ? "Ürün" : "Product"} #${item.productNumber} · ` : ""}{item.defects.split(",").map(label).join(" · ")}</strong><time>{new Date(item.recordedAt).toLocaleString(tr ? "tr-TR" : "en-US")}</time></div>)}</div> : <p className="camera-recent-empty">{tr ? "Henüz kaydedilmiş tespit yok." : "No saved detections yet."}</p>}
  </section>;
}
