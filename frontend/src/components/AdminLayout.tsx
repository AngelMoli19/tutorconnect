import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import type { AdminUser } from "../types/users";

const navByRole: Record<string, { to: string; label: string; icon: ReactElement }[]> = {
  ADMIN: [
    {
      to: "/usuarios",
      label: "Usuarios",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
    },
    {
      to: "/asignaciones",
      label: "Asignaciones",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
    },
    {
      to: "/reportes",
      label: "Reportes",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
    },
  ],
  TUTOR: [
    {
      to: "/tutor/sesiones",
      label: "Sesiones",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
    },
    {
      to: "/tutor/tutorandos",
      label: "Mis Tutorados",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
    },
    {
      to: "/tutor/asistencia",
      label: "Asistencia",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg>
    },
    {
      to: "/tutor/recursos",
      label: "Recursos",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
    },
    {
      to: "/tutor/observaciones",
      label: "Observaciones",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
    },
    {
      to: "/tutor/chat",
      label: "Chat",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
    },
  ],
  TUTORANDO: [
    {
      to: "/tutorando/sesiones",
      label: "Sesiones",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
    },
    {
      to: "/tutorando/asistencia",
      label: "Asistencia",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg>
    },
    {
      to: "/tutorando/recursos",
      label: "Recursos",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
    },
    {
      to: "/tutorando/observaciones",
      label: "Observaciones",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
    },
    {
      to: "/tutorando/chat",
      label: "Chat",
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
    },
  ],
};

interface TutorandoProfileResponse {
  tutorando: AdminUser;
}

export function AdminLayout() {
  const { logout, auth } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState<{ name: string; email: string } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const roleLabel =
    auth?.role === "ADMIN"
      ? "Administrador"
      : auth?.role === "TUTOR"
        ? "Tutor"
        : auth?.role === "TUTORANDO"
          ? "Tutorado"
          : "Usuario";
  const profileRoute = auth?.role === "TUTOR" ? "/tutor/perfil" : auth?.role === "TUTORANDO" ? "/tutorando/perfil" : "/";
  const profileLinkLabel = auth?.role === "ADMIN" ? "Panel" : "Mi perfil";
  const displayName = profileInfo?.name || roleLabel;
  const displayEmail = profileInfo?.email || "";
  const avatarInitial = useMemo(() => (displayName ? displayName.trim()[0]?.toUpperCase() : "U"), [displayName]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!auth?.token || !auth?.role) return;
    let isActive = true;

    const fetchProfile = async () => {
      try {
        if (auth.role === "TUTOR") {
          const { data } = await api.get<AdminUser>("/tutor/profile");
          const name = `${data.profile.first_name} ${data.profile.last_name_father} ${data.profile.last_name_mother}`.trim();
          if (isActive) {
            setProfileInfo({ name, email: data.profile.email });
          }
        } else if (auth.role === "TUTORANDO") {
          const { data } = await api.get<TutorandoProfileResponse>("/tutorando/profile");
          const tutorando = data.tutorando;
          const name = `${tutorando.profile.first_name} ${tutorando.profile.last_name_father} ${tutorando.profile.last_name_mother}`.trim();
          if (isActive) {
            setProfileInfo({ name, email: tutorando.profile.email });
          }
        } else {
          const { data } = await api.get<AdminUser>("/admin/profile");
          const name = `${data.profile.first_name} ${data.profile.last_name_father} ${data.profile.last_name_mother}`.trim();
          if (isActive) {
            setProfileInfo({ name, email: data.profile.email });
          }
        }
      } catch {
        if (isActive) {
          setProfileInfo(null);
        }
      }
    };

    fetchProfile();

    return () => {
      isActive = false;
    };
  }, [auth?.role, auth?.token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <aside className={`app-sidebar app-sidebar--${auth?.role?.toLowerCase() ?? 'admin'}`}>
        <div className="app-sidebar__header">
          <div className="app-sidebar__logo">
            <img
              src="/logo.png"
              alt="TutorConnect Logo"
              className="app-sidebar__logo-icon"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain"
              }}
            />
          </div>
          <div className="app-sidebar__role-badge">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              {auth?.role === "ADMIN" ? (
                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
              ) : auth?.role === "TUTOR" ? (
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              ) : (
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              )}
            </svg>
            {auth?.role === "ADMIN" ? "Administrador" : auth?.role === "TUTOR" ? "Tutor" : "Tutorado"}
          </div>
        </div>

        <nav>
          {(navByRole[auth?.role ?? "ADMIN"] || navByRole.ADMIN).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-content">
        <header className="app-header" style={{
          background: "var(--white)",
          padding: "1rem 2rem 1rem 2rem",
          borderBottom: "1px solid var(--gray-200)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
            {/* Left side - Title and subtitle */}
            <div style={{ flex: 1 }}>
              <h1 style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "var(--gray-900)",
                letterSpacing: "-0.01em",
                lineHeight: "1.2"
              }}>
                {auth?.role === "ADMIN" ? "Panel de Administración" :
                 auth?.role === "TUTOR" ? "Portal del Tutor" :
                 "Portal del Estudiante"}
              </h1>
              <p style={{
                margin: "0.25rem 0 0 0",
                fontSize: "0.8125rem",
                color: "var(--gray-600)",
                fontWeight: "500"
              }}>
                Sistema de Gestión de Tutorías Universitarias
              </p>
            </div>

            {/* Right side - User profile */}
            <div style={{ position: "relative", marginLeft: "auto" }}>
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.5rem 0.75rem",
                border: "1px solid var(--gray-200)",
                borderRadius: "10px",
                background: menuOpen ? "var(--gray-50)" : "var(--white)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: menuOpen ? "0 0 0 3px rgba(8, 145, 178, 0.1)" : "none"
              }}
              onMouseEnter={(e) => {
                if (!menuOpen) {
                  e.currentTarget.style.background = "var(--gray-50)";
                }
              }}
              onMouseLeave={(e) => {
                if (!menuOpen) {
                  e.currentTarget.style.background = "var(--white)";
                }
              }}
            >
              {/* User info text */}
              <div style={{ textAlign: "right", minWidth: "120px" }}>
                <div style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--gray-900)",
                  lineHeight: "1.2",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "150px"
                }}>
                  {displayName}
                </div>
                <div style={{
                  fontSize: "0.75rem",
                  color: "var(--gray-600)",
                  fontWeight: "500",
                  marginTop: "2px"
                }}>
                  {roleLabel}
                </div>
              </div>

              {/* Avatar circle */}
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: `linear-gradient(135deg, var(--role-${auth?.role?.toLowerCase() ?? 'admin'}-500), var(--role-${auth?.role?.toLowerCase() ?? 'admin'}-600))`,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                fontWeight: "700",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
              }}>
                {avatarInitial}
              </div>

              {/* Chevron icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{
                  color: "var(--gray-400)",
                  transition: "transform 0.2s ease",
                  transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)"
                }}
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {menuOpen && (
              <>
                {/* Backdrop */}
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.2)",
                    backdropFilter: "blur(2px)",
                    zIndex: 999,
                    animation: "fadeIn 0.2s ease-out"
                  }}
                  onClick={() => setMenuOpen(false)}
                />

                {/* Menu */}
                <div
                  ref={menuRef}
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "320px",
                    background: "var(--white)",
                    borderRadius: "16px",
                    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)",
                    overflow: "hidden",
                    zIndex: 1000,
                    animation: "slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                >
                  {/* Header - Clean design */}
                  <div style={{
                    padding: "1.5rem",
                    borderBottom: "1px solid var(--gray-100)"
                  }}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      {/* Avatar */}
                      <div style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "12px",
                        background: `linear-gradient(135deg, var(--role-${auth?.role?.toLowerCase() ?? 'admin'}-500), var(--role-${auth?.role?.toLowerCase() ?? 'admin'}-600))`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        color: "white",
                        flexShrink: 0,
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                      }}>
                        {avatarInitial}
                      </div>

                      {/* User Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: "var(--gray-900)",
                          marginBottom: "0.25rem",
                          lineHeight: "1.3",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {displayName}
                        </div>
                        {displayEmail && (
                          <div style={{
                            fontSize: "0.8125rem",
                            color: "var(--gray-600)",
                            marginBottom: "0.5rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {displayEmail}
                          </div>
                        )}
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.25rem 0.625rem",
                          background: `var(--role-${auth?.role?.toLowerCase() ?? 'admin'}-50)`,
                          border: `1px solid var(--role-${auth?.role?.toLowerCase() ?? 'admin'}-200)`,
                          borderRadius: "6px",
                          fontSize: "0.6875rem",
                          fontWeight: "600",
                          color: `var(--role-${auth?.role?.toLowerCase() ?? 'admin'}-700)`,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em"
                        }}>
                          <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                            {auth?.role === "ADMIN" ? (
                              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                            ) : auth?.role === "TUTOR" ? (
                              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                            ) : (
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            )}
                          </svg>
                          {roleLabel}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(profileRoute);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        background: "transparent",
                        border: "none",
                        borderRadius: "10px",
                        color: "var(--gray-900)",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        textAlign: "left"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--gray-50)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: `var(--role-${auth?.role?.toLowerCase() ?? 'admin'}-50)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: `var(--role-${auth?.role?.toLowerCase() ?? 'admin'}-600)`,
                        flexShrink: 0
                      }}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>{profileLinkLabel}</span>
                    </button>

                    {/* Divider */}
                    <div style={{
                      height: "1px",
                      background: "var(--gray-100)",
                      margin: "0.5rem 0"
                    }} />

                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        background: "transparent",
                        border: "none",
                        borderRadius: "10px",
                        color: "#dc2626",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        textAlign: "left"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fef2f2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "#fef2f2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#dc2626",
                        flexShrink: 0
                      }}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>

                <style>{`
                  @keyframes fadeIn {
                    from {
                      opacity: 0;
                    }
                    to {
                      opacity: 1;
                    }
                  }

                  @keyframes slideDown {
                    from {
                      opacity: 0;
                      transform: translateY(-10px) scale(0.95);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0) scale(1);
                    }
                  }
                `}</style>
              </>
            )}
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
