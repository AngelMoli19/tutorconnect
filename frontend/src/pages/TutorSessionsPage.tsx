import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { api, parseApiError } from "../api/client";
import type { SessionCreatePayload, SessionItem, SessionStatus, SessionUpdatePayload } from "../types/sessions";
import type { AdminUser } from "../types/users";
import { Modal } from "../components/Modal";

const emptyForm: SessionCreatePayload = {
  title: "",
  description: "",
  scheduled_at: "",
  meeting_link: "",
  scope: "GENERAL",
  tutorando_ids: [],
};

export function TutorSessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SessionCreatePayload>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [assignedTutorandos, setAssignedTutorandos] = useState<AdminUser[]>([]);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "ALL">("ALL");
  const [editingSession, setEditingSession] = useState<{ id: string; scheduled_at: string; meeting_link: string }>({
    id: "",
    scheduled_at: "",
    meeting_link: "",
  });
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SessionItem[]>("/tutor/sessions");
      setSessions(data);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const loadTutorandos = async () => {
      try {
        const { data } = await api.get<AdminUser[]>("/tutor/tutorandos");
        setAssignedTutorandos(data);
      } catch {
        // ignore silently; form will allow "sin asignar"
      }
    };
    loadTutorandos();
  }, []);

  const handleChange =
    (field: keyof SessionCreatePayload) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      if (field === "scope") {
        setForm((prev) => ({ ...prev, scope: value as SessionCreatePayload["scope"], tutorando_ids: [] }));
      } else {
        setForm((prev) => ({
          ...prev,
          [field]: value,
        }));
      }
    };

  const toggleTutorando = (id: string) => {
    setForm((prev) => {
      const current = prev.tutorando_ids ?? [];
      const exists = current.includes(id);
      return {
        ...prev,
        tutorando_ids: exists ? current.filter((x) => x !== id) : [...current, id],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: SessionCreatePayload = {
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        scheduled_at: form.scheduled_at,
        meeting_link: form.meeting_link?.trim() || undefined,
        scope: form.scope,
        tutorando_ids: form.scope === "PERSONALIZADA" ? form.tutorando_ids?.filter(Boolean) : [],
      };
      await api.post("/tutor/sessions", payload);
      setForm(emptyForm);
      setShowCreateModal(false);
      await fetchSessions();
    } catch (err) {
      setFormError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSessions = sessions.filter((s) => (statusFilter === "ALL" ? true : s.status === statusFilter));

  const calendarEvents = useMemo(() => {
    const colorMap: Record<SessionStatus, string> = {
      SCHEDULED: "#3b82f6",
      COMPLETED: "#10b981",
      CANCELED: "#9ca3af",
    };
    return filteredSessions.map((session) => {
      const start = new Date(session.scheduled_at);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const color = colorMap[session.status as SessionStatus] ?? "#3b82f6";
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

  const handleStatusChange = async (sessionId: string, newStatus: SessionStatus) => {
    try {
      const payload: SessionUpdatePayload = { status: newStatus };
      const { data } = await api.patch<SessionItem>(`/tutor/sessions/${sessionId}`, payload);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? data : s)));
      setSelectedSession((prev) => (prev?.id === sessionId ? data : prev));
    } catch (err) {
      alert(parseApiError(err).message);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm("¿Eliminar esta sesión? Esta acción no se puede deshacer.")) return;
    try {
      await api.delete(`/tutor/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSelectedSession(null);
    } catch (err) {
      alert(parseApiError(err).message);
    }
  };

  const openEdit = (session: SessionItem) => {
    setEditingSession({
      id: session.id,
      scheduled_at: session.scheduled_at.slice(0, 16),
      meeting_link: session.meeting_link ?? "",
    });
  };

  const submitEdit = async () => {
    if (!editingSession.id) return;
    try {
      const payload: SessionUpdatePayload = {
        scheduled_at: editingSession.scheduled_at,
        meeting_link: editingSession.meeting_link || null,
      };
      const { data } = await api.patch<SessionItem>(`/tutor/sessions/${editingSession.id}`, payload);
      setSessions((prev) => prev.map((s) => (s.id === editingSession.id ? data : s)));
      setSelectedSession((prev) => (prev?.id === editingSession.id ? data : prev));
      setEditingSession({ id: "", scheduled_at: "", meeting_link: "" });
    } catch (err) {
      alert(parseApiError(err).message);
    }
  };

  const statusLabel: Record<SessionStatus, string> = {
    SCHEDULED: "Programada",
    COMPLETED: "Completada",
    CANCELED: "Cancelada",
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        marginBottom: "2.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "1.5rem"
      }}>
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
            Crea y gestiona tus sesiones con tutorados
          </p>
        </div>

        {/* Create Session Button */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "1rem 2rem",
            background: "linear-gradient(135deg, var(--role-tutor-500), var(--role-tutor-600))",
            border: "none",
            borderRadius: "14px",
            color: "white",
            fontWeight: "600",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "all 0.3s",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            boxShadow: "0 4px 16px rgba(6, 182, 212, 0.3)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(6, 182, 212, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(6, 182, 212, 0.3)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
          Programar Nueva Sesión
        </button>
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
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 16px rgba(59, 130, 246, 0.25)"
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
                Calendario de Sesiones
              </h3>
              <p style={{ margin: 0, fontSize: "0.9375rem", color: "var(--gray-600)" }}>
                {sessions.length} {sessions.length === 1 ? 'sesión programada' : 'sesiones programadas'}
              </p>
            </div>
          </div>

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
              e.currentTarget.style.borderColor = "#3b82f6";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--gray-200)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
            }}
          >
            <option value="ALL">🔘 Todas las sesiones</option>
            <option value="SCHEDULED">🔵 Programadas</option>
            <option value="COMPLETED">✅ Completadas</option>
            <option value="CANCELED">⛔ Canceladas</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--gray-500)" }}>
            <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }}>
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <p style={{ marginTop: "1.25rem", fontSize: "1.0625rem", fontWeight: "500" }}>Cargando sesiones...</p>
          </div>
        ) : error ? (
          <div style={{
            padding: "2.5rem",
            background: "var(--error-light)",
            border: "2px solid var(--error)",
            borderRadius: "16px",
            textAlign: "center"
          }}>
            <p style={{ margin: 0, color: "var(--error)", fontWeight: "600", fontSize: "1rem" }}>{error}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--gray-500)" }}>
            <svg width="80" height="80" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.2, margin: "0 auto" }}>
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <p style={{ marginTop: "1.5rem", fontSize: "1.125rem", fontWeight: "600", color: "var(--gray-700)" }}>
              {statusFilter === "ALL" ? "Aún no tienes sesiones programadas" : `No hay sesiones ${statusLabel[statusFilter as SessionStatus]?.toLowerCase()}`}
            </p>
            <p style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>
              Comienza creando tu primera sesión de tutoría
            </p>
          </div>
        ) : (
          <div style={{
            marginTop: "1.5rem",
            background: "var(--white)",
            borderRadius: "12px",
            padding: "1rem",
            border: "1px solid var(--gray-100)"
          }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={esLocale}
              buttonText={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
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
              height="auto"
              eventDisplay="block"
              displayEventTime={true}
              displayEventEnd={false}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
            />
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <Modal title="Programar Nueva Sesión" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
              marginBottom: "1.5rem"
            }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--gray-700)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem"
                }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutor-500)" }}>
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  Título de la sesión <span style={{ color: "var(--error)" }}>*</span>
                </span>
                <input
                  type="text"
                  value={form.title}
                  onChange={handleChange("title")}
                  required
                  placeholder="Ej: Tutoría Grupal - Matemáticas"
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    border: "2px solid var(--gray-200)",
                    borderRadius: "10px",
                    fontSize: "0.9375rem",
                    fontWeight: "500",
                    color: "var(--gray-900)",
                    background: "var(--white)",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--role-tutor-100)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--gray-200)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--gray-700)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem"
                }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutor-500)" }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Fecha y hora <span style={{ color: "var(--error)" }}>*</span>
                </span>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={handleChange("scheduled_at")}
                  required
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    border: "2px solid var(--gray-200)",
                    borderRadius: "10px",
                    fontSize: "0.9375rem",
                    fontWeight: "500",
                    color: "var(--gray-900)",
                    background: "var(--white)",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--role-tutor-100)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--gray-200)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--gray-700)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem"
                }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutor-500)" }}>
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  Enlace de reunión
                </span>
                <input
                  type="url"
                  value={form.meeting_link}
                  onChange={handleChange("meeting_link")}
                  placeholder="https://meet.google.com/..."
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    border: "2px solid var(--gray-200)",
                    borderRadius: "10px",
                    fontSize: "0.9375rem",
                    fontWeight: "500",
                    color: "var(--gray-900)",
                    background: "var(--white)",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--role-tutor-100)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--gray-200)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--gray-700)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem"
                }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutor-500)" }}>
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  Alcance <span style={{ color: "var(--error)" }}>*</span>
                </span>
                <select
                  value={form.scope}
                  onChange={handleChange("scope")}
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    border: "2px solid var(--gray-200)",
                    borderRadius: "10px",
                    fontSize: "0.9375rem",
                    fontWeight: "500",
                    color: "var(--gray-900)",
                    background: "var(--white)",
                    transition: "all 0.2s",
                    outline: "none",
                    cursor: "pointer"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--role-tutor-100)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--gray-200)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="GENERAL">General (todos los tutorados)</option>
                  <option value="PERSONALIZADA">Personalizada (seleccionar tutorados)</option>
                </select>
              </label>
            </div>

            {form.scope === "PERSONALIZADA" && (
              <div style={{
                padding: "1.5rem",
                background: "var(--gray-50)",
                borderRadius: "12px",
                marginBottom: "1.5rem"
              }}>
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--gray-700)",
                  display: "block",
                  marginBottom: "1rem"
                }}>
                  Invitar tutorados asignados
                </span>
                {assignedTutorandos.length === 0 ? (
                  <p style={{ color: "var(--gray-600)", margin: 0, fontSize: "0.9375rem" }}>
                    No tienes tutorados asignados.
                  </p>
                ) : (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    maxHeight: "240px",
                    overflowY: "auto"
                  }}>
                    {assignedTutorandos.map((t) => {
                      const checked = (form.tutorando_ids ?? []).includes(t.id);
                      return (
                        <label
                          key={t.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.875rem",
                            background: checked ? "rgba(6, 182, 212, 0.05)" : "var(--white)",
                            borderRadius: "10px",
                            border: checked ? "2px solid var(--role-tutor-500)" : "2px solid var(--gray-200)",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            if (!checked) {
                              e.currentTarget.style.borderColor = "var(--gray-300)";
                              e.currentTarget.style.background = "var(--gray-50)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!checked) {
                              e.currentTarget.style.borderColor = "var(--gray-200)";
                              e.currentTarget.style.background = "var(--white)";
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTutorando(t.id)}
                            style={{
                              width: "18px",
                              height: "18px",
                              cursor: "pointer"
                            }}
                          />
                          <span style={{
                            fontWeight: "500",
                            color: "var(--gray-900)",
                            fontSize: "0.9375rem"
                          }}>
                            {t.profile.last_name_father} {t.profile.last_name_mother}, {t.profile.first_name} ({t.dni})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <label style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              marginBottom: "1.5rem"
            }}>
              <span style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--gray-700)",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem"
              }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutor-500)" }}>
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Descripción
              </span>
              <textarea
                value={form.description}
                onChange={handleChange("description")}
                rows={4}
                placeholder="Describe los temas a tratar en esta sesión..."
                style={{
                  width: "100%",
                  padding: "0.875rem 1rem",
                  border: "2px solid var(--gray-200)",
                  borderRadius: "10px",
                  fontSize: "0.9375rem",
                  fontWeight: "500",
                  color: "var(--gray-900)",
                  background: "var(--white)",
                  transition: "all 0.2s",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--role-tutor-100)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--gray-200)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </label>

            {formError && (
              <div style={{
                padding: "1rem 1.25rem",
                background: "var(--error-light)",
                border: "1px solid var(--error)",
                borderRadius: "10px",
                marginBottom: "1.5rem",
                fontSize: "0.875rem",
                color: "var(--error)",
                fontWeight: "500"
              }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: "0.875rem 1.75rem",
                  background: "var(--white)",
                  border: "2px solid var(--gray-300)",
                  borderRadius: "10px",
                  color: "var(--gray-700)",
                  fontWeight: "600",
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--gray-100)";
                  e.currentTarget.style.borderColor = "var(--gray-400)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--white)";
                  e.currentTarget.style.borderColor = "var(--gray-300)";
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "0.875rem 2rem",
                  background: submitting ? "var(--gray-300)" : "linear-gradient(135deg, var(--role-tutor-500), var(--role-tutor-600))",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "0.9375rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: submitting ? "none" : "0 4px 12px rgba(6, 182, 212, 0.3)"
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(6, 182, 212, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = submitting ? "none" : "0 4px 12px rgba(6, 182, 212, 0.3)";
                }}
              >
                {submitting ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite" }}>
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Crear Sesión
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <Modal
          title={selectedSession.title}
          onClose={() => setSelectedSession(null)}
        >
          <div style={{
            padding: "1.5rem",
            background: `linear-gradient(135deg, ${
              selectedSession.status === "COMPLETED" ? "#10b981" :
              selectedSession.status === "SCHEDULED" ? "#3b82f6" :
              "#64748b"
            } 0%, ${
              selectedSession.status === "COMPLETED" ? "#059669" :
              selectedSession.status === "SCHEDULED" ? "#2563eb" :
              "#475569"
            } 100%)`,
            borderRadius: "16px",
            color: "white",
            marginBottom: "2rem",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "180px",
              height: "180px",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)",
              borderRadius: "50%",
              transform: "translate(30%, -30%)",
              pointerEvents: "none"
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "10px",
                fontSize: "0.8125rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "1rem",
                backdropFilter: "blur(10px)"
              }}>
                {selectedSession.status === "SCHEDULED" && "🔵"}
                {selectedSession.status === "COMPLETED" && "✅"}
                {selectedSession.status === "CANCELED" && "⛔"}
                {" "}
                {statusLabel[selectedSession.status as SessionStatus] ?? selectedSession.status}
              </div>

              <p style={{
                margin: "0 0 1.25rem 0",
                fontSize: "1.0625rem",
                opacity: 0.95,
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                fontWeight: "500"
              }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {new Date(selectedSession.scheduled_at).toLocaleString("es-PE", {
                  dateStyle: "full",
                  timeStyle: "short"
                })}
              </p>

              {selectedSession.description && (
                <p style={{
                  margin: "0 0 1.25rem 0",
                  fontSize: "0.9375rem",
                  opacity: 0.9,
                  lineHeight: "1.6",
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  backdropFilter: "blur(10px)"
                }}>
                  {selectedSession.description}
                </p>
              )}

              {selectedSession.scope === "GENERAL" ? (
                <p style={{
                  margin: 0,
                  fontSize: "0.9375rem",
                  opacity: 0.9,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  Visible para todos tus tutorados asignados
                </p>
              ) : selectedSession.invited_tutorandos?.length ? (
                <div style={{
                  margin: 0,
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  backdropFilter: "blur(10px)"
                }}>
                  <p style={{
                    margin: "0 0 0.5rem 0",
                    fontSize: "0.8125rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    opacity: 0.9
                  }}>
                    Tutorados invitados:
                  </p>
                  <p style={{ margin: 0, fontSize: "0.9375rem", opacity: 0.95 }}>
                    {selectedSession.invited_tutorandos
                      .map((t) => `${t.profile.last_name_father} ${t.profile.last_name_mother}, ${t.profile.first_name}`)
                      .join("; ")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem"
          }}>
            {selectedSession.meeting_link && selectedSession.status === "SCHEDULED" && (
              <a
                href={selectedSession.meeting_link}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "1rem 1.5rem",
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                  gridColumn: "1 / -1"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Unirse a la sesión
              </a>
            )}

            {selectedSession.status !== "COMPLETED" && (
              <button
                onClick={() => handleStatusChange(selectedSession.id, "COMPLETED")}
                style={{
                  padding: "1rem 1.5rem",
                  background: "var(--white)",
                  border: "2px solid var(--gray-300)",
                  borderRadius: "12px",
                  color: "var(--gray-700)",
                  fontWeight: "600",
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--gray-100)";
                  e.currentTarget.style.borderColor = "var(--gray-400)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--white)";
                  e.currentTarget.style.borderColor = "var(--gray-300)";
                }}
              >
                ✅ Completar
              </button>
            )}

            <button
              onClick={() => {
                openEdit(selectedSession);
                setSelectedSession(null);
              }}
              style={{
                padding: "1rem 1.5rem",
                background: "var(--white)",
                border: "2px solid var(--gray-300)",
                borderRadius: "12px",
                color: "var(--gray-700)",
                fontWeight: "600",
                fontSize: "0.9375rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--gray-100)";
                e.currentTarget.style.borderColor = "var(--gray-400)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--white)";
                e.currentTarget.style.borderColor = "var(--gray-300)";
              }}
            >
              📅 Reprogramar
            </button>

            <button
              onClick={() => handleDelete(selectedSession.id)}
              style={{
                padding: "1rem 1.5rem",
                background: "var(--white)",
                border: "2px solid var(--error)",
                borderRadius: "12px",
                color: "var(--error)",
                fontWeight: "600",
                fontSize: "0.9375rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--error-light)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--white)";
              }}
            >
              🗑️ Eliminar
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editingSession.id && (
        <Modal title="Reprogramar Sesión" onClose={() => setEditingSession({ id: "", scheduled_at: "", meeting_link: "" })}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "1.5rem",
            marginBottom: "2rem"
          }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--gray-700)"
              }}>
                Nueva fecha y hora
              </span>
              <input
                type="datetime-local"
                value={editingSession.scheduled_at}
                onChange={(e) => setEditingSession((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                required
                style={{
                  width: "100%",
                  padding: "0.875rem 1rem",
                  border: "2px solid var(--gray-200)",
                  borderRadius: "10px",
                  fontSize: "0.9375rem",
                  fontWeight: "500",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--role-tutor-100)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--gray-200)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--gray-700)"
              }}>
                Enlace de reunión
              </span>
              <input
                type="url"
                value={editingSession.meeting_link}
                onChange={(e) => setEditingSession((prev) => ({ ...prev, meeting_link: e.target.value }))}
                placeholder="https://meet..."
                style={{
                  width: "100%",
                  padding: "0.875rem 1rem",
                  border: "2px solid var(--gray-200)",
                  borderRadius: "10px",
                  fontSize: "0.9375rem",
                  fontWeight: "500",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px var(--role-tutor-100)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--gray-200)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => setEditingSession({ id: "", scheduled_at: "", meeting_link: "" })}
              style={{
                padding: "0.875rem 1.75rem",
                background: "var(--white)",
                border: "2px solid var(--gray-300)",
                borderRadius: "10px",
                color: "var(--gray-700)",
                fontWeight: "600",
                fontSize: "0.9375rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--gray-100)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--white)";
              }}
            >
              Cancelar
            </button>
            <button
              onClick={submitEdit}
              style={{
                padding: "0.875rem 2rem",
                background: "linear-gradient(135deg, var(--role-tutor-500), var(--role-tutor-600))",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontWeight: "600",
                fontSize: "0.9375rem",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(6, 182, 212, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(6, 182, 212, 0.3)";
              }}
            >
              Guardar Cambios
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* FullCalendar Custom Styles */
        .fc {
          font-family: inherit;
        }

        .fc .fc-button {
          background: linear-gradient(135deg, var(--role-tutor-500), var(--role-tutor-600));
          border: none;
          border-radius: 10px;
          padding: 0.625rem 1.125rem;
          font-weight: 600;
          text-transform: capitalize;
          box-shadow: 0 2px 8px rgba(6, 182, 212, 0.2);
          transition: all 0.2s;
        }

        .fc .fc-button:hover {
          background: linear-gradient(135deg, var(--role-tutor-600), var(--role-tutor-700));
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
          transform: translateY(-1px);
        }

        .fc .fc-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .fc .fc-button-active {
          background: linear-gradient(135deg, var(--role-tutor-600), var(--role-tutor-700));
        }

        .fc .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--gray-900);
        }

        .fc-event {
          border-radius: 6px;
          padding: 4px 8px;
          font-weight: 600;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .fc-event:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .fc-daygrid-day-number {
          font-weight: 600;
          color: var(--gray-700);
        }

        .fc .fc-daygrid-day.fc-day-today {
          background-color: rgba(6, 182, 212, 0.05);
        }

        .fc .fc-col-header-cell {
          background: var(--gray-50);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          color: var(--gray-700);
          padding: 0.875rem 0.5rem;
        }

        .fc-theme-standard td, .fc-theme-standard th {
          border-color: var(--gray-200);
        }
      `}</style>
    </div>
  );
}
