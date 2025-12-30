export type UserRole = "ADMIN" | "TUTOR" | "TUTORANDO";

export interface BaseProfilePayload {
  dni: string;
  first_name: string;
  last_name_father: string;
  last_name_mother: string;
  email: string;
  gender: "MASCULINO" | "FEMENINO" | "OTRO";
  phone: string;
  birthdate: string;
  address: string;
  faculty: string;
  school: string;
  department: string;
  province: string;
  district: string;
}

export interface TutorFormPayload extends BaseProfilePayload {}

export interface TutorandoFormPayload extends BaseProfilePayload {
  enrollment_code: string;
}

export interface AdminUser {
  id: string;
  dni: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  profile: BaseProfilePayload;
  enrollment_code?: string | null;
}
