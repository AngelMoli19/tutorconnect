import type { AdminUser } from "./users";

export type ChatThreadKind = "DIRECT" | "GROUP";

export interface ChatThread {
  id: string;
  tutor: AdminUser;
  tutorando?: AdminUser | null;
  last_message?: string | null;
  last_message_at?: string | null;
  kind: ChatThreadKind;
  title?: string | null;
  tutor_typing_at?: string | null;
  tutorando_typing_at?: string | null;
}

export interface ChatMessageReply {
  id: string;
  body?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  sender: AdminUser;
}

export interface ChatMessage {
  id: string;
  body: string;
  created_at: string;
  from_me: boolean;
  sender_role: string;
  sender: AdminUser;
  read_at?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  reply_to?: ChatMessageReply | null;
}

export interface ChatThreadCreatePayload {
  tutorando_id?: string;
  tutor_id?: string;
}

export interface ChatMessageCreatePayload {
  body?: string | null;
  link_url?: string | null;
  reply_to_id?: string | null;
}
