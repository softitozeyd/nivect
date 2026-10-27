import { stationStatus, statusLabels, activityBins } from "../domain";
import { useEffect, useRef, useState, useId } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  X,
  Camera,
  AlertTriangle,
} from "lucide-react";
import type { InspectionEvent } from "../domain";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
export function MetricCard({
  label,
  value,
  unit,
  detail,
  negative = false,
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  negative?: boolean;
}) {
  return (
    <article className="metric">
      <div className="eyebrow">{label}</div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <div className={`metric-detail ${negative ? "danger" : "positive"}`}>
        {negative ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{" "}
        {detail}
      </div>
    </article>
  );
}
export function EmptyState({
  title = "No records found",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Camera size={30} />
      <h3>{title}</h3>
      <p>{children || "Adjust your filters and try again."}</p>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="notice error" role="alert">
      <AlertTriangle size={22} />
      <div>
        <strong>Could not connect to data source</strong>
        <p>{message} · The latest data may be out of date.</p>
      </div>
      <button onClick={retry}>Try again</button>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          aria-label="Close dialog"
          className="icon-button"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function InspectionFrame({
  event,
  large = false,
  simulated = true,
}: {
  event?: InspectionEvent;
  large?: boolean;
  simulated?: boolean;
}) {
  const gradientId = useId();
  const reject = event?.decision === "reject";
  if (!event)
    return (
      <EmptyState title="No inspection image">
        No inspection record has been received for this station yet.
      </EmptyState>
    );
  if (event?.imageUrl)
    return (
      <CapturedImage key={event.imageUrl} url={event.imageUrl} id={event.id} />
    );
  if (!simulated)
    return (
      <EmptyState title="No inspection image">
        No image was provided for this event. Event details are preserved.
      </EmptyState>
    );
  return (
    <div
      className={`inspection-frame ${large ? "large" : ""}`}
      role="img"
      aria-label={`Illustrative bottle image, ${event?.category || "Pass"}. This is not a real camera image.`}
    >
      <div className="frame-grid" />
      <div className="frame-meta">
        <span>CAMERA / {event?.stationId || "CAM-01"}</span>
        <span>SIMULATED FRAME</span>
      </div>
      <div className={`detection ${reject ? "reject" : ""}`}>
        <span>
          {reject ? event.category : "PRODUCT DETECTED"} ·{" "}
          {event.confidence !== null
            ? `${(event.confidence * 100).toFixed(1)}%`
            : "—"}
        </span>
        <svg viewBox="0 0 180 250" className="bottle" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1">
              <stop stopColor="#8bced9" stopOpacity=".5" />
              <stop offset=".4" stopColor="#e8fbff" stopOpacity=".8" />
              <stop offset=".65" stopColor="#b5e0ed" stopOpacity=".6" />
              <stop offset="1" stopColor="#7eb7cf" stopOpacity=".5" />
            </linearGradient>
          </defs>
          {event?.category !== "Missing cap" && (
            <g
              transform={
                event?.category === "Loose cap" ||
                event?.category === "Misaligned cap"
                  ? "translate(0 -8) rotate(10 90 40)"
                  : undefined
              }
            >
              <rect
                x="61"
                y="13"
                width="58"
                height="36"
                rx="7"
                fill="#227eb1"
              />
              <path
                d="M67 18v24m8-24v24m8-24v24m8-24v24m8-24v24m8-24v24"
                stroke="#68bad9"
                strokeWidth="2"
              />
            </g>
          )}
          <path
            d="M65 49h50v18c0 12 27 19 27 45v108q0 18-18 18H56q-18 0-18-18V112c0-26 27-33 27-45z"
            fill={`url(#${gradientId})`}
            stroke="#a7e7ef"
            strokeOpacity=".6"
          />
          <path
            d={
              event.category === "Underfill"
                ? "M40 183q50 6 100 0v37q0 16-18 16H58q-18 0-18-16z"
                : "M40 111q50 7 100 0v109q0 16-18 16H58q-18 0-18-16z"
            }
            fill="#42a9dc"
            fillOpacity=".34"
          />
          <path
            d="M41 99q49 8 98 0M39 111q51 8 102 0M39 213q51 9 102 0M40 223q50 9 100 0"
            fill="none"
            stroke="#c5edf4"
            strokeWidth="3"
            strokeOpacity=".55"
          />
          {event?.category !== "Missing label" && (
            <g
              transform={
                event?.category === "Misaligned label"
                  ? "rotate(-12 90 160)"
                  : undefined
              }
            >
              <rect
                x="42"
                y="114"
                width="96"
                height="72"
                rx="2"
                fill="#eaf9ff"
              />
              <path
                d="M57 139q16-14 33 0t33 0"
                fill="none"
                stroke="#2e99c5"
                strokeWidth="3"
              />
              <text
                x="90"
                y="161"
                textAnchor="middle"
                fill="#1d6b99"
                fontSize="18"
                fontFamily="Georgia"
              >
                RON 88
              </text>
              <text
                x="90"
                y="175"
                textAnchor="middle"
                fill="#337da4"
                fontSize="5"
                letterSpacing="2"
              >
                NATURAL SPRING WATER
              </text>
              <text
                x="90"
                y="201"
                textAnchor="middle"
                fill="#a4d9ed"
                fontSize="6"
              >
                PET · DEMO
              </text>
            </g>
          )}
          <path
            d="M48 105v108"
            stroke="#fff"
            strokeOpacity=".15"
            strokeWidth="5"
          />
        </svg>
      </div>
      <div className="frame-footer">
        <span>Illustrative image · Not a live camera feed</span>
        <span>1920 × 1080</span>
      </div>
    </div>
  );
}
function CapturedImage({ url, id }: { url: string; id: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="image-frame">
      {failed ? (
        <p role="status">
          Could not load image. Event details are preserved below.
        </p>
      ) : (
        <img
          src={url}
          alt={`${id} inspection image`}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
export function TrendChart({
  events,
  start,
  end,
  zone = "Europe/Istanbul",
  period = "Last 3 hours",
}: {
  events: InspectionEvent[];
  start: number;
  end: number;
  zone?: string;
  period?: string;
}) {
  const areaId = useId();
  const dateOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
    ...(end - start > 86400000 ? { day: "2-digit", month: "2-digit" } : {}),
  };
  const bins = activityBins(events, start, end).map((b) => ({
    ...b,
    label: new Intl.DateTimeFormat("en-US", dateOptions).format(b.start),
  }));
  const total = bins.reduce((n, b) => n + b.total, 0);
  const bad = bins.reduce((n, b) => n + b.bad, 0);
  const max = Math.max(1, ...bins.map((b) => b.total));
  const points = bins.map(
    (b, i) => `${40 + i * 60},${170 - (b.total / max) * 130}`,
  );
  return (
    <div className="chart-wrap">
      <div className="legend">
        <span>
          <i /> Inspected products
        </span>
        <span>
          <i className="red" /> Defective products
        </span>
        <small>
          {period} · {zone === "UTC" ? "UTC" : "Istanbul"} · 12 equal intervals
        </small>
      </div>
      <svg
        viewBox="0 0 740 220"
        role="img"
        aria-label={`${period}. Inspected: ${total} products, defective: ${bad} products.`}
      >
        <defs>
          <linearGradient id={areaId} x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#14a995" stopOpacity=".20" />
            <stop offset="1" stopColor="#14a995" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1="40"
              x2="710"
              y1={40 + i * 43}
              y2={40 + i * 43}
              stroke="#edf0f2"
              strokeDasharray="4 4"
            />
            <text x="3" y={44 + i * 43} fill="#89949f" fontSize="10">
              {Math.round(max * (1 - i / 3))}
            </text>
          </g>
        ))}
        <polygon
          points={`40,170 ${points.join(" ")} 700,170`}
          fill={`url(#${areaId})`}
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#119d8c"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {bins.map((b, i) => (
          <g key={i}>
            <circle
              cx={40 + i * 60}
              cy={170 - (b.total / max) * 130}
              r="3"
              fill="#119d8c"
            >
              <title>
                {b.label}: {b.total} products
              </title>
            </circle>
            <rect
              x={36 + i * 60}
              y={170 - (b.bad / max) * 130}
              width="8"
              height={Math.max(0, (b.bad / max) * 130)}
              rx="2"
              fill="#e58477"
            />
            {i % 2 === 0 && (
              <text
                x={40 + i * 60}
                y="205"
                fill="#89949f"
                textAnchor="middle"
                fontSize="11"
              >
                {b.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function StationBadge({
  station,
  connected,
  now,
}: {
  station: import("../domain").Station;
  connected: boolean;
  now?: number;
}) {
  const status = stationStatus(station, connected, now);
  return (
    <Badge
      tone={
        status === "active"
          ? "success"
          : status === "idle" || status === "warning"
            ? "warning"
            : "danger"
      }
    >
      {status === "active" ? `${station.fps} FPS` : statusLabels[status]}
    </Badge>
  );
}
