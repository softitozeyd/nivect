let csrf;
export async function token() {
  const r = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  if (!r.ok) throw Error("Güvenli oturum başlatılamadı.");
  csrf = await r.json();
  return csrf;
}
export async function api(path, options = {}) {
  const method = options.method || "GET",
    headers = { ...options.headers };
  if (!["GET", "HEAD"].includes(method)) {
    const t = csrf || (await token());
    headers[t.headerName] = t.token;
  }
  const r = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  if (!r.ok) {
    let body;
    try {
      body = await r.json();
    } catch {}
    const error = Error(
      r.status === 401
        ? "Oturumunuz kapandı. Yeniden giriş yapın."
        : r.status === 403
          ? "İşlem izni veya güvenlik belirteci geçersiz. Sayfayı yenileyin."
          : body?.detail ||
            body?.message ||
            `İşlem tamamlanamadı (${r.status}).`,
    );
    error.status = r.status;
    if (r.status === 401)
      window.dispatchEvent(new Event("nivect-session-expired"));
    throw error;
  }
  if (r.status === 204) return null;
  return r.headers.get("content-type")?.includes("json") ? r.json() : r.text();
}
export async function login(username, password) {
  await token();
  await api("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  await token();
  return api("/api/auth/me");
}
export async function logout() {
  await api("/api/auth/logout", { method: "POST" });
  csrf = null;
}
