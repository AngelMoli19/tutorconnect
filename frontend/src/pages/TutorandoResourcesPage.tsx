import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import type { ResourceItem } from "../types/resources";

// Helper para determinar el tipo de recurso basado en la URL
function getResourceType(url: string): { icon: string; label: string; color: string } {
  const urlLower = url.toLowerCase();

  if (urlLower.includes(".pdf")) {
    return { icon: "📄", label: "PDF", color: "#dc2626" };
  }
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be") || urlLower.includes("vimeo.com")) {
    return { icon: "🎥", label: "Video", color: "#7c3aed" };
  }
  if (urlLower.includes(".doc") || urlLower.includes(".docx")) {
    return { icon: "📝", label: "Documento", color: "#2563eb" };
  }
  if (urlLower.includes(".ppt") || urlLower.includes(".pptx")) {
    return { icon: "📊", label: "Presentación", color: "#ea580c" };
  }
  if (urlLower.includes(".xls") || urlLower.includes(".xlsx")) {
    return { icon: "📈", label: "Hoja de cálculo", color: "#16a34a" };
  }
  if (urlLower.includes("drive.google.com")) {
    return { icon: "☁️", label: "Google Drive", color: "#0ea5e9" };
  }
  if (urlLower.includes("github.com")) {
    return { icon: "💻", label: "Código", color: "#1f2937" };
  }

  return { icon: "🔗", label: "Enlace", color: "#2c5f8d" };
}

export function TutorandoResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResources() {
      setLoading(true);
      try {
        const { data } = await api.get<ResourceItem[]>("/tutorando/resources");
        setResources(data);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    fetchResources();
  }, []);

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
              📚
            </div>
            <div>
              <h2 style={{ margin: 0, color: "white", fontSize: "1.75rem", fontWeight: 700 }}>
                Recursos de Aprendizaje
              </h2>
              <p style={{ margin: "0.25rem 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.95rem" }}>
                Materiales y documentos compartidos por tu tutor
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contador de recursos */}
      {resources.length > 0 && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "1rem 1.5rem",
            background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
            borderRadius: "1rem",
            border: "1px solid var(--role-tutorando-200)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>📦</span>
          <div>
            <div style={{ fontWeight: 600, color: "var(--role-tutorando-800)" }}>
              {resources.length} {resources.length === 1 ? "recurso disponible" : "recursos disponibles"}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--role-tutorando-600)" }}>
              Accede a materiales de estudio, documentos y enlaces útiles
            </div>
          </div>
        </div>
      )}

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
            padding: "3rem",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
            borderRadius: "1rem",
            border: "2px dashed #d1d5db",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📭</div>
          <p style={{ color: "#6b7280", fontSize: "1.1rem", margin: 0, marginBottom: "0.5rem" }}>
            Aún no hay recursos disponibles
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.9rem", margin: 0 }}>
            Tu tutor compartirá materiales de estudio próximamente
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {resources.map((resource) => {
            const isHovered = hoveredId === resource.id;
            const resourceType = getResourceType(resource.url);

            return (
              <div
                key={resource.id}
                onMouseEnter={() => setHoveredId(resource.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: "white",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  border: "1px solid #e5e7eb",
                  boxShadow: isHovered
                    ? "0 12px 40px rgba(44, 95, 141, 0.15)"
                    : "0 4px 15px rgba(0, 0, 0, 0.05)",
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
                {/* Indicador lateral de color */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "5px",
                    background: `linear-gradient(180deg, ${resourceType.color} 0%, ${resourceType.color}99 100%)`,
                  }}
                />

                {/* Información del recurso */}
                <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  {/* Icono del tipo de recurso */}
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "0.75rem",
                      background: `linear-gradient(135deg, ${resourceType.color}15 0%, ${resourceType.color}25 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      flexShrink: 0,
                      border: `2px solid ${resourceType.color}30`,
                    }}
                  >
                    {resourceType.icon}
                  </div>

                  {/* Detalles */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1f2937", fontWeight: 600 }}>
                        {resource.title}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "0.5rem",
                          background: resourceType.color,
                          color: "white",
                          fontWeight: 600,
                        }}
                      >
                        {resourceType.label}
                      </span>
                    </div>

                    {resource.description && (
                      <p
                        style={{
                          margin: "0.5rem 0 0 0",
                          color: "#6b7280",
                          fontSize: "0.95rem",
                          lineHeight: "1.5",
                        }}
                      >
                        {resource.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botón de acción */}
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    background: isHovered
                      ? "linear-gradient(135deg, var(--role-tutorando-600) 0%, var(--role-tutorando-700) 100%)"
                      : "linear-gradient(135deg, var(--role-tutorando-500) 0%, var(--role-tutorando-600) 100%)",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: isHovered
                      ? "0 8px 25px rgba(44, 95, 141, 0.3)"
                      : "0 4px 15px rgba(44, 95, 141, 0.2)",
                    transform: isHovered ? "scale(1.05)" : "scale(1)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>Abrir</span>
                  <span style={{ fontSize: "1.1rem" }}>→</span>
                </a>
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
