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
        label="INSPECTED PRODUCTS"
        value={failuresOnly ? "—" : m.total.toLocaleString("en-US")}
        unit="units"
        detail={
          failuresOnly
            ? "Total production is unavailable from API"
            : mode === "demo"
              ? "Simulated records"
              : "Received session records"
        }
      />
      <MetricCard
        label={failuresOnly ? "FAILURE RECORDS RECEIVED" : "DEFECTIVE PRODUCTS"}
        value={String(m.defective)}
        unit="units"
        detail={
          failuresOnly ? "Within the latest 20 FAIL records" : "Flagged by AI"
        }
        negative
      />
      <MetricCard
        label="DEFECT RATE"
        value={failuresOnly ? "—" : `${m.rate.toFixed(1)}%`}
        detail={
          failuresOnly
            ? "PASS records are unavailable"
            : "Defective / inspected products"
        }
        negative
      />
      <MetricCard
        label="TOTAL PROCESSING SPEED"
        value={failuresOnly || offline || error ? "—" : String(m.fps)}
        unit="FPS"
        detail={
          failuresOnly
            ? "FPS is unavailable from API"
            : offline || error
              ? "Disconnected · Value is out of date"
              : mode === "demo"
                ? "Total across 2 simulated stations"
                : "Total across active stations"
        }
      />
    </div>
  );
}
export function Overview() {
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
              ? "Nivect · Latest failure records"
              : "Production Line 01"}
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
            ? "Connection lost"
            : failuresOnly
              ? "Camera health unavailable"
              : !healthy
                ? "Check stations"
                : mode === "demo"
                  ? "Simulation active"
                  : "Monitoring active"}
        </Badge>
      </div>
      <MetricRow events={events} />
      <div className="overview-layout">
        <div className="overview-main">
          <section className="panel recommendation-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {failuresOnly ? "Inspection center" : "AI inspection center"}{" "}
                  <span className="count">{summary.total}</span>
                </h2>
                <p>
                  {failuresOnly
                    ? "Spring Boot quality decisions · latest 20 FAIL records"
                    : "Latest inspections · AI decisions and operator review queue"}
                </p>
              </div>
              <div
                className="segmented-control"
                role="group"
                aria-label="Inspection queue filter"
              >
                {(
                  [
                    { value: "all", label: "All" },
                    { value: "pending", label: "Pending" },
                    { value: "reject", label: "Fail" },
                    { value: "pass", label: "Pass" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.value}
                    disabled={
                      failuresOnly &&
                      (t.value === "pass" || t.value === "pending")
                    }
                    aria-pressed={queue === t.value}
                    onClick={() => setQueue(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <EventTable events={rows} onSelect={setSelected} recommendations />
            <div className="queue-footer">
              <span>
                {failuresOnly
                  ? "Open an event to view the available details."
                  : "Open an event to view its image and review."}
              </span>
              <Link className="text-link" to="/history">
                View all records <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
          <section className="panel quality-panel">
            <div className="panel-heading">
              <div>
                <h2>Inspection summary</h2>
                <p>
                  {failuresOnly
                    ? "Only FAIL records are available"
                    : "AI decision distribution in this session"}
                </p>
              </div>
              <span className="soft-label">
                {mode === "demo" ? "Demo" : "API"}
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
                    ? "Pass rate: total production and PASS records are unavailable from API"
                    : `Pass rate based on AI predictions, percent ${passRate.toFixed(1)}`
                }
              >
                <div>
                  <small>PASS RATE</small>
                  <strong>
                    {failuresOnly ? "—" : `${passRate.toFixed(1)}%`}
                  </strong>
                  <span>
                    {failuresOnly ? "Total unavailable" : "AI prediction"}
                  </span>
                </div>
              </div>
              <span className="ring-chip good">
                {failuresOnly
                  ? "PASS unknown"
                  : `${summary.total - summary.defective} passed`}
              </span>
              <span className="ring-chip bad">{summary.defective} failed</span>
            </div>
            <div className="quality-bottom">
              <span>
                <i className="legend-dot" />
                Predicted pass
              </span>
              <span>
                <i className="legend-dot red" />
                Predicted defect
              </span>
            </div>
            <p className="card-footnote">
              {failuresOnly
                ? "Production defect rate and model accuracy cannot be calculated from the latest 20 failures."
                : "This is not a model accuracy measurement; labeled ground truth is required."}
            </p>
          </section>
          <section className="panel activity-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {failuresOnly
                    ? "Failure record activity"
                    : "Inspection activity"}
                </h2>
                <p>
                  {failuresOnly
                    ? "Received FAIL records over the last 3 hours"
                    : "Last 3 hours · 15-minute production intervals"}
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
                <small>{failuresOnly ? "RECEIVED RECORDS" : "INSPECTED"}</small>
                <strong>{summary.total.toLocaleString("en-US")}</strong>
              </div>
              <div>
                <small>REVIEWED</small>
                <strong>{failuresOnly ? "—" : reviewed}</strong>
              </div>
              <div>
                <small>PENDING</small>
                <strong>{failuresOnly ? "—" : pending.length}</strong>
              </div>
            </div>
            <div className="chart-bottom">
              <ShieldCheck size={14} />
              <span>
                Data represents only the records received in this session.
              </span>
            </div>
          </section>
        </div>
        <div className="overview-rail">
          <section className="panel health-panel">
            <div className="panel-heading">
              <h2>{failuresOnly ? "Backend health" : "Station health"}</h2>
              <Cpu size={17} />
            </div>
            <div className="health-headline">
              <small>
                {failuresOnly
                  ? "SPRING BOOT / ACTUATOR"
                  : "TOTAL PROCESSING SPEED"}
              </small>
              <div>
                <strong>
                  {failuresOnly
                    ? backendStatus
                    : offline || error
                      ? "—"
                      : totalFps}
                  <span>{failuresOnly ? "HTTP" : "FPS"}</span>
                </strong>
                <Badge
                  tone={
                    (failuresOnly ? backendUp : healthy) ? "success" : "warning"
                  }
                >
                  {failuresOnly
                    ? "Health response"
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
                  ? "Backend health does not verify camera or model health."
                  : "Camera and inference connection status"}
              </p>
            </div>
            {failuresOnly && (
              <p className="card-footnote">
                Station/heartbeat data, FPS, and model versions are unavailable
                from this API.
              </p>
            )}
            <div className="health-stations">
              {stations.map((s) => (
                <div className="station-mini" key={s.id}>
                  <div className="station-icon">
                    <Camera size={16} />
                  </div>
                  <div>
                    <strong>{s.id}</strong>
                    <small>{s.name}</small>
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
              <span>
                Model{" "}
                <strong>
                  {[...new Set(stations.map((s) => s.modelVersion))].join(
                    ", ",
                  ) || "Unknown"}
                </strong>
              </span>
              <span className="soft-label">
                {mode === "demo" ? "ONNX · Demo" : "API metadata"}
              </span>
            </div>
            <Link className="preview-link" to="/stations">
              View all stations <ArrowUpRight size={14} />
            </Link>
          </section>
          <section className="panel attention-panel">
            <div className="panel-heading">
              <h2>
                {failuresOnly ? "Latest failure alerts" : "Awaiting review"}
              </h2>
              <Badge tone={pending.length ? "danger" : "success"}>
                {pending.length} records
              </Badge>
            </div>
            {!pending.length ? (
              <p className="attention-empty">
                No defect predictions are awaiting review.
              </p>
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
                    <strong>{e.category}</strong>
                    <small>
                      {e.stationId} · {e.id}
                    </small>
                  </span>
                  <span className="attention-action">
                    Review <ArrowUpRight size={12} />
                  </span>
                </button>
              ))
            )}
            <p className="card-footnote">
              AI predictions are kept separate from operator confirmations.
            </p>
          </section>
          <section className="panel preview-panel">
            <div className="panel-heading">
              <h2>Station preview</h2>
              <Badge
                tone={failuresOnly ? "neutral" : healthy ? "success" : "danger"}
              >
                {failuresOnly
                  ? "No image API"
                  : !healthy
                    ? "Check status"
                    : mode === "demo"
                      ? "DEMO"
                      : "API"}
              </Badge>
            </div>
            <InspectionFrame event={events[0]} simulated={mode === "demo"} />
            <Link className="preview-link" to="/monitoring">
              Open live monitoring <ArrowUpRight size={14} />
            </Link>
          </section>
        </div>
      </div>
      <div className="info-note safety-note">
        <ShieldCheck size={16} />
        <span>
          Monitoring and decision support only. No physical production controls.
        </span>
      </div>
      {selected && (
        <EventDetail event={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

export function Monitoring() {
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
          {failuresOnly ? "Select line" : "Select station"}
          <select
            aria-label={failuresOnly ? "Select line" : "Select station"}
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
                <option value="all">All lines</option>
                {lines.map((line) => (
                  <option key={line}>{line}</option>
                ))}
              </>
            ) : (
              !source && (
                <option value={station}>
                  {station ? `${station} · Station not found` : "No stations"}
                </option>
              )
            )}
            {snapshot?.stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={toggle} disabled={!event}>
          {paused ? <Play size={16} /> : <Pause size={16} />}{" "}
          {paused ? "Resume view" : "Pause view"}
        </button>
      </div>
      <div className="monitor-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              {failuresOnly
                ? station === "all"
                  ? "All lines"
                  : station
                : station || "No stations"}{" "}
              ·{" "}
              {mode === "demo" ? "Visual simulation" : "Latest failure record"}
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
                  ? "Disconnected"
                  : paused
                    ? "View paused"
                    : "Camera feed unavailable"
                : health !== "active"
                  ? statusLabels[health]
                  : paused
                    ? "View paused"
                    : mode === "demo"
                      ? "Simulation active"
                      : "Monitoring active"}
            </Badge>
          </div>
          <InspectionFrame event={event} large simulated={mode === "demo"} />
          <p className="info-note">
            {failuresOnly
              ? "Pausing freezes this view; API polling continues."
              : "Pausing freezes only this view. Data collection and other screens keep updating; physical production continues."}
          </p>
        </section>
        <section className="panel decision-panel">
          <span className="eyebrow">
            {failuresOnly ? "LATEST QUALITY DECISION" : "LATEST AI DECISION"}
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
          <h2>{event?.category || "Waiting for data"}</h2>
          <p className="muted">{event?.id}</p>
          <div className="detail-grid">
            <div>
              <small>Model confidence</small>
              <strong>
                {event && event.confidence !== null
                  ? `${(event.confidence * 100).toFixed(1)}%`
                  : "—"}
              </strong>
            </div>
            <div>
              <small>Model</small>
              <strong>{event?.modelVersion || "—"}</strong>
            </div>
            <div>
              <small>Detection time</small>
              <strong>
                {event ? formatDate(event.timestamp, preferences.zone) : "—"}
              </strong>
            </div>
          </div>
          {event && (
            <button onClick={() => setSelected(event)}>
              Open inspection details <ArrowUpRight size={16} />
            </button>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            {failuresOnly ? "Latest failures by line" : "Latest station alerts"}
          </h2>
          <span className="soft-label">AI predictions</span>
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
  const { snapshot, offline, error, preferences, now, mode } = useApp();
  return (
    <>
      <p className="muted">
        Stations are monitored in read-only mode.{" "}
        {mode === "demo"
          ? "Connections are simulated in the demo environment."
          : "The Nivect backend provides no station, camera, or heartbeat endpoint."}
      </p>
      {!snapshot?.stations.length && (
        <section className="panel">
          <EmptyState title="No station records">
            {mode === "demo"
              ? "No station information has been received from the data source yet."
              : "Camera connection status is not assumed. Backend health is shown on the Overview screen."}
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
                {statusLabels[stationStatus(s, !offline && !error, now)]}
              </Badge>
            </div>
            <h2>{s.id}</h2>
            <p>{s.name}</p>
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
                ["Last heartbeat", formatDate(s.heartbeat, preferences.zone)],
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
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <Link
              to={`/monitoring?station=${encodeURIComponent(s.id)}`}
              className="preview-link"
            >
              Go to monitoring <ArrowUpRight size={16} />
            </Link>
          </section>
        ))}
      </div>
    </>
  );
}
export function Reports() {
  const { snapshot, preferences, failuresOnly } = useApp();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const events = filterEvents(snapshot?.events || [], filters);
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
          <label>
            Start date
            <input
              type="date"
              aria-label="Start date"
              max={filters.to || undefined}
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              aria-label="End date"
              min={filters.from}
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
          <button onClick={() => setFilters(emptyFilters)}>
            Entire session
          </button>
          <small>Date boundaries: Istanbul (UTC+3)</small>
        </div>
        <ExportButton events={events} />
      </div>
      <MetricRow events={events} />
      {!events.length ? (
        <section className="panel">
          <EmptyState title="No data in this date range" />
        </section>
      ) : (
        <div className="reports-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>Defect distribution</h2>
              <span className="soft-label">
                {m.defective} records · {defectCount} defects
              </span>
            </div>
            <div className="distribution">
              {defectTypes.map((c, i) => {
                const count = events.filter((e) =>
                  (e.defects || [e.category]).includes(c),
                ).length;
                return (
                  <div key={c}>
                    <div>
                      <span>{c}</span>
                      <strong>{count} units</strong>
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
                  ? "Failure records by line"
                  : "Station comparison"}
              </h2>
              <span className="soft-label">Selected period</span>
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
            <p className="info-note">
              This report shows operational AI predictions. Labeled ground truth
              is required to measure recall and false reject rates.
            </p>
          </section>
          <section className="panel wide">
            <div className="panel-heading">
              <h2>Inspection trend</h2>
              <span className="soft-label">Selected period · All records</span>
            </div>
            <TrendChart
              events={events}
              start={Math.min(chartStart, chartEnd - 1)}
              end={chartEnd}
              zone={preferences.zone}
              period="Selected period"
            />
          </section>
        </div>
      )}
    </>
  );
}
export function Settings() {
  const { preferences, setPreferences, setToast, mode, offline, setOffline } =
    useApp();
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <h2>Interface preferences</h2>
        <p className="muted">
          Preferences are stored in this browser and applied immediately.
        </p>
        <label>
          Refresh interval
          <select
            aria-label="Refresh interval"
            value={preferences.interval}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                interval: Number(e.target.value),
              })
            }
          >
            <option value={3000}>3 seconds</option>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
          </select>
        </label>
        <label>
          Time zone
          <select
            aria-label="Time zone"
            value={preferences.zone}
            onChange={(e) =>
              setPreferences({ ...preferences, zone: e.target.value })
            }
          >
            <option value="Europe/Istanbul">Istanbul (UTC+3)</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <label className="toggle-row">
          <span>
            <strong>Action notifications</strong>
            <small>
              Show notifications for CSV exports and connection actions.
            </small>
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
            <strong>Compact table</strong>
            <small>Reduce row spacing in inspection tables.</small>
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
        <h2>Demo and connection</h2>
        <p className="muted">
          Active data source:{" "}
          <strong>
            {mode === "demo"
              ? "Local simulation"
              : "Live API (Nivect contract)"}
          </strong>
        </p>
        <div className="notice">
          <ShieldCheck size={22} />
          <span>
            {mode === "demo"
              ? "The demo is not connected to production systems. All records and images are illustrative."
              : "API mode is active. Connection errors do not fall back to demo data. Live record changes are disabled."}
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
          {offline ? "Restore demo connection" : "Simulate connection outage"}
        </button>
        <hr />
        <h3>Integration scope</h3>
        <p className="muted">
          The Nivect Spring Boot address is configured through the development
          proxy (default port 8080). Approved APIs for user management, camera
          configuration, and model updates are not available.
        </p>
        <Badge tone="warning">Advanced configuration unavailable</Badge>
        <p className="muted">
          OCR / batch and expiry date inspection: Phase 2.
        </p>
      </section>
    </div>
  );
}
