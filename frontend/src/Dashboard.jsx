import Action, { SelectControl } from "./Action";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  Video,
  ClipboardList,
  Settings,
  ArrowUpRight,
  ArrowLeft,
  LogOut,
  Download,
  RefreshCw,
  Plus,
  Check,
  AlertCircle,
  ScanLine,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "./Landing";
import { api, logout } from "./api";
import Modal from "./Modal";
import Camera from "./Camera";
const toDate = (s) =>
  new Date(
    typeof s === "number" ? s : /[zZ]$|[+-]\d{2}:\d{2}$/.test(s) ? s : s + "Z",
  );
const fmt = (n) => new Intl.NumberFormat("tr-TR").format(n || 0),
  date = (s) =>
    toDate(s).toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
const names = {
    underfill: "Düşük dolum",
    missing_cap: "Eksik kapak",
    loose_cap: "Gevşek kapak",
  },
  verdicts = {
    PASS: "Geçti",
    FAIL: "Kusurlu",
    REVIEW: "İncele",
  };
export default function Dashboard({ user, onExit, onLogout }) {
  const [tab, setTab] = useState("overview"),
    [nav, setNav] = useState(false),
    [overview, setOverview] = useState(null),
    [records, setRecords] = useState(null),
    [model, setModel] = useState(null),
    [health, setHealth] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [source, setSource] = useState("CAMERA"),
    [hours, setHours] = useState("24"),
    [line, setLine] = useState(""),
    [result, setResult] = useState("ALL"),
    [page, setPage] = useState(0),
    [manual, setManual] = useState(false),
    [detail, setDetail] = useState(null),
    [toast, setToast] = useState(""),
    [last, setLast] = useState(null),
    [loggingOut, setLoggingOut] = useState(false);
  const requestVersion = useRef(0);
  const refresh = useCallback(
    async (quiet = false) => {
      const request = ++requestVersion.current;
      if (!quiet) setLoading(true);
      try {
        const [o, r, m, h] = await Promise.all([
          api(
            "/api/v1/overview?" +
              new URLSearchParams({
                source,
                hours,
                line,
              }),
          ),
          api(
            "/api/v1/records?" +
              new URLSearchParams({
                source,
                hours,
                line,
                result,
                page: String(page),
                size: "15",
              }),
          ),
          api("/api/v1/vision/status"),
          api("/actuator/health"),
        ]);
        if (request !== requestVersion.current) return;
        setOverview(o);
        setRecords(r);
        setModel(m);
        setHealth(h.status === "UP");
        setLast(new Date());
        setError("");
      } catch (e) {
        if (request === requestVersion.current) {
          setError(e.message);
          if (e.status === 401) onLogout();
        }
      } finally {
        if (request === requestVersion.current) setLoading(false);
      }
    },
    [source, hours, line, result, page],
  );
  useEffect(() => {
    refresh();
    const t = setInterval(() => {
      if (!document.hidden) refresh(true);
    }, 5000);
    return () => {
      clearInterval(t);
      requestVersion.current++;
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const tabs = [
    ["overview", LayoutDashboard, "Genel bakış"],
    ["camera", Video, "Kamera"],
    ["records", ClipboardList, "İnceleme kayıtları"],
    ["settings", Settings, "Sistem & model"],
  ];
  async function exportCsv() {
    try {
      const csv = await api(
        "/api/v1/export?" +
          new URLSearchParams({
            source,
            hours,
            line,
            result,
          }),
      );
      const url = URL.createObjectURL(
        new Blob(["\uFEFF" + csv], {
          type: "text/csv;charset=utf-8",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "nivect-inspections.csv";
      a.click();
      URL.revokeObjectURL(url);
      setToast("CSV indirildi. En fazla 10.000 kayıt dışa aktarılır.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function exit() {
    setLoggingOut(true);
    try {
      await logout();
      onLogout();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoggingOut(false);
    }
  }
  const totals = overview?.totals || {},
    total = Number(totals.total) || 0;
  const passRate = total ? (Number(totals.passed) / total) * 100 : 0;
  function changeTab(t) {
    setTab(t);
    setNav(false);
  }
  return (
    <div className="workspace">
      <aside className={`sidebar ${nav ? "open" : ""}`}>
        <Action className="brand-button" onClick={onExit} bare>
          <Logo />
        </Action>
        <div className="workspace-label">
          VISION WORKSPACE <span>01</span>
        </div>
        <nav aria-label="Çalışma alanı">
          {tabs.map(([key, Icon, label]) => (
            <Action
              key={key}
              className={tab === key ? "selected" : ""}
              onClick={() => changeTab(key)}
            >
              <Icon size={18} />
              {label}
              {key === "camera" && (
                <span
                  className={`nav-dot ${model?.modelReady ? "ready" : ""}`}
                />
              )}
            </Action>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-small">
            <span className={`status-dot ${health ? "" : "amber"}`} />
            <span>
              {health ? "Altyapı bağlı" : "Bağlantı kontrol ediliyor"}
            </span>
          </div>
          <Action onClick={onExit}>
            <ArrowLeft size={16} /> Ürün sayfası
          </Action>
          <Action disabled={loggingOut} onClick={exit}>
            <LogOut size={16} /> Güvenli çıkış
          </Action>
          <div className="profile">
            <span>OP</span>
            <div>
              Operatör<small>{user.username}</small>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      {nav && (
        <Action
          className="nav-scrim"
          aria-label="Menüyü kapat"
          onClick={() => setNav(false)}
          bare
        />
      )}
      <div className="workspace-main">
        <header className="workspace-top">
          <Action
            className="icon-btn mobile-menu"
            aria-label="Menüyü aç"
            onClick={() => setNav(!nav)}
          >
            <Menu size={20} />
          </Action>
          <div>
            <span>Nivect</span>
            <span className="slash">/</span>
            {tabs.find((t) => t[0] === tab)?.[2]}
          </div>
          <div className="top-meta">
            <span className="timezone">İstanbul · UTC+3</span>
            <span className="avatar">OP</span>
          </div>
        </header>
        <main className="workspace-content">
          <div className="page-heading">
            <div>
              <span className="micro">DETAYLAR KONTROLÜNÜZDE.</span>
              <h1>
                {tab === "overview"
                  ? "Üretime bir bakış."
                  : tab === "camera"
                    ? "Her şişeyi görün."
                    : tab === "records"
                      ? "Her kararın izi."
                      : "Sağlam bir temel."}
              </h1>
              <p>
                {tab === "overview"
                  ? "Görsel kalite kontrolünüzün güncel özeti."
                  : tab === "camera"
                    ? "PC kameranızdan canlı görüntü ve model bağlantısı."
                    : tab === "records"
                      ? "Kayıtlı sonuçları inceleyin, filtreleyin ve dışa aktarın."
                      : "Bağlantılar, model hazırlığı ve ürün kapsamı."}
              </p>
            </div>
            <div className="heading-actions">
              <Action
                className="btn"
                onClick={() => refresh()}
                disabled={loading}
                aria-label="Verileri yenile"
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
              </Action>
              {tab !== "camera" && (
                <Action className="btn" onClick={exportCsv}>
                  <Download size={15} /> CSV
                </Action>
              )}
              <Action className="btn primary" onClick={() => setManual(true)}>
                <Plus size={15} /> Manuel test
              </Action>
            </div>
          </div>
          {error && (
            <div className="error" role="alert">
              <AlertCircle size={17} />
              {error}
              <Action className="text-link" onClick={() => refresh()}>
                Yeniden dene
              </Action>
            </div>
          )}
          {!model?.modelReady && (
            <div className="model-banner">
              <ScanLine size={20} />
              <div>
                <strong>Görüntüye hazır. Modelinizi bekliyor.</strong>
                <span>
                  Gerçek tespit için eğitilmiş PET modeli gerekli. Kamera
                  önizlemesini şimdi açabilirsiniz.
                </span>
              </div>
              <Action
                onClick={() =>
                  changeTab(tab === "camera" ? "settings" : "camera")
                }
              >
                {tab === "camera" ? "Model bilgisi" : "Kamerayı aç"}{" "}
                <ArrowUpRight size={15} />
              </Action>
            </div>
          )}
          {(tab === "overview" || tab === "records") && (
            <div className="filter-bar">
              <div>
                <span className="micro">GÖRÜNÜM</span>
                <SelectControl
                  aria-label="Kayıt kaynağı"
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="CAMERA">Kamera kayıtları</option>
                  <option value="MANUAL">Manuel testler</option>
                  <option value="ALL">Tüm kaynaklar</option>
                  <option value="LEGACY">Eski kayıtlar</option>
                </SelectControl>
                <input
                  aria-label="Hat filtresi"
                  placeholder="Tüm hatlar"
                  value={line}
                  maxLength={50}
                  onChange={(e) => {
                    setLine(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
              <SelectControl
                aria-label="Zaman aralığı"
                value={hours}
                onChange={(e) => {
                  setHours(e.target.value);
                  setPage(0);
                }}
              >
                <option value="24">Son 24 saat</option>
                <option value="168">Son 7 gün</option>
                <option value="720">Son 30 gün</option>
              </SelectControl>
            </div>
          )}
          {tab === "camera" && (
            <Camera model={model} onSaved={() => refresh(true)} />
          )}
          {tab === "overview" && (
            <>
              <div className="stat-grid">
                {[
                  ["İncelenen şişe", total, "Kalıcı olay kaydı", "total"],
                  [
                    "Geçti",
                    totals.passed,
                    total
                      ? `%${passRate.toFixed(1)} geçiş oranı`
                      : "Henüz veri yok",
                    "pass",
                  ],
                  [
                    "Kusurlu",
                    totals.failed,
                    "Kapsam içi kusur tespiti",
                    "fail",
                  ],
                  [
                    "İnceleme bekliyor",
                    totals.review,
                    "Düşük güven / belirsiz görüntü",
                    "review",
                  ],
                ].map(([label, value, note, style]) => (
                  <section className={`stat-card ${style}`} key={label}>
                    <span>
                      {label}
                      <span className="stat-dot" />
                    </span>
                    <strong>{loading && !overview ? "—" : fmt(value)}</strong>
                    <small>{note}</small>
                  </section>
                ))}
              </div>
              <div className="analytics-grid">
                <section className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>İnceleme akışı</h3>
                      <span>Saatlik kayıt dağılımı · seçili zaman aralığı</span>
                    </div>
                    <div className="legend">
                      <i /> Toplam <i className="fail" /> Kusurlu
                    </div>
                  </div>
                  <Chart series={overview?.series || []} />
                </section>
                <section className="panel defect-panel">
                  <div className="panel-heading">
                    <h3>Kusur dağılımı</h3>
                    <ScanLine size={18} />
                  </div>
                  {Object.entries(names).map(([key, name]) => {
                    const n =
                      Number(
                        overview?.defects?.find((d) => d.defect === key)?.count,
                      ) || 0;
                    return (
                      <div className="defect-row" key={key}>
                        <div>
                          <span>{name}</span>
                          <strong>{fmt(n)}</strong>
                        </div>
                        <div className="meter">
                          <i
                            style={{
                              width: `${Math.min(100, (n / Math.max(1, Number(totals.failed))) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <small>Bir kayıtta birden fazla kusur bulunabilir.</small>
                </section>
              </div>
            </>
          )}
          {(tab === "overview" || tab === "records") && (
            <section className="panel records-panel">
              <div className="panel-heading">
                <div>
                  <h3>
                    {tab === "overview"
                      ? "Son incelemeler"
                      : "İnceleme kayıtları"}
                  </h3>
                  <span>
                    {fmt(records?.total)} kayıt ·{" "}
                    {source === "CAMERA"
                      ? "Kamera"
                      : source === "MANUAL"
                        ? "Manuel test"
                        : source === "LEGACY"
                          ? "Eski kayıtlar"
                          : "Tüm kaynaklar"}
                  </span>
                </div>
                <SelectControl
                  aria-label="Sonuç filtresi"
                  value={result}
                  onChange={(e) => {
                    setResult(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="ALL">Tüm sonuçlar</option>
                  <option value="PASS">Geçti</option>
                  <option value="FAIL">Kusurlu</option>
                  <option value="REVIEW">İncele</option>
                </SelectControl>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>OLAY</th>
                      <th>HAT / KAMERA</th>
                      <th>SONUÇ</th>
                      <th>TESPİT</th>
                      <th>GÜVEN</th>
                      <th>ZAMAN</th>
                      <th>
                        <span className="sr-only">Detay</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records?.items?.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="event-id">
                            {r.eventId.slice(0, 8)}
                          </span>
                          <small>
                            {r.source === "MANUAL"
                              ? "Manuel test"
                              : r.modelVersion}
                          </small>
                        </td>
                        <td>
                          {r.lineCode}
                          <small>{r.cameraId}</small>
                        </td>
                        <td>
                          <span className={`badge ${r.overallResult}`}>
                            {verdicts[r.overallResult] || r.overallResult}
                          </span>
                        </td>
                        <td>
                          {r.defects
                            ? r.defects
                                .split(",")
                                .filter(Boolean)
                                .map((d) => names[d] || d)
                                .join(", ")
                            : r.overallResult === "REVIEW"
                              ? "Belirsiz"
                              : "Kusur görülmedi"}
                        </td>
                        <td>
                          {r.confidence === null
                            ? "—"
                            : `%${Math.round(r.confidence * 100)}`}
                        </td>
                        <td className="nowrap">{date(r.inspectedAt)}</td>
                        <td>
                          <Action
                            className="icon-btn"
                            aria-label={`${r.eventId.slice(0, 8)} olay detayı`}
                            onClick={() => setDetail(r)}
                          >
                            <ArrowUpRight size={16} />
                          </Action>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!records?.items?.length && (
                <div className="empty table-empty">
                  <ClipboardList size={30} strokeWidth={1} />
                  <h3>
                    {loading ? "Kayıtlar yükleniyor…" : "Henüz bir iz yok."}
                  </h3>
                  <p>
                    {error
                      ? "Veri bağlantısı yeniden kurulduğunda kayıtlar burada görünür."
                      : "Seçili filtrelerde kayıt bulunamadı. Kamera bağlantısı kurun veya filtreleri değiştirin."}
                  </p>
                  {!loading && (
                    <Action
                      className="text-link"
                      onClick={() => changeTab("camera")}
                    >
                      Kamera bağlantısını aç <ArrowUpRight size={15} />
                    </Action>
                  )}
                </div>
              )}
              <div className="table-footer">
                <span>
                  {last
                    ? `Son güncelleme ${last.toLocaleTimeString("tr-TR", {
                        timeZone: "Europe/Istanbul",
                      })}`
                    : "Bağlantı bekleniyor"}{" "}
                  · 5 sn aralıkla
                </span>
                <div>
                  <Action
                    className="icon-btn"
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Önceki sayfa"
                  >
                    <ChevronLeft size={17} />
                  </Action>
                  <span>
                    {page + 1} / {Math.max(1, records?.pages || 0)}
                  </span>
                  <Action
                    className="icon-btn"
                    disabled={!records || page + 1 >= records.pages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Sonraki sayfa"
                  >
                    <ChevronRight size={17} />
                  </Action>
                </div>
              </div>
            </section>
          )}
          {tab === "settings" && (
            <div className="settings-grid">
              <section className="panel">
                <div className="panel-heading">
                  <h3>Bağlantı durumu</h3>
                  <Activity size={18} />
                </div>
                {[
                  [
                    "Backend & PostgreSQL",
                    health ? "Bağlı" : "Kontrol gerekli",
                    health,
                  ],
                  [
                    "Yerel model servisi",
                    model?.status === "ok" ? "Bağlı" : "Bağlı değil",
                    model?.status === "ok",
                  ],
                  [
                    "PET tespit modeli",
                    model?.modelReady ? "Yüklü" : "Bekleniyor",
                    model?.modelReady,
                  ],
                ].map(([name, value, ok]) => (
                  <div className="setting-row" key={name}>
                    <span>{name}</span>
                    <span className={`badge ${ok ? "PASS" : "REVIEW"}`}>
                      {value}
                    </span>
                  </div>
                ))}
                <p>
                  Servisler bağlı olsa da gerçek hat doğruluğu ayrıca
                  ölçülmelidir.
                </p>
              </section>
              <section className="panel">
                <span className="micro">MODEL KARTI</span>
                <h3>{model?.modelVersion || "Henüz model yüklenmedi"}</h3>
                <p>
                  Desteklenen sınıflar: bottle, underfill, missing_cap,
                  loose_cap. Şema dışında kalan model otomatik olarak
                  etkinleştirilmez.
                </p>
                <div className="setting-row">
                  <span>Cihaz</span>
                  <strong>{model?.device || "—"}</strong>
                </div>
                <div className="setting-row">
                  <span>Geçiş güven eşiği</span>
                  <strong>
                    %{Math.round((model?.minimumConfidence ?? 0.65) * 100)}
                  </strong>
                </div>
                <div className="setting-row">
                  <span>Eğitim / saha kabulü</span>
                  <span className="badge REVIEW">Doğrulanmadı</span>
                </div>
              </section>
              <section className="panel setup-guide">
                <span className="micro">İLK GERÇEK TESPİTE DOĞRU</span>
                <h3>Modelinizi bağlayın.</h3>
                <ol>
                  <li>PET sınıflarını içeren modeli eğitimden dışa aktarın.</li>
                  <li>
                    Güvendiğiniz <code>best.pt</code> dosyasını model servisine
                    tanımlayın.
                  </li>
                  <li>PC kamerasıyla sabit ışıkta tek şişe denemesi yapın.</li>
                  <li>
                    Kendi hattınızdaki bağımsız testlerle eşikleri ve hata
                    oranlarını değerlendirin.
                  </li>
                </ol>
                <p>
                  Ayrıntılı kurulum ve üretime geçiş kontrolü depodaki ürün
                  rehberinde bulunur. Bu ekranda eğitim veya saha onayı otomatik
                  olarak verilmez.
                </p>
              </section>
              <section className="panel">
                <span className="micro">GÜVENLİ KAYIT</span>
                <h3>Her olay bir kez.</h3>
                <p>
                  Kayıtlar PostgreSQL işlemi tamamlandıktan sonra onaylanır.
                  Aynı olay tekrar gönderildiğinde çoğaltılmaz. Aynı kimlikle
                  farklı içerik gönderimi reddedilir.
                </p>
                <p>
                  PC kamerası bekleyen kayıtları bu tarayıcıda saklar. Kuyruk
                  boşalmadan tarayıcı verilerini temizlemeyin. Manuel testler
                  ayrı kaynakta tutulur.
                </p>
                <p>
                  Bu panel ekip içi operatör erişimi içindir; herkese açık tesis
                  yayını öncesi TLS ve erişim politikalarını yapılandırın.
                </p>
              </section>
            </div>
          )}
          <footer className="workspace-footer">
            <span>NIVECT / VISION WORKSPACE</span>
            <span>İyi üretim, iyi gözlemle başlar.</span>
          </footer>
        </main>
      </div>
      {manual && (
        <Manual
          onClose={() => setManual(false)}
          onSaved={() => {
            setManual(false);
            setSource("MANUAL");
            setPage(0);
            setToast(
              "Manuel test kaydedildi. Kamera metriklerinden ayrı tutulur.",
            );
            refresh(true);
          }}
        />
      )}
      {detail && (
        <Modal title="İnceleme detayı" onClose={() => setDetail(null)}>
          <span className={`badge ${detail.overallResult}`}>
            {verdicts[detail.overallResult]}
          </span>
          <dl className="detail-list">
            {[
              ["Olay kimliği", detail.eventId],
              ["Hat", detail.lineCode],
              ["Kamera", detail.cameraId],
              ["Kaynak", detail.source],
              ["Model", detail.modelVersion],
              [
                "Güven",
                detail.confidence === null
                  ? "—"
                  : `%${Math.round(detail.confidence * 100)}`,
              ],
              ["Kusurlar", detail.defects || "Kusur görülmedi"],
              ["Zaman (İstanbul)", date(detail.inspectedAt)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {detail.overallResult === "PASS" && (
            <p className="muted">
              PASS yalnızca tanımlı model kapsamındaki kusurlar için geçerlidir;
              mutlak ürün güvenliği onayı değildir.
            </p>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <Action
            className="icon-btn"
            onClick={() => setToast("")}
            aria-label="Bildirimi kapat"
          >
            <X size={16} />
          </Action>
        </div>
      )}
    </div>
  );
}
function Chart({ series }) {
  if (!series.length)
    return (
      <div className="chart-empty">
        <div className="chart-grid-lines">
          <i />
          <i />
          <i />
        </div>
        <span>İlk kayıtla birlikte akışınız burada görünür.</span>
        <small>Gösterilecek veri yok</small>
      </div>
    );
  const max = Math.max(...series.map((s) => Number(s.total)), 1);
  return (
    <div className="chart" aria-label="Saatlik inceleme grafiği">
      {series.map((s, i) => (
        <div className="chart-column" key={i}>
          <div
            className="chart-bar-wrap"
            title={`${date(s.hour)}: ${s.total} toplam, ${s.failed} kusurlu`}
          >
            <div
              className="chart-bar"
              style={{
                height: `${(Number(s.total) / max) * 100}%`,
              }}
            >
              <i
                style={{
                  height: `${(Number(s.failed) / Math.max(1, Number(s.total))) * 100}%`,
                }}
              />
            </div>
          </div>
          <span>
            {toDate(s.hour).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              timeZone: "Europe/Istanbul",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
function Manual({ onClose, onSaved }) {
  const [line, setLine] = useState("test-line"),
    [defects, setDefects] = useState([]),
    [found, setFound] = useState(true),
    [confidence, setConfidence] = useState(0.9),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef(null);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/v1/inspections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          request.current ||
            (request.current = {
              eventId: crypto.randomUUID(),
              lineCode: line,
              cameraId: "manual",
              bottleFound: found,
              defects,
              confidence: Number(confidence),
              modelVersion: "manual-test",
              source: "MANUAL",
              capturedAt: new Date().toISOString(),
            }),
        ),
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Manuel bağlantı testi" onClose={onClose}>
      <p className="muted">
        Gerçek model sonucu değildir. MANUAL kaynağında saklanır, kamera
        metriklerine karışmaz.
      </p>
      <form onSubmit={submit} className="form-stack">
        <fieldset disabled={busy || !!request.current}>
          <legend>Parametreler</legend>
          <label>
            Hat kodu
            <input
              required
              pattern="[A-Za-z0-9_-]{1,50}"
              maxLength={50}
              value={line}
              onChange={(e) => setLine(e.target.value)}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={found}
              onChange={(e) => setFound(e.target.checked)}
            />{" "}
            Şişe bulundu
          </label>
          <fieldset>
            <legend>Kusurlar</legend>
            {Object.entries(names).map(([k, v]) => (
              <label className="checkbox-label" key={k}>
                <input
                  type="checkbox"
                  checked={defects.includes(k)}
                  onChange={(e) =>
                    setDefects((ds) =>
                      e.target.checked ? [...ds, k] : ds.filter((d) => d !== k),
                    )
                  }
                />
                {v}
              </label>
            ))}
          </fieldset>
          <label>
            Güven · %{Math.round(confidence * 100)}
            <input
              type="range"
              min="0"
              max="1"
              step=".01"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
            />
          </label>
        </fieldset>
        {error && (
          <div className="error" role="alert">
            {error} Tekrar deneme aynı olay kimliğini kullanır.
          </div>
        )}
        <Action className="btn primary" disabled={busy} type="submit">
          {busy ? "Kaydediliyor…" : "Test kaydını oluştur"}
        </Action>
      </form>
    </Modal>
  );
}
