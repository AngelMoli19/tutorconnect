import type { AdminUser } from "./users";
import type { SessionItem } from "./sessions";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "JUSTIFIED";

export interface AttendanceEntry {
  tutorando: AdminUser;
  status?: AttendanceStatus | null;
  updated_at?: string | null;
}

export interface AttendanceUpdateEntry {
  tutorando_id: string;
  status: AttendanceStatus;
}

export interface TutorandoAttendanceItem {
  session: SessionItem;
  status?: AttendanceStatus | null;
  updated_at?: string | null;
}

export interface AttendanceUpdatePayload {
  entries: AttendanceUpdateEntry[];
}
