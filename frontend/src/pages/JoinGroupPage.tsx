import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useApi } from "../hooks/useApi.js";
import { useAuth } from "../contexts/AuthContext.js";
import {
  Check,
  ShieldAlert,
  Wallet,
  ShieldCheck,
  KeyRound,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface InvitePreview {
  id: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  group: {
    id: string;
    name: string;
    service: string;
    description: string | null;
    maxSlots: number;
    pricePerSlot: string;
    _count: { members: number };
    owner: { id: string; email: string };
  };
}

export function JoinGroupPage() {
  const { token } = useParams<{ token: string }>();
  const { request } = useApi();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Balance check state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const data = await request<{ invite: InvitePreview }>(
          `/groups/invites/token/${token}`,
          "GET",
        );
        setInvite(data.invite);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  async function handleJoinClick() {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/join/${token}`);
      return;
    }

    setCheckingBalance(true);
    setError(null);
    try {
      const data = await request<{ balance: number }>("/payments/balance");
      const price = Number(invite!.group.pricePerSlot);
      setWalletBalance(data.balance);
      if (data.balance >= price) {
        setShowConfirm(true);
      } else {
        setShowInsufficientBalance(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCheckingBalance(false);
    }
  }

  async function handleConfirmJoin() {
    setJoining(true);
    setError(null);
    try {
      await request(`/groups/join/${token}`, "POST");
      setSuccess(true);
      setShowConfirm(false);
      setTimeout(() => navigate("/my-groups"), 2500);
    } catch (err) {
      setError((err as Error).message);
      setShowConfirm(false);
    } finally {
      setJoining(false);
    }
  }

  const price = invite ? Number(invite.group.pricePerSlot) : 0;

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-6 font-sans select-none">
      <div className="w-full max-w-md">
        <div className="bg-bg-card border border-border-card rounded-2xl p-8 shadow-sm">
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-5 h-5 border-2 border-border-card border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-text-soft">Carregando convite...</p>
            </div>
          )}

          {!loading && error && !invite && (
            <div className="text-center py-4">
              <div className="w-10 h-10 bg-error-bg rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-5 h-5 text-error-text" />
              </div>
              <p className="text-sm font-medium text-text-muted">
                Convite inválido
              </p>
              <p className="text-xs text-text-soft mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && invite && !success && (
            <>
              <div className="text-center mb-6">
                <p className="text-xs text-text-soft uppercase tracking-wider font-bold mb-1">
                  Convite para
                </p>
                <h1 className="text-xl font-semibold text-text-main">
                  {invite.group.name}
                </h1>
                <span className="inline-block mt-1.5 text-xs font-medium bg-bg-subtle text-text-muted px-2 py-0.5 rounded-full border border-border-card">
                  {invite.group.service}
                </span>
              </div>

              {invite.group.description && (
                <p className="text-sm text-text-muted text-center mb-6">
                  {invite.group.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-bg-subtle border border-border-card rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-soft">
                    Vagas
                  </p>
                  <p className="text-base font-semibold text-text-main mt-0.5">
                    {invite.group._count.members}/{invite.group.maxSlots}
                  </p>
                </div>
                <div className="bg-bg-subtle border border-border-card rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-soft">
                    Preço/vaga
                  </p>
                  <p className="text-base font-semibold text-text-main mt-0.5">
                    R$ {price.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </div>

              {/* How it works — compact */}
              {isAuthenticated && (
                <div className="bg-bg-subtle rounded-xl p-4 mb-5 space-y-2">
                  {[
                    { icon: Wallet, text: "Pague com saldo da carteira" },
                    { icon: ShieldCheck, text: "Custódia de 48h no pagamento" },
                    { icon: KeyRound, text: "Receba as credenciais por e-mail" },
                    { icon: Clock, text: "Cobrança mensal automática" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <p className="text-xs text-text-muted">{text}</p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-text-soft text-center mb-4">
                Criado por{" "}
                <span className="font-medium text-text-muted">
                  {invite.group.owner.email}
                </span>
              </p>

              {error && (
                <div className="bg-error-bg border border-error-border text-error-text text-xs px-3 py-2.5 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {/* Insufficient balance panel */}
              {showInsufficientBalance && walletBalance !== null && (
                <div className="bg-warning-bg border border-warning-border rounded-xl p-4 mb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning-text shrink-0" />
                    <p className="text-sm font-semibold text-warning-text">Saldo insuficiente</p>
                  </div>
                  <div className="text-xs text-text-muted space-y-1">
                    <div className="flex justify-between">
                      <span>Seu saldo:</span>
                      <span className="font-semibold">R$ {walletBalance.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Necessário:</span>
                      <span className="font-semibold text-error-text">R$ {price.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="flex justify-between border-t border-border-subtle pt-1 mt-1">
                      <span>Faltam:</span>
                      <span className="font-bold text-error-text">R$ {(price - walletBalance).toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>
                  <Link
                    to={`/credits?redirect=/join/${token}`}
                    className="block w-full text-center bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg transition-all"
                  >
                    Recarregar Créditos →
                  </Link>
                  <button
                    onClick={() => setShowInsufficientBalance(false)}
                    className="cursor-pointer block w-full text-center text-xs text-text-soft hover:text-text-muted transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Confirm join panel */}
              {showConfirm && walletBalance !== null && (
                <div className="bg-bg-subtle border border-border-card rounded-xl p-4 mb-4 space-y-3">
                  <p className="text-sm font-semibold text-text-main">Confirmar participação</p>
                  <div className="text-xs text-text-muted space-y-1">
                    <div className="flex justify-between">
                      <span>Valor a debitar:</span>
                      <span className="font-bold text-text-main">R$ {price.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saldo após entrada:</span>
                      <span className="font-semibold">R$ {(walletBalance - price).toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-text-soft leading-relaxed">
                    O valor ficará retido por <strong>48 horas</strong> enquanto o líder cadastra o acesso.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="cursor-pointer text-xs font-medium text-text-muted bg-bg-card hover:bg-bg-hover border border-border-card py-2 rounded-lg transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      id="confirm-join-btn"
                      onClick={handleConfirmJoin}
                      disabled={joining}
                      className="cursor-pointer text-xs font-semibold text-white bg-primary hover:bg-primary-hover py-2 rounded-lg transition-all disabled:opacity-60"
                    >
                      {joining ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                          Entrando...
                        </span>
                      ) : "Confirmar"}
                    </button>
                  </div>
                </div>
              )}

              {/* CTA button */}
              {!showConfirm && !showInsufficientBalance && (
                <button
                  id="join-group-btn"
                  onClick={handleJoinClick}
                  disabled={joining || checkingBalance}
                  className="cursor-pointer w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 rounded-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {checkingBalance ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verificando saldo...
                    </span>
                  ) : isAuthenticated ? (
                    "Entrar no grupo"
                  ) : (
                    "Fazer login para entrar"
                  )}
                </button>
              )}
            </>
          )}

          {success && (
            <div className="text-center py-4">
              <div className="w-10 h-10 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-5 h-5 text-success-text" />
              </div>
              <p className="text-sm font-medium text-text-muted">
                Bem-vindo ao grupo!
              </p>
              <p className="text-xs text-text-soft mt-1">
                Aguarde as credenciais do líder. Você será notificado por e-mail.
              </p>
              <p className="text-xs text-text-soft mt-2">Redirecionando...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
