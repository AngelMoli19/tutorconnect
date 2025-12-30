import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import { Modal } from "../components/Modal";
import type { AttendanceEntry, AttendanceStatus, AttendanceUpdatePayload } from "../types/attendance";
import type { SessionItem, SessionStatus } from "../types/sessions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  JUSTIFIED: "Justificado",
};

const sessionStatusLabels: Record<SessionStatus, string> = {
  SCHEDULED: "Programada",
  COMPLETED: "Completada",
  CANCELED: "Cancelada",
};

const statusColors: Record<AttendanceStatus, { bg: string; border: string; text: string; icon: string }> = {
  PRESENT: { bg: "#dcfce7", border: "#16a34a", text: "#15803d", icon: "✓" },
  ABSENT: { bg: "#fee2e2", border: "#dc2626", text: "#991b1b", icon: "✗" },
  JUSTIFIED: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309", icon: "!" },
};

export function TutorAttendancePage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceEntry[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SessionStatus | "ALL">("ALL");
  const [attendanceBySession, setAttendanceBySession] = useState<Record<string, boolean>>({});
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<SessionItem[]>("/tutor/sessions");
        setSessions(data);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    if (filterStatus === "ALL") return sessions;
    return sessions.filter((session) => session.status === filterStatus);
  }, [sessions, filterStatus]);

  const openAttendance = async (session: SessionItem) => {
    setSelectedSession(session);
    setAttendanceLoading(true);
    setAttendanceError(null);
    setAttendanceSuccess(null);
    try {
      const { data } = await api.get<AttendanceEntry[]>(`/tutor/sessions/${session.id}/attendance`);
      setAttendanceEntries(data);
      const hasAttendance = data.some((entry) => Boolean(entry.status));
      setAttendanceBySession((prev) => ({ ...prev, [session.id]: hasAttendance }));
    } catch (err) {
      setAttendanceError(parseApiError(err).message);
      setAttendanceEntries([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleEntryChange = (index: number, status: AttendanceStatus | "") => {
    setAttendanceEntries((prev) => {
      const next = [...prev];
      const entry = { ...next[index] };
      entry.status = status || undefined;
      next[index] = entry;
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedSession) return;
    setAttendanceSuccess(null);
    const entries = attendanceEntries
      .filter((entry) => Boolean(entry.status))
      .map((entry) => ({
        tutorando_id: entry.tutorando.id,
        status: entry.status as AttendanceStatus,
      }));

    if (entries.length === 0) {
      setAttendanceError("Selecciona al menos una asistencia para guardar.");
      return;
    }

    setSaving(true);
    setAttendanceError(null);
    try {
      const payload: AttendanceUpdatePayload = { entries };
      const { data } = await api.put<AttendanceEntry[]>(`/tutor/sessions/${selectedSession.id}/attendance`, payload);
      setAttendanceEntries(data);
      setAttendanceBySession((prev) => ({ ...prev, [selectedSession.id]: true }));
      setAttendanceSuccess("Asistencia guardada correctamente.");
      setTimeout(() => setSelectedSession(null), 1500);
    } catch (err) {
      setAttendanceError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const attendanceStats = useMemo(() => {
    const stats = { present: 0, absent: 0, justified: 0 };
    attendanceEntries.forEach((entry) => {
      if (entry.status === "PRESENT") stats.present++;
      else if (entry.status === "ABSENT") stats.absent++;
      else if (entry.status === "JUSTIFIED") stats.justified++;
    });
    return stats;
  }, [attendanceEntries]);

  const exportToPDF = async () => {
    if (!selectedSession) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Colores del tema
    const primaryColor: [number, number, number] = [8, 145, 178]; // RGB para var(--role-tutor-500)
    const darkGray: [number, number, number] = [55, 65, 81];
    const lightGray: [number, number, number] = [156, 163, 175];

    // Header con gradiente simulado usando rectángulos
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 45, "F");

    // Cargar y agregar logo de TutorConnect
    try {
      const img = new Image();
      img.src = "/logo.png";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Agregar logo sin fondo
            doc.addImage(img, "PNG", 15, 12, 20, 20);
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error("Failed to load logo"));
      });
    } catch (error) {
      // Si falla la carga del logo, continuar sin él
      console.warn("No se pudo cargar el logo:", error);
    }

    // Título principal
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("TutorConnect", 40, 22);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema de Gestión de Tutorías", 40, 30);

    // Fecha de generación
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255, 0.9);
    const currentDate = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    doc.text(`Generado: ${currentDate}`, pageWidth - 15, 22, { align: "right" });

    // Título del documento
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Asistencia", 15, 60);

    // Información de la sesión
    let yPos = 72;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("Información de la Sesión", 15, yPos);

    // Box con información de la sesión
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, yPos + 3, pageWidth - 30, 32, 2, 2, "FD");

    yPos += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("Sesión:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(selectedSession.title, 45, yPos);

    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Fecha:", 20, yPos);
    doc.setFont("helvetica", "normal");
    const sessionDate = new Date(selectedSession.scheduled_at).toLocaleString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    doc.text(sessionDate, 45, yPos);

    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Tipo:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(selectedSession.scope === "GENERAL" ? "Sesión General" : "Sesión Personalizada", 45, yPos);

    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Estado:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(sessionStatusLabels[selectedSession.status as SessionStatus] || selectedSession.status, 45, yPos);

    // Tabla de asistencia
    yPos += 15;
    const tableData = attendanceEntries.map((entry) => [
      entry.tutorando.dni,
      `${entry.tutorando.profile.last_name_father} ${entry.tutorando.profile.last_name_mother}`,
      entry.tutorando.profile.first_name,
      entry.status ? statusLabels[entry.status as AttendanceStatus] : "Sin registrar",
      entry.updated_at
        ? new Date(entry.updated_at).toLocaleString("es-ES", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "-"
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["DNI", "Apellidos", "Nombres", "Estado", "Actualizado"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center"
      },
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        halign: "left"
      },
      columnStyles: {
        0: { cellWidth: 25, halign: "center" },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30, halign: "center" },
        4: { cellWidth: 35, halign: "center" }
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const status = attendanceEntries[data.row.index].status;
          if (status === "PRESENT") {
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fontStyle = "bold";
          } else if (status === "ABSENT") {
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = "bold";
          } else if (status === "JUSTIFIED") {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [107, 114, 128];
          }
        }
      }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
    if (finalY < pageHeight - 30) {
      doc.setFontSize(8);
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setFont("helvetica", "italic");
      doc.text(
        "Este documento fue generado automáticamente por TutorConnect",
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );

      // Número de página
      doc.setFont("helvetica", "normal");
      doc.text(
        `Página 1`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Guardar PDF
    const filename = `Asistencia_${selectedSession.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="table-wrapper">
      {/* Header compacto y moderno */}
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
            ✓
          </div>
          <div>
            <h2 style={{ margin: 0, color: "white", fontSize: "1.25rem", fontWeight: 700 }}>
              Registro de Asistencia
            </h2>
            <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.9)", fontSize: "0.8rem" }}>
              {sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"} registradas
            </p>
          </div>
        </div>
      </div>

      {/* Filtro moderno */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1f2937" }}>Sesiones Programadas</h3>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as SessionStatus | "ALL")}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: "0.75rem",
            border: "2px solid var(--role-tutor-500)",
            fontSize: "0.9rem",
            fontWeight: 500,
            color: "var(--role-tutor-700)",
            background: "white",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.2s",
          }}
        >
          <option value="ALL">📚 Todas las sesiones</option>
          <option value="SCHEDULED">📅 Programadas</option>
          <option value="COMPLETED">✅ Completadas</option>
          <option value="CANCELED">❌ Canceladas</option>
        </select>
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
            style={{
              display: "inline-block",
              width: "50px",
              height: "50px",
              border: "4px solid #e5e7eb",
              borderTopColor: "var(--role-tutor-500)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ marginTop: "1rem", color: "#6b7280", fontSize: "1rem" }}>Cargando sesiones...</p>
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
      ) : filteredSessions.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
            borderRadius: "1rem",
            border: "2px dashed #d1d5db",
          }}
        >
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📭</div>
          <p style={{ color: "#4b5563", fontSize: "1.1rem", margin: 0 }}>
            {filterStatus === "ALL" ? "No hay sesiones registradas" : `No hay sesiones ${sessionStatusLabels[filterStatus]?.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {filteredSessions.map((session) => {
            const isHovered = hoveredSessionId === session.id;
            const hasAttendance = attendanceBySession[session.id];
            const statusConfig = {
              SCHEDULED: { bg: "#dbeafe", border: "#2c5f8d", text: "#1e3a8a", icon: "🔵" },
              COMPLETED: { bg: "#dcfce7", border: "#16a34a", text: "#15803d", icon: "✅" },
              CANCELED: { bg: "#f3f4f6", border: "#9ca3af", text: "#6b7280", icon: "❌" },
            };
            const config = statusConfig[session.status as SessionStatus] || statusConfig.SCHEDULED;

            return (
              <div
                key={session.id}
                onMouseEnter={() => setHoveredSessionId(session.id)}
                onMouseLeave={() => setHoveredSessionId(null)}
                style={{
                  background: "white",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  border: `1px solid ${isHovered ? config.border : "#e5e7eb"}`,
                  boxShadow: isHovered
                    ? "0 12px 40px rgba(8, 145, 178, 0.18), 0 0 0 3px rgba(8, 145, 178, 0.05)"
                    : "0 2px 12px rgba(0, 0, 0, 0.05)",
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
                {/* Barra lateral de color */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "5px",
                    background: `linear-gradient(180deg, ${config.border} 0%, ${config.border}99 100%)`,
                  }}
                />

                {/* Información de la sesión */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem", flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0, fontSize: "1.15rem", color: "#111827", fontWeight: 700 }}>
                      {session.title}
                    </h4>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.3rem 0.7rem",
                        borderRadius: "0.5rem",
                        background: config.bg,
                        color: config.text,
                        fontWeight: 700,
                        border: `2px solid ${config.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <span>{config.icon}</span>
                      {sessionStatusLabels[session.status as SessionStatus]}
                    </span>
                    {hasAttendance && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.3rem 0.7rem",
                          borderRadius: "0.5rem",
                          background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
                          color: "#15803d",
                          fontWeight: 700,
                          border: "2px solid #22c55e",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span>✓</span>
                        Registrado
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>📅</span>
                    <span style={{ fontSize: "0.875rem", color: "#4b5563", fontWeight: 500 }}>
                      {new Date(session.scheduled_at).toLocaleString("es-ES", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>
                      {session.scope === "GENERAL" ? "👥" : "👤"}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500 }}>
                      {session.scope === "GENERAL" ? "Sesión General" : "Sesión Personalizada"}
                    </span>
                  </div>
                </div>

                {/* Botón de acción */}
                <button
                  onClick={() => openAttendance(session)}
                  disabled={session.status === "CANCELED"}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    background: session.status === "CANCELED"
                      ? "#d1d5db"
                      : isHovered
                      ? "linear-gradient(135deg, var(--role-tutor-600) 0%, var(--role-tutor-700) 100%)"
                      : "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-600) 100%)",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: session.status === "CANCELED" ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: session.status === "CANCELED"
                      ? "none"
                      : isHovered
                      ? "0 8px 25px rgba(8, 145, 178, 0.3)"
                      : "0 4px 15px rgba(8, 145, 178, 0.2)",
                    opacity: session.status === "CANCELED" ? 0.5 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>{hasAttendance ? "Editar asistencia" : "Registrar asistencia"}</span>
                  <span style={{ fontSize: "1.1rem" }}>→</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Mensaje de éxito */}
      {attendanceSuccess && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem 1.25rem",
            background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
            border: "2px solid #16a34a",
            borderRadius: "0.75rem",
            color: "#15803d",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>✓</span>
          {attendanceSuccess}
        </div>
      )}

      {/* Modal de asistencia ultra moderno */}
      {selectedSession && (
        <Modal title="" onClose={() => setSelectedSession(null)}>
          <div>
            {/* Header con gradiente */}
            <div
              style={{
                background: "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-700) 100%)",
                borderRadius: "1.25rem",
                padding: "2rem",
                marginBottom: "2rem",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(8, 145, 178, 0.25)",
              }}
            >
              {/* Patrón decorativo */}
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: "150px",
                  height: "150px",
                  background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
                  borderRadius: "50%",
                }}
              />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "0.75rem",
                      background: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(10px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: "white", fontSize: "1.5rem", fontWeight: 700 }}>
                      {selectedSession.title}
                    </h3>
                    <p style={{ margin: "0.25rem 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.9rem" }}>
                      Registro de asistencia de la sesión
                    </p>
                  </div>
                </div>

                {/* Stats compactos */}
                {attendanceEntries.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.75rem" }}>
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.75rem",
                        background: "rgba(255, 255, 255, 0.15)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "white" }}>{attendanceEntries.length}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.9)", marginTop: "0.25rem" }}>
                        Total
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.75rem",
                        background: "rgba(34, 197, 94, 0.2)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "white" }}>{attendanceStats.present}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.9)", marginTop: "0.25rem" }}>
                        Presentes
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.75rem",
                        background: "rgba(239, 68, 68, 0.2)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "white" }}>{attendanceStats.absent}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.9)", marginTop: "0.25rem" }}>
                        Ausentes
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.75rem",
                        background: "rgba(245, 158, 11, 0.2)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "white" }}>{attendanceStats.justified}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.9)", marginTop: "0.25rem" }}>
                        Justificados
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contenido del modal */}
            {attendanceLoading ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                <div
                  style={{
                    display: "inline-block",
                    width: "40px",
                    height: "40px",
                    border: "3px solid #e5e7eb",
                    borderTopColor: "var(--role-tutor-500)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <p style={{ marginTop: "1rem", fontSize: "0.95rem" }}>Cargando asistencia...</p>
              </div>
            ) : attendanceError ? (
              <div
                style={{
                  padding: "1.5rem",
                  background: "#fee2e2",
                  border: "2px solid #dc2626",
                  borderRadius: "1rem",
                  color: "#991b1b",
                }}
              >
                <strong>⚠️ Error:</strong> {attendanceError}
              </div>
            ) : attendanceEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>👥</div>
                <p style={{ fontSize: "1rem", margin: 0 }}>No hay tutorados para esta sesión</p>
              </div>
            ) : (
              <div>
                {/* Lista de estudiantes con checks modernos */}
                <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  {attendanceEntries.map((entry, index) => {
                    const isHovered = hoveredStudentId === entry.tutorando.id;
                    const currentStatus = entry.status;
                    const statusColor = currentStatus ? statusColors[currentStatus] : null;

                    return (
                      <div
                        key={entry.tutorando.id}
                        onMouseEnter={() => setHoveredStudentId(entry.tutorando.id)}
                        onMouseLeave={() => setHoveredStudentId(null)}
                        style={{
                          background: "white",
                          borderRadius: "1rem",
                          padding: "1.25rem",
                          border: statusColor
                            ? `2px solid ${statusColor.border}30`
                            : isHovered
                            ? "2px solid var(--role-tutor-300)"
                            : "2px solid #e5e7eb",
                          boxShadow: isHovered
                            ? "0 8px 24px rgba(8, 145, 178, 0.15)"
                            : "0 2px 8px rgba(0, 0, 0, 0.05)",
                          transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                          transition: "all 0.3s ease",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {/* Barra lateral de color según estado */}
                        {statusColor && (
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: "4px",
                              background: `linear-gradient(180deg, ${statusColor.border} 0%, ${statusColor.border}99 100%)`,
                            }}
                          />
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.875rem" }}>
                          {/* Avatar */}
                          <div
                            style={{
                              width: "50px",
                              height: "50px",
                              borderRadius: "0.75rem",
                              background: statusColor
                                ? `linear-gradient(135deg, ${statusColor.bg} 0%, ${statusColor.bg}dd 100%)`
                                : "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.5rem",
                              fontWeight: 800,
                              color: statusColor ? statusColor.text : "#6b7280",
                              border: statusColor ? `2px solid ${statusColor.border}` : "2px solid #d1d5db",
                              flexShrink: 0,
                            }}
                          >
                            {entry.tutorando.profile.first_name.charAt(0).toUpperCase()}
                          </div>

                          {/* Info del estudiante */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#111827", marginBottom: "0.25rem" }}>
                              {entry.tutorando.profile.last_name_father} {entry.tutorando.profile.last_name_mother},{" "}
                              {entry.tutorando.profile.first_name}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#6b7280" }}>
                              <span>🆔 DNI: {entry.tutorando.dni}</span>
                              {entry.updated_at && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Actualizado:{" "}
                                    {new Date(entry.updated_at).toLocaleDateString("es-ES", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Estado actual badge */}
                          {currentStatus && (
                            <div
                              style={{
                                padding: "0.5rem 0.875rem",
                                borderRadius: "0.625rem",
                                background: statusColor!.bg,
                                border: `2px solid ${statusColor!.border}`,
                                color: statusColor!.text,
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <span style={{ fontSize: "1.1rem" }}>{statusColor!.icon}</span>
                              {statusLabels[currentStatus]}
                            </div>
                          )}
                        </div>

                        {/* Botones de estado tipo check */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
                          {(Object.entries(statusLabels) as [AttendanceStatus, string][]).map(([statusKey, statusLabel]) => {
                            const isSelected = currentStatus === statusKey;
                            const color = statusColors[statusKey];

                            return (
                              <button
                                key={statusKey}
                                type="button"
                                onClick={() => handleEntryChange(index, statusKey)}
                                style={{
                                  padding: "0.75rem 1rem",
                                  borderRadius: "0.75rem",
                                  border: isSelected ? `2px solid ${color.border}` : "2px solid #e5e7eb",
                                  background: isSelected
                                    ? `linear-gradient(135deg, ${color.bg} 0%, ${color.bg}dd 100%)`
                                    : "white",
                                  color: isSelected ? color.text : "#6b7280",
                                  fontWeight: isSelected ? 700 : 500,
                                  fontSize: "0.875rem",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "0.5rem",
                                  boxShadow: isSelected ? `0 4px 12px ${color.border}30` : "0 1px 3px rgba(0, 0, 0, 0.05)",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = color.border;
                                    e.currentTarget.style.background = `${color.bg}40`;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = "#e5e7eb";
                                    e.currentTarget.style.background = "white";
                                  }
                                }}
                              >
                                <span style={{ fontSize: "1.1rem" }}>{color.icon}</span>
                                {statusLabel}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => handleEntryChange(index, "")}
                            style={{
                              padding: "0.75rem 1rem",
                              borderRadius: "0.75rem",
                              border: !currentStatus ? "2px solid var(--role-tutor-500)" : "2px solid #e5e7eb",
                              background: !currentStatus
                                ? "linear-gradient(135deg, var(--role-tutor-50) 0%, var(--role-tutor-100) 100%)"
                                : "white",
                              color: !currentStatus ? "var(--role-tutor-700)" : "#9ca3af",
                              fontWeight: !currentStatus ? 700 : 500,
                              fontSize: "0.875rem",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.5rem",
                            }}
                            onMouseEnter={(e) => {
                              if (currentStatus) {
                                e.currentTarget.style.borderColor = "#9ca3af";
                                e.currentTarget.style.background = "#f9fafb";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentStatus) {
                                e.currentTarget.style.borderColor = "#e5e7eb";
                                e.currentTarget.style.background = "white";
                              }
                            }}
                          >
                            <span style={{ fontSize: "1.1rem" }}>○</span>
                            Sin registrar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botones de acción */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", paddingTop: "1rem", borderTop: "2px solid #e5e7eb" }}>
                  <button
                    type="button"
                    onClick={exportToPDF}
                    disabled={attendanceEntries.length === 0}
                    style={{
                      padding: "0.875rem 1.75rem",
                      borderRadius: "0.75rem",
                      border: "none",
                      background: attendanceEntries.length === 0
                        ? "#d1d5db"
                        : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      cursor: attendanceEntries.length === 0 ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: attendanceEntries.length === 0
                        ? "none"
                        : "0 4px 16px rgba(5, 150, 105, 0.3)",
                      opacity: attendanceEntries.length === 0 ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (attendanceEntries.length > 0) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 24px rgba(5, 150, 105, 0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(5, 150, 105, 0.3)";
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>📄</span>
                    Exportar PDF
                  </button>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSession(null)}
                      style={{
                        padding: "0.875rem 1.75rem",
                        borderRadius: "0.75rem",
                        border: "2px solid #d1d5db",
                        background: "white",
                        color: "#6b7280",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f9fafb";
                        e.currentTarget.style.borderColor = "#9ca3af";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.borderColor = "#d1d5db";
                      }}
                    >
                      Cerrar
                    </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || attendanceEntries.length === 0}
                    style={{
                      padding: "0.875rem 2rem",
                      borderRadius: "0.75rem",
                      border: "none",
                      background: saving || attendanceEntries.length === 0
                        ? "#d1d5db"
                        : "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-600) 100%)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      cursor: saving || attendanceEntries.length === 0 ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: saving || attendanceEntries.length === 0
                        ? "none"
                        : "0 4px 16px rgba(8, 145, 178, 0.3)",
                      opacity: saving || attendanceEntries.length === 0 ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!saving && attendanceEntries.length > 0) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 24px rgba(8, 145, 178, 0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(8, 145, 178, 0.3)";
                    }}
                  >
                    {saving ? (
                      <>
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            border: "2px solid rgba(255, 255, 255, 0.3)",
                            borderTopColor: "white",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <span>Guardar asistencia</span>
                        <span style={{ fontSize: "1.2rem" }}>✓</span>
                      </>
                    )}
                  </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Animaciones */}
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
