import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { genderOptions } from "../data/options";
import type { Faculty, School } from "../types/catalogs";
import type { TutorandoFormPayload, UserRole } from "../types/users";

interface UserFormProps {
  role: Extract<UserRole, "TUTOR" | "TUTORANDO">;
  mode: "create" | "edit";
  initialValues?: Partial<TutorandoFormPayload>;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: (values: TutorandoFormPayload) => Promise<void> | void;
  onCancel: () => void;
}

const emptyValues: TutorandoFormPayload = {
  dni: "",
  first_name: "",
  last_name_father: "",
  last_name_mother: "",
  email: "",
  gender: "MASCULINO",
  phone: "",
  birthdate: "",
  address: "",
  faculty: "",
  school: "",
  department: "",
  province: "",
  district: "",
  enrollment_code: "",
};

export function UserForm({
  role,
  mode,
  initialValues,
  isSubmitting = false,
  error,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const [values, setValues] = useState<TutorandoFormPayload>({ ...emptyValues, ...initialValues });
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState<boolean>(false);

  useEffect(() => {
    setValues((prev) => ({ ...prev, ...emptyValues, ...initialValues }));
  }, [initialValues]);

  useEffect(() => {
    void loadFaculties(initialValues?.faculty, initialValues?.school);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues?.faculty, initialValues?.school]);

  const loadFaculties = async (preferredFaculty?: string, preferredSchool?: string) => {
    setLoadingCatalogs(true);
    setCatalogError(null);
    try {
      const { data } = await api.get<Faculty[]>("/catalogs/faculties");
      setFaculties(data);

      // Find preferred faculty or use first one
      let selectedFaculty: Faculty | null = null;
      if (preferredFaculty) {
        selectedFaculty = data.find((faculty) => faculty.name === preferredFaculty) ?? null;
      }
      if (!selectedFaculty && data.length > 0) {
        selectedFaculty = data[0];
      }

      const selectedFacultyName = selectedFaculty?.name ?? "";
      setValues((prev) => ({ ...prev, faculty: selectedFacultyName }));

      if (selectedFaculty?.id) {
        await loadSchools(selectedFaculty.id, preferredSchool);
      } else {
        setSchools([]);
        setValues((prev) => ({ ...prev, school: "" }));
      }
    } catch (err) {
      setCatalogError(parseApiError(err).message);
      setFaculties([]);
      setSchools([]);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const loadSchools = async (facultyId: string, preferredSchool?: string) => {
    try {
      const { data } = await api.get<School[]>("/catalogs/schools", { params: { faculty_id: facultyId } });
      setSchools(data);

      // Find preferred school or use first one
      let selectedSchool: School | null = null;
      if (preferredSchool) {
        selectedSchool = data.find((school) => school.name === preferredSchool) ?? null;
      }
      if (!selectedSchool && data.length > 0) {
        selectedSchool = data[0];
      }

      setValues((prev) => ({ ...prev, school: selectedSchool?.name ?? "" }));
    } catch (err) {
      setCatalogError(parseApiError(err).message);
      setSchools([]);
      setValues((prev) => ({ ...prev, school: "" }));
    }
  };

  const handleChange =
    (field: keyof TutorandoFormPayload) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      if (field === "faculty") {
        const selectedFaculty = faculties.find((faculty) => faculty.name === value);
        setValues((prev) => ({
          ...prev,
          faculty: value,
          school: "",
        }));
        if (selectedFaculty?.id) {
          void loadSchools(selectedFaculty.id);
        } else {
          setSchools([]);
        }
        return;
      }
      if (field === "phone") {
        if (!/^\d{0,9}$/.test(value)) {
          return;
        }
      }
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (role === "TUTOR") {
      const { enrollment_code, ...base } = values;
      onSubmit({ ...base, enrollment_code: "" });
    } else {
      onSubmit(values);
    }
  };

  const title =
    mode === "create" ? `Registrar ${role === "TUTOR" ? "tutor" : "tutorado"}` : `Editar ${role === "TUTOR" ? "tutor" : "tutorado"}`;

  const roleColor = role === "TUTOR" ? "var(--role-tutor-500)" : "var(--role-tutorando-500)";
  const roleColorDark = role === "TUTOR" ? "var(--role-tutor-700)" : "var(--role-tutorando-700)";

  // Función auxiliar para generar opciones de select
  const getFacultyOptions = (): Array<{ value: string; label: string }> => {
    if (loadingCatalogs) return [{ value: "", label: "Cargando..." }];
    if (faculties.length === 0) return [{ value: "", label: "Sin datos" }];
    return faculties.map((f) => ({ value: f.name, label: f.name }));
  };

  const getSchoolOptions = (): Array<{ value: string; label: string }> => {
    if (loadingCatalogs) return [{ value: "", label: "Cargando..." }];
    if (schools.length === 0) return [{ value: "", label: "Sin datos" }];
    return schools.map((s) => ({ value: s.name, label: s.name }));
  };

  return (
    <div>
      {/* Header con badge del rol */}
      <div style={{
        padding: "1.5rem 2rem",
        background: `linear-gradient(135deg, ${roleColor}, ${roleColorDark})`,
        borderRadius: "12px",
        marginBottom: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.375rem 0.875rem",
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "0.75rem",
            backdropFilter: "blur(10px)",
            color: "white"
          }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              {role === "TUTOR" ? (
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              ) : (
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              )}
            </svg>
            {role === "TUTOR" ? "Tutor" : "Tutorado"}
          </div>
          <h3 style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: "700",
            color: "white",
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
          }}>
            {title}
          </h3>
        </div>
        <div style={{
          width: "64px",
          height: "64px",
          background: "rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.2)"
        }}>
          <svg width="32" height="32" viewBox="0 0 20 20" fill="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>
            {mode === "create" ? (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            ) : (
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            )}
          </svg>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Sección: Información Personal */}
        <div style={{ marginBottom: "2rem" }}>
          <h4 style={{
            margin: "0 0 1.25rem 0",
            fontSize: "0.875rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--gray-600)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: roleColor }}>
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            Información Personal
          </h4>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem"
          }}>
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>}
              label="DNI"
              value={values.dni}
              onChange={handleChange("dni")}
              required
              placeholder="Ej: 12345678"
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
              label="Nombres"
              value={values.first_name}
              onChange={handleChange("first_name")}
              required
              placeholder="Ej: Juan Carlos"
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
              label="Apellido paterno"
              value={values.last_name_father}
              onChange={handleChange("last_name_father")}
              required
              placeholder="Ej: Pérez"
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
              label="Apellido materno"
              value={values.last_name_mother}
              onChange={handleChange("last_name_mother")}
              required
              placeholder="Ej: García"
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
              label="Género"
              type="select"
              value={values.gender}
              onChange={handleChange("gender")}
              options={genderOptions}
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
              label="Fecha de nacimiento"
              type="date"
              value={values.birthdate}
              onChange={handleChange("birthdate")}
              required
              roleColor={roleColor}
            />
          </div>
        </div>

        {/* Sección: Contacto */}
        <div style={{ marginBottom: "2rem" }}>
          <h4 style={{
            margin: "0 0 1.25rem 0",
            fontSize: "0.875rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--gray-600)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: roleColor }}>
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Contacto
          </h4>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem"
          }}>
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>}
              label="Correo electrónico"
              type="email"
              value={values.email}
              onChange={handleChange("email")}
              required
              placeholder="correo@ejemplo.com"
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>}
              label="Teléfono"
              value={values.phone}
              onChange={handleChange("phone")}
              required
              maxLength={9}
              placeholder="999999999"
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
              label="Dirección"
              value={values.address}
              onChange={handleChange("address")}
              required
              placeholder="Av. Principal 123"
              style={{ gridColumn: "1 / -1" }}
              roleColor={roleColor}
            />
          </div>
        </div>

        {/* Sección: Ubicación */}
        <div style={{ marginBottom: "2rem" }}>
          <h4 style={{
            margin: "0 0 1.25rem 0",
            fontSize: "0.875rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--gray-600)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: roleColor }}>
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Ubicación
          </h4>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem"
          }}>
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
              label="Departamento"
              value={values.department}
              onChange={handleChange("department")}
              required
              placeholder="Ej: Puno"
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
              label="Provincia"
              value={values.province}
              onChange={handleChange("province")}
              required
              placeholder="Ej: Puno"
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
              label="Distrito"
              value={values.district}
              onChange={handleChange("district")}
              required
              placeholder="Ej: Puno"
              roleColor={roleColor}
            />
          </div>
        </div>

        {/* Sección: Información Académica */}
        <div style={{ marginBottom: "2rem" }}>
          <h4 style={{
            margin: "0 0 1.25rem 0",
            fontSize: "0.875rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--gray-600)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ color: roleColor }}>
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            Información Académica
          </h4>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem"
          }}>
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" /></svg>}
              label="Facultad"
              type="select"
              value={values.faculty}
              onChange={handleChange("faculty")}
              disabled={loadingCatalogs || faculties.length === 0}
              options={getFacultyOptions()}
              roleColor={roleColor}
            />
            <FormField
              icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
              label="Escuela profesional"
              type="select"
              value={values.school}
              onChange={handleChange("school")}
              disabled={loadingCatalogs || schools.length === 0}
              options={getSchoolOptions()}
              roleColor={roleColor}
            />
            {role === "TUTORANDO" && (
              <FormField
                icon={<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>}
                label="Código de matrícula"
                value={values.enrollment_code}
                onChange={handleChange("enrollment_code")}
                required
                placeholder="Ej: 2024001234"
                roleColor={roleColor}
              />
            )}
          </div>
        </div>

        {/* Error */}
        {(error || catalogError) && (
          <div style={{
            padding: "1rem 1.25rem",
            background: "var(--error-light)",
            border: "1px solid var(--error)",
            borderRadius: "10px",
            marginBottom: "1.5rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start"
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--error)", flexShrink: 0, marginTop: "0.125rem" }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--error)", fontWeight: "500" }}>
              {error ?? catalogError}
            </p>
          </div>
        )}

        {/* Botones */}
        <div style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "flex-end",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--gray-200)"
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.875rem 1.75rem",
              background: "var(--white)",
              border: "2px solid var(--gray-300)",
              borderRadius: "10px",
              color: "var(--gray-700)",
              fontWeight: "600",
              fontSize: "0.9375rem",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gray-100)";
              e.currentTarget.style.borderColor = "var(--gray-400)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--white)";
              e.currentTarget.style.borderColor = "var(--gray-300)";
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "0.875rem 1.75rem",
              background: `linear-gradient(135deg, ${roleColor}, ${roleColorDark})`,
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontWeight: "600",
              fontSize: "0.9375rem",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: role === "TUTOR" ? "0 4px 12px rgba(8, 145, 178, 0.3)" : "0 4px 12px rgba(44, 95, 141, 0.3)",
              opacity: isSubmitting ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = role === "TUTOR" ? "0 6px 20px rgba(8, 145, 178, 0.4)" : "0 6px 20px rgba(44, 95, 141, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = role === "TUTOR" ? "0 4px 12px rgba(8, 145, 178, 0.3)" : "0 4px 12px rgba(44, 95, 141, 0.3)";
            }}
          >
            {isSubmitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite" }}>
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  {mode === "create" ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  )}
                </svg>
                {mode === "create" ? "Guardar" : "Actualizar"}
              </>
            )}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </form>
    </div>
  );
}

// Componente auxiliar para campos de formulario
function FormField({
  icon,
  label,
  type = "text",
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
  maxLength,
  options,
  style,
  roleColor
}: {
  icon: React.ReactNode;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  options?: Array<{ value: string; label: string }>;
  style?: React.CSSProperties;
  roleColor: string;
}) {
  const baseInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.875rem 1rem 0.875rem 2.75rem",
    border: "2px solid var(--gray-200)",
    borderRadius: "10px",
    fontSize: "0.9375rem",
    fontWeight: "500",
    color: "var(--gray-900)",
    background: "var(--white)",
    transition: "all 0.2s",
    outline: "none"
  };

  const [isFocused, setIsFocused] = useState(false);

  return (
    <label style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.5rem", ...style }}>
      <span style={{
        fontSize: "0.8125rem",
        fontWeight: "600",
        color: "var(--gray-700)",
        display: "flex",
        alignItems: "center",
        gap: "0.25rem"
      }}>
        {label}
        {required && <span style={{ color: "var(--error)" }}>*</span>}
      </span>
      <div style={{ position: "relative" }}>
        <div style={{
          position: "absolute",
          left: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          width: "18px",
          height: "18px",
          color: isFocused ? roleColor : "var(--gray-400)",
          transition: "color 0.2s",
          pointerEvents: "none"
        }}>
          {icon}
        </div>
        {type === "select" ? (
          <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            style={{
              ...baseInputStyle,
              cursor: disabled ? "not-allowed" : "pointer",
              borderColor: isFocused ? roleColor : "var(--gray-200)",
              boxShadow: isFocused ? `0 0 0 3px ${roleColor}20` : "none"
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            style={{
              ...baseInputStyle,
              cursor: disabled ? "not-allowed" : "text",
              borderColor: isFocused ? roleColor : "var(--gray-200)",
              boxShadow: isFocused ? `0 0 0 3px ${roleColor}20` : "none"
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        )}
      </div>
    </label>
  );
}
