import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import type { AdminUser } from "../types/users";
import type { ResourceCreatePayload, ResourceItem, ResourceScope, ResourceType } from "../types/resources";

const emptyLinkForm: ResourceCreatePayload = {
  title: "",
  description: "",
  url: "",
  resource_type: "LINK",
  scope: "GENERAL",
  tutorando_ids: [],
};

// Helper para determinar el tipo y color de recurso
function getResourceMeta(type: ResourceType): { icon: string; color: string; bgColor: string } {
  const config: Record<ResourceType, { icon: string; color: string; bgColor: string }> = {
    LINK: { icon: "🔗", color: "#2c5f8d", bgColor: "#dbeafe" },
    FILE: { icon: "📄", color: "#dc2626", bgColor: "#fee2e2" },
    VIDEO: { icon: "🎥", color: "#7c3aed", bgColor: "#ede9fe" },
    DOCUMENT: { icon: "📝", color: "#2563eb", bgColor: "#dbeafe" },
    PRESENTATION: { icon: "📊", color: "#ea580c", bgColor: "#fed7aa" },
    OTHER: { icon: "📦", color: "#6b7280", bgColor: "#f3f4f6" },
  };
  return config[type] || config.LINK;
}

export function TutorResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [assignedTutorandos, setAssignedTutorandos] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"LINK" | "FILE">("LINK");
  const [form, setForm] = useState<ResourceCreatePayload>(emptyLinkForm);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hoveredResourceId, setHoveredResourceId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: resourcesData }, { data: tutorandosData }] = await Promise.all([
        api.get<ResourceItem[]>("/tutor/resources"),
        api.get<AdminUser[]>("/tutor/tutorandos"),
      ]);
      setResources(resourcesData);
      setAssignedTutorandos(tutorandosData);
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
    (field: keyof ResourceCreatePayload) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      if (field === "scope") {
        setForm((prev) => ({ ...prev, scope: value as ResourceScope, tutorando_ids: [] }));
      } else if (field === "resource_type") {
        setForm((prev) => ({ ...prev, resource_type: value as ResourceType }));
      } else {
        setForm((prev) => ({ ...prev, [field]: value }));
      }
    };

  const toggleTutorando = (id: string) => {
    setForm((prev) => {
      const current = prev.tutorando_ids ?? [];
      return {
        ...prev,
        tutorando_ids: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (mode === "LINK") {
        const payload: ResourceCreatePayload = {
          title: form.title.trim(),
          description: form.description?.trim() || undefined,
          url: form.url.trim(),
          resource_type: form.resource_type,
          scope: form.scope,
          tutorando_ids: form.scope === "PERSONALIZADA" ? form.tutorando_ids?.filter(Boolean) : [],
        };
        await api.post("/tutor/resources", payload);
      } else {
        if (!file) {
          throw new Error("Selecciona un archivo para subir.");
        }
        const data = new FormData();
        data.append("title", form.title.trim());
        data.append("description", form.description?.trim() || "");
        data.append("scope", form.scope);
        if (form.scope === "PERSONALIZADA" && form.tutorando_ids?.length) {
          data.append("tutorando_ids", form.tutorando_ids.join(","));
        }
        data.append("file", file);
        await api.post("/tutor/resources/upload", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setForm(emptyLinkForm);
      setFile(null);
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError(parseApiError(err).message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!window.confirm("¿Eliminar este recurso?")) return;
    try {
      await api.delete(`/tutor/resources/${resourceId}`);
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (err) {
      alert(parseApiError(err).message);
    }
  };

  const typeLabel: Record<ResourceType, string> = {
    LINK: "Enlace",
    FILE: "Archivo",
    VIDEO: "Video",
    DOCUMENT: "Documento",
    PRESENTATION: "Presentación",
    OTHER: "Otro",
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
            📚
          </div>
          <div>
            <h2 style={{ margin: 0, color: "white", fontSize: "1.25rem", fontWeight: 700 }}>
              Recursos de Aprendizaje
            </h2>
            <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.9)", fontSize: "0.8rem" }}>
              {resources.length} {resources.length === 1 ? "recurso compartido" : "recursos compartidos"}
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
          {showForm ? "Cancelar" : "Nuevo Recurso"}
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
              📝
            </div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#111827", fontWeight: 700 }}>
              Crear Nuevo Recurso
            </h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Tipo de recurso</span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "LINK" | "FILE")}
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
                  <option value="LINK">🔗 Enlace</option>
                  <option value="FILE">📄 Archivo</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Título *</span>
                <input
                  value={form.title}
                  onChange={handleChange("title")}
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
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Alcance</span>
                <select
                  value={form.scope}
                  onChange={handleChange("scope")}
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
                  <option value="GENERAL">👥 General (todos)</option>
                  <option value="PERSONALIZADA">👤 Personalizada</option>
                </select>
              </label>

              {mode === "LINK" && (
                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Tipo de enlace</span>
                  <select
                    value={form.resource_type}
                    onChange={handleChange("resource_type")}
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
                    <option value="LINK">🔗 Enlace</option>
                    <option value="VIDEO">🎥 Video</option>
                    <option value="DOCUMENT">📝 Documento</option>
                    <option value="PRESENTATION">📊 Presentación</option>
                    <option value="OTHER">📦 Otro</option>
                  </select>
                </label>
              )}
            </div>

            {mode === "LINK" ? (
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>URL *</span>
                <input
                  value={form.url}
                  onChange={handleChange("url")}
                  placeholder="https://..."
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
                />
              </label>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Archivo *</span>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
                />
              </label>
            )}

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Descripción</span>
              <textarea
                value={form.description}
                onChange={handleChange("description")}
                rows={2}
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

            {form.scope === "PERSONALIZADA" && (
              <div style={{ marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "0.75rem" }}>
                  Compartir con:
                </span>
                {assignedTutorandos.length === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: "0.9rem", padding: "1rem", background: "#f9fafb", borderRadius: "0.75rem" }}>
                    No tienes tutorados asignados.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "0.5rem",
                      maxHeight: "200px",
                      overflowY: "auto",
                      padding: "0.75rem",
                      background: "#f9fafb",
                      borderRadius: "0.75rem",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {assignedTutorandos.map((t) => {
                      const checked = (form.tutorando_ids ?? []).includes(t.id);
                      return (
                        <label
                          key={t.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.75rem",
                            background: checked ? "var(--role-tutor-50)" : "white",
                            borderRadius: "0.625rem",
                            border: checked ? "2px solid var(--role-tutor-500)" : "2px solid #e5e7eb",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!checked) {
                              e.currentTarget.style.background = "#f9fafb";
                              e.currentTarget.style.borderColor = "#d1d5db";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!checked) {
                              e.currentTarget.style.background = "white";
                              e.currentTarget.style.borderColor = "#e5e7eb";
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTutorando(t.id)}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                          />
                          <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#111827" }}>
                            {t.profile.last_name_father} {t.profile.last_name_mother}, {t.profile.first_name}
                          </span>
                          <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>({t.dni})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
                  setForm(emptyLinkForm);
                  setFile(null);
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
                    <span>Guardar recurso</span>
                    <span style={{ fontSize: "1.2rem" }}>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de recursos */}
      <div>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", color: "#1f2937" }}>Recursos Compartidos</h3>
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
            <p style={{ marginTop: "1rem", color: "#6b7280", fontSize: "1rem" }}>Cargando recursos...</p>
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
        ) : resources.length === 0 ? (
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
            <p style={{ color: "#4b5563", fontSize: "1.1rem", margin: 0 }}>Aún no has compartido recursos</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {resources.map((resource) => {
              const isHovered = hoveredResourceId === resource.id;
              const meta = getResourceMeta(resource.resource_type);

              return (
                <div
                  key={resource.id}
                  onMouseEnter={() => setHoveredResourceId(resource.id)}
                  onMouseLeave={() => setHoveredResourceId(null)}
                  style={{
                    background: "white",
                    borderRadius: "1rem",
                    padding: "1.5rem",
                    border: `1px solid ${isHovered ? meta.color : "#e5e7eb"}`,
                    boxShadow: isHovered
                      ? "0 12px 40px rgba(8, 145, 178, 0.18), 0 0 0 3px rgba(8, 145, 178, 0.05)"
                      : "0 2px 12px rgba(0, 0, 0, 0.05)",
                    transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                    transition: "all 0.3s ease",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1.5rem",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Barra lateral de color */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "5px",
                      background: `linear-gradient(180deg, ${meta.color} 0%, ${meta.color}99 100%)`,
                    }}
                  />

                  {/* Información del recurso */}
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "1.25rem" }}>
                    {/* Icono del recurso */}
                    <div
                      style={{
                        width: "55px",
                        height: "55px",
                        borderRadius: "0.75rem",
                        background: `linear-gradient(135deg, ${meta.bgColor} 0%, ${meta.bgColor}dd 100%)`,
                        border: `2px solid ${meta.color}30`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.75rem",
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Detalles */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                        <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#111827", fontWeight: 700 }}>
                          {resource.title}
                        </h4>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.3rem 0.7rem",
                            borderRadius: "0.5rem",
                            background: meta.bgColor,
                            color: meta.color,
                            fontWeight: 700,
                            border: `2px solid ${meta.color}`,
                          }}
                        >
                          {typeLabel[resource.resource_type]}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.3rem 0.7rem",
                            borderRadius: "0.5rem",
                            background: resource.scope === "GENERAL" ? "#dbeafe" : "#fef3c7",
                            color: resource.scope === "GENERAL" ? "#1e3a8a" : "#b45309",
                            fontWeight: 700,
                            border: resource.scope === "GENERAL" ? "2px solid #2c5f8d" : "2px solid #f59e0b",
                          }}
                        >
                          {resource.scope === "GENERAL" ? "👥 General" : "👤 Personalizada"}
                        </span>
                      </div>

                      {resource.description && (
                        <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280", fontSize: "0.9rem", lineHeight: "1.5" }}>
                          {resource.description}
                        </p>
                      )}

                      {resource.scope === "PERSONALIZADA" && resource.invited_tutorandos.length > 0 && (
                        <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.85rem", color: "#9ca3af", fontWeight: 500 }}>Compartido con:</span>
                          {resource.invited_tutorandos.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.6rem",
                                borderRadius: "0.5rem",
                                background: "#f3f4f6",
                                color: "#4b5563",
                                fontWeight: 600,
                              }}
                            >
                              {t.profile.first_name} {t.profile.last_name_father}
                            </span>
                          ))}
                          {resource.invited_tutorandos.length > 3 && (
                            <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                              +{resource.invited_tutorandos.length - 3} más
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "0.75rem 1.5rem",
                        borderRadius: "0.75rem",
                        border: "none",
                        background: isHovered
                          ? "linear-gradient(135deg, var(--role-tutor-600) 0%, var(--role-tutor-700) 100%)"
                          : "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-600) 100%)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        boxShadow: isHovered
                          ? "0 8px 25px rgba(8, 145, 178, 0.3)"
                          : "0 4px 15px rgba(8, 145, 178, 0.2)",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>Abrir</span>
                      <span style={{ fontSize: "1.1rem" }}>→</span>
                    </a>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "0.75rem",
                        border: "2px solid #fee2e2",
                        background: "white",
                        color: "#dc2626",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
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
