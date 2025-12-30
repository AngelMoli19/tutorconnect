import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { api, parseApiError } from "../api/client";
import type { SessionItem, SessionStatus } from "../types/sessions";
import { Modal } from "../components/Modal";

export function TutorandoSessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "ALL">("ALL");
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

  const statusLabel: Record<SessionStatus, string> = {
    SCHEDULED: "Programada",
    COMPLETED: "Completada",
    CANCELED: "Cancelada",
  };

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      setSessionsError(null);
      try {
        const { data } = await api.get<SessionItem[]>("/tutorando/sessions");
        setSessions(data);
      } catch (err) {
        setSessionsError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter((s) => (statusFilter === "ALL" ? true : s.status === statusFilter));

  const calendarEvents = useMemo(() => {
    const colorMap: Record<SessionStatus, string> = {
      SCHEDULED: "#2c5f8d",
      COMPLETED: "#16a34a",
      CANCELED: "#9ca3af",
    };
    return filteredSessions.map((session) => {
      const start = new Date(session.scheduled_at);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const color = colorMap[session.status as SessionStatus] ?? "#2c5f8d";
      return {
        id: session.id,
        title: session.title,
        start,
        end,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { session },
      };
    });
  }, [filteredSessions]);

  return (
    <div>
      {/* Header Section */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div>
          <h2 style={{
            margin: "0 0 0.5rem 0",
            fontSize: "2rem",
            fontWeight: "800",
            color: "var(--gray-900)",
            letterSpacing: "-0.025em"
          }}>
            Sesiones de Tutoría
          </h2>
          <p style={{ margin: 0, color: "var(--gray-600)", fontSize: "1rem" }}>
            Revisa tus sesiones programadas con tu tutor
          </p>
        </div>
      </div>

      {/* Calendar Section */}
      <div style={{
        background: "var(--white)",
        borderRadius: "20px",
        padding: "2.5rem",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        border: "1px solid var(--gray-100)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1.5rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: "52px",
              height: "52px",
              background: "linear-gradient(135deg, var(--role-tutorando-500), var(--role-tutorando-600))",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 16px rgba(44, 95, 141, 0.25)"
            }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="white">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: "1.375rem",
                fontWeight: "700",
                color: "var(--gray-900)"
              }}>
                {viewMode === "calendar" ? "Calendario de Sesiones" : "Historial de Sesiones"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.9375rem", color: "var(--gray-600)" }}>
                {sessions.length} {sessions.length === 1 ? 'sesión programada' : 'sesiones programadas'}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Toggle de vista */}
            <div style={{
              display: "flex",
              background: "#f3f4f6",
              borderRadius: "12px",
              padding: "0.25rem",
              gap: "0.25rem"
            }}>
              <button
                onClick={() => setViewMode("calendar")}
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "10px",
                  border: "none",
                  background: viewMode === "calendar"
                    ? "linear-gradient(135deg, var(--role-tutorando-500), var(--role-tutorando-600))"
                    : "transparent",
                  color: viewMode === "calendar" ? "white" : "#6b7280",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: viewMode === "calendar" ? "0 2px 8px rgba(44, 95, 141, 0.2)" : "none"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Calendario
              </button>
              <button
                onClick={() => setViewMode("list")}
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "10px",
                  border: "none",
                  background: viewMode === "list"
                    ? "linear-gradient(135deg, var(--role-tutorando-500), var(--role-tutorando-600))"
                    : "transparent",
                  color: viewMode === "list" ? "white" : "#6b7280",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: viewMode === "list" ? "0 2px 8px rgba(44, 95, 141, 0.2)" : "none"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Historial
              </button>
            </div>

            {/* Filtro de estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SessionStatus | "ALL")}
              style={{
                padding: "0.875rem 1.25rem",
                border: "2px solid var(--gray-200)",
                borderRadius: "12px",
                fontSize: "0.9375rem",
                fontWeight: "600",
                color: "var(--gray-900)",
                background: "var(--white)",
                transition: "all 0.2s",
                outline: "none",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--role-tutorando-500)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(44, 95, 141, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--gray-200)";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
              }}
            >
              <option value="ALL">📚 Todas</option>
              <option value="SCHEDULED">🔵 Programadas</option>
              <option value="COMPLETED">✅ Completadas</option>
              <option value="CANCELED">⛔ Canceladas</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--gray-500)" }}>
            <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }}>
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <p style={{ marginTop: "1.25rem", fontSize: "1.0625rem", fontWeight: "500" }}>Cargando sesiones...</p>
          </div>
        ) : sessionsError ? (
          <div style={{
            padding: "2.5rem",
            background: "var(--error-light)",
            border: "2px solid var(--error)",
            borderRadius: "16px",
            textAlign: "center"
          }}>
            <p style={{ margin: 0, color: "var(--error)", fontWeight: "600", fontSize: "1rem" }}>{sessionsError}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--gray-500)" }}>
            <svg width="80" height="80" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.2, margin: "0 auto" }}>
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <p style={{
              marginTop: "1.5rem",
              fontSize: "1.125rem",
              fontWeight: "600",
              color: "var(--gray-700)"
            }}>
              No hay sesiones programadas
            </p>
            <p style={{
              marginTop: "0.5rem",
              fontSize: "0.9375rem",
              color: "var(--gray-500)"
            }}>
              Tu tutor no ha programado sesiones {statusFilter !== "ALL" ? "con este estado" : "aún"}
            </p>
          </div>
        ) : viewMode === "calendar" ? (
          <div>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={esLocale}
              buttonText={{ today: "Hoy", month: "Mes", week: "Semana" }}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              events={calendarEvents}
              eventClick={(info) => {
                const session = (info.event.extendedProps as { session: SessionItem }).session;
                setSelectedSession(session);
              }}
              eventContent={(arg) => ({
                  html: `
                    <div style="
                      padding: 0.5rem 0.75rem;
                      border-radius: 8px;
                      font-weight: 600;
                      font-size: 0.875rem;
                      line-height: 1.3;
                      cursor: pointer;
                      transition: all 0.2s;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: normal;
                    ">
                      <div style="font-weight: 700; margin-bottom: 0.25rem;">
                        ${arg.timeText}
                      </div>
                      <div style="opacity: 0.95;">
                        ${arg.event.title}
                      </div>
                    </div>
                  `
                })}
              height="auto"
            />
          </div>
        ) : (
          /* Vista de Historial */
          <div style={{ display: "grid", gap: "1rem" }}>
            {filteredSessions.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()).map((session) => {
              const isHovered = hoveredSessionId === session.id;
              const statusConfig = {
                SCHEDULED: { bg: "#dbeafe", border: "#2c5f8d", text: "#1e3a8a", icon: "🔵" },
                COMPLETED: { bg: "#dcfce7", border: "#16a34a", text: "#15803d", icon: "✅" },
                CANCELED: { bg: "#f3f4f6", border: "#9ca3af", text: "#6b7280", icon: "⛔" },
              };
              const config = statusConfig[session.status as SessionStatus] || statusConfig.SCHEDULED;

              return (
                <div
                  key={session.id}
                  onMouseEnter={() => setHoveredSessionId(session.id)}
                  onMouseLeave={() => setHoveredSessionId(null)}
                  onClick={() => setSelectedSession(session)}
                  style={{
                    background: "white",
                    borderRadius: "1rem",
                    padding: "1.5rem",
                    border: `1px solid ${isHovered ? config.border : "#e5e7eb"}`,
                    boxShadow: isHovered
                      ? "0 12px 40px rgba(44, 95, 141, 0.15)"
                      : "0 4px 15px rgba(0, 0, 0, 0.05)",
                    transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Barra lateral de color según estado */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "5px",
                      background: `linear-gradient(180deg, ${config.border} 0%, ${config.border}99 100%)`,
                    }}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1.5rem" }}>
                    {/* Información de la sesión */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                        <h4 style={{ margin: 0, fontSize: "1.25rem", color: "#1f2937", fontWeight: 700 }}>
                          {session.title}
                        </h4>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "0.5rem",
                            background: config.bg,
                            color: config.text,
                            fontWeight: 700,
                            border: `2px solid ${config.border}`,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem"
                          }}
                        >
                          <span>{config.icon}</span>
                          {statusLabel[session.status as SessionStatus]}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.65rem" }}>
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#6b7280" }}>
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span style={{ fontSize: "0.95rem", color: "#4b5563", fontWeight: 500 }}>
                          {new Date(session.scheduled_at).toLocaleString("es-ES", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>
                          {session.scope === "GENERAL" ? "👥" : "👤"}
                        </span>
                        <span style={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: 500 }}>
                          {session.scope === "GENERAL" ? "Sesión General" : "Sesión Personalizada"}
                        </span>
                      </div>

                      {session.description && (
                        <p style={{
                          marginTop: "0.75rem",
                          marginBottom: 0,
                          color: "#6b7280",
                          fontSize: "0.9rem",
                          lineHeight: "1.5",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}>
                          {session.description}
                        </p>
                      )}
                    </div>

                    {/* Acción */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSession(session);
                        }}
                        style={{
                          padding: "0.75rem 1.5rem",
                          borderRadius: "0.75rem",
                          border: "none",
                          background: isHovered
                            ? "linear-gradient(135deg, var(--role-tutorando-600) 0%, var(--role-tutorando-700) 100%)"
                            : "linear-gradient(135deg, var(--role-tutorando-500) 0%, var(--role-tutorando-600) 100%)",
                          color: "white",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          boxShadow: isHovered
                            ? "0 8px 25px rgba(44, 95, 141, 0.3)"
                            : "0 4px 15px rgba(44, 95, 141, 0.2)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>Ver detalles</span>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {session.meeting_link && session.status === "SCHEDULED" && (
                        <a
                          href={session.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: "0.65rem 1.25rem",
                            borderRadius: "0.75rem",
                            border: `2px solid ${config.border}`,
                            background: config.bg,
                            color: config.text,
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            transition: "all 0.2s",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          <span>Unirse</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* Estilos personalizados para eventos del calendario */
          .fc-event {
            border: none !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
            transition: all 0.2s ease !important;
          }

          .fc-event:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
          }

          .fc-daygrid-event {
            margin: 2px 4px !important;
            border-radius: 8px !important;
          }

          .fc-event-main {
            color: white !important;
          }

          /* Estilos para los botones del header */
          .fc-button {
            background: var(--role-tutorando-500) !important;
            border-color: var(--role-tutorando-600) !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            padding: 0.5rem 1rem !important;
            transition: all 0.2s !important;
          }

          .fc-button:hover:not(:disabled) {
            background: var(--role-tutorando-600) !important;
            border-color: var(--role-tutorando-700) !important;
            transform: translateY(-1px);
          }

          .fc-button-active {
            background: var(--role-tutorando-700) !important;
            border-color: var(--role-tutorando-800) !important;
          }

          .fc-toolbar-title {
            font-weight: 700 !important;
            color: var(--gray-900) !important;
          }
        `}</style>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <Modal
          title={selectedSession.title}
          onClose={() => setSelectedSession(null)}
        >
          <SessionDetailsContent
            session={selectedSession}
            statusLabel={statusLabel}
          />
        </Modal>
      )}
    </div>
  );
}

function SessionDetailsContent({
  session,
  statusLabel,
}: {
  session: SessionItem;
  statusLabel: Record<SessionStatus, string>;
}) {
  return (
    <div>
      {/* Header con gradiente */}
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg, var(--role-tutorando-500) 0%, var(--role-tutorando-700) 100%)",
        margin: "-2rem -2rem 2rem -2rem",
        padding: "2.5rem 2rem",
        borderRadius: "20px 20px 0 0",
        overflow: "hidden"
      }}>
        {/* Patrón decorativo */}
        <div style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "200px",
          height: "200px",
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Icono de calendario */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.2)"
            }}>
              <svg width="28" height="28" viewBox="0 0 20 20" fill="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: 0,
                fontSize: "1.75rem",
                fontWeight: "700",
                color: "white",
                textShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                lineHeight: "1.2"
              }}>
                {session.title}
              </h3>
            </div>
          </div>

          {/* Fecha y hora */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1.25rem",
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "white",
            fontSize: "0.9375rem",
            fontWeight: "500",
            marginBottom: "1rem"
          }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {new Date(session.scheduled_at).toLocaleString("es-PE", {
              dateStyle: "full",
              timeStyle: "short"
            })}
          </div>

          {/* Badge de estado */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.25rem",
            background: session.status === "SCHEDULED"
              ? "rgba(34, 197, 94, 0.25)"
              : session.status === "COMPLETED"
              ? "rgba(34, 197, 94, 0.25)"
              : "rgba(239, 68, 68, 0.25)",
            backdropFilter: "blur(10px)",
            borderRadius: "10px",
            border: session.status === "SCHEDULED"
              ? "1px solid rgba(34, 197, 94, 0.3)"
              : session.status === "COMPLETED"
              ? "1px solid rgba(34, 197, 94, 0.3)"
              : "1px solid rgba(239, 68, 68, 0.3)",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: "600"
          }}>
            <span style={{
              fontSize: "1.125rem"
            }}>
              {session.status === "SCHEDULED" ? "🔵" : session.status === "COMPLETED" ? "✅" : "⛔"}
            </span>
            {statusLabel[session.status as SessionStatus] ?? session.status}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ padding: "0 0.5rem" }}>
        {/* Descripción */}
        {session.description && (
          <div style={{
            marginBottom: "2rem"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem"
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutorando-600)" }}>
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <h4 style={{
                margin: 0,
                fontSize: "0.875rem",
                fontWeight: "700",
                color: "var(--gray-700)",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Descripción
              </h4>
            </div>
            <div style={{
              padding: "1.25rem",
              background: "var(--gray-50)",
              borderRadius: "12px",
              border: "1px solid var(--gray-100)"
            }}>
              <p style={{
                margin: 0,
                fontSize: "0.9375rem",
                color: "var(--gray-700)",
                lineHeight: "1.7"
              }}>
                {session.description}
              </p>
            </div>
          </div>
        )}

        {/* Tipo de sesión */}
        <div style={{
          marginBottom: "2rem"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.75rem"
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutorando-600)" }}>
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <h4 style={{
              margin: 0,
              fontSize: "0.875rem",
              fontWeight: "700",
              color: "var(--gray-700)",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              Tipo de Sesión
            </h4>
          </div>
          <div style={{
            padding: "1.25rem 1.5rem",
            background: session.scope === "GENERAL"
              ? "linear-gradient(135deg, #eff6ff, #dbeafe)"
              : "linear-gradient(135deg, var(--role-tutorando-light), #d6e8f5)",
            borderRadius: "12px",
            borderLeft: session.scope === "GENERAL"
              ? "4px solid #3b82f6"
              : "4px solid var(--role-tutorando-500)",
            display: "flex",
            alignItems: "center",
            gap: "1rem"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              background: "white",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
            }}>
              <span style={{ fontSize: "1.25rem" }}>
                {session.scope === "GENERAL" ? "👥" : "👤"}
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: "0.9375rem",
              fontWeight: "600",
              color: session.scope === "GENERAL" ? "#1e40af" : "var(--role-tutorando-800)",
              lineHeight: "1.5"
            }}>
              {session.scope === "GENERAL"
                ? "Sesión enviada por tu tutor a todos sus tutorados"
                : "Sesión asignada directamente para ti"}
            </p>
          </div>
        </div>

        {/* Botón de unirse (si aplica) */}
        {session.meeting_link && session.status === "SCHEDULED" && (
          <div style={{
            marginTop: "2rem",
            padding: "1.5rem",
            background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
            borderRadius: "16px",
            border: "2px solid var(--role-tutorando-200)",
            textAlign: "center"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              marginBottom: "1rem"
            }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutorando-600)" }}>
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              <p style={{
                margin: 0,
                fontSize: "0.9375rem",
                fontWeight: "600",
                color: "var(--role-tutorando-700)"
              }}>
                La sesión está lista para iniciar
              </p>
            </div>
            <a
              href={session.meeting_link}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem 2.5rem",
                background: "linear-gradient(135deg, var(--role-tutorando-500), var(--role-tutorando-600))",
                border: "none",
                borderRadius: "12px",
                color: "white",
                fontWeight: "600",
                fontSize: "1rem",
                cursor: "pointer",
                transition: "all 0.3s",
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(44, 95, 141, 0.3)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(44, 95, 141, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(44, 95, 141, 0.3)";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              Unirse a la sesión
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
