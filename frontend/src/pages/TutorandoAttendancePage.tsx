import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import type { AttendanceStatus, TutorandoAttendanceItem } from "../types/attendance";
import type { SessionStatus } from "../types/sessions";

const attendanceLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  JUSTIFIED: "Justificado",
};

const sessionStatusLabels: Record<SessionStatus, string> = {
  SCHEDULED: "Programada",
  COMPLETED: "Completada",
  CANCELED: "Cancelada",
};

const attendanceIcons: Record<AttendanceStatus, string> = {
  PRESENT: "✓",
  ABSENT: "✗",
  JUSTIFIED: "!",
};

const attendanceColors: Record<AttendanceStatus, { bg: string; border: string; text: string }> = {
  PRESENT: { bg: "#dcfce7", border: "#16a34a", text: "#15803d" },
  ABSENT: { bg: "#fee2e2", border: "#dc2626", text: "#991b1b" },
  JUSTIFIED: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309" },
};

export function TutorandoAttendancePage() {
  const [entries, setEntries] = useState<TutorandoAttendanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "ALL">("ALL");
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);

  useEffect(() => {
    async function fetchAttendance() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<TutorandoAttendanceItem[]>("/tutorando/attendance");
        setEntries(data);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, []);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "ALL") return entries;
    return entries.filter((entry) => entry.session.status === statusFilter);
  }, [entries, statusFilter]);

  return (
    <div className="table-wrapper">
      {/* Header moderno con gradiente */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--role-tutorando-600) 0%, var(--role-tutorando-800) 100%)",
          borderRadius: "1.25rem",
          padding: "2rem",
          marginBottom: "2rem",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(44, 95, 141, 0.2)",
        }}
      >
        {/* Patrón decorativo */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: "translate(30%, -30%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "200px",
            height: "200px",
            background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: "translate(-30%, 30%)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "1rem",
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
              }}
            >
              👁️
            </div>
            <div>
              <h2 style={{ margin: 0, color: "white", fontSize: "1.75rem", fontWeight: 700 }}>
                Registro de Asistencia
              </h2>
              <p style={{ margin: "0.25rem 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.95rem" }}>
                Visualiza los registros de asistencia colocados por tu tutor
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtro mejorado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1f2937", marginBottom: "0.25rem" }}>
            Registros de Asistencia
          </h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
            Asistencia registrada por tu tutor en cada sesión
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SessionStatus | "ALL")}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: "0.75rem",
            border: "2px solid var(--role-tutorando-500)",
            fontSize: "0.95rem",
            fontWeight: 500,
            color: "var(--role-tutorando-700)",
            background: "white",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.2s",
          }}
        >
          <option value="ALL">📚 Todas las sesiones</option>
          <option value="SCHEDULED">📅 Programadas</option>
          <option value="COMPLETED">✅ Completadas</option>
          <option value="CANCELED">❌ Canceladas</option>
        </select>
      </div>

      {/* Contenido */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
            borderRadius: "1rem",
            border: "2px dashed #d1d5db",
          }}
        >
          <div
            style={{
              display: "inline-block",
              width: "50px",
              height: "50px",
              border: "4px solid #e5e7eb",
              borderTopColor: "var(--role-tutorando-500)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ marginTop: "1rem", color: "#6b7280", fontSize: "1rem" }}>Cargando asistencia...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: "1.5rem",
            background: "#fee2e2",
            border: "2px solid #dc2626",
            borderRadius: "1rem",
            color: "#991b1b",
          }}
        >
          <strong>⚠️ Error:</strong> {error}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
            borderRadius: "1rem",
            border: "2px dashed #d1d5db",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📭</div>
          <p style={{ color: "#6b7280", fontSize: "1.1rem", margin: 0 }}>
            {statusFilter === "ALL"
              ? "Aún no hay registros de asistencia"
              : `No hay sesiones ${sessionStatusLabels[statusFilter]?.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {filteredEntries.map((entry) => {
            const isHovered = hoveredId === entry.session.id;
            const attendanceColor = entry.status ? attendanceColors[entry.status] : null;

            return (
              <div
                key={entry.session.id}
                onMouseEnter={() => setHoveredId(entry.session.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: "white",
                  borderRadius: "1.25rem",
                  padding: "0",
                  border: "1px solid #e5e7eb",
                  boxShadow: isHovered
                    ? "0 12px 40px rgba(44, 95, 141, 0.15)"
                    : "0 4px 15px rgba(0, 0, 0, 0.05)",
                  transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Barra superior de color según estado de asistencia */}
                {attendanceColor && (
                  <div
                    style={{
                      height: "6px",
                      background: `linear-gradient(90deg, ${attendanceColor.border} 0%, ${attendanceColor.text} 100%)`,
                    }}
                  />
                )}

                <div style={{ padding: "1.75rem" }}>
                  {/* Header con título y badge de "Registrado por tutor" */}
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <h4 style={{ margin: 0, fontSize: "1.25rem", color: "#1f2937", fontWeight: 700 }}>
                        {entry.session.title}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "0.5rem",
                            background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)",
                            color: "#0369a1",
                            fontWeight: 600,
                            border: "1px solid #7dd3fc",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <span>👁️</span>
                          Registrado por tutor
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "0.5rem",
                            background:
                              entry.session.status === "COMPLETED"
                                ? "#dcfce7"
                                : entry.session.status === "SCHEDULED"
                                ? "#dbeafe"
                                : "#f3f4f6",
                            color:
                              entry.session.status === "COMPLETED"
                                ? "#15803d"
                                : entry.session.status === "SCHEDULED"
                                ? "#1e40af"
                                : "#6b7280",
                            fontWeight: 600,
                          }}
                        >
                          {sessionStatusLabels[entry.session.status as SessionStatus]}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.9rem", color: "#6b7280" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>📅</span>
                        <span>
                          {new Date(entry.session.scheduled_at).toLocaleString("es-ES", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>{entry.session.scope === "GENERAL" ? "👥" : "👤"}</span>
                        <span>
                          {entry.session.scope === "GENERAL" ? "Sesión General" : "Sesión Personalizada"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Estado de asistencia prominente */}
                  <div
                    style={{
                      padding: "1.25rem",
                      borderRadius: "1rem",
                      background: entry.status
                        ? `linear-gradient(135deg, ${attendanceColor!.bg} 0%, ${attendanceColor!.bg}dd 100%)`
                        : "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                      border: entry.status
                        ? `2px solid ${attendanceColor!.border}30`
                        : "2px dashed #d1d5db",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      {entry.status ? (
                        <>
                          <div
                            style={{
                              width: "60px",
                              height: "60px",
                              borderRadius: "1rem",
                              background: `linear-gradient(135deg, ${attendanceColor!.border} 0%, ${attendanceColor!.text} 100%)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "2rem",
                              fontWeight: 700,
                              color: "white",
                              boxShadow: `0 4px 20px ${attendanceColor!.border}40`,
                            }}
                          >
                            {attendanceIcons[entry.status]}
                          </div>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: attendanceColor!.text, opacity: 0.8, marginBottom: "0.25rem", fontWeight: 600 }}>
                              Estado de Asistencia
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: attendanceColor!.text }}>
                              {attendanceLabels[entry.status as AttendanceStatus]}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: "60px",
                              height: "60px",
                              borderRadius: "1rem",
                              background: "#e5e7eb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "2rem",
                            }}
                          >
                            ⏳
                          </div>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem", fontWeight: 600 }}>
                              Estado de Asistencia
                            </div>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#6b7280" }}>
                              Pendiente de registro
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {entry.updated_at && entry.status && (
                      <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#9ca3af" }}>
                        <div>Registrado:</div>
                        <div style={{ fontWeight: 600, color: "#6b7280" }}>
                          {new Date(entry.updated_at).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Animación de spinning */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
