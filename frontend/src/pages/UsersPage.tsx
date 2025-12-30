import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { api, parseApiError } from "../api/client";
import { UserForm } from "../components/UserForm";
import { Modal } from "../components/Modal";
import type { Faculty } from "../types/catalogs";
import type { AdminUser, TutorandoFormPayload, UserRole } from "../types/users";

const roleFilters: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos los roles" },
  { value: "TUTOR", label: "Tutores" },
  { value: "TUTORANDO", label: "Tutorados" },
];

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [role, setRole] = useState<string>("");
  const [faculty, setFaculty] = useState<string>("");
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    open: boolean;
    role: Extract<UserRole, "TUTOR" | "TUTORANDO">;
    mode: "create" | "edit";
    user: AdminUser | null;
  }>({
    open: false,
    role: "TUTOR",
    mode: "create",
    user: null,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null);

  const fetchUsers = useMemo(
    () => async (roleFilter: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = roleFilter ? { role: roleFilter } : undefined;
        const { data } = await api.get<AdminUser[]>("/admin/users", { params });
        setUsers(data);
      } catch (err) {
        const apiError = parseApiError(err);
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchUsers(role);
  }, [fetchUsers, role]);

  const fetchFaculties = useMemo(
    () => async () => {
      setCatalogError(null);
      try {
        const { data } = await api.get<Faculty[]>("/catalogs/faculties");
        setFaculties(data);
      } catch (err) {
        setCatalogError(parseApiError(err).message);
        setFaculties([]);
      }
    },
    [],
  );

  useEffect(() => {
    fetchFaculties();
  }, [fetchFaculties]);

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRole(event.target.value);
  };

  const handleFacultyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFaculty(event.target.value);
  };

  const openForm = (formRole: Extract<UserRole, "TUTOR" | "TUTORANDO">, mode: "create" | "edit", user: AdminUser | null = null) => {
    setFormError(null);
    setFormState({
      open: true,
      role: formRole,
      mode,
      user,
    });
  };

  const closeForm = () => {
    setFormError(null);
    setFormState((prev) => ({ ...prev, open: false, user: null }));
  };

  const handleFormSubmit = async (values: TutorandoFormPayload) => {
    if (!formState.open) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
        if (formState.mode === "create") {
            if (formState.role === "TUTOR") {
                const { enrollment_code, ...tutorPayload } = values;
                await api.post("/admin/tutors", tutorPayload);
            } else {
                await api.post("/admin/tutorandos", values);
            }
        } else if (formState.mode === "edit" && formState.user) {
            if (formState.role === "TUTOR") {
                const { enrollment_code, ...tutorPayload } = values;
                await api.put(`/admin/tutors/${formState.user.id}`, tutorPayload);
            } else {
                await api.put(`/admin/tutorandos/${formState.user.id}`, values);
            }
        }
      closeForm();
      await fetchUsers(role);
    } catch (err) {
      setFormError(parseApiError(err).message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const buildInitialValues = (user: AdminUser | null): Partial<TutorandoFormPayload> => {
    if (!user) return {};
    const profile = user.profile;
    const birthdateIso = (profile as any).birthdate ? (profile as any).birthdate.slice(0, 10) : "";
    return {
      dni: user.dni,
      first_name: profile.first_name,
      last_name_father: profile.last_name_father,
      last_name_mother: profile.last_name_mother,
      email: profile.email,
      gender: profile.gender,
      phone: profile.phone,
      birthdate: birthdateIso,
      address: profile.address,
      faculty: profile.faculty,
      school: profile.school,
      department: profile.department,
      province: profile.province,
      district: profile.district,
      enrollment_code: user.enrollment_code ?? "",
    };
  };

  const selectedInitialValues = buildInitialValues(formState.user);
  const canEdit = (user: AdminUser) => user.role === "TUTOR" || user.role === "TUTORANDO";
  const canDisable = (user: AdminUser) => user.role !== "ADMIN";

  const handleDisable = async (user: AdminUser) => {
    if (!canDisable(user)) return;
    if (!window.confirm(`¿Seguro que deseas desactivar a ${user.profile.first_name}?`)) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      await fetchUsers(role);
    } catch (err) {
      alert(parseApiError(err).message);
    }
  };

  const filteredUsers = users
    .filter((user) => (faculty ? user.profile.faculty === faculty : true))
    .filter((user) => (role ? user.role === role : true))
    .sort((a, b) => {
      const nameA = `${a.profile.last_name_father} ${a.profile.last_name_mother} ${a.profile.first_name}`.toLocaleLowerCase();
      const nameB = `${b.profile.last_name_father} ${b.profile.last_name_mother} ${b.profile.first_name}`.toLocaleLowerCase();
      return nameA.localeCompare(nameB);
    });

  const tutors = filteredUsers.filter((u) => u.role === "TUTOR");
  const tutorandos = filteredUsers.filter((u) => u.role === "TUTORANDO");

  return (
    <div>
      {/* Header Section */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{
          margin: "0 0 0.5rem 0",
          fontSize: "2rem",
          fontWeight: "700",
          color: "var(--gray-900)",
          letterSpacing: "-0.025em"
        }}>
          Usuarios del sistema
        </h2>
        <p style={{ margin: 0, color: "var(--gray-600)", fontSize: "1rem" }}>
          Gestiona tutores y tutorados de la plataforma
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "2rem",
        marginBottom: "2.5rem"
      }}>
        {/* Total Users Card */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)",
            borderRadius: "20px",
            padding: "2rem",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
            cursor: "pointer",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            animation: "slideInUp 0.6s ease-out"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 20px 60px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";
          }}
        >
          {/* Pattern Background */}
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "200px",
            height: "200px",
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: "translate(30%, -30%)",
            pointerEvents: "none"
          }} />

          <div style={{ position: "relative", zIndex: 1, color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.875rem",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                  backdropFilter: "blur(10px)"
                }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Total
                </div>
                <div style={{
                  fontSize: "3.5rem",
                  fontWeight: "800",
                  lineHeight: "1",
                  marginBottom: "0.5rem",
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}>
                  {filteredUsers.length}
                </div>
                <div style={{
                  fontSize: "1rem",
                  fontWeight: "500",
                  opacity: 0.95,
                  letterSpacing: "0.025em"
                }}>
                  Usuarios registrados
                </div>
              </div>

              <div style={{
                width: "72px",
                height: "72px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.2)",
                transition: "transform 0.3s ease"
              }}>
                <svg width="36" height="36" viewBox="0 0 20 20" fill="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
            </div>

            {/* Progress bar decorative */}
            <div style={{
              height: "4px",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "2px",
              overflow: "hidden"
            }}>
              <div style={{
                height: "100%",
                width: "100%",
                background: "rgba(255, 255, 255, 0.5)",
                borderRadius: "2px",
                animation: "shimmer 2s infinite"
              }} />
            </div>
          </div>
        </div>

        {/* Tutores Card */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)",
            borderRadius: "20px",
            padding: "2rem",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(6, 182, 212, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
            cursor: "pointer",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            animation: "slideInUp 0.6s ease-out 0.1s both"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 20px 60px rgba(6, 182, 212, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(6, 182, 212, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";
          }}
        >
          {/* Pattern Background */}
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "200px",
            height: "200px",
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: "translate(30%, -30%)",
            pointerEvents: "none"
          }} />

          <div style={{ position: "relative", zIndex: 1, color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.875rem",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                  backdropFilter: "blur(10px)"
                }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                  </svg>
                  Tutores
                </div>
                <div style={{
                  fontSize: "3.5rem",
                  fontWeight: "800",
                  lineHeight: "1",
                  marginBottom: "0.5rem",
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}>
                  {tutors.length}
                </div>
                <div style={{
                  fontSize: "1rem",
                  fontWeight: "500",
                  opacity: 0.95,
                  letterSpacing: "0.025em"
                }}>
                  Docentes activos
                </div>
              </div>

              <div style={{
                width: "72px",
                height: "72px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.2)",
                transition: "transform 0.3s ease"
              }}>
                <svg width="36" height="36" viewBox="0 0 20 20" fill="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
            </div>

            {/* Progress bar decorative */}
            <div style={{
              height: "4px",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "2px",
              overflow: "hidden"
            }}>
              <div style={{
                height: "100%",
                width: `${tutors.length > 0 ? Math.min((tutors.length / filteredUsers.length) * 100, 100) : 0}%`,
                background: "rgba(255, 255, 255, 0.5)",
                borderRadius: "2px",
                transition: "width 1s ease"
              }} />
            </div>
          </div>
        </div>

        {/* Tutorados Card */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(135deg, #2c5f8d 0%, #1e4976 50%, #1a365d 100%)",
            borderRadius: "20px",
            padding: "2rem",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(44, 95, 141, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
            cursor: "pointer",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            animation: "slideInUp 0.6s ease-out 0.2s both"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 20px 60px rgba(44, 95, 141, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(44, 95, 141, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";
          }}
        >
          {/* Pattern Background */}
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "200px",
            height: "200px",
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: "translate(30%, -30%)",
            pointerEvents: "none"
          }} />

          <div style={{ position: "relative", zIndex: 1, color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.875rem",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                  backdropFilter: "blur(10px)"
                }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Tutorados
                </div>
                <div style={{
                  fontSize: "3.5rem",
                  fontWeight: "800",
                  lineHeight: "1",
                  marginBottom: "0.5rem",
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}>
                  {tutorandos.length}
                </div>
                <div style={{
                  fontSize: "1rem",
                  fontWeight: "500",
                  opacity: 0.95,
                  letterSpacing: "0.025em"
                }}>
                  Estudiantes activos
                </div>
              </div>

              <div style={{
                width: "72px",
                height: "72px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.2)",
                transition: "transform 0.3s ease"
              }}>
                <svg width="36" height="36" viewBox="0 0 20 20" fill="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Progress bar decorative */}
            <div style={{
              height: "4px",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "2px",
              overflow: "hidden"
            }}>
              <div style={{
                height: "100%",
                width: `${tutorandos.length > 0 ? Math.min((tutorandos.length / filteredUsers.length) * 100, 100) : 0}%`,
                background: "rgba(255, 255, 255, 0.5)",
                borderRadius: "2px",
                transition: "width 1s ease"
              }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Filters and Actions */}
      <div className="card" style={{ marginBottom: "2rem", padding: "2rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          alignItems: "end"
        }}>
          {/* Filter by Role */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--gray-700)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--primary-600)" }}>
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filtrar por rol
            </label>
            <select
              value={role}
              onChange={handleRoleChange}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "2px solid var(--gray-200)",
                fontSize: "0.9375rem",
                background: "var(--white)",
                cursor: "pointer",
                transition: "all 0.2s",
                fontWeight: "500"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--primary-500)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--gray-200)"}
            >
              {roleFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Faculty */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--gray-700)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--primary-600)" }}>
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
              </svg>
              Filtrar por facultad
            </label>
            <select
              value={faculty}
              onChange={handleFacultyChange}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "2px solid var(--gray-200)",
                fontSize: "0.9375rem",
                background: "var(--white)",
                cursor: "pointer",
                transition: "all 0.2s",
                fontWeight: "500"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--primary-500)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--gray-200)"}
            >
              <option value="">Todas las facultades</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchUsers(role)}
            disabled={loading}
            style={{
              padding: "0.75rem 1.5rem",
              background: "var(--gray-100)",
              border: "2px solid var(--gray-200)",
              borderRadius: "10px",
              color: "var(--gray-700)",
              fontWeight: "600",
              fontSize: "0.9375rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "var(--gray-200)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--gray-100)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {loading ? "Actualizando..." : "Refrescar"}
          </button>

          {/* Register Tutor */}
          <button
            type="button"
            className="btn-primary--tutor"
            onClick={() => openForm("TUTOR", "create")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "linear-gradient(135deg, var(--role-tutor-600) 0%, var(--role-tutor-700) 100%)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontWeight: "600",
              fontSize: "0.9375rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(8, 145, 178, 0.25)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(8, 145, 178, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(8, 145, 178, 0.25)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Registrar tutor
          </button>

          {/* Register Tutorado */}
          <button
            type="button"
            className="btn-primary--tutorando"
            onClick={() => openForm("TUTORANDO", "create")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "linear-gradient(135deg, var(--role-tutorando-600) 0%, var(--role-tutorando-700) 100%)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontWeight: "600",
              fontSize: "0.9375rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(44, 95, 141, 0.25)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(44, 95, 141, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(44, 95, 141, 0.25)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Registrar tutorado
          </button>
        </div>
      </div>

      {(error || catalogError) && (
        <div style={{
          padding: "1rem 1.5rem",
          background: "var(--error-light)",
          border: "2px solid var(--error)",
          borderRadius: "12px",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="var(--error)">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span style={{ color: "var(--error)", fontWeight: "500" }}>{error ?? catalogError}</span>
        </div>
      )}

      <UserTable
        title="Tutores"
        users={tutors}
        canEdit={canEdit}
        canDisable={canDisable}
        openForm={openForm}
        handleDisable={handleDisable}
        loading={loading}
        onViewDetails={setDetailsUser}
      />
      <UserTable
        title="Tutorados"
        users={tutorandos}
        canEdit={canEdit}
        canDisable={canDisable}
        openForm={openForm}
        handleDisable={handleDisable}
        loading={loading}
        onViewDetails={setDetailsUser}
      />

      {formState.open && (
        <Modal
          title={formState.mode === "create" ? `Registrar ${formState.role === "TUTOR" ? "tutor" : "tutorado"}` : "Editar usuario"}
          onClose={closeForm}
        >
          <UserForm
            role={formState.role}
            mode={formState.mode}
            initialValues={selectedInitialValues}
            isSubmitting={formSubmitting}
            error={formError}
            onSubmit={handleFormSubmit}
            onCancel={closeForm}
          />
        </Modal>
      )}

      {detailsUser && (
        <Modal
          title="Detalles del usuario"
          onClose={() => setDetailsUser(null)}
        >
          <UserDetailsContent user={detailsUser} />
        </Modal>
      )}
    </div>
  );
}

function UserTable({
  title,
  users,
  canEdit,
  canDisable,
  openForm,
  handleDisable,
  loading,
  onViewDetails,
}: {
  title: string;
  users: AdminUser[];
  canEdit: (u: AdminUser) => boolean;
  canDisable: (u: AdminUser) => boolean;
  openForm: (role: Extract<UserRole, "TUTOR" | "TUTORANDO">, mode: "create" | "edit", user?: AdminUser | null) => void;
  handleDisable: (u: AdminUser) => void;
  loading: boolean;
  onViewDetails: (user: AdminUser) => void;
}) {
  const isTutor = title === "Tutores";

  return (
    <div style={{ marginBottom: "3rem" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "1.5rem"
      }}>
        <h3 style={{
          margin: 0,
          fontSize: "1.75rem",
          fontWeight: "700",
          color: "var(--gray-900)",
          letterSpacing: "-0.025em"
        }}>
          {title}
        </h3>
        <span style={{
          padding: "0.5rem 1rem",
          background: isTutor
            ? "linear-gradient(135deg, var(--role-tutor-100), var(--role-tutor-200))"
            : "linear-gradient(135deg, var(--role-tutorando-200), var(--role-tutorando-300))",
          borderRadius: "12px",
          fontSize: "0.9375rem",
          fontWeight: "700",
          color: isTutor ? "var(--role-tutor-800)" : "var(--role-tutorando-900)",
          boxShadow: isTutor
            ? "0 4px 12px rgba(6, 182, 212, 0.15)"
            : "0 4px 12px rgba(44, 95, 141, 0.15)"
        }}>
          {users.length}
        </span>
      </div>

      {users.length === 0 && !loading ? (
        <div style={{
          textAlign: "center",
          padding: "5rem 2rem",
          background: "var(--gray-50)",
          borderRadius: "20px",
          border: "2px dashed var(--gray-200)"
        }}>
          <svg width="80" height="80" viewBox="0 0 20 20" fill="currentColor" style={{
            margin: "0 auto 2rem",
            opacity: 0.15,
            color: "var(--gray-400)"
          }}>
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <div style={{ fontWeight: "700", fontSize: "1.25rem", marginBottom: "0.75rem", color: "var(--gray-700)" }}>
            No se encontraron usuarios
          </div>
          <div style={{ fontSize: "1rem", color: "var(--gray-500)" }}>
            Prueba con otro filtro o registra nuevos usuarios
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "1.5rem"
        }}>
          {users.map((user, index) => (
            <div
              key={user.id}
              style={{
                position: "relative",
                background: "white",
                borderRadius: "20px",
                border: "2px solid var(--gray-100)",
                overflow: "hidden",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = user.role === "TUTOR"
                  ? "0 20px 60px rgba(6, 182, 212, 0.25)"
                  : "0 20px 60px rgba(44, 95, 141, 0.25)";
                e.currentTarget.style.borderColor = user.role === "TUTOR"
                  ? "var(--role-tutor-200)"
                  : "var(--role-tutorando-300)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "var(--gray-100)";
              }}
            >
              {/* Header with Gradient Background */}
              <div style={{
                position: "relative",
                background: user.role === "TUTOR"
                  ? "linear-gradient(135deg, var(--role-tutor-600) 0%, var(--role-tutor-700) 100%)"
                  : "linear-gradient(135deg, var(--role-tutorando-600) 0%, var(--role-tutorando-700) 100%)",
                padding: "2rem 1.5rem 4rem 1.5rem",
                overflow: "hidden"
              }}>
                {/* Decorative Pattern */}
                <div style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: "150px",
                  height: "150px",
                  background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)",
                  borderRadius: "50%",
                  pointerEvents: "none"
                }} />

                {/* Status Badge */}
                <div style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  padding: "0.5rem 0.875rem",
                  background: user.is_active
                    ? "rgba(34, 197, 94, 0.25)"
                    : "rgba(239, 68, 68, 0.25)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "8px",
                  border: user.is_active
                    ? "1px solid rgba(34, 197, 94, 0.3)"
                    : "1px solid rgba(239, 68, 68, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "white",
                  fontSize: "0.8125rem",
                  fontWeight: "600"
                }}>
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "white"
                  }}></span>
                  {user.is_active ? "Activo" : "Inactivo"}
                </div>

                {/* Role Badge */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  background: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "white",
                  fontSize: "0.8125rem",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    {user.role === "TUTOR" ? (
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                    ) : (
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    )}
                  </svg>
                  {user.role === "TUTORANDO" ? "Tutorado" : user.role}
                </div>
              </div>

              {/* Avatar Container - Overlapping */}
              <div style={{
                position: "relative",
                marginTop: "-3rem",
                marginBottom: "1rem",
                display: "flex",
                justifyContent: "center"
              }}>
                <div style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "24px",
                  background: user.role === "TUTOR"
                    ? "linear-gradient(135deg, var(--role-tutor-400), var(--role-tutor-500))"
                    : "linear-gradient(135deg, var(--role-tutorando-400), var(--role-tutorando-500))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "700",
                  fontSize: "2rem",
                  border: "4px solid white",
                  boxShadow: user.role === "TUTOR"
                    ? "0 8px 32px rgba(6, 182, 212, 0.4)"
                    : "0 8px 32px rgba(44, 95, 141, 0.4)",
                  position: "relative",
                  zIndex: 1
                }}>
                  {user.profile.first_name.charAt(0)}{user.profile.last_name_father.charAt(0)}
                </div>
              </div>

              {/* User Info */}
              <div style={{ padding: "0 1.5rem 1.5rem 1.5rem" }}>
                <div style={{
                  textAlign: "center",
                  marginBottom: "1.5rem"
                }}>
                  <h4 style={{
                    margin: "0 0 0.375rem 0",
                    fontSize: "1.125rem",
                    fontWeight: "700",
                    color: "var(--gray-900)",
                    lineHeight: "1.3"
                  }}>
                    {user.profile.first_name}
                  </h4>
                  <p style={{
                    margin: "0 0 0.75rem 0",
                    fontSize: "0.9375rem",
                    fontWeight: "600",
                    color: "var(--gray-600)"
                  }}>
                    {user.profile.last_name_father} {user.profile.last_name_mother}
                  </p>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    background: "var(--gray-50)",
                    borderRadius: "8px",
                    fontSize: "0.8125rem",
                    color: "var(--gray-600)",
                    maxWidth: "100%",
                    overflow: "hidden"
                  }}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {user.profile.email}
                    </span>
                  </div>
                </div>

                {/* Additional Info */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1.5rem"
                }}>
                  <div style={{
                    padding: "0.875rem",
                    background: "var(--gray-50)",
                    borderRadius: "10px",
                    border: "1px solid var(--gray-100)"
                  }}>
                    <div style={{
                      fontSize: "0.6875rem",
                      fontWeight: "600",
                      color: "var(--gray-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.25rem"
                    }}>
                      DNI
                    </div>
                    <div style={{
                      fontSize: "0.875rem",
                      fontWeight: "700",
                      color: "var(--gray-900)"
                    }}>
                      {user.dni}
                    </div>
                  </div>
                  {user.enrollment_code && (
                    <div style={{
                      padding: "0.875rem",
                      background: "var(--gray-50)",
                      borderRadius: "10px",
                      border: "1px solid var(--gray-100)"
                    }}>
                      <div style={{
                        fontSize: "0.6875rem",
                        fontWeight: "600",
                        color: "var(--gray-500)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "0.25rem"
                      }}>
                        Código
                      </div>
                      <div style={{
                        fontSize: "0.875rem",
                        fontWeight: "700",
                        color: "var(--gray-900)"
                      }}>
                        {user.enrollment_code}
                      </div>
                    </div>
                  )}
                </div>

                {/* Faculty */}
                <div style={{
                  padding: "0.875rem",
                  background: user.role === "TUTOR"
                    ? "var(--role-tutor-light)"
                    : "var(--role-tutorando-light)",
                  borderRadius: "10px",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    background: "white",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: user.role === "TUTOR" ? "var(--role-tutor-600)" : "var(--role-tutorando-600)",
                    flexShrink: 0
                  }}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.6875rem",
                      fontWeight: "600",
                      color: user.role === "TUTOR" ? "var(--role-tutor-700)" : "var(--role-tutorando-800)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.125rem"
                    }}>
                      Facultad
                    </div>
                    <div style={{
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      color: user.role === "TUTOR" ? "var(--role-tutor-900)" : "var(--role-tutorando-900)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {user.profile.faculty}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: "flex",
                  gap: "0.625rem"
                }}>
                  <button
                    type="button"
                    onClick={() => onViewDetails(user)}
                    title="Ver detalles"
                    style={{
                      flex: 1,
                      padding: "0.75rem 1rem",
                      background: user.role === "TUTOR"
                        ? "linear-gradient(135deg, var(--role-tutor-600), var(--role-tutor-700))"
                        : "linear-gradient(135deg, var(--role-tutorando-600), var(--role-tutorando-700))",
                      border: "none",
                      borderRadius: "10px",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      transition: "all 0.2s",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      boxShadow: user.role === "TUTOR"
                        ? "0 4px 12px rgba(6, 182, 212, 0.25)"
                        : "0 4px 12px rgba(44, 95, 141, 0.25)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = user.role === "TUTOR"
                        ? "0 6px 20px rgba(6, 182, 212, 0.35)"
                        : "0 6px 20px rgba(44, 95, 141, 0.35)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = user.role === "TUTOR"
                        ? "0 4px 12px rgba(6, 182, 212, 0.25)"
                        : "0 4px 12px rgba(44, 95, 141, 0.25)";
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Ver detalles
                  </button>

                  {canEdit(user) && (
                    <button
                      type="button"
                      onClick={() => openForm(user.role as Extract<UserRole, "TUTOR" | "TUTORANDO">, "edit", user)}
                      title="Editar usuario"
                      style={{
                        padding: "0.75rem",
                        background: "white",
                        border: "2px solid var(--gray-200)",
                        borderRadius: "10px",
                        color: "var(--gray-600)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = user.role === "TUTOR"
                          ? "var(--role-tutor-light)"
                          : "var(--role-tutorando-light)";
                        e.currentTarget.style.borderColor = user.role === "TUTOR"
                          ? "var(--role-tutor-500)"
                          : "var(--role-tutorando-500)";
                        e.currentTarget.style.color = user.role === "TUTOR"
                          ? "var(--role-tutor-700)"
                          : "var(--role-tutorando-700)";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.borderColor = "var(--gray-200)";
                        e.currentTarget.style.color = "var(--gray-600)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  )}

                  {canDisable(user) && (
                    <button
                      type="button"
                      onClick={() => handleDisable(user)}
                      title="Desactivar usuario"
                      style={{
                        padding: "0.75rem",
                        background: "white",
                        border: "2px solid var(--gray-200)",
                        borderRadius: "10px",
                        color: "var(--gray-600)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--error)";
                        e.currentTarget.style.borderColor = "var(--error)";
                        e.currentTarget.style.color = "white";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.borderColor = "var(--gray-200)";
                        e.currentTarget.style.color = "var(--gray-600)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function UserDetailsContent({ user }: { user: AdminUser }) {
  return (
    <div>
      {/* Header con avatar grande */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        padding: "2rem",
        background: user.role === "TUTOR"
          ? "linear-gradient(135deg, var(--role-tutor-500), var(--role-tutor-600))"
          : "linear-gradient(135deg, var(--role-tutorando-500), var(--role-tutorando-600))",
        borderRadius: "12px",
        marginBottom: "2rem",
        color: "white"
      }}>
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.2)",
          border: "3px solid rgba(255, 255, 255, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2rem",
          fontWeight: "700",
          flexShrink: 0
        }}>
          {user.profile.first_name.charAt(0)}{user.profile.last_name_father.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.75rem", fontWeight: "700" }}>
            {user.profile.first_name} {user.profile.last_name_father} {user.profile.last_name_mother}
          </h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <span style={{
              padding: "0.375rem 0.875rem",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem"
            }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                {user.role === "TUTOR" ? (
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                ) : (
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                )}
              </svg>
              {user.role === "TUTORANDO" ? "Tutorado" : user.role}
            </span>
            <span style={{
              padding: "0.375rem 0.875rem",
              background: user.is_active ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem"
            }}>
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "white"
              }}></span>
              {user.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de información */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1.5rem"
      }}>
        <InfoCard
          icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" /></svg>}
          label="DNI"
          value={user.dni}
        />
        <InfoCard
          icon={<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>}
          label="Correo electrónico"
          value={user.profile.email}
        />
        <InfoCard
          icon={<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>}
          label="Teléfono"
          value={user.profile.phone || "—"}
        />
        <InfoCard
          icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
          label="Género"
          value={user.profile.gender === "MASCULINO" ? "Masculino" : user.profile.gender === "FEMENINO" ? "Femenino" : user.profile.gender === "OTRO" ? "Otro" : "—"}
        />
        {(user.profile as any).birthdate && (
          <InfoCard
            icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
            label="Fecha de nacimiento"
            value={new Date((user.profile as any).birthdate).toLocaleDateString("es-PE", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          />
        )}
        {user.enrollment_code && (
          <InfoCard
            icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /><path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" /></svg>}
            label="Código de matrícula"
            value={user.enrollment_code}
          />
        )}
        <InfoCard
          icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>}
          label="Facultad"
          value={user.profile.faculty}
        />
        <InfoCard
          icon={<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" /></svg>}
          label="Escuela Profesional"
          value={user.profile.school}
        />
        <InfoCard
          icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
          label="Dirección"
          value={user.profile.address || "—"}
        />
        <InfoCard
          icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" /></svg>}
          label="Ubicación"
          value={[user.profile.district, user.profile.province, user.profile.department].filter(Boolean).join(", ") || "—"}
        />
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      padding: "1.5rem",
      background: "var(--gray-50)",
      borderRadius: "12px",
      border: "2px solid var(--gray-100)",
      transition: "all 0.2s"
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--primary-200)";
        e.currentTarget.style.background = "var(--primary-50)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--gray-100)";
        e.currentTarget.style.background = "var(--gray-50)";
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "0.75rem"
      }}>
        <div style={{
          width: "36px",
          height: "36px",
          background: "var(--primary-100)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--primary-600)"
        }}>
          <div style={{ width: "18px", height: "18px" }}>
            {icon}
          </div>
        </div>
        <div style={{
          fontSize: "0.8125rem",
          fontWeight: "600",
          color: "var(--gray-600)",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          {label}
        </div>
      </div>
      <div style={{
        fontSize: "1rem",
        fontWeight: "600",
        color: "var(--gray-900)",
        wordBreak: "break-word"
      }}>
        {value}
      </div>
    </div>
  );
}
