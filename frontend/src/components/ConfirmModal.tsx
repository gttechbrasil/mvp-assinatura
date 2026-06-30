import { X, AlertTriangle, Info } from "lucide-react";
import { useEffect } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Bloquear scroll quando a modal estiver aberta
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay com blur */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      
      {/* Conteúdo do Modal */}
      <div className="relative bg-bg-card rounded-2xl shadow-xl border border-border-card w-full max-w-sm animate-in zoom-in-95 fade-in duration-200 overflow-hidden flex flex-col">

        
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 p-3 rounded-full ${isDanger ? 'bg-error-bg text-error-text' : 'bg-bg-subtle text-primary'}`}>
              {isDanger ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-main leading-tight mb-2">
                {title}
              </h3>
              <div className="text-sm text-text-muted leading-relaxed">
                {message}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-bg-subtle px-6 py-4 flex items-center justify-end gap-3 border-t border-border-subtle">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:text-text-main hover:bg-bg-hover transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm active:scale-95 cursor-pointer ${
              isDanger 
                ? "bg-error-text hover:opacity-90" 
                : "bg-primary hover:bg-primary-hover"
            }`}
          >
            {confirmText}
          </button>
        </div>
        
        {/* Botão de fechar superior */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-text-soft hover:text-text-main hover:bg-bg-hover rounded-lg transition-colors cursor-pointer"
          aria-label="Fechar modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
