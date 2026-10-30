import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation, Link } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  ScanLine,
  History as HistoryIcon,
  Camera,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  CalendarDays,
  Bell,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useApp } from "./store";
import { backendOffset } from "./services/nivect";
import { formatDate, freshness } from "./domain";
import { Badge, ErrorState } from "./components/ui";
import { History } from "./components/events";
import {
  Overview,
  Monitoring,
  Stations,
  Reports,
  Settings,
} from "./features/pages";
const navigation = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/monitoring", label: "Live Monitoring", icon: ScanLine },
  { path: "/history", label: "Inspection History", icon: HistoryIcon },
  { path: "/stations", label: "Stations", icon: Camera },
  { path: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];
const descriptions: Record<string, string> = {
  "/": "Hello, Operator. Monitor your packaging quality control in one place.",
  "/monitoring": "Follow the simulated inspection feed from your stations.",
  "/history": "Find, inspect, and review detections.",
  "/stations": "Monitor camera and inference status.",
  "/reports": "Turn inspection data into useful insights.",
  "/settings": "Manage your workspace and demo preferences.",
};
export default function App() {
  const {
    snapshot,
    error,
    loading,
    offline,
    setOffline,
    refresh,
    toast,
    preferences,
    mode,
    now,
  } = useApp();
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const current = navigation.find((n) => n.path === location.pathname);
  const health = freshness(snapshot?.updatedAt || "", !offline && !error, now);
  const pendingReviews =
    snapshot?.events.filter((e) => e.decision === "reject" && !e.review)
      .length || 0;
  useEffect(() => {
    if (!mobile) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobile]);
  return (
    <div
      className={`app-shell cloud-shell ${preferences.compact ? "compact" : ""}`}
    >
      <div className="main-shell">
        <header className="topbar cloud-topbar">
          <div className="brand-group">
            <button
              className="menu-button icon-button"
              aria-label={mobile ? "Close menu" : "Open menu"}
              aria-expanded={mobile}
              aria-controls="main-navigation"
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="brand" aria-label="VisionQC home">
              <span className="brand-mark">
                <ScanLine size={22} />
              </span>
              <span>VisionQC</span>
            </Link>
          </div>
          <nav
            id="main-navigation"
            className={`top-navigation ${mobile ? "open" : ""}`}
            aria-label="Main navigation"
          >
            {navigation.map((n) => (
              <NavLink
                to={n.path}
                key={n.path}
                end={n.path === "/"}
                onClick={() => setMobile(false)}
              >
                <n.icon size={14} />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="topbar-right">
            <span className="demo-mode">
              {mode === "demo" ? "DEMO MODE · SIMULATED DATA" : "LIVE API MODE"}
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Open notifications"
              aria-expanded={notifications}
              onClick={() => setNotifications(!notifications)}
            >
              <Bell size={18} />
              {(pendingReviews > 0 || offline || error) && <i />}
            </button>
            <Link
              to="/settings"
              className="icon-button settings-shortcut"
              aria-label="Open interface settings"
            >
              <SettingsIcon size={18} />
            </Link>
            <Link
              to="/settings"
              className="avatar small profile-avatar"
              aria-label="Demo Operator · Local session"
              title="Demo Operator · No authentication"
            >
              OP
              <span
                className={
                  health === "active"
                    ? "profile-dot"
                    : "profile-dot unavailable"
                }
              />
            </Link>
          </div>
          {notifications && (
            <div className="notification-popover">
              <strong>Notifications</strong>
              <p>
                {offline || error
                  ? "Data connection lost. The latest data may be out of date."
                  : pendingReviews
                    ? `There are ${pendingReviews} unreviewed AI defect predictions in this session. Review them in Inspection History.`
                    : "There are no unreviewed AI defect predictions in this session."}
              </p>
              <Link
                className="text-link"
                to="/history"
                onClick={() => setNotifications(false)}
              >
                Go to inspection history
              </Link>
              <button onClick={() => setNotifications(false)}>Close</button>
            </div>
          )}
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">VISIONQC / OPERATIONS CENTER</div>
              <h1>{current?.label || "Page not found"}</h1>
              <p>
                {mode === "api" && location.pathname === "/monitoring"
                  ? "View the latest available failure record."
                  : mode === "api" && location.pathname === "/history"
                    ? "Find and inspect recent failure records."
                    : descriptions[location.pathname]}
              </p>
            </div>
            <div className="heading-actions">
              <span className="line-button" title="MVP: one production line">
                <Camera size={14} />{" "}
                {mode === "demo" ? "Production Line 01" : "Nivect · All lines"}{" "}
                <ChevronDown size={13} />
              </span>
              <span className="date-label">
                <CalendarDays size={14} />
                {new Intl.DateTimeFormat("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: preferences.zone,
                }).format(now)}
              </span>
              <Badge
                tone={
                  health === "active"
                    ? "success"
                    : health === "warning"
                      ? "warning"
                      : "danger"
                }
              >
                {health === "active"
                  ? "Data up to date"
                  : health === "warning"
                    ? "Data delayed"
                    : health === "unknown"
                      ? "Status unknown"
                      : "Disconnected"}
              </Badge>
            </div>
          </div>
          {mode === "demo" && (
            <div className="demo-disclaimer" id="line-info">
              <Activity size={14} />
              <span>
                Demo workspace — all metrics, inspections, and images are
                simulated.
              </span>
              <span>One line · 2 stations</span>
            </div>
          )}
          {mode === "api" && (
            <div className="notice api-scope-banner">
              <Activity size={16} />
              <div>
                <strong>Nivect / Spring Boot · Latest 20 failures</strong>
                <p>
                  This API provides FAIL records only. Total production, overall
                  defect rate, FPS, camera health, model confidence, and image
                  access are unavailable. No failure records does not mean
                  production has stopped. Assumed backend UTC offset:{" "}
                  {backendOffset} (the API provides no time zone).
                </p>
              </div>
            </div>
          )}
          {offline && (
            <div className="notice error" role="alert">
              <strong>Connection lost · Data is out of date</strong>
              <span>Showing the last successfully received data.</span>
              <button onClick={() => setOffline(false)}>
                Restore connection
              </button>
            </div>
          )}
          {error && <ErrorState message={error} retry={() => void refresh()} />}
          <div className="freshness">
            <span
              className={health === "active" ? "pulse-dot" : "warning-dot"}
            />
            <span>
              Last updated:{" "}
              {snapshot
                ? formatDate(snapshot.updatedAt, preferences.zone)
                : "No data received yet"}
            </span>
            <span className="source-caption">
              {mode === "demo" ? "Local demo environment" : "API environment"} ·{" "}
              {health === "active"
                ? "Data source reachable"
                : "Check your connection"}
            </span>
          </div>
          {loading ? (
            <div className="panel loading" role="status">
              Loading inspection data…
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/history" element={<History />} />
              <Route path="/stations" element={<Stations />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="*"
                element={
                  <section className="panel empty">
                    <h2>Page not found</h2>
                    <Link to="/">Back to overview</Link>
                  </section>
                }
              />
            </Routes>
          )}
          <footer>
            <span>
              <ShieldCheck size={14} /> VisionQC · Intelligent Packaging Quality
              Control
            </span>
            <details className="workspace-details">
              <summary>Workspace information</summary>
              <div>
                <strong>Quality, at every step.</strong>
                <p>
                  Make your production visible with intelligent packaging
                  inspection.
                </p>
                <p>MVP · Pilot workspace · Demo Operator</p>
                <small>Local session · No authentication</small>
              </div>
            </details>
            <span>
              MVP 1.0 <span className="divider" />
              {mode === "demo" ? "Simulation environment" : "API environment"}
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
