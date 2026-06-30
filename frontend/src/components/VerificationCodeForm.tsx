import React, { useState, useRef, useEffect } from "react";

interface VerificationCodeFormProps {
  email: string;
  onVerifySuccess: (code: string) => void;
  onCancel: () => void;
  onAlert: (type: "error" | "success", message: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const VerificationCodeForm: React.FC<VerificationCodeFormProps> = ({
  email,
  onVerifySuccess,
  onCancel,
  onAlert,
  loading,
  setLoading,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const API_URL = `${import.meta.env.VITE_API_URL || "/api/v1"}/auth`;

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (value: string, index: number) => {
    // Only allow digits
    const cleaned = value.replace(/[^0-9]/g, "");
    if (!cleaned) return;

    const newDigits = [...digits];
    // Take only the last character if typed
    newDigits[index] = cleaned.slice(-1);
    setDigits(newDigits);

    // Auto-focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      // If the current input is empty, focus the previous one and clear it
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim().replace(/[^0-9]/g, "");
    if (!pasteData) return;

    const codeArray = pasteData.slice(0, 6).split("");
    const newDigits = [...digits];
    
    codeArray.forEach((char, idx) => {
      newDigits[idx] = char;
    });

    setDigits(newDigits);

    // Focus the next empty or last input
    const nextFocusIndex = Math.min(codeArray.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const verifyCodeCall = async (fullCode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Código inválido ou expirado.");
      }

      onAlert("success", "Código validado! Defina sua nova senha.");
      setTimeout(() => {
        onVerifySuccess(fullCode);
      }, 1000);
    } catch (err: any) {
      onAlert("error", err.message || "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = digits.join("");
    if (fullCode.length !== 6) {
      onAlert("error", "Por favor, digite o código de 6 dígitos.");
      return;
    }

    verifyCodeCall(fullCode);
  };

  // Auto-submit when all 6 fields are filled
  useEffect(() => {
    const fullCode = digits.join("");
    if (fullCode.length === 6 && !loading) {
      verifyCodeCall(fullCode);
    }
  }, [digits]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 select-none">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-text-muted mb-3 text-center">
          Código de Verificação
        </label>
        
        <div className="grid grid-cols-6 gap-2 justify-center max-w-xs mx-auto">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              className="w-10 h-12 bg-bg-subtle border border-border-card rounded-lg text-center text-lg font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
              disabled={loading}
              required
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-sm"
        disabled={loading || digits.join("").length !== 6}
        id="submit-btn"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" id="spinner"></div>
        ) : (
          "Verificar Código"
        )}
      </button>

      <button
        type="button"
        className="w-full bg-transparent hover:bg-bg-hover border border-border-card text-text-muted font-medium py-2 px-4 rounded-lg text-sm transition-all cursor-pointer focus:outline-none active:scale-[0.98] disabled:opacity-50"
        disabled={loading}
        onClick={onCancel}
        id="back-to-login-btn"
      >
        Cancelar
      </button>
    </form>
  );
};
