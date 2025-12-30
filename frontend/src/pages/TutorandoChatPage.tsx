import { useEffect, useMemo, useRef, useState } from "react";
import { api, parseApiError } from "../api/client";
import type { AdminUser } from "../types/users";
import type { ChatMessage, ChatMessageCreatePayload, ChatThread, ChatThreadCreatePayload } from "../types/chat";

interface TutorandoProfileResponse {
  tutorando: AdminUser;
  assigned_tutor: AdminUser | null;
  assignments_count: number;
}

const TYPING_TIMEOUT_MS = 2000;
const TYPING_WINDOW_MS = 5000;

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
};

const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return `${first}${last}`;
};

const buildMessageLabel = (message: ChatMessage) => {
  const body = message.body?.trim();
  if (body) return body;
  if (message.attachment_type === "LINK") return "Enlace compartido";
  if (message.attachment_type === "IMAGE") return "Imagen compartida";
  if (message.attachment_type) return "Archivo adjunto";
  return "Sin mensajes";
};

const getAttachmentLabel = (message: ChatMessage) => message.attachment_name || message.attachment_url || "Adjunto";

export function TutorandoChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [assignedTutor, setAssignedTutor] = useState<AdminUser | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadProfile = async () => {
    try {
      const { data } = await api.get<TutorandoProfileResponse>("/tutorando/profile");
      setAssignedTutor(data.assigned_tutor);
    } catch {
      setAssignedTutor(null);
    }
  };

  const loadThreads = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const { data } = await api.get<ChatThread[]>("/tutorando/chats/threads");
      setThreads(data);
      setActiveThread((prev) => {
        if (!prev) return prev;
        return data.find((thread) => thread.id === prev.id) ?? prev;
      });
    } catch (err) {
      if (!silent) {
        setError(parseApiError(err).message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const { data } = await api.get<ChatMessage[]>(`/tutorando/chats/threads/${threadId}/messages`);
      setMessages(data);
    } catch (err) {
      setMessages([]);
      setError(parseApiError(err).message);
    }
  };

  const notifyTyping = async (isTyping: boolean) => {
    if (!activeThread) return;
    try {
      await api.post(`/tutorando/chats/threads/${activeThread.id}/typing`, { is_typing: isTyping });
    } catch {
      // ignore typing errors
    }
  };

  const triggerTyping = () => {
    if (!activeThread) return;
    notifyTyping(true);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      notifyTyping(false);
    }, TYPING_TIMEOUT_MS);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    loadProfile();
    loadThreads();
  }, []);

  // Auto-scroll al final cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadThreads(true);
    }, activeThread ? 5000 : 15000);
    return () => clearInterval(interval);
  }, [activeThread?.id]);

  useEffect(() => {
    if (!activeThread) return;
    loadMessages(activeThread.id);
    const interval = setInterval(() => {
      loadMessages(activeThread.id);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeThread?.id]);

  const handleCreateThread = async () => {
    if (!assignedTutor) return;
    try {
      const payload: ChatThreadCreatePayload = { tutor_id: assignedTutor.id };
      const { data } = await api.post<ChatThread>("/tutorando/chats/threads", payload);
      setThreads((prev) => {
        const exists = prev.find((t) => t.id === data.id);
        return exists ? prev : [data, ...prev];
      });
      setActiveThread(data);
      loadMessages(data.id);
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  const handleSelectThread = (thread: ChatThread) => {
    setActiveThread(thread);
    setNewMessage("");
    setLinkUrl("");
    setSelectedFile(null);
    setReplyTo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    loadMessages(thread.id);
    // Scroll al final al cambiar de thread
    setTimeout(() => scrollToBottom("auto"), 200);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setLinkUrl("");
    }
  };

  const handleSend = async () => {
    if (!activeThread) return;
    const trimmed = newMessage.trim();
    const link = linkUrl.trim();
    if (!trimmed && !link && !selectedFile) return;

    setSending(true);
    try {
      let data: ChatMessage;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (trimmed) formData.append("body", trimmed);
        if (replyTo) formData.append("reply_to_id", replyTo.id);
        const response = await api.post<ChatMessage>(
          `/tutorando/chats/threads/${activeThread.id}/messages/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        data = response.data;
      } else {
        const payload: ChatMessageCreatePayload = {
          body: trimmed || undefined,
          link_url: link || undefined,
          reply_to_id: replyTo?.id,
        };
        const response = await api.post<ChatMessage>(`/tutorando/chats/threads/${activeThread.id}/messages`, payload);
        data = response.data;
      }
      setMessages((prev) => [...prev, data]);
      setNewMessage("");
      setLinkUrl("");
      setSelectedFile(null);
      setReplyTo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === activeThread.id
            ? { ...thread, last_message: buildMessageLabel(data), last_message_at: data.created_at }
            : thread,
        ),
      );
      notifyTyping(false);
      // Scroll inmediato al enviar mensaje
      setTimeout(() => scrollToBottom("auto"), 100);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSending(false);
    }
  };

  const isOtherTyping = useMemo(() => {
    if (!activeThread || !activeThread.tutor_typing_at) return false;
    const last = new Date(activeThread.tutor_typing_at).getTime();
    return Date.now() - last < TYPING_WINDOW_MS;
  }, [activeThread?.tutor_typing_at, activeThread?.id]);

  return (
    <div className="table-wrapper" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.25rem" }}>
      {/* Left Sidebar - Conversation List */}
      <div
        style={{
          background: "white",
          borderRadius: "1.25rem",
          padding: "1.5rem",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          height: "fit-content",
        }}
      >
        {/* Sidebar Header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.75rem",
                background: "linear-gradient(135deg, var(--role-tutorando-500) 0%, var(--role-tutorando-600) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
              }}
            >
              💬
            </div>
            <h3 style={{ margin: 0, fontSize: "1.35rem", color: "#1f2937", fontWeight: 700 }}>Mis Chats</h3>
          </div>
          <button
            className="btn-primary"
            type="button"
            onClick={handleCreateThread}
            disabled={!assignedTutor}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <span>✉️</span>
            <span>Nuevo Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "#6b7280" }}>
              <div
                style={{
                  display: "inline-block",
                  width: "30px",
                  height: "30px",
                  border: "3px solid #e5e7eb",
                  borderTopColor: "var(--role-tutorando-500)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>Cargando chats...</p>
            </div>
          ) : threads.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>💭</div>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>Sin conversaciones</p>
              <p style={{ color: "#9ca3af", fontSize: "0.8rem", margin: "0.25rem 0 0 0" }}>
                Inicia un chat con tu tutor
              </p>
            </div>
          ) : (
            threads.map((thread) => {
              const tutorName = `${thread.tutor.profile.first_name} ${thread.tutor.profile.last_name_father}`;
              const initials = getInitials(thread.tutor.profile.first_name, thread.tutor.profile.last_name_father);
              const isActive = activeThread?.id === thread.id;
              const relativeTime = thread.last_message_at ? getRelativeTime(thread.last_message_at) : "";

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleSelectThread(thread)}
                  style={{
                    textAlign: "left",
                    background: isActive
                      ? "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)"
                      : "transparent",
                    border: isActive ? "1px solid var(--role-tutorando-300)" : "1px solid transparent",
                    borderRadius: "0.75rem",
                    padding: "0.75rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: "45px",
                      height: "45px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--role-tutorando-400) 0%, var(--role-tutorando-600) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "white",
                      flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(44, 95, 141, 0.2)",
                    }}
                  >
                    {initials}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          color: "#1f2937",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {thread.kind === "GROUP" ? "Chat General" : tutorName}
                      </div>
                      {relativeTime && (
                        <span style={{ fontSize: "0.7rem", color: "#9ca3af", flexShrink: 0, marginLeft: "0.5rem" }}>
                          {relativeTime}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#6b7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {thread.last_message ?? "Sin mensajes"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div
        style={{
          background: "white",
          borderRadius: "1.25rem",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          minHeight: "600px",
          overflow: "hidden",
        }}
      >
        {/* Chat Header */}
        {activeThread ? (
          <div
            style={{
              background: "linear-gradient(135deg, var(--role-tutorando-600) 0%, var(--role-tutorando-800) 100%)",
              padding: "1.25rem 1.5rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative pattern */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "150px",
                height: "150px",
                background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
                borderRadius: "50%",
                transform: "translate(30%, -30%)",
              }}
            />

            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "1rem" }}>
              {/* Tutor Avatar */}
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 100%)",
                  border: "2px solid rgba(255, 255, 255, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "white",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
              >
                {getInitials(activeThread.tutor.profile.first_name, activeThread.tutor.profile.last_name_father)}
              </div>

              {/* Tutor Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                  <h3 style={{ margin: 0, color: "white", fontSize: "1.25rem", fontWeight: 700 }}>
                    {activeThread.kind === "GROUP"
                      ? activeThread.title || "Chat General"
                      : `${activeThread.tutor.profile.first_name} ${activeThread.tutor.profile.last_name_father}`}
                  </h3>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "0.5rem",
                      background: "rgba(255, 255, 255, 0.2)",
                      color: "white",
                      fontWeight: 600,
                    }}
                  >
                    Tutor Asignado
                  </span>
                </div>
                {isOtherTyping && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.95)" }}>
                    <span style={{ fontSize: "0.85rem" }}>✏️</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Escribiendo...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}
          >
            <h3 style={{ margin: 0, color: "#6b7280", fontSize: "1.15rem", fontWeight: 600 }}>
              Selecciona un chat
            </h3>
          </div>
        )}

        {error && (
          <div
            style={{
              margin: "1rem 1.5rem",
              padding: "0.75rem 1rem",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "0.75rem",
              color: "#991b1b",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Messages Area */}
        <div
          className="chat-messages-area"
          style={{
            flex: 1,
            maxHeight: "500px",
            overflowY: "auto",
            padding: "1.25rem 1.5rem",
            background: "#f9fafb",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            scrollBehavior: "smooth",
          }}
        >
          {activeThread ? (
            messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#6b7280" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>💬</div>
                <p style={{ fontSize: "1rem", margin: 0 }}>Aún no hay mensajes</p>
                <p style={{ fontSize: "0.85rem", color: "#9ca3af", margin: "0.25rem 0 0 0" }}>
                  Inicia la conversación con tu tutor
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.from_me ? "flex-end" : "flex-start",
                    gap: "0.5rem",
                    alignItems: "flex-end",
                  }}
                >
                  {/* Tutor avatar for received messages */}
                  {!msg.from_me && activeThread.kind !== "GROUP" && (
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--role-tutorando-400) 0%, var(--role-tutorando-600) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(msg.sender.profile.first_name, msg.sender.profile.last_name_father)}
                    </div>
                  )}

                  <div
                    style={{
                      background: msg.from_me
                        ? "linear-gradient(135deg, var(--role-tutorando-500) 0%, var(--role-tutorando-600) 100%)"
                        : "white",
                      color: msg.from_me ? "white" : "#1f2937",
                      padding: "0.75rem 1rem",
                      borderRadius: msg.from_me ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                      maxWidth: "70%",
                      position: "relative",
                      boxShadow: msg.from_me
                        ? "0 4px 15px rgba(44, 95, 141, 0.25)"
                        : "0 2px 10px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {activeThread.kind === "GROUP" && !msg.from_me && (
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          marginBottom: "0.4rem",
                          color: msg.from_me ? "rgba(255,255,255,0.9)" : "var(--role-tutorando-600)",
                        }}
                      >
                        {msg.sender.profile.first_name} {msg.sender.profile.last_name_father}
                      </div>
                    )}

                    {msg.reply_to && (
                      <div
                        style={{
                          borderLeft: msg.from_me
                            ? "3px solid rgba(255,255,255,0.5)"
                            : "3px solid var(--role-tutorando-400)",
                          paddingLeft: "0.6rem",
                          marginBottom: "0.6rem",
                          fontSize: "0.75rem",
                          background: msg.from_me ? "rgba(255,255,255,0.15)" : "rgba(44, 95, 141, 0.08)",
                          padding: "0.5rem 0.6rem",
                          borderRadius: "0.5rem",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>
                          {msg.reply_to.sender.profile.first_name} {msg.reply_to.sender.profile.last_name_father}
                        </div>
                        <div style={{ opacity: 0.85 }}>
                          {msg.reply_to.body?.trim() || msg.reply_to.attachment_name || "Adjunto"}
                        </div>
                      </div>
                    )}

                    {msg.body && (
                      <div
                        style={{
                          marginBottom: msg.attachment_url ? "0.6rem" : 0,
                          lineHeight: "1.5",
                          fontSize: "0.95rem",
                        }}
                      >
                        {msg.body}
                      </div>
                    )}

                    {msg.attachment_url && msg.attachment_type === "IMAGE" && (
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                        <img
                          src={msg.attachment_url}
                          alt={getAttachmentLabel(msg)}
                          style={{
                            maxWidth: "240px",
                            borderRadius: "0.75rem",
                            display: "block",
                            border: msg.from_me ? "2px solid rgba(255,255,255,0.3)" : "2px solid #e5e7eb",
                          }}
                        />
                      </a>
                    )}

                    {msg.attachment_url && msg.attachment_type !== "IMAGE" && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: msg.from_me ? "#e0e7ff" : "var(--role-tutorando-600)",
                          textDecoration: "underline",
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span>📎</span>
                        {getAttachmentLabel(msg)}
                      </a>
                    )}

                    <div
                      style={{
                        fontSize: "0.7rem",
                        opacity: 0.7,
                        marginTop: "0.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span>{formatDateTime(msg.created_at)}</span>
                      {msg.from_me && (
                        <span style={{ fontWeight: 600 }}>
                          {msg.read_at ? "✓✓ Leído" : "✓ Entregado"}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setReplyTo(msg)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: msg.from_me ? "rgba(255,255,255,0.85)" : "var(--role-tutorando-600)",
                        fontSize: "0.75rem",
                        marginTop: "0.4rem",
                        cursor: "pointer",
                        padding: "0.25rem 0",
                        fontWeight: 600,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      ↩️ Responder
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#6b7280" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>💭</div>
              <p style={{ fontSize: "1rem", margin: 0 }}>Selecciona una conversación</p>
              <p style={{ fontSize: "0.85rem", color: "#9ca3af", margin: "0.25rem 0 0 0" }}>
                para comenzar a chatear con tu tutor
              </p>
            </div>
          )}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderTop: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          {/* Reply Indicator */}
          {replyTo && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                border: "1px solid var(--role-tutorando-200)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--role-tutorando-600)",
                    fontWeight: 600,
                    marginBottom: "0.25rem",
                  }}
                >
                  ↩️ Respondiendo a {replyTo.sender.profile.first_name}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {replyTo.body?.trim() || replyTo.attachment_name || "Adjunto"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--role-tutorando-300)",
                  background: "white",
                  color: "var(--role-tutorando-600)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--role-tutorando-50)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* File Preview */}
          {selectedFile && (
            <div
              style={{
                marginBottom: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>📎</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1f2937" }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                style={{
                  padding: "0.35rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                  background: "white",
                  color: "#6b7280",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Link Input */}
          {!selectedFile && (
            <div style={{ marginBottom: "0.75rem" }}>
              <input
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  triggerTyping();
                }}
                placeholder="🔗 Pegar enlace (opcional)"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                  fontSize: "0.9rem",
                  background: "#f9fafb",
                  outline: "none",
                  transition: "all 0.2s",
                }}
                disabled={!activeThread || sending}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--role-tutorando-400)";
                  e.currentTarget.style.background = "white";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "#f9fafb";
                }}
              />
            </div>
          )}

          {/* Main Input Row */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            {/* Textarea */}
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                triggerTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribe un mensaje... (Shift+Enter para nueva línea)"
              rows={1}
              style={{
                flex: 1,
                padding: "0.85rem 1rem",
                borderRadius: "1rem",
                border: "2px solid #e5e7eb",
                fontSize: "0.95rem",
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: "1.5",
                minHeight: "48px",
                maxHeight: "120px",
                transition: "all 0.2s",
              }}
              disabled={!activeThread || sending}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--role-tutorando-500)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(44, 95, 141, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "48px";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {/* Attach Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!activeThread || sending}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  border: "2px solid var(--role-tutorando-300)",
                  background: "white",
                  color: "var(--role-tutorando-600)",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = "var(--role-tutorando-50)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                📎
              </button>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!activeThread || sending}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  border: "none",
                  background: !activeThread || sending
                    ? "#d1d5db"
                    : "linear-gradient(135deg, var(--role-tutorando-500) 0%, var(--role-tutorando-600) 100%)",
                  color: "white",
                  fontSize: "1.25rem",
                  cursor: !activeThread || sending ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: !activeThread || sending ? "none" : "0 4px 15px rgba(44, 95, 141, 0.3)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(44, 95, 141, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(44, 95, 141, 0.3)";
                }}
              >
                {sending ? "⏳" : "✈️"}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: "none" }}
              onChange={handleFileChange}
              disabled={!activeThread || sending}
            />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          /* Custom scrollbar for chat messages area */

          /* Firefox */
          .chat-messages-area {
            scrollbar-width: thin;
            scrollbar-color: #2c5f8d #f1f5f9;
          }

          /* WebKit browsers (Chrome, Safari, Edge) */
          .chat-messages-area::-webkit-scrollbar {
            width: 10px;
          }

          .chat-messages-area::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }

          .chat-messages-area::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, var(--role-tutorando-400), var(--role-tutorando-600));
            border-radius: 10px;
          }

          .chat-messages-area::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, var(--role-tutorando-500), var(--role-tutorando-700));
          }
        `}
      </style>
    </div>
  );
}
