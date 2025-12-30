import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, parseApiError } from "../api/client";

interface ResetPasswordResponse {
  message: string;
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "", color: "" });

  const evaluatePasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strengths = [
      { score: 0, label: "", color: "" },
      { score: 1, label: "Muy débil", color: "#EF4444" },
      { score: 2, label: "Débil", color: "#F59E0B" },
      { score: 3, label: "Aceptable", color: "#F59E0B" },
      { score: 4, label: "Fuerte", color: "#10B981" },
      { score: 5, label: "Muy fuerte", color: "#10B981" },
    ];

    return strengths[score];
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    if (value) {
      setPasswordStrength(evaluatePasswordStrength(value));
    } else {
      setPasswordStrength({ score: 0, label: "", color: "" });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post<ResetPasswordResponse>("/auth/reset-password", {
        token: token.trim(),
        new_password: newPassword,
      });
      const successMessage = data.message || "Contraseña actualizada correctamente.";
      navigate("/login", { state: { resetSuccess: successMessage } });
      return;
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const passwordsMatch = confirmPassword && newPassword === confirmPassword;
  const passwordsDontMatch = confirmPassword && newPassword !== confirmPassword;

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: "520px" }}>
        <div className="login-card-header">
          <div className="login-card-logo">
            <svg width="40" height="40" viewBox="0 0 20 20" fill="white">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1>Nueva contraseña</h1>
          <p className="login-card-subtitle">
            Crea una contraseña segura para tu cuenta
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label htmlFor="token">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Token de Recuperación
            </label>
            <input
              id="token"
              name="token"
              type="text"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Token recibido por correo"
              required
            />
          </div>

          <div className="form-control">
            <label htmlFor="new-password">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Nueva Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="new-password"
                name="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => handlePasswordChange(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
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
                aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showNewPassword ? (
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
            {passwordStrength.label && (
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{
                  height: "4px",
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "9999px",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    background: passwordStrength.color,
                    transition: "all 0.3s ease",
                  }} />
                </div>
                <p style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.8rem",
                  color: passwordStrength.color,
                  fontWeight: 600,
                }}>
                  Seguridad: {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          <div className="form-control">
            <label htmlFor="confirm-password">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Confirmar Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repite tu contraseña"
                required
                autoComplete="new-password"
                style={{
                  borderBottomColor: passwordsMatch
                    ? "rgba(16, 185, 129, 0.9)"
                    : passwordsDontMatch
                    ? "rgba(239, 68, 68, 0.9)"
                    : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? (
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
            {passwordsMatch && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#10B981", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Las contraseñas coinciden
              </p>
            )}
            {passwordsDontMatch && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#EF4444", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Las contraseñas no coinciden
              </p>
            )}
          </div>

          {error && (
            <div className="alert alert-error">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={submitting || !passwordsMatch}>
            {submitting ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite" }}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" opacity="0.3" />
                  <path d="M10 2a8 8 0 018 8h-2a6 6 0 00-6-6V2z" />
                </svg>
                Guardando...
              </span>
            ) : (
              "Actualizar contraseña"
            )}
          </button>
        </form>

        <div className="login-links">
          <Link to="/login">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver al inicio de sesión
          </Link>
        </div>

        <div className="glass-panel" style={{ marginTop: "2rem", fontSize: "0.875rem" }}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0, marginTop: "0.125rem" }}>
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>Consejos de seguridad:</strong>
              <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem", opacity: 0.9 }}>
                <li>Usa al menos 8 caracteres</li>
                <li>Combina mayúsculas, minúsculas y números</li>
                <li>Incluye caracteres especiales (!@#$%)</li>
                <li>No uses información personal</li>
              </ul>
            </div>
          </div>
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
