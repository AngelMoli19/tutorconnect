import type { AdminUser } from "./users";

export interface SessionItem {
  id: string;
  title: string;
  description?: string | null;
  scheduled_at: string;
  meeting_link?: string | null;
  status: string;
  scope: "GENERAL" | "PERSONALIZADA";
  tutor: AdminUser;
  tutorando: AdminUser | null;
  invited_tutorandos: AdminUser[];
}

export interface SessionCreatePayload {
  title: string;
  description?: string;
  scheduled_at: string;
  meeting_link?: string;
  scope: "GENERAL" | "PERSONALIZADA";
  tutorando_ids?: string[];
}

export type SessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELED";

export interface SessionUpdatePayload {
  status?: SessionStatus;
  scheduled_at?: string;
  meeting_link?: string | null;
}
