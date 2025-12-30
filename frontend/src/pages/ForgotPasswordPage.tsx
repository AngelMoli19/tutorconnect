import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, parseApiError } from "../api/client";

interface ForgotPasswordResponse {
  message: string;
}

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<ForgotPasswordResponse>("/auth/forgot-password", {
        identifier: identifier.trim(),
      });
      setMessage(data.message || "Si el usuario existe, enviaremos un correo con instrucciones.");
      setIdentifier("");
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-header">
          <div className="login-card-logo">
            <svg width="40" height="40" viewBox="0 0 20 20" fill="white">
              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1>Recuperar contraseña</h1>
          <p className="login-card-subtitle">
            Ingresa tu DNI o correo electrónico y te enviaremos instrucciones
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label htmlFor="identifier">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              DNI o Correo Electrónico
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Ej: 12345678 o correo@ejemplo.com"
              required
              autoComplete="username"
            />
          </div>

          {message && (
            <div className="alert alert-success">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <strong>¡Correo enviado!</strong>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", opacity: 0.9 }}>{message}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite" }}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" opacity="0.3" />
                  <path d="M10 2a8 8 0 018 8h-2a6 6 0 00-6-6V2z" />
                </svg>
                Enviando...
              </span>
            ) : (
              "Enviar instrucciones"
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
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>Nota importante:</strong>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Si no recibes el correo en unos minutos, verifica tu carpeta de spam o contacta al administrador del sistema.
              </p>
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
