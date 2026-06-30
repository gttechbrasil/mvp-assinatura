import React, { createContext, useState, useCallback, useContext } from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const toastHandlers = React.useMemo(() => ({
    success: (msg: string, dur?: number) => addToast(msg, "success", dur),
    error: (msg: string, dur?: number) => addToast(msg, "error", dur),
    info: (msg: string, dur?: number) => addToast(msg, "info", dur),
    warning: (msg: string, dur?: number) => addToast(msg, "warning", dur),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: toastHandlers }}>
      {children}

      {/* Container de Toasts Flutuantes */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  // Configurações visuais por tipo
  const configs = {
    success: {
      icon: <CheckCircle className="w-5 h-5 text-success-text" />,
      bg: "bg-success-bg/95 border-success-border",
      textColor: "text-success-text",
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-error-text" />,
      bg: "bg-error-bg/95 border-error-border",
      textColor: "text-error-text",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-warning-text" />,
      bg: "bg-warning-bg/95 border-warning-border",
      textColor: "text-warning-text",
    },
    info: {
      icon: <Info className="w-5 h-5 text-text-muted" />,
      bg: "bg-bg-card/95 border-border-card",
      textColor: "text-text-main",
    },
  };

  const config = configs[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-slide-in ${config.bg}`}
      style={{
        animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      <div className="shrink-0 mt-0.5">{config.icon}</div>
      <div className={`flex-1 text-xs font-medium ${config.textColor} leading-relaxed`}>
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 text-text-soft hover:text-text-main transition-colors p-0.5 rounded hover:bg-black/5 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Injetar estilos CSS para a animação do Toaster no browser de forma integrada
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return context.toast;
}
