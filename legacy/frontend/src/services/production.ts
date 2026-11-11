import { useCallback, useEffect, useState } from "react";
export type ProductionSession = {id: number; active: boolean | null; startedAt: string; endedAt: string | null; totalCount: number; passCount: number; defectCount: number; uncertainCount: number};
const path = "/api/v1/production-sessions";
async function request(url: string, init?: RequestInit): Promise<ProductionSession | null> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const text = await r.text(); return text ? JSON.parse(text) as ProductionSession : null;
}
export function useProductionSession() {
  const [production, setProduction] = useState<ProductionSession | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const refreshSession = useCallback(async () => {
    try { const row = await request(`${path}/latest`); setProduction(row); setSessionError(false); return row; }
    catch (e) { setSessionError(true); throw e; }
    finally { setSessionLoading(false); }
  }, []);
  useEffect(() => { const first = setTimeout(() => void refreshSession().catch(() => {}), 0); const timer = setInterval(() => void refreshSession().catch(() => {}), 5000); return () => { clearTimeout(first); clearInterval(timer); }; }, [refreshSession]);
  const startSession = async () => { const current = await refreshSession(); if (current?.active) return current; const row = await request(path, {method:"POST"}); if (!row) throw new Error("No session returned"); setProduction(row); return row; };
  const stopSession = async (id: number) => { const row = await request(`${path}/${id}/stop`, {method:"POST"}); setProduction(row); return row; };
  return {production, sessionError, sessionLoading, refreshSession, startSession, stopSession, setProduction};
}
