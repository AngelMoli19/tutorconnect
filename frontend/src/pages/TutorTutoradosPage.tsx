import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import { Modal } from "../components/Modal";
import type { AdminUser } from "../types/users";

const buildUserLabel = (user: AdminUser) =>
  `${user.profile.last_name_father} ${user.profile.last_name_mother}, ${user.profile.first_name}`.trim();

const matchesSearch = (user: AdminUser, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const name = buildUserLabel(user).toLowerCase();
  return name.includes(normalized) || user.dni.toLowerCase().includes(normalized);
};

export function TutorTutoradosPage() {
  const [tutorandos, setTutorandos] = useState<AdminUser[]>([]);
  const [selectedTutorando, setSelectedTutorando] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTutorandos() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<AdminUser[]>("/tutor/tutorandos");
        const sorted = [...data].sort((a, b) => buildUserLabel(a).localeCompare(buildUserLabel(b)));
        setTutorandos(sorted);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    fetchTutorandos();
  }, []);

  const filteredTutorandos = useMemo(
    () => tutorandos.filter((tutorando) => matchesSearch(tutorando, search)),
    [tutorandos, search],
  );

  const activeTutorandos = useMemo(() => tutorandos.filter((t) => t.is_active).length, [tutorandos]);

  return (
    <div className="table-wrapper">
      {/* Header compacto */}
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
            👥
          </div>
          <div>
            <h2 style={{ margin: 0, color: "white", fontSize: "1.25rem", fontWeight: 700 }}>
              Mis Tutorados
            </h2>
            <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.9)", fontSize: "0.8rem" }}>
              {tutorandos.length} {tutorandos.length === 1 ? "estudiante" : "estudiantes"} • {activeTutorandos} {activeTutorandos === 1 ? "activo" : "activos"}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar compacto */}
      <div
        style={{
          marginBottom: "1rem",
          position: "relative",
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "1.25rem",
              pointerEvents: "none",
              zIndex: 1,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
            }}
          >
            🔍
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            style={{
              width: "100%",
              padding: "0.875rem 3rem",
              borderRadius: "0.875rem",
              border: "2px solid rgba(8, 145, 178, 0.2)",
              fontSize: "0.95rem",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              outline: "none",
              fontWeight: 500,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--role-tutor-500)";
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(8, 145, 178, 0.2)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.background = "white";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(8, 145, 178, 0.2)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.05)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.85rem",
                color: "white",
                padding: "0.4rem 0.65rem",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)";
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Contenido */}
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
            className="spin-animation"
            style={{
              display: "inline-block",
              width: "50px",
              height: "50px",
              border: "4px solid #e5e7eb",
              borderTopColor: "var(--role-tutor-500)",
              borderRadius: "50%",
            }}
          />
          <p style={{ marginTop: "1rem", color: "#6b7280", fontSize: "1rem", fontWeight: 600 }}>Cargando tutorados...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: "1.5rem",
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            border: "2px solid #dc2626",
            borderRadius: "1rem",
            color: "#991b1b",
          }}
        >
          <strong style={{ fontSize: "1rem" }}>⚠️ Error:</strong> {error}
        </div>
      ) : filteredTutorandos.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
            borderRadius: "1rem",
            border: "2px dashed #d1d5db",
          }}
        >
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem", filter: "grayscale(0.3)" }}>📭</div>
          <p style={{ color: "#4b5563", fontSize: "1.1rem", margin: 0, marginBottom: "0.5rem", fontWeight: 700 }}>
            {search ? "No se encontraron tutorados" : "Aún no tienes tutorados asignados"}
          </p>
          {search && (
            <p style={{ color: "#9ca3af", fontSize: "0.95rem", margin: 0 }}>
              Intenta con otro término de búsqueda
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {filteredTutorandos.map((tutorando) => {
            const isHovered = hoveredId === tutorando.id;
            const isActive = tutorando.is_active;

            return (
              <div
                key={tutorando.id}
                className="tutorando-card"
                onMouseEnter={() => setHoveredId(tutorando.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: "white",
                  borderRadius: "1rem",
                  padding: "0",
                  border: isHovered ? "2px solid var(--role-tutor-400)" : "1px solid #e5e7eb",
                  boxShadow: isHovered
                    ? "0 12px 40px rgba(8, 145, 178, 0.18), 0 0 0 3px rgba(8, 145, 178, 0.05)"
                    : "0 2px 12px rgba(0, 0, 0, 0.05)",
                  transform: isHovered ? "translateY(-4px) scale(1.005)" : "translateY(0) scale(1)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Efecto de brillo en hover */}
                {isHovered && (
                  <div
                    className="shine-effect"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                      animation: "shine 1.5s infinite",
                    }}
                  />
                )}

                {/* Barra lateral con gradiente animado */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "6px",
                    background: isActive
                      ? "linear-gradient(180deg, var(--role-tutor-400) 0%, var(--role-tutor-600) 50%, var(--role-tutor-800) 100%)"
                      : "linear-gradient(180deg, #9ca3af 0%, #6b7280 100%)",
                    boxShadow: isActive ? "0 0 20px rgba(8, 145, 178, 0.5)" : "none",
                  }}
                />

                <div style={{ padding: "1.5rem", paddingLeft: "1.75rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
                  {/* Avatar con efecto 3D */}
                  <div
                    style={{
                      width: "65px",
                      height: "65px",
                      borderRadius: "1rem",
                      background: isActive
                        ? "linear-gradient(135deg, var(--role-tutor-400) 0%, var(--role-tutor-600) 100%)"
                        : "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.875rem",
                      color: "white",
                      fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: isActive
                        ? "0 8px 24px rgba(8, 145, 178, 0.35), inset 0 -2px 0 rgba(0, 0, 0, 0.2)"
                        : "0 8px 24px rgba(0, 0, 0, 0.12), inset 0 -2px 0 rgba(0, 0, 0, 0.2)",
                      transform: isHovered ? "scale(1.08) rotate(-5deg)" : "scale(1) rotate(0deg)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                    }}
                  >
                    {tutorando.profile.first_name.charAt(0).toUpperCase()}
                    {/* Ping indicator para activos */}
                    {isActive && (
                      <div
                        className="ping"
                        style={{
                          position: "absolute",
                          top: "-4px",
                          right: "-4px",
                          width: "16px",
                          height: "16px",
                          background: "#22c55e",
                          borderRadius: "50%",
                          border: "2.5px solid white",
                          boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.3)",
                        }}
                      />
                    )}
                  </div>

                  {/* Información */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem", flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#111827", fontWeight: 800, letterSpacing: "-0.3px" }}>
                        {buildUserLabel(tutorando)}
                      </h3>
                      <span
                        className={isActive ? "pulse-badge" : ""}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.4rem 0.9rem",
                          borderRadius: "0.75rem",
                          background: isActive
                            ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
                            : "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                          color: isActive ? "#15803d" : "#6b7280",
                          fontWeight: 700,
                          border: isActive ? "2px solid #22c55e" : "2px solid #9ca3af",
                          boxShadow: isActive ? "0 4px 12px rgba(34, 197, 94, 0.3)" : "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span style={{ fontSize: "0.9rem" }}>{isActive ? "✓" : "○"}</span>
                        {isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.625rem", marginBottom: "0.625rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          color: "#4b5563",
                          background: "rgba(8, 145, 178, 0.05)",
                          padding: "0.5rem 0.875rem",
                          borderRadius: "0.625rem",
                          border: "1px solid rgba(8, 145, 178, 0.1)",
                        }}
                      >
                        <span style={{ fontSize: "1.1rem" }}>🆔</span>
                        <span style={{ fontWeight: 600 }}>DNI: {tutorando.dni}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          color: "#4b5563",
                          background: "rgba(8, 145, 178, 0.05)",
                          padding: "0.5rem 0.875rem",
                          borderRadius: "0.625rem",
                          border: "1px solid rgba(8, 145, 178, 0.1)",
                        }}
                      >
                        <span style={{ fontSize: "1.1rem" }}>📋</span>
                        <span style={{ fontWeight: 600 }}>Código: {tutorando.enrollment_code ?? "-"}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.85rem",
                        color: "#6b7280",
                        background: "#f9fafb",
                        padding: "0.5rem 0.875rem",
                        borderRadius: "0.625rem",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>🏛️</span>
                      <span style={{ fontWeight: 500 }}>
                        {tutorando.profile.faculty} - {tutorando.profile.school}
                      </span>
                    </div>
                  </div>

                  {/* Botón con efecto glassmorphism */}
                  <button
                    onClick={() => setSelectedTutorando(tutorando)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      borderRadius: "0.75rem",
                      border: "none",
                      background: isHovered
                        ? "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-700) 100%)"
                        : "linear-gradient(135deg, var(--role-tutor-400) 0%, var(--role-tutor-600) 100%)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: isHovered
                        ? "0 8px 24px rgba(8, 145, 178, 0.4)"
                        : "0 4px 16px rgba(8, 145, 178, 0.25)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                    }}
                  >
                    Ver detalle
                    <span style={{ fontSize: "1.2rem" }}>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ultra moderno tipo Bento Box */}
      {selectedTutorando && (
        <Modal title="" onClose={() => setSelectedTutorando(null)}>
          <div>
            {/* Header con efecto parallax */}
            <div
              style={{
                background: "linear-gradient(135deg, var(--role-tutor-400) 0%, var(--role-tutor-600) 50%, var(--role-tutor-800) 100%)",
                borderRadius: "1.5rem",
                padding: "2.5rem",
                marginBottom: "2rem",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(8, 145, 178, 0.3)",
              }}
            >
              {/* Patrón de grid animado */}
              <div
                className="grid-animation"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: "20px 20px",
                }}
              />

              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div
                  style={{
                    width: "90px",
                    height: "90px",
                    borderRadius: "1.75rem",
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.5rem",
                    color: "white",
                    fontWeight: 900,
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
                    border: "2px solid rgba(255, 255, 255, 0.15)",
                  }}
                >
                  {selectedTutorando.profile.first_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "white", fontSize: "2rem", fontWeight: 900, textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)", letterSpacing: "-0.5px" }}>
                    {buildUserLabel(selectedTutorando)}
                  </h3>
                  <p style={{ margin: "0.5rem 0 0 0", color: "rgba(255, 255, 255, 0.95)", fontSize: "1.1rem", textShadow: "0 1px 3px rgba(0, 0, 0, 0.3)" }}>
                    Información Completa del Estudiante
                  </p>
                </div>
              </div>
            </div>

            {/* Categorías de información - Diseño Bento Box asimétrico */}
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* Sección: Información Personal */}
              <div>
                <h4
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>👤</span>
                  Información Personal
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  <InfoCard label="Nombre" value={buildUserLabel(selectedTutorando)} icon="👤" color="#6366f1" />
                  <InfoCard label="DNI" value={selectedTutorando.dni} icon="🆔" color="#8b5cf6" />
                  <InfoCard label="Código" value={selectedTutorando.enrollment_code ?? "-"} icon="📋" color="#ec4899" />
                  <InfoCard label="Nacimiento" value={selectedTutorando.profile.birthdate} icon="🎂" color="#f59e0b" />
                  <InfoCard label="Sexo" value={selectedTutorando.profile.gender} icon="⚥" color="#10b981" />
                  <InfoCard
                    label="Estado"
                    value={selectedTutorando.is_active ? "Activo" : "Inactivo"}
                    icon={selectedTutorando.is_active ? "✅" : "○"}
                    color={selectedTutorando.is_active ? "#22c55e" : "#9ca3af"}
                    highlight={selectedTutorando.is_active}
                  />
                </div>
              </div>

              {/* Sección: Contacto */}
              <div>
                <h4
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>📞</span>
                  Contacto
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  <InfoCard label="Correo" value={selectedTutorando.profile.email} icon="📧" color="#0ea5e9" />
                  <InfoCard label="Teléfono" value={selectedTutorando.profile.phone} icon="📱" color="#06b6d4" />
                  <InfoCard label="Dirección" value={selectedTutorando.profile.address} icon="🏠" color="#14b8a6" span={2} />
                </div>
              </div>

              {/* Sección: Académico */}
              <div>
                <h4
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>🎓</span>
                  Información Académica
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  <InfoCard label="Facultad" value={selectedTutorando.profile.faculty} icon="🏛️" color="#f59e0b" span={2} />
                  <InfoCard label="Escuela" value={selectedTutorando.profile.school} icon="🎓" color="#f97316" span={2} />
                </div>
              </div>

              {/* Sección: Ubicación */}
              <div>
                <h4
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>📍</span>
                  Ubicación
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  <InfoCard label="Departamento" value={selectedTutorando.profile.department} icon="📍" color="#ef4444" />
                  <InfoCard label="Provincia" value={selectedTutorando.profile.province} icon="🗺️" color="#f43f5e" />
                  <InfoCard label="Distrito" value={selectedTutorando.profile.district} icon="📌" color="#ec4899" />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Animaciones CSS */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .spin-animation {
            animation: spin 1s linear infinite;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); }
            50% { transform: translateY(-20px) translateX(10px); }
          }

          .float-animation {
            animation: float 6s ease-in-out infinite;
          }

          .float-animation-reverse {
            animation: float 8s ease-in-out infinite reverse;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.95); }
          }

          .pulse-animation {
            animation: pulse 2s ease-in-out infinite;
          }

          @keyframes pulse-badge {
            0%, 100% { box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3); }
            50% { box-shadow: 0 4px 20px rgba(34, 197, 94, 0.5); }
          }

          .pulse-badge {
            animation: pulse-badge 2s ease-in-out infinite;
          }

          @keyframes ping {
            0% { transform: scale(1); opacity: 1; }
            75%, 100% { transform: scale(2); opacity: 0; }
          }

          .ping::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 50%;
            background: #22c55e;
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          }

          @keyframes shine {
            to { left: 200%; }
          }

          .stat-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .stat-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
          }

          @keyframes grid-move {
            0% { transform: translateY(0); }
            100% { transform: translateY(20px); }
          }

          .grid-animation {
            animation: grid-move 2s ease-in-out infinite alternate;
          }

          .tutorando-card::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, transparent, rgba(8, 145, 178, 0.1), transparent);
            border-radius: 1rem;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: -1;
          }

          .tutorando-card:hover::before {
            opacity: 1;
          }
        `}
      </style>
    </div>
  );
}

// Componente InfoCard para el modal
function InfoCard({
  label,
  value,
  icon,
  color,
  span,
  highlight,
}: {
  label: string;
  value: string | number;
  icon?: string;
  color: string;
  span?: number;
  highlight?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: "1.5rem",
        background: isHovered
          ? `linear-gradient(135deg, ${color}10 0%, ${color}20 100%)`
          : "white",
        borderRadius: "1.25rem",
        border: isHovered ? `2px solid ${color}` : "2px solid #f3f4f6",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: isHovered
          ? `0 12px 30px ${color}30`
          : "0 2px 8px rgba(0, 0, 0, 0.04)",
        gridColumn: span ? `span ${span}` : "auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Efecto de fondo al hacer hover */}
      {isHovered && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100px",
            height: "100px",
            background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
            borderRadius: "50%",
            transform: "translate(30%, -30%)",
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          {icon && (
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.75rem",
                background: `linear-gradient(135deg, ${color}20, ${color}30)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                transform: isHovered ? "rotate(-10deg) scale(1.1)" : "rotate(0deg) scale(1)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {icon}
            </div>
          )}
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: color,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            fontWeight: 700,
            color: "#111827",
            fontSize: "1.125rem",
            lineHeight: "1.5",
            wordBreak: "break-word",
          }}
        >
          {value}
        </div>
      </div>

      {/* Badge de highlight */}
      {highlight && (
        <div
          className="pulse-animation"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            width: "12px",
            height: "12px",
            background: color,
            borderRadius: "50%",
            boxShadow: `0 0 0 4px ${color}30`,
          }}
        />
      )}
    </div>
  );
}
