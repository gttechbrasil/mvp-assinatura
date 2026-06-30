import React, { useState } from "react";

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSubmit,
  onCancel,
  loading,
}) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 select-none">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-text-muted mb-1.5" htmlFor="email-input">
          E-mail
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-text-soft">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          <input
            id="email-input"
            type="email"
            className="w-full bg-bg-subtle/50 border border-border-card rounded-lg text-text-main pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder-text-soft"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-sm"
        disabled={loading}
        id="submit-btn"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" id="spinner"></div>
        ) : (
          "Enviar Código"
        )}
      </button>

      <button
        type="button"
        className="w-full bg-transparent hover:bg-bg-hover border border-border-card text-text-muted font-medium py-2 px-4 rounded-lg text-sm transition-all cursor-pointer focus:outline-none active:scale-[0.98] disabled:opacity-50"
        disabled={loading}
        onClick={onCancel}
        id="back-to-login-btn"
      >
        Voltar para o Login
      </button>
    </form>
  );
};
