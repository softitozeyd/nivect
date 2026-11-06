import Action from "./Action";
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, LockKeyhole, AlertCircle } from "lucide-react";
import Landing, { Logo } from "./Landing";
import Dashboard from "./Dashboard";
import Modal from "./Modal";
import { api, login } from "./api";
import "./style.css";
import "./actions.css";
function App() {
  const [user, setUser] = useState(null),
    [view, setView] = useState(
      location.hash === "#workspace" ? "workspace" : "landing",
    ),
    [showLogin, setShowLogin] = useState(false),
    [checking, setChecking] = useState(true);
  useEffect(() => {
    api("/api/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    const expired = () => {
      if (user) {
        setUser(null);
        setView("landing");
        setShowLogin(true);
      }
    };
    window.addEventListener("nivect-session-expired", expired);
    return () => window.removeEventListener("nivect-session-expired", expired);
  }, [user]);
  function open() {
    if (user) {
      setView("workspace");
      location.hash = "workspace";
      window.scrollTo(0, 0);
    } else setShowLogin(true);
  }
  function loggedOut() {
    setUser(null);
    setView("landing");
    location.hash = "";
    setShowLogin(true);
  }
  if (view === "workspace" && checking)
    return (
      <div className="loading-screen">
        <Logo />
        <span>Çalışma alanı hazırlanıyor…</span>
      </div>
    );
  return (
    <>
      {view === "workspace" && user ? (
        <Dashboard
          user={user}
          onLogout={loggedOut}
          onExit={() => {
            setView("landing");
            location.hash = "";
            window.scrollTo(0, 0);
          }}
        />
      ) : (
        <Landing onOpen={open} />
      )}{" "}
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onLogin={(u) => {
            setUser(u);
            setShowLogin(false);
            setView("workspace");
            location.hash = "workspace";
            window.scrollTo(0, 0);
          }}
        />
      )}
    </>
  );
}
function Login({ onClose, onLogin }) {
  const [username, setUsername] = useState("operator"),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await login(username, password));
    } catch (e) {
      setError(
        e.status === 401 ? "Kullanıcı adı veya parola hatalı." : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Yeniden hoş geldiniz." onClose={onClose}>
      <div className="login-intro">
        <span className="lock-orb">
          <LockKeyhole size={21} />
        </span>
        <p>
          Detaylar kontrolünüzde.
          <br />
          <span>Operatör hesabınızla çalışma alanına giriş yapın.</span>
        </p>
      </div>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Kullanıcı adı
          <input
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </label>
        <label>
          Parola
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <div className="error" role="alert">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        <Action className="pill dark full" disabled={busy} type="submit">
          {busy ? "Bağlanıyor…" : "Çalışma alanına gir"}
          <ArrowUpRight size={16} />
        </Action>
      </form>
      <p className="login-foot">Yalnızca yetkili ekip erişimi.</p>
    </Modal>
  );
}
class ErrorBoundary extends React.Component {
  state = {
    error: false,
  };
  static getDerivedStateFromError() {
    return {
      error: true,
    };
  }
  render() {
    return this.state.error ? (
      <div className="loading-screen">
        <Logo />
        <h1>Bir şeyler yolunda gitmedi.</h1>
        <p>Çalışma alanını yeniden yükleyerek devam edebilirsiniz.</p>
        <Action className="btn primary" onClick={() => location.reload()}>
          Yeniden yükle
        </Action>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
