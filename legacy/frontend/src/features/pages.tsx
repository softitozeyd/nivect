import { useLanguage, useT } from '../i18n';
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Camera,
  CheckCheck,
  CircleHelp,
  Cpu,
  Pause,
  Play,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "../store";
import {
  categories,
  metrics,
  formatDate,
  emptyFilters,
  filterEvents,
  stationStatus,
  statusLabels,
  freshness,
} from "../domain";
import type { InspectionEvent, Filters } from "../domain";
import {
  Badge,
  StationBadge,
  MetricCard,
  InspectionFrame,
  TrendChart,
  EmptyState,
} from "../components/ui";
import { EventTable, EventDetail, ExportButton } from "../components/events";
import { petProduct } from "../services/nivect";
function MetricRow({ events }: { events: InspectionEvent[] }) {
  const t = useT();
  const { language } = useLanguage();
  const { snapshot, offline, error, mode, now, failuresOnly } = useApp();
  const m = metrics(
    events,
    snapshot?.stations.reduce(
      (sum, s) =>
        sum +
        (stationStatus(s, !offline && !error, now) === "active" ? s.fps : 0),
      0,
    ) || 0,
  );
  return (
    <div className="metric-grid">
      <MetricCard
        label={t("INSPECTED PRODUCTS")}
        value={failuresOnly ? "—" : m.total.toLocaleString(language === "tr" ? "tr-TR" : "en-US")}
        unit={t("units")}
        detail={
          failuresOnly
            ? t("Total production is unavailable from API")
            : mode === "demo"
              ? t("Simulated records")
              : t("Received session records")
        }
      />
      <MetricCard
        label={failuresOnly ? t("FAILURE RECORDS RECEIVED") : t("DEFECTIVE PRODUCTS")}
        value={String(m.defective)}
        unit={t("units")}
        detail={
          failuresOnly ? t("Within the latest 20 FAIL records") : t("Flagged by AI")
        }
        negative
      />
      <MetricCard
        label={t("DEFECT RATE")}
        value={failuresOnly ? "—" : `${m.rate.toFixed(1)}%`}
        detail={
          failuresOnly
            ? t("PASS records are unavailable")
            : t("Defective / inspected products")
        }
        negative
      />
      <MetricCard
        label={t("TOTAL PROCESSING SPEED")}
        value={failuresOnly || offline || error ? "—" : String(m.fps)}
        unit={t("FPS")}
        detail={
          failuresOnly
            ? t("FPS is unavailable from API")
            : offline || error
              ? t("Disconnected · Value is out of date")
              : mode === "demo"
                ? t("Total across 2 simulated stations")
                : t("Total across active stations")
        }
      />
    </div>
  );
}
export function Overview() {
  const t = useT();
  const { language } = useLanguage();
  const { snapshot, offline, error, mode, preferences, now, failuresOnly } =
    useApp();
  const [selected, setSelected] = useState<InspectionEvent | null>(null);
  const [queue, setQueue] = useState<"all" | "pending" | "reject" | "pass">(
    "all",
  );
  const events = snapshot?.events || [];
  const summary = metrics(events);
  const chartEnd = Date.parse(snapshot?.updatedAt || "") || 0;
  const stations = snapshot?.stations || [];
  const active = stations.filter(
    (s) => stationStatus(s, !offline && !error, now) === "active",
  ).length;
  const healthy = stations.length > 0 && active === stations.length;
  const backendFreshness = freshness(
    snapshot?.updatedAt || "",
    !offline && !error,
    now,
  );
  const backendUp =
    backendFreshness === "active" && snapshot?.backendHealth === "UP";
  const backendStatus =
    backendFreshness === "active"
      ? snapshot?.backendHealth === "UNKNOWN"
        ? "Unknown"
        : snapshot?.backendHealth || "Unknown"
      : backendFreshness === "warning"
        ? "Data delayed"
        : statusLabels[backendFreshness];
  const pending = events.filter((e) => e.decision === "reject" && !e.review);
  const reviewed = events.filter((e) => e.review).length;
  const passRate = summary.total
    ? ((summary.total - summary.defective) / summary.total) * 100
    : 0;
  const rows = events
    .filter(
      (e) =>
        queue === "all" ||
        (queue === "pending"
          ? e.decision === "reject" && !e.review
          : e.decision === queue),
    )
    .slice(0, 5);
  const totalFps = stations
    .filter((s) => stationStatus(s, !offline && !error, now) === "active")
    .reduce((n, s) => n + s.fps, 0);
  return (
    <>
      <div className="context-strip">
        <div>
          <span className={healthy ? "pulse-dot" : "warning-dot"} />
          <strong>
            {failuresOnly
              ? t("Nivect · Latest failure records")
              : t("Production Line 01")}
          </strong>
          <span className="divider" />
          {petProduct}
        </div>
        <Badge
          tone={
            failuresOnly && !error ? "neutral" : healthy ? "success" : "danger"
          }
        >
          {offline || error
            ? t("Connection lost")
            : failuresOnly
              ? t("Camera health unavailable")
              : !healthy
                ? t("Check stations")
                : mode === "demo"
                  ? t("Simulation active")
                  : t("Monitoring active")}
        </Badge>
      </div>
      <MetricRow events={events} />
      <div className="overview-layout">
        <div className="overview-main">
          <section className="panel recommendation-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {failuresOnly ? t("Inspection center") : t("AI inspection center")}{" "}
                  <span className="count">{summary.total}</span>
                </h2>
                <p>
                  {failuresOnly
                    ? t("Spring Boot quality decisions · latest 20 FAIL records")
                    : t("Latest inspections · AI decisions and operator review queue")}
                </p>
              </div>
              <div
                className="segmented-control"
                role="group"
                aria-label={t("Inspection queue filter")}
              >
                {(
                  [
                    { value: "all", label: "All" },
                    { value: "pending", label: "Pending" },
                    { value: "reject", label: "Fail" },
                    { value: "pass", label: "Pass" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    disabled={
                      failuresOnly &&
                      (option.value === "pass" || option.value === "pending")
                    }
                    aria-pressed={queue === option.value}
                    onClick={() => setQueue(option.value)}
                  >
                    {t(option.label)}
                  </button>
                ))}
              </div>
            </div>
            <EventTable events={rows} onSelect={setSelected} recommendations />
            <div className="queue-footer">
              <span>
                {failuresOnly
                  ? t("Open an event to view the available details.")
                  : t("Open an event to view its image and review.")}
              </span>
              <Link className="text-link" to="/history">{t("View all records")}{' '}<ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
          <section className="panel quality-panel">
            <div className="panel-heading">
              <div>
                <h2>{t("Inspection summary")}</h2>
                <p>
                  {failuresOnly
                    ? t("Only FAIL records are available")
                    : t("AI decision distribution in this session")}
                </p>
              </div>
              <span className="soft-label">
                {mode === "demo" ? t("Demo") : t("API")}
              </span>
            </div>
            <div className="quality-ring-wrap">
              <div
                className="quality-ring"
                style={{
                  background: `conic-gradient(#0da7e3 ${failuresOnly ? 0 : passRate}%, #dcecf8 0)`,
                }}
                role="img"
                aria-label={
                  failuresOnly
                    ? t("Pass rate: total production and PASS records are unavailable from API")
                    : `Pass rate based on AI predictions, percent ${passRate.toFixed(1)}`
                }
              >
                <div>
                  <small>{t("PASS RATE")}</small>
                  <strong>
                    {failuresOnly ? "—" : `${passRate.toFixed(1)}%`}
                  </strong>
                  <span>
                    {failuresOnly ? t("Total unavailable") : t("AI prediction")}
                  </span>
                </div>
              </div>
              <span className="ring-chip good">
                {failuresOnly
                  ? t("PASS unknown")
                  : `${summary.total - summary.defective} passed`}
              </span>
              <span className="ring-chip bad">{summary.defective}{' '}{t("failed")}</span>
            </div>
            <div className="quality-bottom">
              <span>
                <i className="legend-dot" />{t("Predicted pass")}{' '}</span>
              <span>
                <i className="legend-dot red" />{t("Predicted defect")}{' '}</span>
            </div>
            <p className="card-footnote">
              {failuresOnly
                ? t("Production defect rate and model accuracy cannot be calculated from the latest 20 failures.")
                : t("This is not a model accuracy measurement; labeled ground truth is required.")}
            </p>
          </section>
          <section className="panel activity-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {failuresOnly
                    ? t("Failure record activity")
                    : t("Inspection activity")}
                </h2>
                <p>
                  {failuresOnly
                    ? t("Received FAIL records over the last 3 hours")
                    : t("Last 3 hours · 15-minute production intervals")}
                </p>
              </div>
              <span className="pulse-dot" />
            </div>
            <TrendChart
              events={events}
              start={chartEnd - 10800000}
              end={chartEnd}
              zone={preferences.zone}
            />
            <div className="activity-totals">
              <div>
                <small>{failuresOnly ? t("RECEIVED RECORDS") : t("INSPECTED")}</small>
                <strong>{summary.total.toLocaleString(language === "tr" ? "tr-TR" : "en-US")}</strong>
              </div>
              <div>
                <small>{t("REVIEWED")}</small>
                <strong>{failuresOnly ? "—" : reviewed}</strong>
              </div>
              <div>
                <small>{t("PENDING")}</small>
                <strong>{failuresOnly ? "—" : pending.length}</strong>
              </div>
            </div>
            <div className="chart-bottom">
              <ShieldCheck size={14} />
              <span>{t("Data represents only the records received in this session.")}{' '}</span>
            </div>
          </section>
        </div>
        <div className="overview-rail">
          <section className="panel health-panel">
            <div className="panel-heading">
              <h2>{failuresOnly ? t("Backend health") : t("Station health")}</h2>
              <Cpu size={17} />
            </div>
            <div className="health-headline">
              <small>
                {failuresOnly
                  ? t("SPRING BOOT / ACTUATOR")
                  : t("TOTAL PROCESSING SPEED")}
              </small>
              <div>
                <strong>
                  {failuresOnly
                    ? backendStatus
                    : offline || error
                      ? "—"
                      : totalFps}
                  <span>{failuresOnly ? t("HTTP") : t("FPS")}</span>
                </strong>
                <Badge
                  tone={
                    (failuresOnly ? backendUp : healthy) ? "success" : "warning"
                  }
                >
                  {failuresOnly
                    ? t("Health response")
                    : `${active}/${stations.length} active`}
                </Badge>
              </div>
              <div className="health-meter">
                <span
                  style={{
                    width: `${failuresOnly ? (backendUp ? 100 : 0) : stations.length ? (active / stations.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p>
                {failuresOnly
                  ? t("Backend health does not verify camera or model health.")
                  : t("Camera and inference connection status")}
              </p>
            </div>
            {failuresOnly && (
              <p className="card-footnote">{t("Station/heartbeat data, FPS, and model versions are unavailable from this API.")}{' '}</p>
            )}
            <div className="health-stations">
              {stations.map((s) => (
                <div className="station-mini" key={s.id}>
                  <div className="station-icon">
                    <Camera size={16} />
                  </div>
                  <div>
                    <strong>{s.id}</strong>
                    <small>{t(s.name)}</small>
                  </div>
                  <StationBadge
                    station={s}
                    connected={!offline && !error}
                    now={now}
                  />
                </div>
              ))}
            </div>
            <div className="system-foot">
              <Cpu size={14} />
              <span>{t("Model")}{" "}
                <strong>
                  {[...new Set(stations.map((s) => s.modelVersion))].join(
                    ", ",
                  ) || "Unknown"}
                </strong>
              </span>
              <span className="soft-label">
                {mode === "demo" ? t("ONNX · Demo") : t("API metadata")}
              </span>
            </div>
            <Link className="preview-link" to="/stations">{t("View all stations")}{' '}<ArrowUpRight size={14} />
            </Link>
          </section>
          <section className="panel attention-panel">
            <div className="panel-heading">
              <h2>
                {failuresOnly ? t("Latest failure alerts") : t("Awaiting review")}
              </h2>
              <Badge tone={pending.length ? "danger" : "success"}>
                {pending.length}{' '}{t("records")}{' '}</Badge>
            </div>
            {!pending.length ? (
              <p className="attention-empty">{t("No defect predictions are awaiting review.")}{' '}</p>
            ) : (
              pending.slice(0, 2).map((e) => (
                <button
                  className="attention-event"
                  key={e.id}
                  onClick={() => setSelected(e)}
                >
                  <span className="attention-icon">
                    <AlertTriangle size={15} />
                  </span>
                  <span>
                    <strong>{t(e.category)}</strong>
                    <small>
                      {e.stationId} · {e.id}
                    </small>
                  </span>
                  <span className="attention-action">{t("Review")}{' '}<ArrowUpRight size={12} />
                  </span>
                </button>
              ))
            )}
            <p className="card-footnote">{t("AI predictions are kept separate from operator confirmations.")}{' '}</p>
          </section>
          <section className="panel preview-panel">
            <div className="panel-heading">
              <h2>{t("Station preview")}</h2>
              <Badge
                tone={failuresOnly ? "neutral" : healthy ? "success" : "danger"}
              >
                {failuresOnly
                  ? t("No image API")
                  : !healthy
                    ? t("Check status")
                    : mode === "demo"
                      ? t("DEMO")
                      : t("API")}
              </Badge>
            </div>
            <InspectionFrame event={events[0]} simulated={mode === "demo"} />
            <Link className="preview-link" to="/monitoring">{t("Open live monitoring")}{' '}<ArrowUpRight size={14} />
            </Link>
          </section>
        </div>
      </div>
      <div className="info-note safety-note">
        <ShieldCheck size={16} />
        <span>{t("Monitoring and decision support only. No physical production controls.")}{' '}</span>
      </div>
      {selected && (
        <EventDetail event={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

export function Monitoring() {
  const t = useT();
  const { language } = useLanguage();
  const { snapshot, offline, error, preferences, mode, now, failuresOnly } =
    useApp();
  const [params, setParams] = useSearchParams();
  const station = failuresOnly
    ? params.get("line") || "all"
    : params.get("station") || snapshot?.stations[0]?.id || "";
  const lines = [...new Set(snapshot?.events.map((e) => e.lineId) || [])];
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState<InspectionEvent | undefined>();
  const [selected, setSelected] = useState<InspectionEvent | null>(null);
  const events = (snapshot?.events || []).filter((e) =>
    failuresOnly
      ? station === "all" || e.lineId === station
      : e.stationId === station,
  );
  const event = paused ? frozen : events[0];
  const source = snapshot?.stations.find((s) => s.id === station);
  const health = source
    ? stationStatus(source, !offline && !error, now)
    : "unknown";
  function toggle() {
    if (!paused) setFrozen(events[0]);
    setPaused(!paused);
  }
  return (
    <>
      <div className="section-top">
        <label>
          {failuresOnly ? t("Select line") : t("Select station")}
          <select
            aria-label={failuresOnly ? t("Select line") : t("Select station")}
            value={station}
            onChange={(e) => {
              setParams(
                failuresOnly
                  ? { line: e.target.value }
                  : { station: e.target.value },
              );
              setPaused(false);
            }}
          >
            {failuresOnly ? (
              <>
                <option value="all">{t("All lines")}</option>
                {lines.map((line) => (
                  <option key={line}>{line}</option>
                ))}
              </>
            ) : (
              !source && (
                <option value={station}>
                  {station ? `${station} · Station not found` : t("No stations")}
                </option>
              )
            )}
            {snapshot?.stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {t(s.name)}
              </option>
            ))}
          </select>
        </label>
        <button onClick={toggle} disabled={!event}>
          {paused ? <Play size={16} /> : <Pause size={16} />}{" "}
          {paused ? t("Resume view") : t("Pause view")}
        </button>
      </div>
      <div className="monitor-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              {failuresOnly
                ? station === "all"
                  ? t("All lines")
                  : station
                : station || "No stations"}{" "}
              ·{" "}
              {mode === "demo" ? t("Visual simulation") : t("Latest failure record")}
            </h2>
            <Badge
              tone={
                failuresOnly
                  ? error
                    ? "danger"
                    : "neutral"
                  : health !== "active"
                    ? "danger"
                    : paused
                      ? "warning"
                      : "success"
              }
            >
              {failuresOnly
                ? error
                  ? t("Disconnected")
                  : paused
                    ? t("View paused")
                    : t("Camera feed unavailable")
                : health !== "active"
                  ? t(statusLabels[health])
                  : paused
                    ? t("View paused")
                    : mode === "demo"
                      ? t("Simulation active")
                      : t("Monitoring active")}
            </Badge>
          </div>
          <InspectionFrame event={event} large simulated={mode === "demo"} />
          <p className="info-note">
            {failuresOnly
              ? t("Pausing freezes this view; API polling continues.")
              : t("Pausing freezes only this view. Data collection and other screens keep updating; physical production continues.")}
          </p>
        </section>
        <section className="panel decision-panel">
          <span className="eyebrow">
            {failuresOnly ? t("LATEST QUALITY DECISION") : t("LATEST AI DECISION")}
          </span>
          <div
            className={`decision-symbol ${!event ? "unknown" : event.decision === "reject" ? "bad" : ""}`}
          >
            {!event ? (
              <CircleHelp size={38} />
            ) : event.decision === "reject" ? (
              <AlertTriangle size={38} />
            ) : (
              <CheckCheck size={38} />
            )}
          </div>
          <h2>{t(event?.category || "Waiting for data")}</h2>
          <p className="muted">{event?.id}</p>
          <div className="detail-grid">
            <div>
              <small>{t("Model confidence")}</small>
              <strong>
                {event && event.confidence !== null
                  ? `${(event.confidence * 100).toFixed(1)}%`
                  : "—"}
              </strong>
            </div>
            <div>
              <small>{t("Model")}</small>
              <strong>{event?.modelVersion || "—"}</strong>
            </div>
            <div>
              <small>{t("Detection time")}</small>
              <strong>
                {event ? formatDate(event.timestamp, preferences.zone, language === "tr" ? "tr-TR" : "en-US") : "—"}
              </strong>
            </div>
          </div>
          {event && (
            <button onClick={() => setSelected(event)}>{t("Open inspection details")}{' '}<ArrowUpRight size={16} />
            </button>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            {failuresOnly ? t("Latest failures by line") : t("Latest station alerts")}
          </h2>
          <span className="soft-label">{t("AI predictions")}</span>
        </div>
        <EventTable
          events={events.filter((e) => e.decision === "reject").slice(0, 5)}
          onSelect={setSelected}
        />
      </section>
      {selected && (
        <EventDetail event={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
export function Stations() {
  const t = useT();
  const { language } = useLanguage();
  const { snapshot, offline, error, preferences, now, mode } = useApp();
  return (
    <>
      <p className="muted">{t("Stations are monitored in read-only mode.")}{" "}
        {mode === "demo"
          ? t("Connections are simulated in the demo environment.")
          : t("The Nivect backend provides no station, camera, or heartbeat endpoint.")}
      </p>
      {!snapshot?.stations.length && (
        <section className="panel">
          <EmptyState title={t("No station records")}>
            {mode === "demo"
              ? t("No station information has been received from the data source yet.")
              : t("Camera connection status is not assumed. Backend health is shown on the Overview screen.")}
          </EmptyState>
        </section>
      )}
      <div className="station-cards">
        {snapshot?.stations.map((s) => (
          <section className="panel station-card" key={s.id}>
            <div className="panel-heading">
              <div className="station-icon">
                <Camera size={24} />
              </div>
              <Badge
                tone={
                  stationStatus(s, !offline && !error, now) === "active"
                    ? "success"
                    : "danger"
                }
              >
                {t(statusLabels[stationStatus(s, !offline && !error, now)])}
              </Badge>
            </div>
            <h2>{s.id}</h2>
            <p>{t(s.name)}</p>
            <div className="spec-list">
              {[
                ["Production line", "Production Line 01"],
                [
                  "Camera connection",
                  offline || error ? "Disconnected" : statusLabels[s.camera],
                ],
                [
                  "Inference status",
                  offline || error ? "Unknown" : statusLabels[s.inference],
                ],
                ["Last heartbeat", formatDate(s.heartbeat, preferences.zone, language === "tr" ? "tr-TR" : "en-US")],
                ["Model version", s.modelVersion],
                [
                  "Processing speed",
                  offline || error ? "Out of date" : `${s.fps} FPS`,
                ],
                [
                  "Last error",
                  offline
                    ? "Simulated connection outage"
                    : s.error || "No errors recorded",
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{t(k)}</span>
                  <strong>{t(v)}</strong>
                </div>
              ))}
            </div>
            <Link
              to={`/monitoring?station=${encodeURIComponent(s.id)}`}
              className="preview-link"
            >{t("Go to monitoring")}{' '}<ArrowUpRight size={16} />
            </Link>
          </section>
        ))}
      </div>
    </>
  );
}
export function Reports() {
  const t = useT();
  const { language } = useLanguage();
  const { snapshot, preferences, failuresOnly } = useApp();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const events = filterEvents(snapshot?.events || [], filters, t, language);
  const m = metrics(events);
  const defectTypes = categories
    .slice(1)
    .filter((c) => events.some((e) => (e.defects || [e.category]).includes(c)));
  const defectCount = events.reduce(
    (count, e) =>
      count + (e.defects?.length ?? (e.decision === "reject" ? 1 : 0)),
    0,
  );
  const chartEnd = filters.to
    ? Date.parse(`${filters.to}T23:59:59.999+03:00`)
    : Date.parse(snapshot?.updatedAt || "") || 0;
  const chartStart = filters.from
    ? Date.parse(`${filters.from}T00:00:00+03:00`)
    : events.length
      ? Math.min(...events.map((e) => Date.parse(e.timestamp)))
      : chartEnd - 10800000;
  return (
    <>
      <div className="section-top">
        <div className="date-controls">
          <label>{t("Start date")}{' '}<input
              type="date"
              aria-label={t("Start date")}
              max={filters.to || undefined}
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label>{t("End date")}{' '}<input
              type="date"
              aria-label={t("End date")}
              min={filters.from}
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
          <button onClick={() => setFilters(emptyFilters)}>{t("Entire session")}{' '}</button>
          <small>{t("Date boundaries: Istanbul (UTC+3)")}</small>
        </div>
        <ExportButton events={events} />
      </div>
      <MetricRow events={events} />
      {!events.length ? (
        <section className="panel">
          <EmptyState title={t("No data in this date range")} />
        </section>
      ) : (
        <div className="reports-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>{t("Defect distribution")}</h2>
              <span className="soft-label">
                {m.defective}{' '}{t("records ·")}{' '}{defectCount}{' '}{t("defects")}{' '}</span>
            </div>
            <div className="distribution">
              {defectTypes.map((c, i) => {
                const count = events.filter((e) =>
                  (e.defects || [e.category]).includes(c),
                ).length;
                return (
                  <div key={c}>
                    <div>
                      <span>{t(c)}</span>
                      <strong>{count}{' '}{t("units")}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        style={{
                          width: `${defectCount ? (count / defectCount) * 100 : 0}%`,
                          background: [
                            "#119d8c",
                            "#55bbaa",
                            "#e5ac5a",
                            "#db887c",
                          ][i % 4],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>
                {failuresOnly
                  ? t("Failure records by line")
                  : t("Station comparison")}
              </h2>
              <span className="soft-label">{t("Selected period")}</span>
            </div>
            <div className="spec-list">
              {[
                ...new Set([
                  ...(failuresOnly
                    ? []
                    : snapshot?.stations.map((s) => s.id) || []),
                  ...events.map((e) => (failuresOnly ? e.lineId : e.stationId)),
                ]),
              ].map((id) => {
                const stat = metrics(
                  events.filter(
                    (e) => (failuresOnly ? e.lineId : e.stationId) === id,
                  ),
                );
                return (
                  <div key={id}>
                    <strong>{id}</strong>
                    <span>
                      {failuresOnly
                        ? `${stat.defective} failure records · Rate unavailable`
                        : `${stat.total} products · ${stat.defective} defects · ${stat.rate.toFixed(1)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="info-note">{t("This report shows operational AI predictions. Labeled ground truth is required to measure recall and false reject rates.")}{' '}</p>
          </section>
          <section className="panel wide">
            <div className="panel-heading">
              <h2>{t("Inspection trend")}</h2>
              <span className="soft-label">{t("Selected period · All records")}</span>
            </div>
            <TrendChart
              events={events}
              start={Math.min(chartStart, chartEnd - 1)}
              end={chartEnd}
              zone={preferences.zone}
              period={t("Selected period")}
            />
          </section>
        </div>
      )}
    </>
  );
}
export function Settings() {
  const t = useT();
  const { language, setLanguage } = useLanguage();
  const { preferences, setPreferences, setToast, mode, offline, setOffline } =
    useApp();
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <h2>{t("Interface preferences")}</h2>
        <label>{t("Interface language")}<select aria-label={t("Interface language")} value={language} onChange={(e) => setLanguage(e.target.value as "tr" | "en")}><option value="tr">Türkçe</option><option value="en">English</option></select></label>
        <p className="muted">{t("Preferences are stored in this browser and applied immediately.")}{' '}</p>
        <label>{t("Refresh interval")}{' '}<select
            aria-label={t("Refresh interval")}
            value={preferences.interval}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                interval: Number(e.target.value),
              })
            }
          >
            <option value={3000}>{t("3 seconds")}</option>
            <option value={5000}>{t("5 seconds")}</option>
            <option value={10000}>{t("10 seconds")}</option>
          </select>
        </label>
        <label>{t("Time zone")}{' '}<select
            aria-label={t("Time zone")}
            value={preferences.zone}
            onChange={(e) =>
              setPreferences({ ...preferences, zone: e.target.value })
            }
          >
            <option value="Europe/Istanbul">{t("Istanbul (UTC+3)")}</option>
            <option value="UTC">{t("UTC")}</option>
          </select>
        </label>
        <label className="toggle-row">
          <span>
            <strong>{t("Action notifications")}</strong>
            <small>{t("Show notifications for CSV exports and connection actions.")}{' '}</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.notifications}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                notifications: e.target.checked,
              })
            }
          />
        </label>
        <label className="toggle-row">
          <span>
            <strong>{t("Compact table")}</strong>
            <small>{t("Reduce row spacing in inspection tables.")}</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.compact}
            onChange={(e) =>
              setPreferences({ ...preferences, compact: e.target.checked })
            }
          />
        </label>
      </section>
      <section className="panel settings-panel">
        <h2>{t("Demo and connection")}</h2>
        <p className="muted">{t("Active data source:")}{" "}
          <strong>
            {mode === "demo"
              ? t("Local simulation")
              : t("Live API (Nivect contract)")}
          </strong>
        </p>
        <div className="notice">
          <ShieldCheck size={22} />
          <span>
            {mode === "demo"
              ? t("The demo is not connected to production systems. All records and images are illustrative.")
              : t("API mode is active. Connection errors do not fall back to demo data. Live record changes are disabled.")}
          </span>
        </div>
        <button
          disabled={mode !== "demo"}
          onClick={() => {
            setOffline(!offline);
            if (preferences.notifications)
              setToast(
                offline
                  ? "Restoring demo connection."
                  : "Demo connection outage enabled.",
              );
          }}
        >
          {offline ? t("Restore demo connection") : t("Simulate connection outage")}
        </button>
        <hr />
        <h3>{t("Integration scope")}</h3>
        <p className="muted">{t("The Nivect Spring Boot address is configured through the development proxy (default port 8080). Approved APIs for user management, camera configuration, and model updates are not available.")}{' '}</p>
        <Badge tone="warning">{t("Advanced configuration unavailable")}</Badge>
        <p className="muted">{t("OCR / batch and expiry date inspection: Phase 2.")}{' '}</p>
      </section>
    </div>
  );
}
