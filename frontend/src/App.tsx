import { useLanguage } from './i18n';
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
  const { t, language, setLanguage } = useLanguage();
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
              aria-label={mobile ? t("Close menu") : t("Open menu")}
              aria-expanded={mobile}
              aria-controls="main-navigation"
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="brand" aria-label={t("VisionQC home")}>
              <span className="brand-mark">
                <ScanLine size={22} />
              </span>
              <span>{t("VisionQC")}</span>
            </Link>
          </div>
          <nav
            id="main-navigation"
            className={`top-navigation ${mobile ? "open" : ""}`}
            aria-label={t("Main navigation")}
          >
            {navigation.map((n) => (
              <NavLink
                to={n.path}
                key={n.path}
                end={n.path === "/"}
                onClick={() => setMobile(false)}
              >
                <n.icon size={14} />
                <span>{t(n.label)}</span>
              </NavLink>
            ))}
          </nav>
          <div className="topbar-right">
            <label className="language-switch">
              <span className="sr-only">Dil / Language</span>
              <select aria-label="Dil / Language" value={language} onChange={(event) => setLanguage(event.target.value === "en" ? "en" : "tr")}>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </label>
            <span className="demo-mode">
              {mode === "demo" ? t("DEMO MODE · SIMULATED DATA") : t("LIVE API MODE")}
            </span>
            <button
              className="icon-button notification-button"
              aria-label={t("Open notifications")}
              aria-expanded={notifications}
              onClick={() => setNotifications(!notifications)}
            >
              <Bell size={18} />
              {(pendingReviews > 0 || offline || error) && <i />}
            </button>
            <Link
              to="/settings"
              className="icon-button settings-shortcut"
              aria-label={t("Open interface settings")}
            >
              <SettingsIcon size={18} />
            </Link>
            <Link
              to="/settings"
              className="avatar small profile-avatar"
              aria-label={t("Demo Operator · Local session")}
              title={t("Demo Operator · No authentication")}
            >{t("OP")}{' '}<span
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
              <strong>{t("Notifications")}</strong>
              <p>
                {offline || error
                  ? t("Data connection lost. The latest data may be out of date.")
                  : mode === "api"
                    ? t("Latest failure records: {count}. Operator reviews are unavailable.").replace("{count}", String(pendingReviews))
                    : pendingReviews
                      ? t("There are {count} unreviewed AI defect predictions in this session. Review them in Inspection History.").replace("{count}", String(pendingReviews))
                      : t("There are no unreviewed AI defect predictions in this session.")}
              </p>
              <Link
                className="text-link"
                to="/history"
                onClick={() => setNotifications(false)}
              >{t("Go to inspection history")}{' '}</Link>
              <button onClick={() => setNotifications(false)}>{t("Close")}</button>
            </div>
          )}
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">{t("VISIONQC / OPERATIONS CENTER")}</div>
              <h1>{t(current?.label || "Page not found")}</h1>
              <p>
                {mode === "api" && location.pathname === "/monitoring"
                  ? t("View the latest available failure record.")
                  : mode === "api" && location.pathname === "/history"
                    ? t("Find and inspect recent failure records.")
                    : t(descriptions[location.pathname] || "")}
              </p>
            </div>
            <div className="heading-actions">
              <span className="line-button" title={t("MVP: one production line")}>
                <Camera size={14} />{" "}
                {mode === "demo" ? t("Production Line 01") : t("Nivect · All lines")}{" "}
                <ChevronDown size={13} />
              </span>
              <span className="date-label">
                <CalendarDays size={14} />
                {new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", {
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
                  ? t("Data up to date")
                  : health === "warning"
                    ? t("Data delayed")
                    : health === "unknown"
                      ? t("Status unknown")
                      : t("Disconnected")}
              </Badge>
            </div>
          </div>
          {mode === "demo" && (
            <div className="demo-disclaimer" id="line-info">
              <Activity size={14} />
              <span>{t("Demo workspace — all metrics, inspections, and images are simulated.")}{' '}</span>
              <span>{t("One line · 2 stations")}</span>
            </div>
          )}
          {mode === "api" && (
            <div className="notice api-scope-banner">
              <Activity size={16} />
              <div>
                <strong>{t("Nivect / Spring Boot · Latest 20 failures")}</strong>
                <p>{t("This API provides FAIL records only. Total production, overall defect rate, FPS, camera health, model confidence, and image access are unavailable. No failure records does not mean production has stopped. Assumed backend UTC offset:")}{" "}
                  {backendOffset}{' '}{t("(the API provides no time zone).")}{' '}</p>
              </div>
            </div>
          )}
          {offline && (
            <div className="notice error" role="alert">
              <strong>{t("Connection lost · Data is out of date")}</strong>
              <span>{t("Showing the last successfully received data.")}</span>
              <button onClick={() => setOffline(false)}>{t("Restore connection")}{' '}</button>
            </div>
          )}
          {error && <ErrorState message={error} retry={() => void refresh()} />}
          <div className="freshness">
            <span
              className={health === "active" ? "pulse-dot" : "warning-dot"}
            />
            <span>{t("Last updated:")}{" "}
              {snapshot
                ? formatDate(snapshot.updatedAt, preferences.zone, language === "tr" ? "tr-TR" : "en-US")
                : t("No data received yet")}
            </span>
            <span className="source-caption">
              {mode === "demo" ? t("Local demo environment") : t("API environment")} ·{" "}
              {health === "active"
                ? t("Data source reachable")
                : t("Check your connection")}
            </span>
          </div>
          {loading ? (
            <div className="panel loading" role="status">{t("Loading inspection data…")}{' '}</div>
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
                    <h2>{t("Page not found")}</h2>
                    <Link to="/">{t("Back to overview")}</Link>
                  </section>
                }
              />
            </Routes>
          )}
          <footer>
            <span>
              <ShieldCheck size={14} />{' '}{t("VisionQC · Intelligent Packaging Quality Control")}{' '}</span>
            <details className="workspace-details">
              <summary>{t("Workspace information")}</summary>
              <div>
                <strong>{t("Quality, at every step.")}</strong>
                <p>{t("Make your production visible with intelligent packaging inspection.")}{' '}</p>
                <p>{t("MVP · Pilot workspace · Demo Operator")}</p>
                <small>{t("Local session · No authentication")}</small>
              </div>
            </details>
            <span>{t("MVP 1.0")}{' '}<span className="divider" />
              {mode === "demo" ? t("Simulation environment") : t("API environment")}
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          {t(toast)}
        </div>
      )}
    </div>
  );
}
