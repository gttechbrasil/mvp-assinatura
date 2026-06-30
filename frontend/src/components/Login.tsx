import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "./LoginForm.js";
import { RegisterForm } from "./RegisterForm.js";
import { ForgotPasswordForm } from "./ForgotPasswordForm.js";
import { VerificationCodeForm } from "./VerificationCodeForm.js";
import { ResetPasswordForm } from "./ResetPasswordForm.js";
import { useAuth } from "../contexts/AuthContext.js";

type Mode = "login" | "register" | "forgot" | "verify" | "reset";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [shake, setShake] = useState(false);

  const API_URL = `${import.meta.env.VITE_API_URL || "/api/v1"}/auth`;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleAlert = (type: "error" | "success", message: string) => {
    setAlert({ type, message });
    if (type === "error") {
      triggerShake();
    }
  };

  const handleLoginSubmit = async (
    loginEmail: string,
    loginPassword: string,
  ) => {
    setAlert(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Erro ao fazer login. Verifique suas credenciais.",
        );
      }

      login(data.user, data.accessToken);
      if (data.user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/groups");
      }
    } catch (err: any) {
      handleAlert("error", err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (
    regEmail: string,
    regPassword: string,
  ) => {
    setAlert(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erro ao realizar o cadastro.");
      }

      handleAlert("success", "Cadastro realizado com sucesso! Faça login.");
      setTimeout(() => {
        setMode("login");
      }, 1500);
    } catch (err: any) {
      handleAlert("error", err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (forgotEmail: string) => {
    setAlert(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erro ao solicitar recuperação.");
      }

      setEmail(forgotEmail);
      handleAlert(
        "success",
        "Código de recuperação enviado! Verifique o console backend.",
      );
      setTimeout(() => {
        setMode("verify");
        setAlert(null);
      }, 1500);
    } catch (err: any) {
      handleAlert("error", err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySuccess = (verifiedCode: string) => {
    setCode(verifiedCode);
    setMode("reset");
    setAlert(null);
  };

  const handleResetPasswordSubmit = async (newPassword: string) => {
    setAlert(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erro ao redefinir a senha.");
      }

      handleAlert("success", "Senha redefinida com sucesso! Faça login.");
      setTimeout(() => {
        setMode("login");
        setEmail("");
        setCode("");
      }, 1500);
    } catch (err: any) {
      handleAlert("error", err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setMode("login");
    setAlert(null);
    setEmail("");
    setCode("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-page p-4 font-sans select-none">
      <div
        className={`w-full max-w-[400px] bg-bg-card border border-border-card rounded-2xl p-8 shadow-sm transition-all duration-300 ${shake ? "animate-shake border-error-border" : ""}`}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="text-center">
            {mode === "login" && (
              <>
                <h2
                  className="text-xl font-semibold text-text-main tracking-tight"
                  id="login-title"
                >
                  Acessar Conta
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Entre com seus dados de acesso
                </p>
              </>
            )}
            {mode === "register" && (
              <>
                <h2
                  className="text-xl font-semibold text-text-main tracking-tight"
                  id="register-title"
                >
                  Criar Conta
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Cadastre-se na nossa plataforma
                </p>
              </>
            )}
            {mode === "forgot" && (
              <>
                <h2
                  className="text-xl font-semibold text-text-main tracking-tight"
                  id="forgot-title"
                >
                  Recuperar Senha
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Esqueceu sua senha? Insira seu e-mail
                </p>
              </>
            )}
            {mode === "verify" && (
              <>
                <h2
                  className="text-xl font-semibold text-text-main tracking-tight"
                  id="verify-title"
                >
                  Verificar Código
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Insira o código enviado para o console
                </p>
              </>
            )}
            {mode === "reset" && (
              <>
                <h2
                  className="text-xl font-semibold text-text-main tracking-tight"
                  id="reset-title"
                >
                  Nova Senha
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Defina sua nova credencial de acesso
                </p>
              </>
            )}
          </div>
        </div>

        {alert && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 mb-4 border ${alert.type === "error" ? "bg-error-bg border-error-border text-error-text" : "bg-success-bg border-success-border text-success-text"}`}
            id="login-alert"
          >
            {alert.type === "error" ? (
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span>{alert.message}</span>
          </div>
        )}

        {mode === "login" && (
          <LoginForm
            onSubmit={handleLoginSubmit}
            onRegisterClick={() => {
              setMode("register");
              setAlert(null);
            }}
            onForgotClick={() => {
              setMode("forgot");
              setAlert(null);
            }}
            loading={loading}
          />
        )}

        {mode === "register" && (
          <RegisterForm
            onSubmit={handleRegisterSubmit}
            onLoginClick={() => {
              setMode("login");
              setAlert(null);
            }}
            loading={loading}
            onAlert={handleAlert}
          />
        )}

        {mode === "forgot" && (
          <ForgotPasswordForm
            onSubmit={handleForgotPasswordSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        )}

        {mode === "verify" && (
          <VerificationCodeForm
            email={email}
            onVerifySuccess={handleVerifySuccess}
            onCancel={handleCancel}
            onAlert={handleAlert}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        {mode === "reset" && (
          <ResetPasswordForm
            onSubmit={handleResetPasswordSubmit}
            onCancel={handleCancel}
            loading={loading}
            onAlert={handleAlert}
          />
        )}
      </div>
    </div>
  );
};
