import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import type { AdminUser } from "../types/users";

export function TutorProfilePage() {
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<AdminUser>("/tutor/profile");
        setProfile(data);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        gap: "1rem"
      }}>
        <div style={{
          width: "48px",
          height: "48px",
          border: "4px solid var(--gray-200)",
          borderTop: "4px solid var(--role-tutor-500)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <p style={{
          margin: 0,
          fontSize: "1rem",
          color: "var(--gray-600)",
          fontWeight: "500"
        }}>Cargando perfil...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: "2rem",
        background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
        borderRadius: "1rem",
        border: "1px solid #fecaca",
        display: "flex",
        alignItems: "center",
        gap: "1rem"
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p style={{ margin: 0, color: "#dc2626", fontWeight: "500" }}>{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        padding: "2rem",
        background: "var(--gray-50)",
        borderRadius: "1rem",
        textAlign: "center",
        color: "var(--gray-600)"
      }}>
        <p style={{ margin: 0 }}>No se pudo cargar el perfil.</p>
      </div>
    );
  }

  const profileData = profile.profile;
  const fullName = `${profileData.first_name} ${profileData.last_name_father} ${profileData.last_name_mother}`.trim();
  const initials = `${profileData.first_name?.[0] || ''}${profileData.last_name_father?.[0] || ''}`.toUpperCase();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "2rem",
      paddingBottom: "2rem"
    }}>
      {/* Header Section with Gradient */}
      <div style={{
        background: "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-600) 100%)",
        borderRadius: "1.5rem",
        padding: "2.5rem",
        color: "white",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 10px 40px -10px rgba(6, 182, 212, 0.3)"
      }}>
        {/* Decorative circles */}
        <div style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.1)",
          filter: "blur(40px)"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-30px",
          left: "-30px",
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.08)",
          filter: "blur(30px)"
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "2rem" }}>
          {/* Avatar */}
          <div style={{
            width: "100px",
            height: "100px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            border: "3px solid rgba(255, 255, 255, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
            fontWeight: "700",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            flexShrink: 0
          }}>
            {initials}
          </div>

          {/* User Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 0.875rem",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              borderRadius: "2rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              marginBottom: "0.75rem",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
              Tutor
            </div>
            <h1 style={{
              margin: "0 0 0.5rem 0",
              fontSize: "2rem",
              fontWeight: "700",
              letterSpacing: "-0.025em",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
            }}>
              {fullName}
            </h1>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "1rem",
              opacity: 0.95
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              {profileData.email}
            </div>
          </div>

          {/* Status Badge */}
          <div style={{
            padding: "1rem 1.5rem",
            background: profile.is_active
              ? "rgba(16, 185, 129, 0.2)"
              : "rgba(239, 68, 68, 0.2)",
            backdropFilter: "blur(10px)",
            borderRadius: "1rem",
            border: `2px solid ${profile.is_active ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            textAlign: "center",
            flexShrink: 0
          }}>
            <div style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              opacity: 0.9,
              marginBottom: "0.25rem"
            }}>
              Estado
            </div>
            <div style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              justifyContent: "center"
            }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: profile.is_active ? "#10b981" : "#ef4444",
                boxShadow: profile.is_active
                  ? "0 0 10px rgba(16, 185, 129, 0.5)"
                  : "0 0 10px rgba(239, 68, 68, 0.5)"
              }} />
              {profile.is_active ? "Activo" : "Inactivo"}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <div style={{
        background: "var(--white)",
        borderRadius: "1.5rem",
        padding: "2rem",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
        border: "1px solid var(--gray-200)"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "2px solid var(--gray-100)"
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--role-tutor-500), var(--role-tutor-600))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            boxShadow: "0 4px 12px rgba(6, 182, 212, 0.2)"
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: "700",
            color: "var(--gray-900)",
            letterSpacing: "-0.025em"
          }}>
            Datos Personales
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem"
        }}>
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" /></svg>}
            label="DNI"
            value={profile.dni}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>}
            label="Correo"
            value={profileData.email}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>}
            label="Teléfono"
            value={profileData.phone}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg>}
            label="Facultad"
            value={profileData.faculty}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg>}
            label="Escuela"
            value={profileData.school}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>}
            label="Departamento"
            value={profileData.department}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
            label="Provincia"
            value={profileData.province}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
            label="Distrito"
            value={profileData.district}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" /></svg>}
            label="Dirección"
            value={profileData.address}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
            label="Nacimiento"
            value={profileData.birthdate}
          />
          <InfoRow
            icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
            label="Sexo"
            value={profileData.gender}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        padding: "1.25rem",
        background: isHovered ? "var(--gray-50)" : "var(--white)",
        borderRadius: "12px",
        border: "1px solid var(--gray-200)",
        transition: "all 0.2s",
        cursor: "default",
        boxShadow: isHovered
          ? "0 4px 12px rgba(0, 0, 0, 0.08)"
          : "0 1px 2px rgba(0, 0, 0, 0.05)"
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.875rem",
        color: "var(--gray-600)",
        marginBottom: "0.5rem",
        fontWeight: "500"
      }}>
        {icon && <span style={{ color: "var(--role-tutor-500)" }}>{icon}</span>}
        {label}
      </div>
      <div style={{
        fontWeight: 600,
        color: "var(--gray-900)",
        fontSize: "1rem",
        wordBreak: "break-word"
      }}>
        {value}
      </div>
    </div>
  );
}
