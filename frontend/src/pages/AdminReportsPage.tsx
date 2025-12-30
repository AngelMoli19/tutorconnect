import { useEffect, useState } from "react";
import { api } from "../api/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AdminUser } from "../types/users";
import type { SessionItem, SessionStatus } from "../types/sessions";
import type { ObservationItem, ObservationCategory } from "../types/observations";
import type { AttendanceEntry } from "../types/attendance";

// Interfaz para datos de asistencia completos (por sesión)
interface SessionWithAttendance extends SessionItem {
  attendance: AttendanceEntry[];
}

export function AdminReportsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsWithAttendance, setSessionsWithAttendance] = useState<SessionWithAttendance[]>([]);
  const [observations, setObservations] = useState<ObservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Obtener usuarios de todos los roles
      const [tutorsRes, tutorandosRes] = await Promise.all([
        api.get<AdminUser[]>("/admin/users", { params: { role: "TUTOR" } }),
        api.get<AdminUser[]>("/admin/users", { params: { role: "TUTORANDO" } }),
      ]);

      const allUsers = [...tutorsRes.data, ...tutorandosRes.data];
      setUsers(allUsers);

      // Obtener todas las sesiones del sistema (endpoint correcto)
      const { data: allSessions } = await api.get<SessionItem[]>("/admin/sessions");
      setSessions(allSessions);

      // Para cada sesión, obtener su asistencia
      const sessionsWithAtt: SessionWithAttendance[] = [];
      for (const session of allSessions) {
        try {
          const { data: attendance } = await api.get<AttendanceEntry[]>(
            `/admin/sessions/${session.id}/attendance`
          );
          sessionsWithAtt.push({ ...session, attendance });
        } catch {
          // Si no hay asistencia, agregar sesión con array vacío
          sessionsWithAtt.push({ ...session, attendance: [] });
        }
      }
      setSessionsWithAttendance(sessionsWithAtt);

      // Obtener todas las observaciones del sistema (endpoint correcto)
      const { data: allObservations } = await api.get<ObservationItem[]>("/admin/observations");
      setObservations(allObservations);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterByDate = <T extends { scheduled_at?: string; created_at?: string; updated_at?: string }>(items: T[]): T[] => {
    if (!dateFrom && !dateTo) return items;
    return items.filter((item) => {
      const itemDate = item.scheduled_at || item.created_at || item.updated_at;
      if (!itemDate) return true;
      const date = new Date(itemDate);
      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo)) return false;
      return true;
    });
  };

  const addPDFHeader = async (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [8, 145, 178];

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 40, "F");

    try {
      const img = new Image();
      img.src = "/logo.png";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            doc.addImage(img, "PNG", 15, 10, 18, 18);
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error("Failed to load logo"));
      });
    } catch (error) {
      console.warn("No se pudo cargar el logo:", error);
    }

    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("TutorConnect", 38, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(title, 38, 28);

    const today = new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.setFontSize(9);
    doc.text(today, pageWidth - 15, 24, { align: "right" });
  };

  const exportAttendanceReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [8, 145, 178];
    const darkGray: [number, number, number] = [55, 65, 81];

    await addPDFHeader(doc, "Reporte General de Asistencia");

    const filteredSessions = filterByDate(sessionsWithAttendance);

    // Calcular estadísticas globales
    let totalPresentes = 0;
    let totalAusentes = 0;
    let totalJustificados = 0;
    let totalRegistros = 0;

    filteredSessions.forEach((session) => {
      session.attendance.forEach((att) => {
        if (att.status) {
          totalRegistros++;
          if (att.status === "PRESENT") totalPresentes++;
          else if (att.status === "ABSENT") totalAusentes++;
          else if (att.status === "JUSTIFIED") totalJustificados++;
        }
      });
    });

    let yPos = 50;

    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 50, 3, 3, "F");

    doc.setFontSize(11);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Estadísticas Generales", 20, yPos + 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const stats = [
      `Total de Registros: ${totalRegistros}`,
      `Presentes: ${totalPresentes} (${totalRegistros > 0 ? ((totalPresentes / totalRegistros) * 100).toFixed(1) : 0}%)`,
      `Ausentes: ${totalAusentes} (${totalRegistros > 0 ? ((totalAusentes / totalRegistros) * 100).toFixed(1) : 0}%)`,
      `Justificados: ${totalJustificados} (${totalRegistros > 0 ? ((totalJustificados / totalRegistros) * 100).toFixed(1) : 0}%)`,
    ];

    stats.forEach((stat, index) => {
      doc.text(stat, 20, yPos + 18 + index * 6);
    });

    yPos += 60;

    // Tabla de asistencia por sesión
    const tableData = filteredSessions.map((session) => {
      const presentes = session.attendance.filter((a) => a.status === "PRESENT").length;
      const ausentes = session.attendance.filter((a) => a.status === "ABSENT").length;
      const justificados = session.attendance.filter((a) => a.status === "JUSTIFIED").length;
      const total = presentes + ausentes + justificados;

      return [
        session.title,
        total.toString(),
        presentes.toString(),
        ausentes.toString(),
        justificados.toString(),
        total > 0 ? `${((presentes / total) * 100).toFixed(1)}%` : "0%",
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Sesión", "Total", "Presentes", "Ausentes", "Justif.", "% Asist."]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 70 },
        1: { halign: "center", cellWidth: 15 },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "center", cellWidth: 18 },
        5: { halign: "center", cellWidth: 20 },
      },
    });

    const filename = `Reporte_Asistencia_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  const exportSessionsReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [8, 145, 178];
    const darkGray: [number, number, number] = [55, 65, 81];

    await addPDFHeader(doc, "Reporte de Sesiones");

    const filteredSessions = filterByDate(sessions);
    const total = filteredSessions.length;
    const programadas = filteredSessions.filter((s) => s.status === "SCHEDULED").length;
    const completadas = filteredSessions.filter((s) => s.status === "COMPLETED").length;
    const canceladas = filteredSessions.filter((s) => s.status === "CANCELED").length;

    let yPos = 50;

    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, "F");

    doc.setFontSize(11);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen de Sesiones", 20, yPos + 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const stats = [
      `Total de Sesiones: ${total}`,
      `Programadas: ${programadas} (${total > 0 ? ((programadas / total) * 100).toFixed(1) : 0}%)`,
      `Completadas: ${completadas} (${total > 0 ? ((completadas / total) * 100).toFixed(1) : 0}%)`,
      `Canceladas: ${canceladas} (${total > 0 ? ((canceladas / total) * 100).toFixed(1) : 0}%)`,
    ];

    stats.forEach((stat, index) => {
      doc.text(stat, 20, yPos + 18 + index * 5);
    });

    yPos += 45;

    const tableData = filteredSessions.map((session) => {
      const tutorName = `${session.tutor.profile.last_name_father} ${session.tutor.profile.last_name_mother}, ${session.tutor.profile.first_name}`;
      const sessionWithAtt = sessionsWithAttendance.find((s) => s.id === session.id);
      const participantes = sessionWithAtt?.attendance.filter((a) => a.status).length || 0;

      return [
        session.title,
        new Date(session.scheduled_at).toLocaleDateString("es-ES"),
        tutorName.substring(0, 35),
        session.status,
        participantes.toString(),
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Título", "Fecha", "Tutor", "Estado", "Participantes"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 50 },
        1: { halign: "center", cellWidth: 25 },
        2: { halign: "left", cellWidth: 45 },
        3: { halign: "center", cellWidth: 30 },
        4: { halign: "center", cellWidth: 25 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const estado = data.cell.raw as string;
          if (estado === "COMPLETED") {
            data.cell.styles.textColor = [34, 197, 94];
            data.cell.styles.fontStyle = "bold";
          } else if (estado === "CANCELED") {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          } else if (estado === "SCHEDULED") {
            data.cell.styles.textColor = [59, 130, 246];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    const filename = `Reporte_Sesiones_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  const exportTutoradosReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [8, 145, 178];
    const darkGray: [number, number, number] = [55, 65, 81];

    await addPDFHeader(doc, "Reporte de Tutorados");

    const tutorados = users.filter((u) => u.role === "TUTORANDO");
    let yPos = 50;

    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");

    doc.setFontSize(11);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen General", 20, yPos + 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Total de Tutorados: ${tutorados.length}`, 20, yPos + 15);

    yPos += 30;

    const tableData = tutorados.map((tutorando) => {
      // Contar sesiones y asistencias del tutorado
      let totalSessions = 0;
      let presentes = 0;
      let ausentes = 0;

      sessionsWithAttendance.forEach((session) => {
        const attendance = session.attendance.find((a) => a.tutorando.id === tutorando.id);
        if (attendance && attendance.status) {
          totalSessions++;
          if (attendance.status === "PRESENT") presentes++;
          else if (attendance.status === "ABSENT") ausentes++;
        }
      });

      const asistenciaRate = totalSessions > 0 ? ((presentes / totalSessions) * 100).toFixed(1) : "0";

      const tutorandoObs = observations.filter((o) => o.tutorando.id === tutorando.id);
      const totalObs = tutorandoObs.length;

      const riesgo = parseFloat(asistenciaRate) < 70 || ausentes > 3 ? "Alto" : parseFloat(asistenciaRate) < 85 ? "Medio" : "Bajo";

      return [
        tutorando.dni,
        `${tutorando.profile.last_name_father} ${tutorando.profile.last_name_mother}, ${tutorando.profile.first_name}`.substring(0, 40),
        totalSessions.toString(),
        presentes.toString(),
        ausentes.toString(),
        `${asistenciaRate}%`,
        totalObs.toString(),
        riesgo,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["DNI", "Estudiante", "Sesiones", "Presentes", "Ausentes", "% Asist.", "Obs.", "Riesgo"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 22 },
        1: { halign: "left", cellWidth: 50 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "center", cellWidth: 20 },
        5: { halign: "center", cellWidth: 18 },
        6: { halign: "center", cellWidth: 12 },
        7: { halign: "center", cellWidth: 15 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 7) {
          const riesgo = data.cell.raw as string;
          if (riesgo === "Alto") {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          } else if (riesgo === "Medio") {
            data.cell.styles.textColor = [245, 158, 11];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [34, 197, 94];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    const filename = `Reporte_Tutorados_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  const exportTutoresReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [8, 145, 178];
    const darkGray: [number, number, number] = [55, 65, 81];

    await addPDFHeader(doc, "Reporte de Tutores");

    const tutores = users.filter((u) => u.role === "TUTOR");
    let yPos = 50;

    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");

    doc.setFontSize(11);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen de Tutores", 20, yPos + 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Total de Tutores: ${tutores.length}`, 20, yPos + 15);

    yPos += 30;

    const tableData = tutores.map((tutor) => {
      const tutorSessions = sessions.filter((s) => s.tutor.id === tutor.id);
      const totalSessions = tutorSessions.length;
      const completadas = tutorSessions.filter((s) => s.status === "COMPLETED").length;
      const programadas = tutorSessions.filter((s) => s.status === "SCHEDULED").length;

      const tutorObs = observations.filter((o) => o.tutor.id === tutor.id);
      const totalObs = tutorObs.length;

      const tutoradosSet = new Set<string>();
      sessionsWithAttendance.forEach((session) => {
        if (session.tutor.id === tutor.id) {
          session.attendance.forEach((att) => {
            if (att.status) {
              tutoradosSet.add(att.tutorando.id);
            }
          });
        }
      });

      return [
        tutor.dni,
        `${tutor.profile.last_name_father} ${tutor.profile.last_name_mother}, ${tutor.profile.first_name}`.substring(0, 45),
        totalSessions.toString(),
        completadas.toString(),
        programadas.toString(),
        tutoradosSet.size.toString(),
        totalObs.toString(),
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["DNI", "Tutor", "Total Sesiones", "Completadas", "Programadas", "Tutorados", "Observaciones"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 22 },
        1: { halign: "left", cellWidth: 55 },
        2: { halign: "center", cellWidth: 25 },
        3: { halign: "center", cellWidth: 25 },
        4: { halign: "center", cellWidth: 25 },
        5: { halign: "center", cellWidth: 20 },
        6: { halign: "center", cellWidth: 28 },
      },
    });

    const filename = `Reporte_Tutores_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  const exportObservationsReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [8, 145, 178];
    const darkGray: [number, number, number] = [55, 65, 81];

    await addPDFHeader(doc, "Reporte de Observaciones");

    const filteredObservations = filterByDate(observations);
    const total = filteredObservations.length;

    const categoryCounts: Record<string, number> = {};
    filteredObservations.forEach((obs) => {
      categoryCounts[obs.category] = (categoryCounts[obs.category] || 0) + 1;
    });

    let yPos = 50;

    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");

    doc.setFontSize(11);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen de Observaciones", 20, yPos + 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Total de Observaciones: ${total}`, 20, yPos + 15);

    yPos += 30;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Distribución por Categoría", 20, yPos);
    yPos += 8;

    const categoryTableData = Object.entries(categoryCounts).map(([categoria, count]) => [
      categoria,
      count.toString(),
      total > 0 ? `${((count / total) * 100).toFixed(1)}%` : "0%",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Categoría", "Cantidad", "Porcentaje"]],
      body: categoryTableData,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 80 },
        1: { halign: "center", cellWidth: 40 },
        2: { halign: "center", cellWidth: 40 },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY || yPos + 20;
    yPos = finalY + 15;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle de Observaciones", 20, yPos);
    yPos += 8;

    const detailTableData = filteredObservations.slice(0, 20).map((obs) => {
      const tutorandoName = `${obs.tutorando.profile.last_name_father} ${obs.tutorando.profile.last_name_mother}, ${obs.tutorando.profile.first_name}`;
      const tutorName = `${obs.tutor.profile.last_name_father} ${obs.tutor.profile.last_name_mother}, ${obs.tutor.profile.first_name}`;

      return [
        new Date(obs.created_at).toLocaleDateString("es-ES"),
        tutorandoName.substring(0, 28),
        tutorName.substring(0, 28),
        obs.category,
        obs.summary.substring(0, 50) + (obs.summary.length > 50 ? "..." : ""),
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Fecha", "Tutorado", "Tutor", "Categoría", "Resumen"]],
      body: detailTableData,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 22 },
        1: { halign: "left", cellWidth: 33 },
        2: { halign: "left", cellWidth: 33 },
        3: { halign: "center", cellWidth: 25 },
        4: { halign: "left", cellWidth: 65 },
      },
    });

    if (filteredObservations.length > 20) {
      const finalY2 = (doc as any).lastAutoTable.finalY || yPos + 20;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Mostrando 20 de ${filteredObservations.length} observaciones`, 20, finalY2 + 10);
    }

    const filename = `Reporte_Observaciones_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  if (loading) {
    return (
      <div className="table-wrapper">
        <h2 style={{ marginTop: 0 }}>Reportes</h2>
        <p style={{ color: "#6b7280" }}>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Reportes del Sistema</h2>
        <p style={{ color: "#6b7280", margin: 0 }}>
          Genera reportes detallados con estadísticas y exportación a PDF
        </p>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
          padding: "1rem 1.5rem",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1", minWidth: "200px" }}>
          <label
            style={{
              display: "block",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
            }}
          >
            Fecha Desde
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "6px",
              fontSize: "0.875rem",
              background: "rgba(255, 255, 255, 0.95)",
            }}
          />
        </div>
        <div style={{ flex: "1", minWidth: "200px" }}>
          <label
            style={{
              display: "block",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
            }}
          >
            Fecha Hasta
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "6px",
              fontSize: "0.875rem",
              background: "rgba(255, 255, 255, 0.95)",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            style={{
              padding: "0.5rem 1rem",
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "6px",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              📈
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", color: "#111827" }}>Asistencia General</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Estadísticas y tendencias</p>
            </div>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: "1.5" }}>
            Reporte completo de asistencia con estadísticas por sesión, tasas de asistencia y comparativas.
          </p>
          <button
            onClick={exportAttendanceReport}
            disabled={sessionsWithAttendance.length === 0}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: sessionsWithAttendance.length === 0 ? "#9ca3af" : "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: sessionsWithAttendance.length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              opacity: sessionsWithAttendance.length === 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (sessionsWithAttendance.length > 0) {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(8, 145, 178, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>📄</span>
            Generar PDF
          </button>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              📅
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", color: "#111827" }}>Sesiones</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Programación y estados</p>
            </div>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: "1.5" }}>
            Detalle de sesiones con distribución por estado, participantes y asignación de tutores.
          </p>
          <button
            onClick={exportSessionsReport}
            disabled={sessions.length === 0}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: sessions.length === 0 ? "#9ca3af" : "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: sessions.length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              opacity: sessions.length === 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (sessions.length > 0) {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(8, 145, 178, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>📄</span>
            Generar PDF
          </button>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              👥
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", color: "#111827" }}>Tutorados</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Rendimiento individual</p>
            </div>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: "1.5" }}>
            Análisis de cada estudiante con asistencia, observaciones e identificación de estudiantes en riesgo.
          </p>
          <button
            onClick={exportTutoradosReport}
            disabled={users.filter((u) => u.role === "TUTORANDO").length === 0}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: users.filter((u) => u.role === "TUTORANDO").length === 0 ? "#9ca3af" : "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: users.filter((u) => u.role === "TUTORANDO").length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              opacity: users.filter((u) => u.role === "TUTORANDO").length === 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (users.filter((u) => u.role === "TUTORANDO").length > 0) {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(8, 145, 178, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>📄</span>
            Generar PDF
          </button>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              👨‍🏫
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", color: "#111827" }}>Tutores</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Desempeño y actividad</p>
            </div>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: "1.5" }}>
            Reporte de tutores con sesiones asignadas, tutorados atendidos y observaciones registradas.
          </p>
          <button
            onClick={exportTutoresReport}
            disabled={users.filter((u) => u.role === "TUTOR").length === 0}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: users.filter((u) => u.role === "TUTOR").length === 0 ? "#9ca3af" : "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: users.filter((u) => u.role === "TUTOR").length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              opacity: users.filter((u) => u.role === "TUTOR").length === 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (users.filter((u) => u.role === "TUTOR").length > 0) {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(8, 145, 178, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>📄</span>
            Generar PDF
          </button>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              📝
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", color: "#111827" }}>Observaciones</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Por categoría y tendencias</p>
            </div>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: "1.5" }}>
            Análisis de observaciones con distribución por categoría, detalle y tendencias en el periodo.
          </p>
          <button
            onClick={exportObservationsReport}
            disabled={observations.length === 0}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: observations.length === 0 ? "#9ca3af" : "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: observations.length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              opacity: observations.length === 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (observations.length > 0) {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(8, 145, 178, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>📄</span>
            Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
