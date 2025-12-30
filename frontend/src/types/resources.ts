import type { AdminUser } from "./users";

export type ResourceType = "LINK" | "FILE" | "VIDEO" | "DOCUMENT" | "PRESENTATION" | "OTHER";
export type ResourceScope = "GENERAL" | "PERSONALIZADA";

export interface ResourceItem {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  resource_type: ResourceType;
  scope: ResourceScope;
  created_at: string;
  tutor: AdminUser;
  invited_tutorandos: AdminUser[];
}

export interface ResourceCreatePayload {
  title: string;
  description?: string;
  url: string;
  resource_type: ResourceType;
  scope: ResourceScope;
  tutorando_ids?: string[];
}
