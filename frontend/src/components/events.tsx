import { useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import { categories, emptyFilters, filterEvents, formatDate } from "../domain";
import type { InspectionEvent, Filters, OperatorReview } from "../domain";
import { useApp } from "../store";
import { Badge, EmptyState, InspectionFrame, Modal } from "./ui";
import { inspectionCsv } from "../utils/csv";
export function EventTable({
  events,
  onSelect,
  recommendations = false,
}: {
  events: InspectionEvent[];
  onSelect: (event: InspectionEvent) => void;
  recommendations?: boolean;
}) {
  const { preferences } = useApp();
  return (
    <div
      className={`table-scroll ${recommendations ? "recommendation-table" : ""}`}
    >
      <table>
        <thead>
          <tr>
            <th>EVENT / TIME</th>
            <th>STATION</th>
            <th>RESULT</th>
            <th>FINDING</th>
            <th>CONFIDENCE</th>
            <th>
              {recommendations ? (
                "ACTION"
              ) : (
                <span className="sr-only">Open</span>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>
                <div className="event-product">
                  {recommendations && (
                    <span className="product-thumbnail" aria-hidden="true">
                      <svg viewBox="0 0 26 34">
                        <rect
                          x="9"
                          y="2"
                          width="8"
                          height="5"
                          rx="1"
                          fill="#466b70"
                        />
                        <path
                          d="M9 7h8v3q6 2 6 8v12q0 3-3 3H6q-3 0-3-3V18q0-6 6-8z"
                          fill="#9cbdb7"
                        />
                        <rect
                          x="5"
                          y="16"
                          width="16"
                          height="12"
                          rx="2"
                          fill="#eaf3ed"
                        />
                        <path
                          d="M13 18q-5 1-3 5 5-1 3-5m0 0q5 1 3 5-5-1-3-5"
                          fill="#6c9b87"
                        />
                      </svg>
                    </span>
                  )}
                  <div>
                    <button
                      className="text-button event-id"
                      onClick={() => onSelect(e)}
                    >
                      {e.id}
                    </button>
                    <small>{formatDate(e.timestamp, preferences.zone)}</small>
                    {recommendations && (
                      <small className="product-caption">{e.product}</small>
                    )}
                  </div>
                </div>
              </td>
              <td>
                {e.stationId}
                <small>
                  {e.lineId === "L1" ? "Production Line 01" : e.lineId}
                </small>
              </td>
              <td>
                <Badge tone={e.decision === "pass" ? "success" : "danger"}>
                  {e.decision === "pass" ? "Pass" : "Fail"}
                </Badge>
              </td>
              <td>
                {e.category}
                {e.defects && e.defects.length > 1 && (
                  <small>{e.defects.join(" · ")}</small>
                )}
                {e.review && (
                  <small className="teal">
                    {e.review.outcome === "confirmed"
                      ? "Operator confirmed"
                      : e.review.outcome === "false-positive"
                        ? "False positive"
                        : "Flagged for review"}
                  </small>
                )}
              </td>
              <td className="mono">
                <div className="confidence-display">
                  {e.confidence === null
                    ? "—"
                    : `${(e.confidence * 100).toFixed(1)}%`}
                  {recommendations && e.confidence !== null && (
                    <span className="confidence-meter" aria-hidden="true">
                      <i style={{ width: `${e.confidence * 100}%` }} />
                    </span>
                  )}
                </div>
              </td>
              <td>
                <button
                  className={
                    recommendations
                      ? `recommendation-action ${e.decision === "reject" ? "review" : "pass"}`
                      : "icon-button"
                  }
                  aria-label={`${e.id} open details`}
                  onClick={() => onSelect(e)}
                >
                  {recommendations ? (
                    <>
                      {e.review
                        ? "Reviewed"
                        : e.decision === "reject"
                          ? "Review"
                          : "Details"}
                      <ArrowRight size={12} />
                    </>
                  ) : (
                    <ArrowRight size={17} />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!events.length && <EmptyState />}
    </div>
  );
}
export function FilterPanel({
  value,
  onChange,
  stations = ["CAM-01", "CAM-02"],
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  stations?: string[];
}) {
  const update = (key: keyof Filters, v: string) =>
    onChange({ ...value, [key]: v });
  return (
    <div className="filters">
      <label className="search">
        <Search size={17} />
        <input
          aria-label="Search events or products"
          placeholder="Search events or products…"
          value={value.search}
          onChange={(e) => update("search", e.target.value)}
        />
      </label>
      <label>
        Defect type
        <select
          aria-label="Defect type"
          value={value.category}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="all">All findings</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Station
        <select
          aria-label="Station"
          disabled={!stations.length}
          value={value.station}
          onChange={(e) => update("station", e.target.value)}
        >
          <option value="all">
            {stations.length ? "All stations" : "Unavailable from API"}
          </option>
          {stations.map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      <label>
        Decision
        <select
          aria-label="Decision"
          value={value.decision}
          onChange={(e) => update("decision", e.target.value)}
        >
          <option value="all">All decisions</option>
          <option value="reject">Fail</option>
          <option value="pass">Pass</option>
        </select>
      </label>
      <label>
        Start date
        <input
          type="date"
          aria-label="Start date"
          max={value.to || undefined}
          value={value.from}
          onChange={(e) => update("from", e.target.value)}
        />
      </label>
      <label>
        End date
        <input
          type="date"
          aria-label="End date"
          min={value.from}
          value={value.to}
          onChange={(e) => update("to", e.target.value)}
        />
      </label>
      <label>
        Sort order
        <select
          aria-label="Sort order"
          value={value.sort}
          onChange={(e) =>
            onChange({
              ...value,
              sort: e.target.value === "oldest" ? "oldest" : "newest",
            })
          }
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </label>
      <button className="subtle" onClick={() => onChange(emptyFilters)}>
        Clear
      </button>
      <small className="filter-timezone">
        Date boundaries: Istanbul (UTC+3)
      </small>
    </div>
  );
}
export function exportCsv(events: InspectionEvent[], simulated = true) {
  const csv = inspectionCsv(events);
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = simulated ? "visionqc-demo-report.csv" : "visionqc-report.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ExportButton({ events }: { events: InspectionEvent[] }) {
  const { mode, preferences, setToast } = useApp();
  return (
    <button
      onClick={() => {
        exportCsv(events, mode === "demo");
        if (preferences.notifications)
          setToast(`${events.length} records exported as CSV.`);
      }}
    >
      <Download size={16} /> Download CSV
    </button>
  );
}
export function EventDetail({
  event,
  onClose,
}: {
  event: InspectionEvent;
  onClose: () => void;
}) {
  const { review, mode, offline, error, preferences } = useApp();
  const [outcome, setOutcome] = useState<OperatorReview["outcome"]>(
    event.review?.outcome || "confirmed",
  );
  const [note, setNote] = useState(event.review?.note || "");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [saved, setSaved] = useState(event.review);
  const unavailable = mode !== "demo" || offline || !!error;
  async function save() {
    if (unavailable || busy) return;
    setFailure("");
    setBusy(true);
    try {
      const value = { outcome, note, at: new Date().toISOString() };
      await review(event.id, value);
      setSaved(value);
      setConfirm(false);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Inspection details · ${event.id}`} onClose={onClose}>
      <InspectionFrame event={event} simulated={mode === "demo"} />
      <div className="detail-grid">
        {[
          ["Time", formatDate(event.timestamp, preferences.zone)],
          ...(event.sourceInspectedAt
            ? [
                ["Server time (no time zone)", event.sourceInspectedAt],
                [
                  "Assumed UTC offset applied",
                  event.timestampOffset || "Unknown",
                ],
              ]
            : []),
          ["Product", event.product],
          ["Line / Station", `${event.lineId} / ${event.stationId}`],
          [
            mode === "demo" ? "AI prediction" : "Backend quality decision",
            `${event.category} · ${event.confidence === null ? "—" : `${(event.confidence * 100).toFixed(1)}%`}`,
          ],
          ["Model version", event.modelVersion],
          ...(event.checks
            ? [
                ["Cap check", event.checks.capOk ? "Pass" : "Fail"],
                ["Label check", event.checks.labelOk ? "Pass" : "Fail"],
                [
                  "Fill level check",
                  event.checks.liquidLevelOk ? "Pass" : "Fail",
                ],
              ]
            : []),
          ...(event.imagePath
            ? [["Image path (server metadata)", event.imagePath]]
            : []),
          [
            "Operator decision",
            saved
              ? {
                  confirmed: "Defect confirmed",
                  "false-positive": "False positive",
                  flagged: "Flagged for review",
                }[saved.outcome]
              : mode === "api"
                ? "Review status unavailable"
                : "Not reviewed yet",
          ],
        ].map(([key, value]) => (
          <div key={key}>
            <small>{key}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {event.defects && (
        <p className="notice">
          All defects: {event.defects.join(" · ")}. The backend does not
          distinguish missing caps from loose caps.
        </p>
      )}
      {event.imagePath && (
        <p className="muted">
          The server file path is not an image download URL. It is not opened
          automatically because the backend provides no image access endpoint.
        </p>
      )}
      {saved?.note && <p className="notice">Operator note: {saved.note}</p>}
      <h3>Operator review</h3>
      <p className="muted">
        {mode === "api"
          ? "Operator reviews are unavailable for live records."
          : "The AI prediction stays unchanged. Demo reviews are stored only for this session."}
      </p>
      <label>
        Review outcome
        <select
          aria-label="Review outcome"
          disabled={unavailable || busy || confirm}
          value={outcome}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "confirmed" || v === "false-positive" || v === "flagged")
              setOutcome(v);
          }}
        >
          <option value="confirmed">Confirm defect</option>
          <option value="false-positive">Mark as false positive</option>
          <option value="flagged">Flag for review</option>
        </select>
      </label>
      <label>
        Operator note
        <textarea
          maxLength={500}
          disabled={unavailable || busy || confirm}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add your review…"
        />
      </label>
      {mode === "api" && (
        <p className="notice">
          Live record changes are disabled until an approved API and
          authorization are available.
        </p>
      )}
      {failure && (
        <p role="alert" className="danger">
          {failure}
        </p>
      )}
      {confirm ? (
        <div className="notice">
          <p>
            Your review will be added to this demo quality record. Do you want
            to continue?
          </p>
          <button onClick={() => setConfirm(false)}>Cancel</button>
          <button
            className="primary"
            disabled={busy || unavailable}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Confirm and save"}
          </button>
        </div>
      ) : (
        <button
          className="primary full"
          disabled={unavailable}
          onClick={() => setConfirm(true)}
        >
          Save review
        </button>
      )}
    </Modal>
  );
}
export function History() {
  const { snapshot, failuresOnly } = useApp();
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InspectionEvent | null>(null);
  const rows = filterEvents(snapshot?.events || [], filters);
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const safePage = Math.min(page, pages);
  return (
    <>
      <div className="section-top">
        <p className="muted">
          {failuresOnly
            ? "Nivect · Local filtering of the latest 20 failures"
            : "Session history of up to 500 records"}{" "}
          · {rows.length} results
        </p>
        <ExportButton events={rows} />
      </div>
      <section className="panel">
        <FilterPanel
          value={filters}
          stations={
            failuresOnly
              ? []
              : [
                  ...new Set([
                    ...(snapshot?.stations.map((s) => s.id) || []),
                    ...(snapshot?.events.map((e) => e.stationId) || []),
                  ]),
                ]
          }
          onChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
        />
        <EventTable
          events={rows.slice((safePage - 1) * 10, safePage * 10)}
          onSelect={setSelected}
        />
        <div className="pagination">
          <span>
            {rows.length} records · {rows.length ? (safePage - 1) * 10 + 1 : 0}–
            {Math.min(safePage * 10, rows.length)}
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {safePage} / {pages}
            </span>
            <button
              aria-label="Next page"
              disabled={safePage === pages}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      {selected && (
        <EventDetail event={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
