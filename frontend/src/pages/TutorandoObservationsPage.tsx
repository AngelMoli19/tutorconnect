import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import type { ObservationItem } from "../types/observations";

type ObservationCategory = "ACADEMICA" | "EMOCIONAL" | "GENERAL";

const categoryLabel: Record<ObservationCategory, string> = {
  ACADEMICA: "Académica",
  EMOCIONAL: "Emocional",
  GENERAL: "General",
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

export function TutorandoObservationsPage() {
  const [observations, setObservations] = useState<ObservationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ObservationCategory | "ALL">("ALL");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchObservations() {
      setLoading(true);
      try {
        const { data } = await api.get<ObservationItem[]>("/tutorando/observations");
        setObservations(data);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    fetchObservations();
  }, []);

  const filteredObservations = useMemo(() => {
    if (categoryFilter === "ALL") return observations;
    return observations.filter((obs) => obs.category === categoryFilter);
  }, [observations, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const counts = {
      ACADEMICA: 0,
      EMOCIONAL: 0,
      GENERAL: 0,
    };
    observations.forEach((obs) => {
      if (obs.category in counts) {
        counts[obs.category as ObservationCategory]++;
      }
    });
    return counts;
  }, [observations]);

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
            width: "250px",
            height: "250px",
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
              📋
            </div>
            <div>
              <h2 style={{ margin: 0, color: "white", fontSize: "1.75rem", fontWeight: 700 }}>
                Observaciones del Tutor
              </h2>
              <p style={{ margin: "0.25rem 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.95rem" }}>
                Notas, comentarios y seguimiento de tu progreso
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards por categoría */}
      {observations.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
              borderRadius: "1rem",
              padding: "1.25rem",
              color: "white",
              boxShadow: "0 4px 20px rgba(30, 64, 175, 0.2)",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📚</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "0.25rem" }}>Académicas</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{categoryCounts.ACADEMICA}</div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              borderRadius: "1rem",
              padding: "1.25rem",
              color: "white",
              boxShadow: "0 4px 20px rgba(124, 58, 237, 0.2)",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>💙</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "0.25rem" }}>Emocionales</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{categoryCounts.EMOCIONAL}</div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
              borderRadius: "1rem",
              padding: "1.25rem",
              color: "white",
              boxShadow: "0 4px 20px rgba(21, 128, 61, 0.2)",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📝</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "0.25rem" }}>Generales</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{categoryCounts.GENERAL}</div>
          </div>
        </div>
      )}

      {/* Filtro por categoría */}
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
        <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1f2937" }}>Historial de Observaciones</h3>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ObservationCategory | "ALL")}
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
          <option value="ALL">📂 Todas las categorías</option>
          <option value="ACADEMICA">📚 Académicas</option>
          <option value="EMOCIONAL">💙 Emocionales</option>
          <option value="GENERAL">📝 Generales</option>
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
            padding: "3rem",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
            borderRadius: "1rem",
            border: "2px dashed #d1d5db",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📭</div>
          <p style={{ color: "#6b7280", fontSize: "1.1rem", margin: 0, marginBottom: "0.5rem" }}>
            {categoryFilter === "ALL"
              ? "Aún no tienes observaciones registradas"
              : `No hay observaciones ${categoryLabel[categoryFilter]?.toLowerCase()}`}
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.9rem", margin: 0 }}>
            Tu tutor añadirá comentarios sobre tu progreso
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {filteredObservations.map((obs) => {
            const isHovered = hoveredId === obs.id;
            const config = categoryConfig[obs.category as ObservationCategory] || categoryConfig.GENERAL;

            return (
              <div
                key={obs.id}
                onMouseEnter={() => setHoveredId(obs.id)}
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
                    background: `linear-gradient(180deg, ${config.borderColor} 0%, ${config.color} 100%)`,
                  }}
                />

                <div style={{ display: "flex", gap: "1rem" }}>
                  {/* Icono de categoría */}
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "0.75rem",
                      background: config.bgColor,
                      border: `2px solid ${config.borderColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      flexShrink: 0,
                    }}
                  >
                    {config.icon}
                  </div>

                  {/* Contenido */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1f2937", fontWeight: 600 }}>
                        {obs.summary}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "0.5rem",
                          background: config.color,
                          color: "white",
                          fontWeight: 600,
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
