import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import type { AdminUser } from "../types/users";

interface AssignmentTutorando {
  assignment_id: string;
  tutorando: AdminUser;
  assigned_at: string;
  active: boolean;
}

interface AssignmentResponse {
  tutor: AdminUser;
  tutorandos: AssignmentTutorando[];
}

const buildUserLabel = (user: AdminUser) =>
  `${user.profile.last_name_father} ${user.profile.last_name_mother}, ${user.profile.first_name}`.trim();

const matchesSearch = (user: AdminUser, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const name = buildUserLabel(user).toLowerCase();
  return name.includes(normalized) || user.dni.toLowerCase().includes(normalized);
};

export function AssignmentsPage() {
  const { auth } = useAuth();
  const [tutors, setTutors] = useState<AdminUser[]>([]);
  const [selectedTutorId, setSelectedTutorId] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentTutorando[]>([]);
  const [tutorandos, setTutorandos] = useState<AdminUser[]>([]);
  const [selectedToAssign, setSelectedToAssign] = useState<Set<string>>(new Set());
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tutorSearch, setTutorSearch] = useState("");
  const [assignedSearch, setAssignedSearch] = useState("");
  const [availableSearch, setAvailableSearch] = useState("");

  useEffect(() => {
    if (auth?.role !== "ADMIN") return;
    async function loadTutorsAndTutorandos() {
      setError(null);
      try {
        const [{ data: tutorsData }, { data: tutorandosData }] = await Promise.all([
          api.get<AdminUser[]>("/admin/users", { params: { role: "TUTOR" } }),
          api.get<AdminUser[]>("/admin/users", { params: { role: "TUTORANDO" } }),
        ]);
        const sortedTutors = [...tutorsData].sort((a, b) => buildUserLabel(a).localeCompare(buildUserLabel(b)));
        const sortedTutorandos = [...tutorandosData].sort((a, b) => buildUserLabel(a).localeCompare(buildUserLabel(b)));
        setTutors(sortedTutors);
        setTutorandos(sortedTutorandos);
        if (sortedTutors.length > 0) {
          setSelectedTutorId((prev) => prev || sortedTutors[0].id);
        }
      } catch (err) {
        setError(parseApiError(err).message);
      }
    }
    loadTutorsAndTutorandos();
  }, []);

  useEffect(() => {
    if (auth?.role !== "ADMIN") return;
    if (!selectedTutorId) return;
    async function loadAssignments() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<AssignmentResponse>(`/admin/assignments/${selectedTutorId}`);
        setAssignments(data.tutorandos);
        setSelectedToAssign(new Set());
        setSelectedToRemove(new Set());
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    loadAssignments();
  }, [selectedTutorId]);

  const filteredTutors = useMemo(() => {
    if (!tutorSearch.trim()) return tutors;
    const query = tutorSearch.trim().toLowerCase();
    return tutors.filter((tutor) => buildUserLabel(tutor).toLowerCase().includes(query) || tutor.dni.toLowerCase().includes(query));
  }, [tutors, tutorSearch]);

  const activeAssignments = assignments.filter((assignment) => assignment.active);
  const assignedIds = new Set(activeAssignments.map((assignment) => assignment.tutorando.id));

  const availableTutorandos = tutorandos.filter((tutorando) => !assignedIds.has(tutorando.id));

  const filteredAssigned = activeAssignments.filter((assignment) => matchesSearch(assignment.tutorando, assignedSearch));
  const filteredAvailable = availableTutorandos.filter((tutorando) => matchesSearch(tutorando, availableSearch));

  const handleTutorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTutorId(event.target.value);
  };

  const toggleAssign = (id: string) => {
    setSelectedToAssign((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleRemove = (assignmentId: string) => {
    setSelectedToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedToAssign.size === 0 || !selectedTutorId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post("/admin/assignments", {
        tutor_id: selectedTutorId,
        tutorando_ids: Array.from(selectedToAssign),
      });
      setSelectedToAssign(new Set());
      const { data } = await api.get<AssignmentResponse>(`/admin/assignments/${selectedTutorId}`);
      setAssignments(data.tutorandos);
    } catch (err) {
      setActionError(parseApiError(err).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateAssignment = async (assignmentId: string) => {
    if (!selectedTutorId) return;
    if (!window.confirm("¿Seguro que deseas desactivar esta asignación?")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const { data } = await api.delete<AssignmentResponse>(`/admin/assignments/${assignmentId}`, {
        params: { include_inactive: false },
      });
      setAssignments(data.tutorandos);
    } catch (err) {
      setActionError(parseApiError(err).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedToRemove.size === 0) return;
    if (!window.confirm("¿Quitar las asignaciones seleccionadas?")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await Promise.all(
        Array.from(selectedToRemove).map((assignmentId) =>
          api.delete(`/admin/assignments/${assignmentId}`, { params: { include_inactive: false } }),
        ),
      );
      setSelectedToRemove(new Set());
      const { data } = await api.get<AssignmentResponse>(`/admin/assignments/${selectedTutorId}`);
      setAssignments(data.tutorandos);
    } catch (err) {
      setActionError(parseApiError(err).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAllAvailable = () => {
    const allIds = filteredAvailable.map((tutorando) => tutorando.id);
    setSelectedToAssign(new Set(allIds));
  };

  const handleClearAssign = () => {
    setSelectedToAssign(new Set());
  };

  const handleClearRemove = () => {
    setSelectedToRemove(new Set());
  };

  const selectedTutor = tutors.find((tutor) => tutor.id === selectedTutorId);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {auth?.role !== "ADMIN" ? (
        <p className="error-text">Permisos insuficientes.</p>
      ) : (
        <>
          {/* Header */}
          <div style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              margin: "0 0 0.5rem 0",
              fontSize: "2rem",
              fontWeight: "800",
              color: "var(--gray-900)",
              letterSpacing: "-0.025em"
            }}>
              Asignación Tutor - Tutorado
            </h2>
            <p style={{ margin: 0, color: "var(--gray-600)", fontSize: "1rem" }}>
              Gestiona las asignaciones entre tutores y tutorados
            </p>
          </div>

          {error && (
            <div style={{
              padding: "1rem 1.25rem",
              background: "var(--error-light)",
              border: "1px solid var(--error)",
              borderRadius: "12px",
              marginBottom: "2rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start"
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--error)", flexShrink: 0, marginTop: "0.125rem" }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--error)", fontWeight: "500" }}>
                {error}
              </p>
            </div>
          )}

          {/* Stats Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2.5rem"
          }}>
            {/* Asignados Card */}
            <div
              style={{
                position: "relative",
                background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
                borderRadius: "18px",
                padding: "1.75rem",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 32px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: "slideInUp 0.6s ease-out"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";
              }}
            >
              <div style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "150px",
                height: "150px",
                background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                borderRadius: "50%",
                transform: "translate(30%, -30%)",
                pointerEvents: "none"
              }} />

              <div style={{ position: "relative", zIndex: 1, color: "white" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                  backdropFilter: "blur(10px)"
                }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Asignados
                </div>
                <div style={{
                  fontSize: "3rem",
                  fontWeight: "800",
                  lineHeight: "1",
                  marginBottom: "0.5rem",
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}>
                  {activeAssignments.length}
                </div>
                <div style={{
                  fontSize: "0.95rem",
                  fontWeight: "500",
                  opacity: 0.95,
                  letterSpacing: "0.025em"
                }}>
                  Tutorados asignados
                </div>
              </div>
            </div>

            {/* Disponibles Card */}
            <div
              style={{
                position: "relative",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
                borderRadius: "18px",
                padding: "1.75rem",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 32px rgba(245, 158, 11, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: "slideInUp 0.6s ease-out 0.1s both"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(245, 158, 11, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(245, 158, 11, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";
              }}
            >
              <div style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "150px",
                height: "150px",
                background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                borderRadius: "50%",
                transform: "translate(30%, -30%)",
                pointerEvents: "none"
              }} />

              <div style={{ position: "relative", zIndex: 1, color: "white" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                  backdropFilter: "blur(10px)"
                }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Disponibles
                </div>
                <div style={{
                  fontSize: "3rem",
                  fontWeight: "800",
                  lineHeight: "1",
                  marginBottom: "0.5rem",
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}>
                  {availableTutorandos.length}
                </div>
                <div style={{
                  fontSize: "0.95rem",
                  fontWeight: "500",
                  opacity: 0.95,
                  letterSpacing: "0.025em"
                }}>
                  Sin asignar
                </div>
              </div>
            </div>

            {/* Para Asignar Card */}
            <div
              style={{
                position: "relative",
                background: "linear-gradient(135deg, #2c5f8d 0%, #1e4976 50%, #1a365d 100%)",
                borderRadius: "18px",
                padding: "1.75rem",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 32px rgba(44, 95, 141, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: "slideInUp 0.6s ease-out 0.2s both"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(44, 95, 141, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(44, 95, 141, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";
              }}
            >
              <div style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "150px",
                height: "150px",
                background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                borderRadius: "50%",
                transform: "translate(30%, -30%)",
                pointerEvents: "none"
              }} />

              <div style={{ position: "relative", zIndex: 1, color: "white" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                  backdropFilter: "blur(10px)"
                }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Para Asignar
                </div>
                <div style={{
                  fontSize: "3rem",
                  fontWeight: "800",
                  lineHeight: "1",
                  marginBottom: "0.5rem",
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}>
                  {selectedToAssign.size}
                </div>
                <div style={{
                  fontSize: "0.95rem",
                  fontWeight: "500",
                  opacity: 0.95,
                  letterSpacing: "0.025em"
                }}>
                  Seleccionados
                </div>
              </div>
            </div>

            {/* Para Quitar Card */}
            <div
              style={{
                position: "relative",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)",
                borderRadius: "18px",
                padding: "1.75rem",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 32px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: "slideInUp 0.6s ease-out 0.3s both"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(239, 68, 68, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";
              }}
            >
              <div style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "150px",
                height: "150px",
                background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                borderRadius: "50%",
                transform: "translate(30%, -30%)",
                pointerEvents: "none"
              }} />

              <div style={{ position: "relative", zIndex: 1, color: "white" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                  backdropFilter: "blur(10px)"
                }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Para Quitar
                </div>
                <div style={{
                  fontSize: "3rem",
                  fontWeight: "800",
                  lineHeight: "1",
                  marginBottom: "0.5rem",
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}>
                  {selectedToRemove.size}
                </div>
                <div style={{
                  fontSize: "0.95rem",
                  fontWeight: "500",
                  opacity: 0.95,
                  letterSpacing: "0.025em"
                }}>
                  Seleccionados
                </div>
              </div>
            </div>
          </div>

          {/* Tutor Selection */}
          <div style={{
            background: "var(--white)",
            borderRadius: "16px",
            padding: "2rem",
            marginBottom: "2rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid var(--gray-100)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.5rem"
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, var(--role-tutor-500), var(--role-tutor-600))",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(6, 182, 212, 0.25)"
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "var(--gray-900)"
                }}>
                  Seleccionar Tutor
                </h3>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--gray-600)" }}>
                  Escoge el tutor para gestionar sus asignaciones
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", alignItems: "end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{
                  fontSize: "0.8125rem",
                  fontWeight: "600",
                  color: "var(--gray-700)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutor-500)" }}>
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  Buscar tutor
                </span>
                <input
                  type="text"
                  value={tutorSearch}
                  onChange={(e) => setTutorSearch(e.target.value)}
                  placeholder="Nombre o DNI..."
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    border: "2px solid var(--gray-200)",
                    borderRadius: "10px",
                    fontSize: "0.9375rem",
                    fontWeight: "500",
                    color: "var(--gray-900)",
                    background: "var(--white)",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--role-tutor-100)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--gray-200)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{
                  fontSize: "0.8125rem",
                  fontWeight: "600",
                  color: "var(--gray-700)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutor-500)" }}>
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                  </svg>
                  Tutor seleccionado
                </span>
                <select
                  value={selectedTutorId}
                  onChange={handleTutorChange}
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    border: "2px solid var(--gray-200)",
                    borderRadius: "10px",
                    fontSize: "0.9375rem",
                    fontWeight: "500",
                    color: "var(--gray-900)",
                    background: "var(--white)",
                    transition: "all 0.2s",
                    outline: "none",
                    cursor: "pointer"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--role-tutor-100)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--gray-200)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {filteredTutors.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>
                      {buildUserLabel(tutor)} ({tutor.dni})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedTutor && (
              <div style={{
                marginTop: "1.5rem",
                padding: "1rem 1.25rem",
                background: "var(--role-tutor-50)",
                border: "1px solid var(--role-tutor-200)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--role-tutor-600)", flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p style={{ margin: 0, fontSize: "0.9375rem", color: "var(--role-tutor-900)", fontWeight: "500" }}>
                  Gestionando asignaciones de: <strong>{buildUserLabel(selectedTutor)}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Assignments Grid */}
          {selectedTutor && (
            <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))" }}>
              {/* Asignados */}
              <div style={{
                background: "var(--white)",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
                border: "1px solid var(--gray-100)",
                display: "flex",
                flexDirection: "column"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                  paddingBottom: "1rem",
                  borderBottom: "2px solid var(--gray-100)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)"
                    }}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="white">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 style={{
                      margin: 0,
                      fontSize: "1.125rem",
                      fontWeight: "700",
                      color: "var(--gray-900)"
                    }}>
                      Tutorados Asignados
                    </h3>
                  </div>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  <span style={{
                    fontSize: "0.8125rem",
                    fontWeight: "600",
                    color: "var(--gray-700)"
                  }}>
                    Buscar asignado
                  </span>
                  <input
                    type="text"
                    value={assignedSearch}
                    onChange={(e) => setAssignedSearch(e.target.value)}
                    placeholder="Nombre o DNI..."
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "2px solid var(--gray-200)",
                      borderRadius: "10px",
                      fontSize: "0.9375rem",
                      fontWeight: "500",
                      outline: "none",
                      transition: "all 0.2s"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#10b981";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--gray-200)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </label>

                {actionError && (
                  <div style={{
                    padding: "0.875rem 1rem",
                    background: "var(--error-light)",
                    border: "1px solid var(--error)",
                    borderRadius: "10px",
                    marginBottom: "1rem",
                    fontSize: "0.875rem",
                    color: "var(--error)",
                    fontWeight: "500"
                  }}>
                    {actionError}
                  </div>
                )}

                <div style={{ flex: 1, minHeight: "300px", maxHeight: "500px", overflowY: "auto", marginBottom: "1.5rem" }}>
                  {loading ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray-500)" }}>
                      <svg width="40" height="40" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }}>
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      <p style={{ marginTop: "1rem" }}>Cargando asignaciones...</p>
                    </div>
                  ) : filteredAssigned.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--gray-500)" }}>
                      <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.3, margin: "0 auto" }}>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p style={{ marginTop: "1rem", fontSize: "0.9375rem" }}>No hay tutorados asignados</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {filteredAssigned.map((assignment) => (
                        <div
                          key={assignment.assignment_id}
                          style={{
                            padding: "1rem",
                            borderRadius: "12px",
                            background: "var(--gray-50)",
                            border: "2px solid var(--gray-200)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "0.75rem",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#10b981";
                            e.currentTarget.style.background = "rgba(16, 185, 129, 0.05)";
                            e.currentTarget.style.transform = "translateX(4px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--gray-200)";
                            e.currentTarget.style.background = "var(--gray-50)";
                            e.currentTarget.style.transform = "translateX(0)";
                          }}
                        >
                          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={selectedToRemove.has(assignment.assignment_id)}
                              onChange={() => toggleRemove(assignment.assignment_id)}
                              style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer"
                              }}
                            />
                            <div>
                              <div style={{
                                fontWeight: "600",
                                color: "var(--gray-900)",
                                fontSize: "0.9375rem"
                              }}>
                                {buildUserLabel(assignment.tutorando)}
                              </div>
                              <div style={{
                                fontSize: "0.8125rem",
                                color: "var(--gray-600)",
                                marginTop: "0.125rem"
                              }}>
                                DNI: {assignment.tutorando.dni}
                              </div>
                            </div>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeactivateAssignment(assignment.assignment_id)}
                            style={{
                              padding: "0.5rem 0.875rem",
                              background: "var(--white)",
                              border: "2px solid #ef4444",
                              borderRadius: "8px",
                              color: "#dc2626",
                              fontWeight: "600",
                              fontSize: "0.8125rem",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.375rem"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#ef4444";
                              e.currentTarget.style.color = "white";
                              e.currentTarget.style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "var(--white)";
                              e.currentTarget.style.color = "#dc2626";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.75rem", paddingTop: "1rem", borderTop: "2px solid var(--gray-100)" }}>
                  <button
                    type="button"
                    onClick={handleClearRemove}
                    disabled={selectedToRemove.size === 0}
                    style={{
                      flex: 1,
                      padding: "0.875rem 1.5rem",
                      background: "var(--white)",
                      border: "2px solid var(--gray-300)",
                      borderRadius: "10px",
                      color: "var(--gray-700)",
                      fontWeight: "600",
                      fontSize: "0.9375rem",
                      cursor: selectedToRemove.size === 0 ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      opacity: selectedToRemove.size === 0 ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (selectedToRemove.size > 0) {
                        e.currentTarget.style.background = "var(--gray-100)";
                        e.currentTarget.style.borderColor = "var(--gray-400)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--white)";
                      e.currentTarget.style.borderColor = "var(--gray-300)";
                    }}
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveSelected}
                    disabled={selectedToRemove.size === 0 || actionLoading}
                    style={{
                      flex: 2,
                      padding: "0.875rem 1.5rem",
                      background: selectedToRemove.size === 0 || actionLoading ? "var(--gray-300)" : "linear-gradient(135deg, #ef4444, #dc2626)",
                      border: "none",
                      borderRadius: "10px",
                      color: "white",
                      fontWeight: "600",
                      fontSize: "0.9375rem",
                      cursor: selectedToRemove.size === 0 || actionLoading ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow: selectedToRemove.size > 0 && !actionLoading ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "none"
                    }}
                    onMouseEnter={(e) => {
                      if (selectedToRemove.size > 0 && !actionLoading) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = selectedToRemove.size > 0 && !actionLoading ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "none";
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {actionLoading ? "Quitando..." : "Quitar seleccionados"}
                  </button>
                </div>
              </div>

              {/* Disponibles */}
              <div style={{
                background: "var(--white)",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
                border: "1px solid var(--gray-100)",
                display: "flex",
                flexDirection: "column"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                  paddingBottom: "1rem",
                  borderBottom: "2px solid var(--gray-100)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      background: "linear-gradient(135deg, #2c5f8d, #1e4976)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(44, 95, 141, 0.25)"
                    }}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="white">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 style={{
                      margin: 0,
                      fontSize: "1.125rem",
                      fontWeight: "700",
                      color: "var(--gray-900)"
                    }}>
                      Tutorados Disponibles
                    </h3>
                  </div>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  <span style={{
                    fontSize: "0.8125rem",
                    fontWeight: "600",
                    color: "var(--gray-700)"
                  }}>
                    Buscar disponible
                  </span>
                  <input
                    type="text"
                    value={availableSearch}
                    onChange={(e) => setAvailableSearch(e.target.value)}
                    placeholder="Nombre o DNI..."
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "2px solid var(--gray-200)",
                      borderRadius: "10px",
                      fontSize: "0.9375rem",
                      fontWeight: "500",
                      outline: "none",
                      transition: "all 0.2s"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#2c5f8d";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(44, 95, 141, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--gray-200)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </label>

                <div style={{ flex: 1, minHeight: "300px", maxHeight: "500px", overflowY: "auto", marginBottom: "1.5rem" }}>
                  {filteredAvailable.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--gray-500)" }}>
                      <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.3, margin: "0 auto" }}>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p style={{ marginTop: "1rem", fontSize: "0.9375rem" }}>No hay tutorados disponibles</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {filteredAvailable.map((tutorando) => (
                        <label
                          key={tutorando.id}
                          style={{
                            padding: "1rem",
                            borderRadius: "12px",
                            background: "var(--gray-50)",
                            border: "2px solid var(--gray-200)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#2c5f8d";
                            e.currentTarget.style.background = "rgba(44, 95, 141, 0.05)";
                            e.currentTarget.style.transform = "translateX(4px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--gray-200)";
                            e.currentTarget.style.background = "var(--gray-50)";
                            e.currentTarget.style.transform = "translateX(0)";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedToAssign.has(tutorando.id)}
                            onChange={() => toggleAssign(tutorando.id)}
                            style={{
                              width: "18px",
                              height: "18px",
                              cursor: "pointer"
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: "600",
                              color: "var(--gray-900)",
                              fontSize: "0.9375rem"
                            }}>
                              {buildUserLabel(tutorando)}
                            </div>
                            <div style={{
                              fontSize: "0.8125rem",
                              color: "var(--gray-600)",
                              marginTop: "0.125rem"
                            }}>
                              DNI: {tutorando.dni}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.75rem", paddingTop: "1rem", borderTop: "2px solid var(--gray-100)", marginBottom: "1rem" }}>
                  <button
                    type="button"
                    onClick={handleSelectAllAvailable}
                    disabled={filteredAvailable.length === 0}
                    style={{
                      flex: 1,
                      padding: "0.75rem 1.25rem",
                      background: "var(--white)",
                      border: "2px solid var(--gray-300)",
                      borderRadius: "10px",
                      color: "var(--gray-700)",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      cursor: filteredAvailable.length === 0 ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      opacity: filteredAvailable.length === 0 ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (filteredAvailable.length > 0) {
                        e.currentTarget.style.background = "var(--gray-100)";
                        e.currentTarget.style.borderColor = "var(--gray-400)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--white)";
                      e.currentTarget.style.borderColor = "var(--gray-300)";
                    }}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAssign}
                    disabled={selectedToAssign.size === 0}
                    style={{
                      flex: 1,
                      padding: "0.75rem 1.25rem",
                      background: "var(--white)",
                      border: "2px solid var(--gray-300)",
                      borderRadius: "10px",
                      color: "var(--gray-700)",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      cursor: selectedToAssign.size === 0 ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      opacity: selectedToAssign.size === 0 ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (selectedToAssign.size > 0) {
                        e.currentTarget.style.background = "var(--gray-100)";
                        e.currentTarget.style.borderColor = "var(--gray-400)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--white)";
                      e.currentTarget.style.borderColor = "var(--gray-300)";
                    }}
                  >
                    Limpiar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={selectedToAssign.size === 0 || actionLoading}
                  style={{
                    width: "100%",
                    padding: "1rem 1.5rem",
                    background: selectedToAssign.size === 0 || actionLoading ? "var(--gray-300)" : "linear-gradient(135deg, #2c5f8d, #1e4976)",
                    border: "none",
                    borderRadius: "10px",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "1rem",
                    cursor: selectedToAssign.size === 0 || actionLoading ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    boxShadow: selectedToAssign.size > 0 && !actionLoading ? "0 4px 12px rgba(44, 95, 141, 0.3)" : "none"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedToAssign.size > 0 && !actionLoading) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(44, 95, 141, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = selectedToAssign.size > 0 && !actionLoading ? "0 4px 12px rgba(44, 95, 141, 0.3)" : "none";
                  }}
                >
                  {actionLoading ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite" }}>
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Asignando...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      Asignar seleccionados ({selectedToAssign.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
