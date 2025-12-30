import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./styles/fullcalendar.css";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("No se encontro el elemento root en index.html");
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
