import React, { useEffect } from "react";

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 1000,
        animation: "fadeIn 0.2s ease-out"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--white)",
          borderRadius: "1.5rem",
          width: "min(1100px, 95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          position: "relative",
          animation: "slideUp 0.3s ease-out",
          border: "1px solid var(--gray-200)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2rem 2rem 1.5rem",
            borderBottom: "1px solid var(--gray-200)",
            position: "sticky",
            top: 0,
            background: "var(--white)",
            zIndex: 1,
            borderRadius: "1.5rem 1.5rem 0 0"
          }}
        >
          <h3 style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: "700",
            color: "var(--gray-900)",
            letterSpacing: "-0.025em"
          }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--gray-100)",
              border: "none",
              borderRadius: "0.75rem",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gray-600)",
              fontSize: "1.25rem",
              transition: "all 0.2s",
              fontWeight: "400"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gray-200)";
              e.currentTarget.style.color = "var(--gray-900)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--gray-100)";
              e.currentTarget.style.color = "var(--gray-600)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ✕
          </button>
        </header>
        <div style={{ padding: "2rem" }}>{children}</div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
