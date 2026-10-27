import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { adapter, DemoAdapter, mode } from "./services/adapter";
import type { Snapshot, OperatorReview } from "./domain";
interface Preferences {
  interval: number;
  notifications: boolean;
  zone: string;
  compact: boolean;
}
const defaults: Preferences = {
  interval: 3000,
  notifications: true,
  zone: "Europe/Istanbul",
  compact: false,
};
function readPreferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem("visionqc.preferences") || "{}");
    return {
      interval: [3000, 5000, 10000].includes(p.interval) ? p.interval : 3000,
      notifications:
        typeof p.notifications === "boolean" ? p.notifications : true,
      zone: ["Europe/Istanbul", "UTC"].includes(p.zone)
        ? p.zone
        : defaults.zone,
      compact: p.compact === true,
    };
  } catch {
    return defaults;
  }
}
function useStore() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(readPreferences);
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(Date.now);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (offline) return;
      activeRequest.current?.abort();
      const request = new AbortController();
      activeRequest.current = request;
      const requestSignal = signal
        ? AbortSignal.any([signal, request.signal])
        : request.signal;
      try {
        const data = await adapter.load(requestSignal);
        if (!requestSignal.aborted) {
          setSnapshot(data);
          setError("");
        }
      } catch (e) {
        if (!requestSignal.aborted)
          setError(e instanceof Error ? e.message : "Could not connect");
      } finally {
        if (!requestSignal.aborted) setLoading(false);
        if (activeRequest.current === request) activeRequest.current = null;
      }
    },
    [offline],
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll(first = false) {
      if (controller.signal.aborted) return;
      // A manual retry owns its request until completion. Scheduled polling
      // must not abort it, even when it takes longer than the polling interval.
      if (!activeRequest.current) {
        if (!first && !offline && adapter instanceof DemoAdapter)
          adapter.tick();
        await refresh(controller.signal);
      }
      if (!controller.signal.aborted)
        timer = setTimeout(() => void poll(), preferences.interval);
    }
    const initial = setTimeout(() => void poll(true), 0);
    return () => {
      clearTimeout(initial);
      clearTimeout(timer);
      controller.abort();
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [refresh, offline, preferences.interval]);
  useEffect(() => {
    try {
      localStorage.setItem("visionqc.preferences", JSON.stringify(preferences));
    } catch {
      // Preferences still apply for this session when storage is unavailable.
    }
  }, [preferences]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  async function review(id: string, value: OperatorReview) {
    if (mode !== "demo" || offline || error)
      throw new Error("Restore the demo connection to submit a review.");
    await adapter.review(id, value);
    await refresh();
    if (preferences.notifications)
      setToast("Operator review saved to the demo session.");
  }
  return {
    snapshot,
    error,
    offline,
    setOffline,
    loading,
    preferences,
    setPreferences,
    toast,
    setToast,
    refresh,
    review,
    mode,
    failuresOnly: mode === "api",
    now,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useStore()}>{children}</Context.Provider>;
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Provider missing");
  return value;
}
