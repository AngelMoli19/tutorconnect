import { useEffect, useMemo, useRef, useState } from "react";
import { api, parseApiError } from "../api/client";
import type { AdminUser } from "../types/users";
import type { ChatMessage, ChatMessageCreatePayload, ChatThread, ChatThreadCreatePayload } from "../types/chat";

const TYPING_TIMEOUT_MS = 2000;
const TYPING_WINDOW_MS = 5000;

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const buildMessageLabel = (message: ChatMessage) => {
  const body = message.body?.trim();
  if (body) return body;
  if (message.attachment_type === "LINK") return "Enlace compartido";
  if (message.attachment_type === "IMAGE") return "Imagen compartida";
  if (message.attachment_type) return "Archivo adjunto";
  return "Sin mensajes";
};

const getAttachmentLabel = (message: ChatMessage) => message.attachment_name || message.attachment_url || "Adjunto";

export function TutorChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [assignedTutorandos, setAssignedTutorandos] = useState<AdminUser[]>([]);
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

  const loadThreads = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const { data } = await api.get<ChatThread[]>("/tutor/chats/threads");
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

  const loadTutorandos = async () => {
    try {
      const { data } = await api.get<AdminUser[]>("/tutor/tutorandos");
      setAssignedTutorandos(data);
    } catch {
      setAssignedTutorandos([]);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const { data } = await api.get<ChatMessage[]>(`/tutor/chats/threads/${threadId}/messages`);
      setMessages(data);
    } catch (err) {
      setMessages([]);
      setError(parseApiError(err).message);
    }
  };

  const notifyTyping = async (isTyping: boolean) => {
    if (!activeThread) return;
    try {
      await api.post(`/tutor/chats/threads/${activeThread.id}/typing`, { is_typing: isTyping });
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

  useEffect(() => {
    loadThreads();
    loadTutorandos();
  }, []);

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

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Auto-scroll al final cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

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

  const handleCreateThread = async (tutorandoId: string) => {
    if (!tutorandoId) return;
    try {
      const payload: ChatThreadCreatePayload = { tutorando_id: tutorandoId };
      const { data } = await api.post<ChatThread>("/tutor/chats/threads", payload);
      setThreads((prev) => {
        const exists = prev.find((t) => t.id === data.id);
        return exists ? prev : [data, ...prev];
      });
      handleSelectThread(data);
    } catch (err) {
      setError(parseApiError(err).message);
    }
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
          `/tutor/chats/threads/${activeThread.id}/messages/upload`,
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
        const response = await api.post<ChatMessage>(`/tutor/chats/threads/${activeThread.id}/messages`, payload);
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
    if (!activeThread || !activeThread.tutorando_typing_at) return false;
    const last = new Date(activeThread.tutorando_typing_at).getTime();
    return Date.now() - last < TYPING_WINDOW_MS;
  }, [activeThread?.tutorando_typing_at, activeThread?.id]);

  return (
    <div className="table-wrapper" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem" }}>
      {/* Sidebar de conversaciones */}
      <div
        style={{
          background: "white",
          borderRadius: "1.25rem",
          padding: "0",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header del sidebar */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-700) 100%)",
            padding: "1.5rem",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.75rem",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
              }}
            >
              💬
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Chats</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.9 }}>
                {threads.length} {threads.length === 1 ? "conversación" : "conversaciones"}
              </p>
            </div>
          </div>

          {/* Selector de nuevo chat */}
          <select
            value=""
            onChange={(e) => handleCreateThread(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              color: "white",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
              transition: "all 0.2s",
            }}
          >
            <option value="" style={{ color: "#1f2937" }}>+ Nuevo chat...</option>
            {assignedTutorandos.map((t) => (
              <option key={t.id} value={t.id} style={{ color: "#1f2937" }}>
                {t.profile.last_name_father} {t.profile.last_name_mother}, {t.profile.first_name}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de conversaciones */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              <div
                style={{
                  display: "inline-block",
                  width: "32px",
                  height: "32px",
                  border: "3px solid #e5e7eb",
                  borderTopColor: "var(--role-tutor-500)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>Cargando...</p>
            </div>
          ) : threads.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>💬</div>
              <p style={{ fontSize: "0.9rem", margin: 0 }}>Sin conversaciones</p>
              <p style={{ fontSize: "0.8rem", margin: "0.25rem 0 0 0" }}>Inicia un chat con un tutorado</p>
            </div>
          ) : (
            threads.map((thread) => {
              const label = thread.kind === "GROUP" ? thread.title || "Chat general" : `${thread.tutorando?.profile.first_name ?? "Tutorado"}`;
              const isActive = activeThread?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleSelectThread(thread)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: isActive
                      ? "linear-gradient(135deg, var(--role-tutor-50) 0%, var(--role-tutor-100) 100%)"
                      : "transparent",
                    border: isActive ? "2px solid var(--role-tutor-300)" : "2px solid transparent",
                    borderRadius: "0.75rem",
                    padding: "0.875rem",
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "translateX(0)";
                    }
                  }}
                >
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        background: "linear-gradient(180deg, var(--role-tutor-500) 0%, var(--role-tutor-700) 100%)",
                        borderRadius: "0 4px 4px 0",
                      }}
                    />
                  )}
                  <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                    {label}
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
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Área principal del chat */}
      <div
        style={{
          background: "white",
          borderRadius: "1.25rem",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: "600px",
        }}
      >
        {/* Header del chat */}
        <div
          style={{
            background: activeThread
              ? "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-700) 100%)"
              : "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
            padding: "1.5rem 2rem",
            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Patrón decorativo */}
          <div
            style={{
              position: "absolute",
              top: "-50px",
              right: "-50px",
              width: "150px",
              height: "150px",
              background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                  }}
                >
                  {activeThread ? "👤" : "💬"}
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: activeThread ? "white" : "#6b7280",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                    }}
                  >
                    {activeThread
                      ? activeThread.kind === "GROUP"
                        ? activeThread.title || "Chat general"
                        : `${activeThread.tutorando?.profile.first_name ?? "Tutorado"}`
                      : "Selecciona un chat"}
                  </h3>
                  {isOtherTyping && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginTop: "0.25rem",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "0.25rem",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "currentColor",
                            animation: "bounce 1.4s infinite ease-in-out both",
                            animationDelay: "0s",
                          }}
                        />
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "currentColor",
                            animation: "bounce 1.4s infinite ease-in-out both",
                            animationDelay: "0.16s",
                          }}
                        />
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "currentColor",
                            animation: "bounce 1.4s infinite ease-in-out both",
                            animationDelay: "0.32s",
                          }}
                        />
                      </div>
                      <span>Escribiendo...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              margin: "1rem",
              padding: "1rem 1.25rem",
              background: "#fee2e2",
              border: "2px solid #dc2626",
              borderRadius: "0.75rem",
              color: "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>⚠️</span>
            <span style={{ fontWeight: 500 }}>{error}</span>
          </div>
        )}
        {/* Área de mensajes */}
        <div
          className="chat-messages-area"
          style={{
            flex: 1,
            maxHeight: "500px",
            overflowY: "auto",
            padding: "1.5rem",
            background: "#f9fafb",
            scrollBehavior: "smooth",
          }}
        >
          {activeThread ? (
            messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>💬</div>
                <p style={{ fontSize: "1.1rem", margin: 0, marginBottom: "0.5rem", color: "#6b7280" }}>
                  No hay mensajes aún
                </p>
                <p style={{ fontSize: "0.9rem", margin: 0 }}>Inicia la conversación enviando un mensaje</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.from_me ? "flex-end" : "flex-start",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      background: msg.from_me
                        ? "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-600) 100%)"
                        : "white",
                      color: msg.from_me ? "white" : "#111827",
                      padding: "0.875rem 1.125rem",
                      borderRadius: msg.from_me ? "1.25rem 1.25rem 0.25rem 1.25rem" : "1.25rem 1.25rem 1.25rem 0.25rem",
                      margin: 0,
                      maxWidth: "70%",
                      position: "relative",
                      boxShadow: msg.from_me
                        ? "0 4px 12px rgba(8, 145, 178, 0.25)"
                        : "0 4px 12px rgba(0, 0, 0, 0.08)",
                      border: msg.from_me ? "none" : "1px solid #e5e7eb",
                    }}
                  >
                    {activeThread.kind === "GROUP" && !msg.from_me && (
                      <div style={{ fontSize: "0.7rem", fontWeight: 600, marginBottom: "0.2rem" }}>
                        {msg.sender.profile.first_name} {msg.sender.profile.last_name_father}
                      </div>
                    )}
                    {msg.reply_to && (
                      <div
                        style={{
                          borderLeft: "3px solid rgba(255,255,255,0.6)",
                          paddingLeft: "0.5rem",
                          marginBottom: "0.35rem",
                          fontSize: "0.75rem",
                          opacity: 0.9,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {msg.reply_to.sender.profile.first_name} {msg.reply_to.sender.profile.last_name_father}
                        </div>
                        <div>
                          {msg.reply_to.body?.trim() || msg.reply_to.attachment_name || "Adjunto"}
                        </div>
                      </div>
                    )}
                    {msg.body && <div style={{ marginBottom: msg.attachment_url ? "0.5rem" : 0 }}>{msg.body}</div>}
                    {msg.attachment_url && msg.attachment_type === "IMAGE" && (
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                        <img
                          src={msg.attachment_url}
                          alt={getAttachmentLabel(msg)}
                          style={{ maxWidth: "220px", borderRadius: "0.5rem", display: "block" }}
                        />
                      </a>
                    )}
                    {msg.attachment_url && msg.attachment_type !== "IMAGE" && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: msg.from_me ? "#e0e7ff" : "#1d4ed8", textDecoration: "underline" }}
                      >
                        {getAttachmentLabel(msg)}
                      </a>
                    )}
                    <div style={{ fontSize: "0.7rem", opacity: 0.75, marginTop: "0.35rem" }}>{formatDateTime(msg.created_at)}</div>
                    {msg.from_me && (
                      <div style={{ fontSize: "0.7rem", opacity: 0.75 }}>
                        {msg.read_at ? "Leido" : "Entregado"}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setReplyTo(msg)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: msg.from_me ? "#e0e7ff" : "#1d4ed8",
                        fontSize: "0.7rem",
                        marginTop: "0.3rem",
                        cursor: "pointer",
                      }}
                    >
                      Responder
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>👈</div>
              <p style={{ fontSize: "1.1rem", margin: 0, color: "#6b7280" }}>
                Selecciona un tutorado para comenzar
              </p>
            </div>
          )}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div
            style={{
              margin: "0 1.5rem",
              padding: "0.875rem 1.125rem",
              borderRadius: "0.75rem",
              background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
              border: "2px solid var(--role-tutor-200)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
              <div
                style={{
                  width: "4px",
                  height: "40px",
                  borderRadius: "4px",
                  background: "linear-gradient(180deg, var(--role-tutor-500) 0%, var(--role-tutor-600) 100%)",
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--role-tutor-700)", fontWeight: 600, marginBottom: "0.25rem" }}>
                  Respondiendo a {replyTo.sender.profile.first_name}
                </div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "#4b5563",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {replyTo.body?.trim() || replyTo.attachment_name || "Adjunto"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fee2e2";
                e.currentTarget.style.color = "#dc2626";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#6b7280";
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>×</span>
            </button>
          </div>
        )}

        {/* Input area */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid #e5e7eb", background: "white" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "0.75rem" }}>
            <input
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
              placeholder="Escribe un mensaje..."
              style={{
                flex: 1,
                padding: "0.875rem 1.125rem",
                borderRadius: "1.25rem",
                border: "2px solid #e5e7eb",
                fontSize: "0.95rem",
                outline: "none",
                transition: "all 0.2s",
                background: "#f9fafb",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                e.currentTarget.style.background = "white";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.background = "#f9fafb";
              }}
              disabled={!activeThread || sending}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeThread || sending}
              style={{
                padding: "0.875rem 1.125rem",
                borderRadius: "1.25rem",
                border: "2px solid var(--role-tutor-200)",
                background: "white",
                color: "var(--role-tutor-600)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: !activeThread || sending ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: !activeThread || sending ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => {
                if (activeThread && !sending) {
                  e.currentTarget.style.background = "var(--role-tutor-50)";
                  e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.borderColor = "var(--role-tutor-200)";
              }}
            >
              📎 Adjuntar
            </button>
            <button
              onClick={handleSend}
              disabled={!activeThread || sending}
              style={{
                padding: "0.875rem 1.75rem",
                borderRadius: "1.25rem",
                border: "none",
                background: !activeThread || sending
                  ? "#d1d5db"
                  : "linear-gradient(135deg, var(--role-tutor-500) 0%, var(--role-tutor-600) 100%)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: !activeThread || sending ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: !activeThread || sending
                  ? "none"
                  : "0 4px 12px rgba(8, 145, 178, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => {
                if (activeThread && !sending) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(8, 145, 178, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(8, 145, 178, 0.3)";
              }}
            >
              {sending ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Enviando...
                </>
              ) : (
                <>
                  Enviar
                  <span style={{ fontSize: "1.1rem" }}>→</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: "none" }}
              onChange={handleFileChange}
              disabled={!activeThread || sending}
            />
          </div>

          {/* Link input */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <input
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                triggerTyping();
              }}
              placeholder="🔗 Pegar enlace (opcional)"
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                borderRadius: "1.25rem",
                border: "2px solid #e5e7eb",
                fontSize: "0.9rem",
                outline: "none",
                transition: "all 0.2s",
                background: "#f9fafb",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--role-tutor-500)";
                e.currentTarget.style.background = "white";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.background = "#f9fafb";
              }}
              disabled={!activeThread || sending || Boolean(selectedFile)}
            />
            {selectedFile && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "1.25rem",
                  background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                  border: "2px solid var(--role-tutor-200)",
                  color: "var(--role-tutor-700)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>📎</span>
                {selectedFile.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Animations and Custom Styles */}
      <style>
        {`
          /* Spin animation */
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          /* Bounce animation for typing indicator */
          @keyframes bounce {
            0%, 80%, 100% {
              transform: scale(0);
              opacity: 0.5;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }

          /* Firefox scrollbar */
          .chat-messages-area {
            scrollbar-width: thin;
            scrollbar-color: var(--role-tutor-500) #f1f5f9;
          }

          /* WebKit browsers scrollbar (Chrome, Safari, Edge) */
          .chat-messages-area::-webkit-scrollbar {
            width: 10px;
          }

          .chat-messages-area::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }

          .chat-messages-area::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, var(--role-tutor-400), var(--role-tutor-600));
            border-radius: 10px;
          }

          .chat-messages-area::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, var(--role-tutor-500), var(--role-tutor-700));
          }
        `}
      </style>
    </div>
  );
}
