import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";

interface DashboardMetrics {
  tutors_total: number;
  tutorandos_total: number;
  sessions_total: number;
}

export function DashboardPage() {
  const { auth } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth?.role !== "ADMIN") {
      setError("Permisos insuficientes.");
      return;
    }
    async function fetchMetrics() {
      try {
        const { data } = await api.get<DashboardMetrics>("/admin/dashboard");
        setMetrics(data);
      } catch (err) {
        const apiError = parseApiError(err);
        setError(apiError.message);
      }
    }
    fetchMetrics();
  }, [auth?.role]);

  return (
    <div className="card-grid">
      {auth?.role === "ADMIN" ? (
        <>
          <div className="card">
            <h3>Total de tutores</h3>
            <strong>{metrics?.tutors_total ?? "-"}</strong>
          </div>
          <div className="card">
            <h3>Total de tutorados</h3>
            <strong>{metrics?.tutorandos_total ?? "-"}</strong>
          </div>
          <div className="card">
            <h3>Sesiones programadas</h3>
            <strong>{metrics?.sessions_total ?? "-"}</strong>
          </div>
          {error && (
            <div className="card" style={{ gridColumn: "1/-1", color: "#dc2626" }}>
              <h3>Error al cargar métricas</h3>
              <p style={{ margin: "0.5rem 0 0" }}>{error}</p>
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ gridColumn: "1/-1", color: "#6b7280" }}>
          <h3>Panel no disponible</h3>
          <p style={{ margin: "0.5rem 0 0" }}>Este panel está reservado para administradores.</p>
        </div>
      )}
    </div>
  );
}
