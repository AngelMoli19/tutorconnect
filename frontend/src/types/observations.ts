import type { AdminUser } from "./users";

export type ObservationCategory = "ACADEMICA" | "EMOCIONAL" | "GENERAL";

export interface ObservationItem {
  id: string;
  category: ObservationCategory;
  summary: string;
  details: string;
  created_at: string;
  tutor: AdminUser;
  tutorando: AdminUser;
  session_id?: string | null;
}

export interface ObservationCreatePayload {
  tutorando_id: string;
  session_id?: string;
  category: ObservationCategory;
  summary: string;
  details: string;
}
