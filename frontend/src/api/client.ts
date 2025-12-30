import axios from "axios";
import { clearAuth, loadAuth } from "../utils/auth-storage";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const auth = loadAuth();
  if (auth?.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        clearAuth();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export interface ApiError {
  message: string;
  status?: number;
}

export function parseApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    return {
      status: error.response?.status,
      message:
        typeof detail === "string"
          ? detail
          : Array.isArray(detail) && detail.length > 0
          ? detail[0].msg ?? "Error inesperado."
          : "No se pudo completar la solicitud. Intente nuevamente.",
    };
  }

  return {
    message: "Error desconocido. Verifique su conexion e intente nuevamente.",
  };
}
