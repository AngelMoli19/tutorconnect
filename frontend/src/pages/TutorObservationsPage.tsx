import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import type { AdminUser } from "../types/users";
import type { ObservationCategory, ObservationCreatePayload, ObservationItem } from "../types/observations";
import type { SessionItem } from "../types/sessions";

const emptyObservation: ObservationCreatePayload = {
  tutorando_id: "",
  session_id: "",
  category: "GENERAL",
  summary: "",
  details: "",
};

const categoryConfig: Record<
  ObservationCategory,
  { icon: string; color: string; bgColor: string; borderColor: string }
> = {
  ACADEMICA: {
    icon: "📚",
    color: "#1e40af",
    bgColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  EMOCIONAL: {
    icon: "💙",
    color: "#7c3aed",
    bgColor: "#ede9fe",
    borderColor: "#a78bfa",
  },
  GENERAL: {
    icon: "📝",
    color: "#15803d",
    bgColor: "#dcfce7",
    borderColor: "#22c55e",
  },
};

export function TutorObservationsPage() {
  const [observations, setObservations] = useState<ObservationItem[]>([]);
  const [assignedTutorandos, setAssignedTutorandos] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [form, setForm] = useState<ObservationCreatePayload>(emptyObservation);
  const [filterTutorando, setFilterTutorando] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hoveredObservationId, setHoveredObservationId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: obsData }, { data: tutorandosData }, { data: sessionsData }] = await Promise.all([
        api.get<ObservationItem[]>("/tutor/observations"),
        api.get<AdminUser[]>("/tutor/tutorandos"),
        api.get<SessionItem[]>("/tutor/sessions"),
      ]);
      setObservations(obsData);
      setAssignedTutorandos(tutorandosData);
      setSessions(sessionsData);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange =
    (field: keyof ObservationCreatePayload) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: ObservationCreatePayload = {
        tutorando_id: form.tutorando_id,
        session_id: form.session_id || undefined,
        category: form.category as ObservationCategory,
        summary: form.summary.trim(),
        details: form.details.trim(),
      };
      await api.post("/tutor/observations", payload);
      setForm(emptyObservation);
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar esta observación?")) return;
    try {
      await api.delete(`/tutor/observations/${id}`);
      setObservations((prev) => prev.filter((obs) => obs.id !== id));
    } catch (err) {
      alert(parseApiError(err).message);
    }
  };

  const filteredObservations = observations.filter((obs) => (filterTutorando ? obs.tutorando.id === filterTutorando : true));

  const categoryLabel: Record<ObservationCategory, string> = {
    ACADEMICA: "Académica",
    EMOCIONAL: "Emocional",
    GENERAL: "General",
  };

  return (
    <div className="table-wrapper">
      {/* Header compacto y moderno */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-700) 100%)",
          borderRadius: "0.75rem",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 12px rgba(8, 145, 178, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "0.5rem",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
            }}
          >
            📋
          </div>
          <div>
            <h2 style={{ margin: 0, color: "white", fontSize: "1.25rem", fontWeight: 700 }}>
              Observaciones y Avances
            </h2>
            <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.9)", fontSize: "0.8rem" }}>
              {observations.length} {observations.length === 1 ? "observación registrada" : "observaciones registradas"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "0.625rem",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            background: showForm ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            color: "white",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = showForm ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.15)";
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>{showForm ? "−" : "+"}</span>
          {showForm ? "Cancelar" : "Nueva Observación"}
        </button>
      </div>

      {/* Formulario de creación (colapsable) */}
      {showForm && (
        <div
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            border: "2px solid var(--role-tutor-200)",
            boxShadow: "0 4px 20px rgba(8, 145, 178, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.5rem",
                background: "linear-gradient(135deg, var(--role-tutor-100) 0%, var(--role-tutor-200) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
              }}
            >
              ✍️
            </div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#111827", fontWeight: 700 }}>
              Registrar Nueva Observación
            </h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Tutorado *</span>
                <select
                  value={form.tutorando_id}
                  onChange={handleChange("tutorando_id")}
                  required
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border: "2px solid #e5e7eb",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    outline: "none",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  <option value="">Seleccionar tutorado</option>
                  {assignedTutorandos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.profile.last_name_father} {t.profile.last_name_mother}, {t.profile.first_name} ({t.dni})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Sesión (opcional)</span>
                <select
                  value={form.session_id}
                  onChange={handleChange("session_id")}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border: "2px solid #e5e7eb",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    outline: "none",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  <option value="">Sin sesión asociada</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} - {new Date(s.scheduled_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Categoría</span>
                <select
                  value={form.category}
                  onChange={handleChange("category")}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border: "2px solid #e5e7eb",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    outline: "none",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  <option value="GENERAL">📝 General</option>
                  <option value="ACADEMICA">📚 Académica</option>
                  <option value="EMOCIONAL">💙 Emocional</option>
                </select>
              </label>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Resumen *</span>
              <input
                value={form.summary}
                onChange={handleChange("summary")}
                required
                placeholder="Breve descripción de la observación..."
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "2px solid #e5e7eb",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Detalle *</span>
              <textarea
                value={form.details}
                onChange={handleChange("details")}
                rows={3}
                required
                placeholder="Descripción detallada de la observación..."
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "2px solid #e5e7eb",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  outline: "none",
                  transition: "all 0.2s",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              />
            </label>

            {formError && (
              <div
                style={{
                  padding: "1rem 1.25rem",
                  background: "#fee2e2",
                  border: "2px solid #dc2626",
                  borderRadius: "0.75rem",
                  color: "#991b1b",
                  fontSize: "0.9rem",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyObservation);
                  setFormError(null);
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  border: "2px solid #d1d5db",
                  background: "white",
                  color: "#6b7280",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                  e.currentTarget.style.borderColor = "#9ca3af";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "0.75rem 2rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: submitting
                    ? "#d1d5db"
                    : "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-600) 100%)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: submitting ? "none" : "0 4px 16px rgba(8, 145, 178, 0.3)",
                  opacity: submitting ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(8, 145, 178, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(8, 145, 178, 0.3)";
                }}
              >
                {submitting ? (
                  <>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Guardando...
                  </>
                ) : (
                  <>
                    <span>Guardar observación</span>
                    <span style={{ fontSize: "1.2rem" }}>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtro y lista de observaciones */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1f2937" }}>Historial de Observaciones</h3>
          <select
            value={filterTutorando}
            onChange={(e) => setFilterTutorando(e.target.value)}
            style={{
              padding: "0.65rem 1rem",
              borderRadius: "0.75rem",
              border: "2px solid var(--role-tutor-500)",
              fontSize: "0.9rem",
              fontWeight: 500,
              color: "var(--role-tutor-700)",
              background: "white",
              cursor: "pointer",
              outline: "none",
              transition: "all 0.2s",
            }}
          >
            <option value="">👥 Todos los tutorados</option>
            {assignedTutorandos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.profile.last_name_father} {t.profile.last_name_mother}, {t.profile.first_name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "2.5rem",
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
                borderTopColor: "var(--role-tutor-500)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ marginTop: "1rem", color: "#6b7280", fontSize: "1rem" }}>Cargando observaciones...</p>
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
        ) : filteredObservations.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2.5rem",
              background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
              borderRadius: "1rem",
              border: "2px dashed #d1d5db",
            }}
          >
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📭</div>
            <p style={{ color: "#4b5563", fontSize: "1.1rem", margin: 0 }}>
              {filterTutorando ? "No hay observaciones para este tutorado" : "Aún no has registrado observaciones"}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {filteredObservations.map((obs) => {
              const isHovered = hoveredObservationId === obs.id;
              const config = categoryConfig[obs.category as ObservationCategory] || categoryConfig.GENERAL;

              return (
                <div
                  key={obs.id}
                  onMouseEnter={() => setHoveredObservationId(obs.id)}
                  onMouseLeave={() => setHoveredObservationId(null)}
                  style={{
                    background: "white",
                    borderRadius: "1rem",
                    padding: "1.5rem",
                    border: `1px solid ${isHovered ? config.borderColor : "#e5e7eb"}`,
                    boxShadow: isHovered
                      ? "0 12px 40px rgba(8, 145, 178, 0.18), 0 0 0 3px rgba(8, 145, 178, 0.05)"
                      : "0 2px 12px rgba(0, 0, 0, 0.05)",
                    transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                    transition: "all 0.3s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Barra lateral de color según categoría */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "5px",
                      background: `linear-gradient(180deg, ${config.borderColor} 0%, ${config.borderColor}99 100%)`,
                    }}
                  />

                  <div style={{ display: "flex", gap: "1.25rem" }}>
                    {/* Icono de categoría */}
                    <div
                      style={{
                        width: "55px",
                        height: "55px",
                        borderRadius: "0.75rem",
                        background: `linear-gradient(135deg, ${config.bgColor} 0%, ${config.bgColor}dd 100%)`,
                        border: `2px solid ${config.borderColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.75rem",
                        flexShrink: 0,
                      }}
                    >
                      {config.icon}
                    </div>

                    {/* Contenido */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                        <h4 style={{ margin: 0, fontSize: "1.15rem", color: "#111827", fontWeight: 700 }}>
                          {obs.summary}
                        </h4>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.3rem 0.7rem",
                            borderRadius: "0.5rem",
                            background: config.bgColor,
                            color: config.color,
                            fontWeight: 700,
                            border: `2px solid ${config.borderColor}`,
                          }}
                        >
                          {categoryLabel[obs.category as ObservationCategory] || obs.category}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "0 0 0.75rem 0",
                          color: "#4b5563",
                          fontSize: "0.95rem",
                          lineHeight: "1.6",
                        }}
                      >
                        {obs.details}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6b7280", fontSize: "0.85rem" }}>
                          <span>👤</span>
                          <span style={{ fontWeight: 600 }}>
                            {obs.tutorando.profile.first_name} {obs.tutorando.profile.last_name_father}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#9ca3af", fontSize: "0.85rem" }}>
                          <span>🕒</span>
                          <span>
                            {new Date(obs.created_at).toLocaleString("es-ES", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botón de eliminar */}
                    <button
                      onClick={() => handleDelete(obs.id)}
                      style={{
                        padding: "0.65rem 1rem",
                        borderRadius: "0.75rem",
                        border: "2px solid #fee2e2",
                        background: "white",
                        color: "#dc2626",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        flexShrink: 0,
                        height: "fit-content",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fee2e2";
                        e.currentTarget.style.borderColor = "#dc2626";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.borderColor = "#fee2e2";
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Animaciones */}
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
