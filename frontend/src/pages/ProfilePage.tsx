import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "../components/AppLayout.js";
import { useAuth } from "../contexts/AuthContext.js";
import { useApi } from "../hooks/useApi.js";
import { useToast } from "../hooks/useToast.js";
import { User, Lock, Mail, Phone, Check, Camera, FileText } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  name: string | null;
  phone: string | null;
  document: string | null;
  avatarUrl: string | null;
  created_at: string;
}

type Tab = "data" | "security";

function formatPhoneInput(value: string) {
  const val = value.replace(/\D/g, "");
  if (val.length > 11)
    return `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7, 11)}`;
  if (val.length > 6)
    return `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
  if (val.length > 2) return `(${val.slice(0, 2)}) ${val.slice(2)}`;
  if (val.length > 0) return `(${val}`;
  return "";
}

function formatCPFInput(value: string) {
  const val = value.replace(/\D/g, "").slice(0, 11);
  if (val.length > 9)
    return `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`;
  if (val.length > 6)
    return `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`;
  if (val.length > 3) return `${val.slice(0, 3)}.${val.slice(3)}`;
  return val;
}

function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, "");

  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

export function ProfilePage() {
  const { token, login } = useAuth();
  const { request } = useApi();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("data");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentVal, setDocumentVal] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<{ user: UserProfile }>("/users/profile");
      setProfile(data.user);
      setName(data.user.name ?? "");
      setEmail(data.user.email);
      setPhone(formatPhoneInput(data.user.phone ?? ""));
      setDocumentVal(formatCPFInput(data.user.document ?? ""));
      setAvatarPreview(data.user.avatarUrl ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("A imagem deve ter no máximo 2MB.");
      toast.warning("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
      setAvatarChanged(true);
      setProfileError(null);
    };
    reader.readAsDataURL(file);
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);

    if (documentVal && !validateCPF(documentVal)) {
      setProfileError("CPF inválido. Verifique os dígitos.");
      toast.error("CPF inválido. Verifique os dígitos.");
      setProfileLoading(false);
      return;
    }

    try {
      const data = await request<{ user: UserProfile }>(
        "/users/profile",
        "PUT",
        {
          name: name || null,
          email,
          phone: phone || null,
          document: documentVal || null,
          ...(avatarChanged ? { avatarUrl: avatarPreview } : {}),
        },
      );

      setProfile(data.user);
      setAvatarChanged(false);
      setProfileSuccess("Perfil atualizado com sucesso!");
      toast.success("Perfil atualizado com sucesso!");

      if (token) {
        login(
          { id: data.user.id, email: data.user.email, role: data.user.role },
          token,
        );
      }
    } catch (err) {
      const msg = (err as Error).message;
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (newPassword !== confirmPassword) {
      setSecurityError("As senhas não coincidem.");
      toast.error("As senhas não coincidem.");
      return;
    }

    setSecurityLoading(true);

    try {
      await request("/users/password", "PUT", {
        currentPassword,
        newPassword,
      });

      setSecuritySuccess("Senha atualizada com sucesso!");
      toast.success("Senha atualizada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = (err as Error).message;
      setSecurityError(msg);
      toast.error(msg);
    } finally {
      setSecurityLoading(false);
    }
  };

  const initials = profile?.email
    ? profile.email.slice(0, 2).toUpperCase()
    : "??";

  const registrationDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <AppLayout>
      <div className="w-full max-w-3xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text-main tracking-tight">
            Perfil
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            Gerencie as informações da sua conta.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-border-card border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-text-soft">Carregando perfil...</p>
          </div>
        ) : error ? (
          <div className="bg-error-bg border border-error-border text-error-text text-sm px-5 py-4 rounded-xl">
            {error}
          </div>
        ) : (
          <>
            {/* Hero card */}
            <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden mb-8">
              <div className="px-8 py-8 flex items-center gap-6">
                {/* Avatar Column */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-bg-subtle border border-border-card text-text-muted flex items-center justify-center text-3xl font-bold overflow-hidden select-none">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <button
                      type="button"
                      id="avatar-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer shadow-md border-2 border-bg-card hover:bg-primary-hover transition-colors"
                      title="Alterar foto"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      id="avatar-file-input"
                    />
                  </div>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarPreview(null);
                        setAvatarChanged(true);
                      }}
                      className="text-[11px] text-error-text hover:underline cursor-pointer font-medium"
                    >
                      Remover foto
                    </button>
                  )}
                </div>

                {/* User Info Column */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {avatarChanged && (
                      <span className="inline-block text-xs font-medium text-text-soft bg-bg-subtle px-2.5 py-0.5 rounded-full">
                        Foto alterada — salve para confirmar
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-semibold text-text-main tracking-tight">
                    {profile?.name || profile?.email}
                  </p>
                  {profile?.name && (
                    <p className="text-sm text-text-muted mt-0.5">
                      {profile.email}
                    </p>
                  )}
                  <p className="text-sm text-text-soft mt-1">
                    Membro desde {registrationDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 bg-bg-subtle p-1 rounded-xl mb-6 max-w-xs">
              <button
                onClick={() => setActiveTab("data")}
                className={`cursor-pointer flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-all ${
                  activeTab === "data"
                    ? "bg-bg-card text-text-main shadow-sm"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <User className="w-4 h-4" />
                Meus dados
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`cursor-pointer flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-all ${
                  activeTab === "security"
                    ? "bg-bg-card text-text-main shadow-sm"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <Lock className="w-4 h-4" />
                Segurança
              </button>
            </div>

            {/* Forms */}
            {activeTab === "data" ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="bg-bg-card border border-border-card rounded-2xl p-6 space-y-5">
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                    Dados pessoais
                  </h2>

                  {profileSuccess && (
                    <div className="bg-success-bg border border-success-border text-success-text text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {profileSuccess}
                    </div>
                  )}

                  {profileError && (
                    <div className="bg-error-bg border border-error-border text-error-text text-sm px-4 py-3 rounded-xl">
                      {profileError}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-text-muted mb-2"
                    >
                      Nome de usuário
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full text-sm border border-border-card rounded-xl px-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors"
                      disabled={profileLoading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-text-muted mb-2"
                    >
                      E-mail <span className="text-error-text">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-text-soft">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full text-sm border border-border-card rounded-xl pl-11 pr-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors"
                        disabled={profileLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-text-muted mb-2"
                      >
                        Telefone
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 text-text-soft">
                          <Phone className="w-4 h-4" />
                        </span>
                        <input
                          id="phone"
                          type="text"
                          value={phone}
                          onChange={(e) =>
                            setPhone(formatPhoneInput(e.target.value))
                          }
                          maxLength={15}
                          placeholder="(00) 00000-0000"
                          className="w-full text-sm border border-border-card rounded-xl pl-11 pr-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors"
                          disabled={profileLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="document"
                        className="block text-sm font-medium text-text-muted mb-2"
                      >
                        CPF
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 text-text-soft">
                          <FileText className="w-4 h-4" />
                        </span>
                        <input
                          id="document"
                          type="text"
                          value={documentVal}
                          onChange={(e) =>
                            setDocumentVal(formatCPFInput(e.target.value))
                          }
                          maxLength={14}
                          placeholder="000.000.000-00"
                          className="w-full text-sm border border-border-card rounded-xl pl-11 pr-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors"
                          disabled={profileLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="cursor-pointer w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3.5 rounded-xl transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {profileLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Salvar Alterações"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="bg-bg-card border border-border-card rounded-2xl p-6 space-y-5">
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                    Alteração de senha
                  </h2>

                  {securitySuccess && (
                    <div className="bg-success-bg border border-success-border text-success-text text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {securitySuccess}
                    </div>
                  )}

                  {securityError && (
                    <div className="bg-error-bg border border-error-border text-error-text text-sm px-4 py-3 rounded-xl">
                      {securityError}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="block text-sm font-medium text-text-muted mb-2"
                    >
                      Senha atual <span className="text-error-text">*</span>
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-sm border border-border-card rounded-xl px-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors"
                      disabled={securityLoading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-sm font-medium text-text-muted mb-2"
                    >
                      Nova senha <span className="text-error-text">*</span>
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full text-sm border border-border-card rounded-xl px-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors"
                      disabled={securityLoading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-text-muted mb-2"
                    >
                      Confirmar nova senha{" "}
                      <span className="text-error-text">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua nova senha"
                      className="w-full text-sm border border-border-card rounded-xl px-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors"
                      disabled={securityLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={securityLoading}
                  className="cursor-pointer w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3.5 rounded-xl transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {securityLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Atualizando...
                    </span>
                  ) : (
                    "Atualizar Senha"
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
