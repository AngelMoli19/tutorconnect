import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ApiError } from "../api/client";

interface LocationState {
  from?: Location;
}
interface LoginLocationState {
  resetSuccess?: string;
}

export function LoginPage() {
  const { login, isAuthenticating } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = (location.state as LocationState | undefined)?.from?.pathname ?? "/";
  const resetMessage = (location.state as LoginLocationState | undefined)?.resetSuccess;
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const auth = await login({ dni: dni.trim(), password });
      const roleDefaultRoute: Record<string, string> = {
        ADMIN: "/usuarios",
        TUTOR: "/tutor/sesiones",
        TUTORANDO: "/tutorando",
      };
      const target = fromLocation === "/" ? roleDefaultRoute[auth.role] ?? "/" : fromLocation;
      navigate(target, { replace: true });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "No se pudo iniciar sesión.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-header">
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.375rem 0.875rem",
            background: "rgba(255, 255, 255, 0.12)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: "600",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.9)",
            marginBottom: "1.25rem",
            backdropFilter: "blur(10px)",
            animation: "fadeInDown 0.6s ease-out 0.2s both",
          }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            UNA Puno
          </div>
          <h1>Bienvenido a TutorConnect</h1>
          <p className="login-card-subtitle">Sistema de Gestión de Tutorías</p>
        </div>

        <form onSubmit={handleSubmit}>
          {resetMessage && (
            <div className="alert alert-success">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{resetMessage}</span>
            </div>
          )}

          <div className="form-control">
            <label htmlFor="dni">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              DNI / Usuario
            </label>
            <input
              id="dni"
              name="dni"
              type="text"
              value={dni}
              onChange={(event) => setDni(event.target.value)}
              placeholder="Ingrese su DNI"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-control">
            <label htmlFor="password">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingrese su contraseña"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255, 255, 255, 0.7)",
                  padding: "0.25rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255, 255, 255, 1)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)"}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={isAuthenticating}>
            {isAuthenticating ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite" }}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" opacity="0.3" />
                  <path d="M10 2a8 8 0 018 8h-2a6 6 0 00-6-6V2z" />
                </svg>
                Verificando...
              </span>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <div className="login-links">
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
