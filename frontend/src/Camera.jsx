import Action, { SelectControl } from "./Action";
import { useState, useRef, useEffect } from "react";
import {
  Video,
  VideoOff,
  ScanLine,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "./api";
import { BottleGate } from "./gate";
import { pendingEvents, enqueueEvent, acknowledgeEvent } from "./outbox";
export default function Camera({ model, onSaved }) {
  const [stream, setStream] = useState(null),
    [devices, setDevices] = useState([]),
    [device, setDevice] = useState(""),
    [error, setError] = useState(""),
    [running, setRunning] = useState(false),
    [observation, setObservation] = useState(null),
    [line, setLine] = useState("line-1"),
    [pending, setPending] = useState(0),
    [saved, setSaved] = useState(0),
    [production, setProduction] = useState(null),
    [sessionBusy, setSessionBusy] = useState(false);
  const video = useRef(),
    canvas = useRef(),
    streamRef = useRef(),
    runningRef = useRef(false),
    gate = useRef(new BottleGate()),
    busy = useRef(false),
    alive = useRef(true),
    lineRef = useRef(line),
    onSavedRef = useRef(onSaved),
    productionRef = useRef(null);
  lineRef.current = line;
  onSavedRef.current = onSaved;
  async function flush() {
    if (busy.current) return false;
    busy.current = true;
    try {
      let queue = await pendingEvents();
      if (alive.current) setPending(queue.length);
      while (queue.length) {
        const queued = queue[0];
        const isSessionEvent = !!queued.productionSessionId;
        const response = await api(isSessionEvent ? `/api/v1/production-sessions/${queued.productionSessionId}/products` : "/api/v1/inspections", {
          method: "POST", headers: {"Content-Type": "application/json"},
          body: JSON.stringify(isSessionEvent ? {expectedProductNumber: queued.expectedProductNumber, uncertain: queued.uncertain, inspection: queued.inspection} : queued),
        });
        if (isSessionEvent) { productionRef.current = response.session; if (alive.current) setProduction(response.session); }
        await acknowledgeEvent(queue[0].eventId);
        queue = await pendingEvents();
        if (alive.current) {
          setPending(queue.length);
          setSaved((n) => n + 1);
          onSavedRef.current();
        }
      }
      return true;
    } catch (e) {
      if (alive.current) setError(`Kayıt kuyruğu: ${e.message}`);
      return false;
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    alive.current = true;
    flush();
    api("/api/v1/production-sessions/latest").then(({session}) => { if (alive.current) {productionRef.current = session; setProduction(session);} }).catch(e => {if (alive.current) setError(e.message);});
    const t = setInterval(flush, 10000);
    return () => {
      alive.current = false;
      runningRef.current = false;
      clearInterval(t);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
  }, [stream]);
  async function start() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error(
          "Kamera için HTTPS veya localhost ve desteklenen bir tarayıcı gerekiyor.",
        );
      const s = await navigator.mediaDevices.getUserMedia({
        video: device
          ? {
              deviceId: {
                exact: device,
              },
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
            }
          : {
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
            },
        audio: false,
      });
      streamRef.current = s;
      setStream(s);
      setDevices(
        (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "videoinput",
        ),
      );
    } catch (e) {
      setError(
        e.name === "NotAllowedError"
          ? "Kamera izni verilmedi. Tarayıcı ayarlarından izin verip yeniden deneyin."
          : e.message,
      );
    }
  }
  function stop() {
    runningRef.current = false;
    setRunning(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    gate.current.reset();
    setObservation(null);
  }
  async function inspect() {
    if (!runningRef.current || !alive.current) return;
    try {
      const v = video.current;
      if (!v?.videoWidth) {
        setTimeout(inspect, 500);
        return;
      }
      const c = canvas.current;
      c.width = Math.min(v.videoWidth, 960);
      c.height = Math.round((v.videoHeight * c.width) / v.videoWidth);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      const blob = await new Promise((resolve) =>
        c.toBlob(resolve, "image/jpeg", 0.8),
      );
      const result = await api("/api/v1/vision/frame", {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
        },
        body: blob,
      });
      if (!alive.current || !runningRef.current) return;
      setObservation(result);
      const event = gate.current.observe(result);
      if (event) {
        if (!productionRef.current?.active) throw Error("Aktif üretim oturumu bulunamadı.");
        const {uncertain, ...inspection} = event;
        const eventId = crypto.randomUUID();
        const full = {
          ...inspection,
          eventId,
          lineCode: lineRef.current,
          cameraId: "pc-browser",
          source: "CAMERA",
          capturedAt: new Date().toISOString(),
        };
        const queue = await pendingEvents();
        if (queue.length >= 1000)
          throw Error(
            "Yerel kayıt kuyruğu doldu. Bağlantıyı düzeltmeden tespit devam edemez.",
          );
        await enqueueEvent({eventId, productionSessionId: productionRef.current.id, expectedProductNumber: productionRef.current.totalCount + 1, uncertain, inspection: full});
        setPending(queue.length + 1);
        if (!await flush()) throw Error("Ürün kaydı bekliyor; bağlantıyı düzeltip tekrar gönderin.");
      }
    } catch (e) {
      if (alive.current) {
        setError(e.message);
        runningRef.current = false;
        setRunning(false);
      }
      return;
    }
    if (runningRef.current) setTimeout(inspect, 650);
  }
  async function toggle() {
    if (sessionBusy) return;
    setSessionBusy(true); setError("");
    try {
      if (runningRef.current) {
        runningRef.current = false; setRunning(false);
        if (!await flush()) throw Error("Bekleyen kayıtlar gönderilmeden oturum bitirilemez.");
        if (productionRef.current?.active) {
          const ended = await api(`/api/v1/production-sessions/${productionRef.current.id}/stop`, {method:"POST"});
          productionRef.current = ended; setProduction(ended);
        }
      } else {
        if (!await flush()) throw Error("Bekleyen kayıtlar gönderilmeden yeni tespit başlatılamaz.");
        const latest = await api("/api/v1/production-sessions/latest");
        const current = latest.session?.active ? latest.session : await api("/api/v1/production-sessions", {method:"POST"});
        productionRef.current = current; setProduction(current);
        if (!alive.current || !streamRef.current) return;
        gate.current.reset(); runningRef.current = true; setRunning(true); inspect();
      }
    } catch(e) { if(alive.current) setError(e.message); }
    finally { if(alive.current) setSessionBusy(false); }
  }
  async function endSession() {
    if (sessionBusy || !productionRef.current?.active) return;
    setSessionBusy(true); setError("");
    try {
      if (!await flush()) throw Error("Bekleyen kayıtlar gönderilmeden oturum bitirilemez.");
      const ended = await api(`/api/v1/production-sessions/${productionRef.current.id}/stop`, {method:"POST"});
      productionRef.current = ended; setProduction(ended);
    } catch(e) { if(alive.current) setError(e.message); }
    finally { if(alive.current) setSessionBusy(false); }
  }
  return (
    <div className="camera-layout">
      <section className="panel camera-panel">
        <div className="panel-heading">
          <h3>PC kamerası</h3>
          <span className={`badge ${stream ? "PASS" : "REVIEW"}`}>
            {stream ? "Önizleme açık" : "Bağlı değil"}
          </span>
        </div>
        <div className="camera-viewport">
          {stream ? (
            <>
              <video ref={video} autoPlay playsInline muted />
              <div className="camera-reticle" />
              <span className="camera-live">
                <i />
                {running ? "TESPİT AÇIK" : "YALNIZCA ÖNİZLEME"}
              </span>
              {observation && (
                <div className="camera-verdict">
                  {!observation.bottleFound
                    ? "Şişe bekleniyor"
                    : observation.bottleCount !== 1
                      ? "Tek şişe yerleştirin"
                      : observation.defects.length
                        ? observation.defects.join(" · ")
                        : "Kapsam içi kusur görülmedi"}
                  <small>
                    {Math.round(observation.confidence * 100)}% model güveni
                  </small>
                </div>
              )}
            </>
          ) : (
            <div className="empty">
              <VideoOff size={36} strokeWidth={1} />
              <h3>Bakışınızı bağlayın.</h3>
              <p>
                PC kameranızı açarak kontrol alanını hazırlayın.
                <br />
                Görüntü yalnızca tespit açıkken model servisine gönderilir.
              </p>
              <Action className="pill dark" onClick={start}>
                <Video size={16} /> Kamerayı aç
              </Action>
            </div>
          )}
        </div>
        <canvas ref={canvas} hidden />
        <div className="camera-controls">
          {stream ? (
            <>
              <Action className="btn" onClick={stop}>
                <VideoOff size={15} /> Kapat
              </Action>
              <Action
                className="btn primary"
                onClick={toggle}
                disabled={!model?.modelReady || !line || sessionBusy}
              >
                {running ? "Kaydı durdur" : "Kaydı başlat"}
                <ScanLine size={16} />
              </Action>
            </>
          ) : (
            <Action className="btn" onClick={start}>
              <Video size={16} /> Kamerayı aç
            </Action>
          )}
          <span>
            {saved} işlendi · {pending} bekliyor
          </span>
        </div>
        <section className="session-summary" aria-label="Üretim oturumu sayaçları">
          <div><strong>Üretim oturumu {production ? `#${production.id}` : ""}</strong><span>{production?.active ? "Açık" : production ? "Tamamlandı" : "Henüz oturum yok"}</span></div>
          <div className="session-grid"><div><small>Toplam</small><strong>{production?.totalCount ?? "—"}</strong></div><div><small>Uygun</small><strong>{production?.passCount ?? "—"}</strong></div><div><small>Hatalı</small><strong>{production ? production.failCount + production.reviewCount : "—"}</strong></div></div>
          <p>Kararsız ürünler hatalı sayılır. Kamera denemesi kesin bant sayımı değildir; fiziksel ayırma yapılmaz.</p>
          {production?.active && !running && <Action className="btn" disabled={sessionBusy} onClick={endSession}>Oturumu bitir</Action>}
        </section>
        {error && (
          <div className="error" role="alert">
            <AlertCircle size={17} />
            {error}
            {pending > 0 && (
              <Action className="text-link" onClick={flush}>
                Yeniden gönder <RefreshCw size={14} />
              </Action>
            )}
          </div>
        )}
      </section>
      <aside className="camera-side">
        <section className="panel">
          <span className="micro">KONTROL ALANI</span>
          <h3>Tek şişe. Net görüntü.</h3>
          <p>
            Şişeyi tamamen kadraja alın. Sabit ışık ve sade bir arka plan
            kullanın. Şişeyi en az beş gözlem boyunca gösterin, ardından kadrajdan çıkarın. Hatalı ve kararsız ürünler kaydedilir; uygun ürünler yalnızca sayılır.
          </p>
          <label>
            Üretim hattı
            <input
              value={line}
              disabled={running}
              maxLength={50}
              pattern="[A-Za-z0-9_-]+"
              onChange={(e) =>
                setLine(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))
              }
            />
          </label>
          {devices.length > 0 && (
            <label>
              Kamera
              <SelectControl
                value={device}
                disabled={!!stream}
                onChange={(e) => setDevice(e.target.value)}
              >
                <option value="">Varsayılan kamera</option>
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Kamera ${i + 1}`}
                  </option>
                ))}
              </SelectControl>
            </label>
          )}
        </section>
        <section className="panel model-note">
          <span className={`status-dot ${model?.modelReady ? "" : "amber"}`} />
          <h3>{model?.modelReady ? "Model bağlı" : "Model bekleniyor"}</h3>
          <p>
            {model?.modelReady
              ? `${model.modelVersion} · ${model.device}`
              : "Kamera önizlemesi kullanılabilir. Gerçek tespit için eğitilmiş best.pt dosyasını yerel model servisine bağlayın."}
          </p>
          <small>
            Bu akış tek şişe denemeleri içindir. Üretim bandında hız ve çoklu
            nesne takibi ayrıca doğrulanmalıdır.
          </small>
        </section>
      </aside>
    </div>
  );
}
