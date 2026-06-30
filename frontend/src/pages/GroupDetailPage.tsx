import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/AppLayout.js";
import { useApi } from "../hooks/useApi.js";
import { useAuth } from "../contexts/AuthContext.js";
import {
  ChevronLeft,
  Plus,
  Crown,
  Link2,
  Check,
  X,
  Share2,
  Users,
  Minus,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { ServiceIcon } from "../components/ServiceIcon.js";
import { useToast } from "../contexts/ToastContext.js";
import { useConfirm } from "../contexts/ConfirmContext.js";

interface Member {
  id: string;
  status:
    | "ACTIVE"
    | "INACTIVE"
    | "BLOCKED"
    | "PENDING_CREDENTIALS"
    | "PENDING_PAYMENT";
  joinedAt: string;
  escrowReleasedAt?: string | null;
  user: { id: string; email: string; avatarUrl?: string | null };
}

interface Invite {
  id: string;
  token: string;
  email: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
  service: string;
  description: string | null;
  maxSlots: number;
  pricePerSlot: string;
  status: "ACTIVE" | "INACTIVE";
  isOwner: boolean;
  isMember?: boolean;
  credentials?: string | null;
  myMemberStatus?:
    | "ACTIVE"
    | "INACTIVE"
    | "BLOCKED"
    | "PENDING_CREDENTIALS"
    | "PENDING_PAYMENT"
    | null;
  owner: {
    id: string;
    email: string;
    name?: string | null;
    phone?: string | null;
    created_at?: string;
    avatarUrl?: string | null;
  };
  members: Member[];
  _count: { members: number };
}

const APP_URL = import.meta.env.VITE_APP_URL ?? "http://localhost:5173";

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { request } = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [group, setGroup] = useState<Group | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [slotCount, setSlotCount] = useState(1);

  // Join flow state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);

  // Credentials state
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentialsInput, setCredentialsInput] = useState("");
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);

  const fetchGroup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<{ group: Group }>(`/groups/${id}`);
      setGroup(data.group);

      if (data.group.isMember || data.group.isOwner) {
        try {
          const balData = await request<{ balance: number }>("/payments/balance");
          setWalletBalance(balData.balance);
        } catch (e) {
          console.warn("Erro ao buscar saldo da carteira:", e);
        }
      }

      if (data.group.isOwner) {
        const inv = await request<{ invites: Invite[] }>(
          `/groups/${id}/invites`,
        );
        setInvites(inv.invites);
      }
      // Pre-fill credentials form if already set
      if (data.group.credentials) {
        setCredentialsInput(data.group.credentials);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // Registra a visualização no banco de dados (fire-and-forget)
  useEffect(() => {
    if (group) {
      request(`/groups/${group.id}/view`, "POST").catch(() => {});
    }
  }, [group?.id]);

  async function handleMemberStatus(
    memberId: string,
    status: "ACTIVE" | "INACTIVE" | "BLOCKED",
  ) {
    setActionLoading(memberId);
    try {
      await request(`/groups/${id}/members/${memberId}/status`, "PATCH", {
        status,
      });
      await fetchGroup();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveMember(memberId: string) {
    const isConfirmed = await confirm({
      title: "Remover Membro",
      message: "Tem certeza que deseja remover este membro?",
      confirmText: "Remover",
      isDanger: true,
    });
    if (!isConfirmed) return;

    setActionLoading(memberId + "-remove");
    try {
      await request(`/groups/${id}/members/${memberId}`, "DELETE");
      await fetchGroup();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateInvite() {
    setActionLoading("invite");
    try {
      await request(`/groups/${id}/invites`, "POST", {});
      const inv = await request<{ invites: Invite[] }>(`/groups/${id}/invites`);
      setInvites(inv.invites);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    setActionLoading("revoke-" + inviteId);
    try {
      await request(`/groups/${id}/invites/${inviteId}`, "DELETE");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  function copyInviteLink(token: string) {
    const link = `${APP_URL}/join/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  function handleShareGroup() {
    const link = `${APP_URL}/groups/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    });
  }

  async function handleDeleteGroup() {
    const isConfirmed = await confirm({
      title: "Excluir Grupo",
      message: "Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.",
      confirmText: "Excluir Grupo",
      isDanger: true,
    });
    if (!isConfirmed) return;

    try {
      await request(`/groups/${id}`, "DELETE");
      toast.success("Grupo excluído com sucesso.");
      navigate("/groups");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  // ─── Join flow with balance check ────────────────────────────────────────
  async function handleJoinClick() {
    setError(null);
    setActionLoading("balance-check");
    try {
      const data = await request<{
        balance: number;
        lockedInGroups: number;
        pendingDeposits: number;
      }>("/payments/balance");
      setWalletBalance(data.balance);
      const price = Number(group!.pricePerSlot) * slotCount;
      if (data.balance >= price) {
        setShowJoinConfirm(true);
      } else {
        setShowInsufficientBalance(true);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmJoin() {
    setActionLoading("join");
    setError(null);
    try {
      await request(`/groups/${id}/join`, "POST");
      setShowJoinConfirm(false);
      await fetchGroup();
    } catch (err) {
      setError((err as Error).message);
      setShowJoinConfirm(false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReactivateSubscription() {
    setActionLoading("reactivate");
    setError(null);
    try {
      await request(`/groups/${id}/reactivate`, "POST");
      await fetchGroup();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeaveGroup() {
    const isConfirmed = await confirm({
      title: "Sair do Grupo",
      message: "Tem certeza que deseja cancelar sua assinatura e sair deste grupo? Se estiver no período de custódia de 48h, o valor pago será estornado integralmente para sua carteira.",
      confirmText: "Sair do Grupo",
      isDanger: true,
    });
    if (!isConfirmed) return;

    setActionLoading("leave");
    try {
      await request(`/groups/${id}/leave`, "POST");
      toast.success("Você saiu do grupo com sucesso.");
      navigate("/groups");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Credentials ─────────────────────────────────────────────────────────
  async function handleSaveCredentials() {
    if (!credentialsInput.trim()) return;
    setActionLoading("credentials");
    setError(null);
    try {
      await request(`/groups/${id}/credentials`, "PATCH", {
        credentials: credentialsInput.trim(),
      });
      setShowCredentialsForm(false);
      await fetchGroup();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <div className="w-6 h-6 border-2 border-border-card border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-text-soft">Carregando grupo...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !group) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto px-6 py-8">
          <div className="bg-error-bg border border-error-border text-error-text text-sm px-5 py-4 rounded-xl">
            {error ?? "Grupo não encontrado."}
          </div>
        </div>
      </AppLayout>
    );
  }

  const usedSlots = group._count.members;
  const availableSlots = group.maxSlots - usedSlots;
  const slotsPercent = Math.round((usedSlots / group.maxSlots) * 100);
  const isFull = availableSlots === 0;
  const priceNum = Number(group.pricePerSlot);
  const isVisitor = !group.isOwner && !group.isMember;

  // Detect if current user is in PENDING_CREDENTIALS state
  const myMembership = group.members.find((m) => m.user.id === user?.id);
  const isPendingCredentials = myMembership?.status === "PENDING_CREDENTIALS";
  const isActiveMember = myMembership?.status === "ACTIVE";
  const isBlockedMember = myMembership?.status === "BLOCKED";

  // Count pending members (for leader alert)
  const pendingCredentialMembers = group.members.filter(
    (m) => m.status === "PENDING_CREDENTIALS",
  );

  // ─── Visitor layout: 2/3 + 1/3 ──────────────────────────────────────────────
  if (isVisitor) {
    const totalPrice = priceNum * slotCount;

    return (
      <AppLayout>
        <div className="w-full max-w-6xl mx-auto px-6 py-10">
          {/* Breadcrumb */}
          <Link
            to="/groups"
            id="back-to-groups"
            className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-text-soft hover:text-text-muted transition-colors mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar para grupos
          </Link>

          <div className="flex gap-8 items-start">
            {/* ── Left column 2/3 — Group info ─────────────────────────────── */}
            <div className="flex-[2] min-w-0 space-y-6">
              {/* Hero */}
              <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden">
                <div className="p-8">
                  {/* Service + status badges & Share button */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-12 h-12 bg-bg-subtle rounded-xl flex items-center justify-center text-text-muted shrink-0">
                        <ServiceIcon
                          service={group.service}
                          className="w-6 h-6"
                        />
                      </div>
                      <div className="ml-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-text-soft">
                            {group.service}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              group.status === "ACTIVE"
                                ? "bg-success-bg text-success-text"
                                : "bg-bg-subtle text-text-soft"
                            }`}
                          >
                            {group.status === "ACTIVE" ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleShareGroup}
                      className="shrink-0 cursor-pointer inline-flex items-center justify-center gap-2 text-sm font-medium text-text-muted hover:text-text-main bg-bg-subtle hover:bg-bg-hover border border-border-card px-3 py-1.5 rounded-xl transition-all"
                      title="Compartilhar grupo"
                    >
                      {copiedShare ? (
                        <>
                          <Check className="w-4 h-4 text-success-text" />
                          <span className="hidden sm:inline">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Compartilhar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h1 className="text-2xl font-semibold text-text-main tracking-tight">
                    {group.name}
                  </h1>

                  {group.description ? (
                    <p className="text-sm text-text-muted mt-3 leading-relaxed">
                      {group.description}
                    </p>
                  ) : (
                    <p className="text-sm text-text-soft mt-3 italic">
                      Sem descrição fornecida pelo líder.
                    </p>
                  )}

                  <p className="text-xs text-text-soft mt-4">
                    Criado por{" "}
                    <span className="font-medium text-text-muted">
                      {group.owner.email}
                    </span>
                  </p>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-bg-card border border-border-card rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                  Como funciona
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      icon: Wallet,
                      label: "Pague com saldo da sua carteira",
                      desc: "O valor é debitado do seu saldo. Recarregue via PIX se necessário.",
                    },
                    {
                      icon: ShieldCheck,
                      label: "Custódia de 48 horas",
                      desc: "Seu pagamento fica protegido enquanto o líder cadastra as credenciais.",
                    },
                    {
                      icon: KeyRound,
                      label: "Receba as credenciais",
                      desc: "O líder envia o acesso à assinatura. Você será notificado por e-mail.",
                    },
                    {
                      icon: Clock,
                      label: "Cobrança mensal automática",
                      desc: "Renovado automaticamente todo mês enquanto você tiver saldo.",
                    },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-main">
                          {label}
                        </p>
                        <p className="text-xs text-text-soft mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Líder do Grupo */}
              <div className="bg-bg-card border border-border-card rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-5">
                  Líder do Grupo
                </h2>

                <div className="flex items-center gap-4 mb-6">
                  {group.owner.avatarUrl ? (
                    <img
                      src={group.owner.avatarUrl}
                      alt={group.owner.name || group.owner.email}
                      className="w-14 h-14 rounded-full object-cover border border-primary/20 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold uppercase border border-primary/20 shrink-0">
                      {group.owner.name
                        ? group.owner.name.charAt(0)
                        : group.owner.email.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-text-main">
                      {group.owner.name || "Líder"}
                    </h3>
                    {group.owner.created_at && (
                      <p className="text-xs text-text-soft mt-0.5">
                        Na plataforma desde{" "}
                        {new Date(group.owner.created_at)
                          .toLocaleDateString("pt-BR", {
                            month: "long",
                            year: "numeric",
                          })
                          .replace(/^\w/, (c) => c.toUpperCase())}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border-subtle">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-soft font-medium">E-mail</span>
                    <span className="text-text-muted select-all font-mono">
                      {group.owner.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-soft font-medium">Telefone</span>
                    <span className="text-text-muted select-all">
                      {group.owner.phone || "Não informado"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Members preview */}
              <div className="bg-bg-card border border-border-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-text-soft" />
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                    Membros
                  </h2>
                  <span className="ml-auto text-xs text-text-soft">
                    {usedSlots} de {group.maxSlots}
                  </span>
                </div>
                <div className="flex -space-x-2">
                  {group.members.slice(0, 8).map((m) =>
                    m.user.avatarUrl ? (
                      <img
                        key={m.id}
                        src={m.user.avatarUrl}
                        alt={m.user.email}
                        title={m.user.email}
                        className="w-9 h-9 rounded-full object-cover border-2 border-bg-card"
                      />
                    ) : (
                      <div
                        key={m.id}
                        className="w-9 h-9 rounded-full bg-bg-subtle border-2 border-bg-card flex items-center justify-center text-xs font-bold text-text-muted uppercase"
                        title={m.user.email}
                      >
                        {m.user.email.charAt(0)}
                      </div>
                    ),
                  )}
                  {usedSlots > 8 && (
                    <div className="w-9 h-9 rounded-full bg-bg-subtle border-2 border-bg-card flex items-center justify-center text-xs font-bold text-text-muted">
                      +{usedSlots - 8}
                    </div>
                  )}
                  {usedSlots === 0 && (
                    <p className="text-sm text-text-soft">
                      Nenhum membro ainda.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right column 1/3 — Join panel ────────────────────────────── */}
            <div className="flex-1 min-w-[280px]">
              <div className="sticky top-24 bg-bg-card border border-border-card rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 space-y-5">
                  {/* Price */}
                  <div>
                    <p className="text-xs font-semibold text-text-soft uppercase tracking-wider mb-1">
                      Valor por cota
                    </p>
                    <p className="text-3xl font-bold text-text-main tracking-tight">
                      R$ {priceNum.toFixed(2).replace(".", ",")}
                      <span className="text-base font-normal text-text-soft ml-1">
                        /mês
                      </span>
                    </p>
                  </div>

                  <div className="border-t border-border-subtle" />

                  {/* Slot counter */}
                  <div>
                    <p className="text-sm font-medium text-text-muted mb-3">
                      Quantas cotas?
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        id="slot-decrease-btn"
                        onClick={() => setSlotCount((n) => Math.max(1, n - 1))}
                        disabled={slotCount <= 1}
                        className="cursor-pointer w-9 h-9 rounded-xl border border-border-card bg-bg-subtle hover:bg-bg-hover flex items-center justify-center text-text-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-lg font-semibold text-text-main">
                        {slotCount}
                      </span>
                      <button
                        type="button"
                        id="slot-increase-btn"
                        onClick={() =>
                          setSlotCount((n) =>
                            Math.min(n + 1, Math.max(1, availableSlots)),
                          )
                        }
                        disabled={slotCount >= availableSlots || isFull}
                        className="cursor-pointer w-9 h-9 rounded-xl border border-border-card bg-bg-subtle hover:bg-bg-hover flex items-center justify-center text-text-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-bg-subtle rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-sm text-text-muted">
                      {slotCount}× R$ {priceNum.toFixed(2).replace(".", ",")}
                    </p>
                    <p className="text-base font-bold text-text-main">
                      R$ {totalPrice.toFixed(2).replace(".", ",")}
                    </p>
                  </div>

                  {/* Vacancy status */}
                  {isFull ? (
                    <div className="text-xs text-center text-error-text font-medium">
                      Grupo lotado — sem vagas disponíveis
                    </div>
                  ) : (
                    <div className="text-xs text-center text-text-soft">
                      {availableSlots} vaga{availableSlots !== 1 ? "s" : ""}{" "}
                      disponível{availableSlots !== 1 ? "is" : ""}
                    </div>
                  )}

                  {/* Insufficient balance modal */}
                  {showInsufficientBalance && walletBalance !== null && (
                    <div className="bg-warning-bg border border-warning-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning-text shrink-0" />
                        <p className="text-sm font-semibold text-warning-text">
                          Saldo insuficiente
                        </p>
                      </div>
                      <div className="text-xs text-text-muted space-y-1">
                        <div className="flex justify-between">
                          <span>Seu saldo:</span>
                          <span className="font-semibold">
                            R$ {walletBalance.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Necessário:</span>
                          <span className="font-semibold text-error-text">
                            R$ {totalPrice.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-border-subtle pt-1 mt-1">
                          <span>Faltam:</span>
                          <span className="font-bold text-error-text">
                            R${" "}
                            {(totalPrice - walletBalance)
                              .toFixed(2)
                              .replace(".", ",")}
                          </span>
                        </div>
                      </div>
                      <Link
                        to="/credits"
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

                  {/* Confirm join modal */}
                  {showJoinConfirm && walletBalance !== null && (
                    <div className="bg-bg-subtle border border-border-card rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-text-main">
                        Confirmar participação
                      </p>
                      <div className="text-xs text-text-muted space-y-1">
                        <div className="flex justify-between">
                          <span>Valor a debitar:</span>
                          <span className="font-bold text-text-main">
                            R$ {totalPrice.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Saldo após entrada:</span>
                          <span className="font-semibold">
                            R${" "}
                            {(walletBalance - totalPrice)
                              .toFixed(2)
                              .replace(".", ",")}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-soft leading-relaxed">
                        O valor ficará retido por <strong>48 horas</strong>{" "}
                        enquanto o líder cadastra as credenciais. Após esse
                        prazo, é repassado ao líder automaticamente.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setShowJoinConfirm(false)}
                          className="cursor-pointer text-xs font-medium text-text-muted bg-bg-card hover:bg-bg-hover border border-border-card py-2 rounded-lg transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          id="confirm-join-btn"
                          onClick={handleConfirmJoin}
                          disabled={actionLoading === "join"}
                          className="cursor-pointer text-xs font-semibold text-white bg-primary hover:bg-primary-hover py-2 rounded-lg transition-all disabled:opacity-60"
                        >
                          {actionLoading === "join" ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                              Entrando...
                            </span>
                          ) : (
                            "Confirmar"
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CTA — only shown when not showing modals */}
                  {!showJoinConfirm && !showInsufficientBalance && (
                    <button
                      id="join-group-direct-btn"
                      onClick={handleJoinClick}
                      disabled={isFull || actionLoading === "balance-check"}
                      className="cursor-pointer w-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === "balance-check" ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                          Verificando saldo...
                        </span>
                      ) : isFull ? (
                        "Grupo Lotado"
                      ) : (
                        "Participar do Grupo"
                      )}
                    </button>
                  )}

                  {/* Disclaimer */}
                  <p className="text-[11px] text-text-soft text-center leading-relaxed">
                    Pagamento seguro com custódia de 48h. Cancele quando quiser.
                  </p>

                  {/* Error banner */}
                  {error && (
                    <div className="bg-error-bg border border-error-border text-error-text text-xs px-4 py-2.5 rounded-xl">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ─── Owner / Member layout: original 1-column ────────────────────────────
  return (
    <AppLayout>
      <div className="w-full max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Breadcrumb */}
        <Link
          to="/groups"
          id="back-to-groups"
          className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-text-soft hover:text-text-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para grupos
        </Link>

        {/* ─── LEADER ALERT: pending credentials ─────────────────────────── */}
        {group.isOwner && pendingCredentialMembers.length > 0 && (
          <div className="bg-warning-bg border border-warning-border rounded-2xl p-5 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-warning-text shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-warning-text">
                {pendingCredentialMembers.length === 1
                  ? "1 novo membro aguarda suas credenciais"
                  : `${pendingCredentialMembers.length} novos membros aguardam suas credenciais`}
              </p>
              <p className="text-xs text-text-muted mt-1">
                O pagamento está em custódia. Cadastre as credenciais de acesso
                para liberar o valor para sua carteira.
              </p>
            </div>
            <button
              onClick={() => setShowCredentialsForm(true)}
              className="cursor-pointer shrink-0 text-xs font-semibold text-white bg-warning-text hover:opacity-90 px-4 py-2 rounded-xl transition-all"
            >
              Cadastrar credenciais
            </button>
          </div>
        )}

        {/* ─── MEMBER ALERT: waiting for credentials ──────────────────────── */}
        {!group.isOwner && isPendingCredentials && (
          <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-start gap-4">
            <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-text-main">
                Aguardando credenciais do líder
              </p>
              <p className="text-xs text-text-muted mt-1">
                Seu pagamento foi recebido e está em custódia por 48 horas. O
                líder será notificado para cadastrar as credenciais de acesso e
                você receberá um e-mail assim que estiverem disponíveis.
              </p>
            </div>
          </div>
        )}

        {/* ─── MEMBER ALERT: blocked due to delinquency ──────────────────────── */}
        {!group.isOwner && isBlockedMember && (
          <div className="bg-error-bg border border-error-border rounded-2xl p-5 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-error-text shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-error-text">
                Assinatura suspensa por inadimplência
              </p>
              <p className="text-xs text-text-muted mt-1">
                Sua assinatura deste grupo foi suspensa devido a saldo insuficiente em sua carteira no momento da renovação recorrente.
                {walletBalance !== null && (
                  <span className="block mt-1 font-semibold text-text-main">
                    Seu saldo atual: R$ {walletBalance.toFixed(2).replace(".", ",")} | Preço da vaga: R$ {priceNum.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </p>
              <div className="mt-3 flex items-center gap-3">
                {walletBalance !== null && walletBalance >= priceNum ? (
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={actionLoading === "reactivate"}
                    className="cursor-pointer text-xs font-semibold text-white bg-success-text hover:opacity-90 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                  >
                    {actionLoading === "reactivate" ? (
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        Reativando...
                      </span>
                    ) : (
                      "Reativar Assinatura"
                    )}
                  </button>
                ) : (
                  <Link
                    to="/credits"
                    className="cursor-pointer text-xs font-semibold text-white bg-error-text hover:opacity-90 px-4 py-2 rounded-xl transition-all"
                  >
                    Recarregar Carteira →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hero header */}
        <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 bg-bg-subtle rounded-2xl flex items-center justify-center text-text-muted shrink-0">
                  <ServiceIcon service={group.service} className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-text-soft">
                      {group.service}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        group.status === "ACTIVE"
                          ? "bg-success-bg text-success-text"
                          : "bg-bg-subtle text-text-soft"
                      }`}
                    >
                      {group.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                    {group.isOwner && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-bg-subtle text-text-muted">
                        <Crown className="w-3.5 h-3.5" /> Você é o líder
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-semibold text-text-main tracking-tight">
                    {group.name}
                  </h1>
                  {group.description && (
                    <p className="text-sm text-text-muted mt-1.5 max-w-lg">
                      {group.description}
                    </p>
                  )}
                  <p className="text-xs text-text-soft mt-2">
                    Criado por{" "}
                    <span className="font-medium text-text-muted">
                      {group.owner.email}
                    </span>
                  </p>
                </div>
              </div>

              {group.isOwner && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/groups/${group.id}/edit`}
                    id="edit-group-btn"
                    className="cursor-pointer text-sm font-medium text-text-muted bg-bg-subtle hover:bg-bg-hover border border-border-card px-4 py-2 rounded-xl transition-all"
                  >
                    Editar
                  </Link>
                  <button
                    id="delete-group-btn"
                    onClick={handleDeleteGroup}
                    className="cursor-pointer text-sm font-medium text-error-text bg-error-bg hover:bg-error-bg border border-error-border px-4 py-2 rounded-xl transition-all"
                  >
                    Excluir
                  </button>
                </div>
              )}

              {!group.isOwner && group.isMember && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="leave-group-btn"
                    onClick={handleLeaveGroup}
                    disabled={actionLoading === "leave"}
                    className="cursor-pointer text-sm font-medium text-error-text bg-error-bg hover:bg-error-bg border border-error-border px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                  >
                    {actionLoading === "leave" ? "Saindo..." : "Sair do Grupo"}
                  </button>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-border-subtle">
              <StatBlock
                label="Total de vagas"
                value={String(group.maxSlots)}
              />
              <StatBlock label="Ocupadas" value={String(usedSlots)} />
              <StatBlock
                label="Disponíveis"
                value={String(availableSlots)}
                color={isFull ? "red" : "green"}
              />
              <StatBlock
                label="Preço por vaga"
                value={`R$ ${priceNum.toFixed(2)}`}
              />
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-text-soft mb-2">
                <span>Ocupação do grupo</span>
                <span className="font-medium text-text-muted">
                  {slotsPercent}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-bg-subtle rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isFull
                      ? "bg-error-text"
                      : slotsPercent > 75
                        ? "bg-warning-text"
                        : "bg-success-text"
                  }`}
                  style={{ width: `${slotsPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-error-bg border border-error-border text-error-text text-sm px-5 py-4 rounded-xl">
            {error}
          </div>
        )}

        {/* ─── CREDENTIALS SECTION ─────────────────────────────────────────── */}
        {/* For LEADER: form to set credentials */}
        {group.isOwner && (
          <section className="bg-bg-card border border-border-card rounded-2xl overflow-hidden">
            <div className="px-8 py-5 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-main flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Credenciais de Acesso
                </h2>
                <p className="text-xs text-text-soft mt-0.5">
                  {group.credentials
                    ? "Credenciais cadastradas. Membros ativos podem visualizá-las."
                    : "Nenhuma credencial cadastrada. Membros novos não terão acesso."}
                </p>
              </div>
              <button
                onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                className="cursor-pointer text-sm font-medium text-text-muted bg-bg-subtle hover:bg-bg-hover border border-border-card px-4 py-2 rounded-xl transition-all"
              >
                {group.credentials ? "Editar" : "Cadastrar"}
              </button>
            </div>

            {showCredentialsForm && (
              <div className="p-6 space-y-4">
                <div className="bg-warning-bg border border-warning-border rounded-xl p-3">
                  <p className="text-xs text-warning-text font-medium">
                    ⚠️ Compartilhe apenas dentro da plataforma. Não divulgue as
                    credenciais em outros canais.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-soft uppercase tracking-wider block mb-2">
                    Dados de acesso (e-mail, senha, link de convite, etc.)
                  </label>
                  <textarea
                    id="credentials-input"
                    value={credentialsInput}
                    onChange={(e) => setCredentialsInput(e.target.value)}
                    placeholder={
                      "E-mail: usuario@example.com\nSenha: minhasenha123"
                    }
                    rows={5}
                    className="w-full bg-bg-subtle border border-border-card rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-text-soft focus:outline-none focus:border-primary resize-none font-mono"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCredentialsForm(false)}
                    className="cursor-pointer text-sm font-medium text-text-muted px-4 py-2 rounded-xl border border-border-card hover:bg-bg-hover transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    id="save-credentials-btn"
                    onClick={handleSaveCredentials}
                    disabled={
                      !credentialsInput.trim() ||
                      actionLoading === "credentials"
                    }
                    className="cursor-pointer text-sm font-semibold text-white bg-primary hover:bg-primary-hover px-6 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === "credentials" ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </span>
                    ) : (
                      "Salvar credenciais"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Preview current credentials (for owner) */}
            {group.credentials && !showCredentialsForm && (
              <div className="p-6">
                <div className="relative bg-bg-subtle rounded-xl p-4">
                  <pre
                    className={`text-sm font-mono text-text-main whitespace-pre-wrap break-words ${!showCredentials ? "blur-sm select-none" : ""}`}
                  >
                    {group.credentials}
                  </pre>
                  <button
                    onClick={() => setShowCredentials(!showCredentials)}
                    className="cursor-pointer absolute top-3 right-3 p-1.5 text-text-soft hover:text-text-muted bg-bg-card rounded-lg border border-border-card transition-all"
                  >
                    {showCredentials ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* For ACTIVE MEMBER: view credentials */}
        {!group.isOwner && isActiveMember && group.credentials && (
          <section className="bg-bg-card border border-border-card rounded-2xl overflow-hidden">
            <div className="px-8 py-5 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-main flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Credenciais de Acesso
                </h2>
                <p className="text-xs text-text-soft mt-0.5">
                  Dados fornecidos pelo líder. Não compartilhe fora da
                  plataforma.
                </p>
              </div>
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-text-muted bg-bg-subtle hover:bg-bg-hover border border-border-card px-4 py-2 rounded-xl transition-all"
              >
                {showCredentials ? (
                  <>
                    <EyeOff className="w-4 h-4" /> Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> Revelar
                  </>
                )}
              </button>
            </div>
            <div className="p-6">
              <div className="relative bg-bg-subtle rounded-xl p-4">
                <pre
                  className={`text-sm font-mono text-text-main whitespace-pre-wrap break-words transition-all ${!showCredentials ? "blur-sm select-none" : ""}`}
                >
                  {group.credentials}
                </pre>
                {!showCredentials && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setShowCredentials(true)}
                      className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover px-4 py-2 rounded-xl shadow-lg transition-all"
                    >
                      <Eye className="w-4 h-4" /> Clique para revelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Members section */}
        <section className="bg-bg-card border border-border-card rounded-2xl overflow-hidden">
          <div className="px-8 py-5 border-b border-border-subtle flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-main">
                Membros
              </h2>
              <p className="text-xs text-text-soft mt-0.5">
                {usedSlots} de {group.maxSlots} vagas preenchidas
              </p>
            </div>
          </div>

          <div className="divide-y divide-border-subtle">
            {group.members.map((member) => {
              const isOwner = member.user.id === group.owner.id;
              const isCurrentUser = member.user.id === user?.id;
              return (
                <div
                  key={member.id}
                  id={`member-${member.id}`}
                  className="flex items-center justify-between px-8 py-4 hover:bg-bg-subtle/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {member.user.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.email}
                        className="w-9 h-9 rounded-full object-cover border border-border-card shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 bg-bg-subtle rounded-full flex items-center justify-center text-text-muted text-sm font-bold uppercase border border-border-card shrink-0">
                        {member.user.email.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-text-main">
                        {member.user.email}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-text-soft font-normal">
                            (você)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-soft mt-0.5">
                        Entrou em{" "}
                        {new Date(member.joinedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={isOwner ? "owner" : member.status} />
                    {group.isOwner && !isOwner && (
                      <div className="flex items-center gap-1">
                        {member.status !== "BLOCKED" ? (
                          <button
                            onClick={() =>
                              handleMemberStatus(member.id, "BLOCKED")
                            }
                            disabled={actionLoading === member.id}
                            className="cursor-pointer text-xs text-text-soft hover:text-error-text px-3 py-1.5 rounded-lg hover:bg-error-bg transition-all disabled:opacity-50 border border-transparent hover:border-error-border"
                          >
                            Bloquear
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleMemberStatus(member.id, "ACTIVE")
                            }
                            disabled={actionLoading === member.id}
                            className="cursor-pointer text-xs text-text-soft hover:text-success-text px-3 py-1.5 rounded-lg hover:bg-success-bg transition-all disabled:opacity-50 border border-transparent hover:border-success-border"
                          >
                            Ativar
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={actionLoading === member.id + "-remove"}
                          className="cursor-pointer text-xs text-text-soft hover:text-error-text px-3 py-1.5 rounded-lg hover:bg-error-bg transition-all disabled:opacity-50 border border-transparent hover:border-error-border"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Invites section — only for owner */}
        {group.isOwner && (
          <section className="bg-bg-card border border-border-card rounded-2xl overflow-hidden">
            <div className="px-8 py-5 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-main">
                  Convites
                </h2>
                <p className="text-xs text-text-soft mt-0.5">
                  Gere links para convidar membros ao grupo.
                  {isFull && (
                    <span className="text-error-text ml-1">Grupo lotado.</span>
                  )}
                </p>
              </div>
              <button
                id="create-invite-btn"
                onClick={handleCreateInvite}
                disabled={actionLoading === "invite" || isFull}
                className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === "invite" ? (
                  <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Gerar convite
              </button>
            </div>

            {invites.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Link2 className="w-8 h-8 text-text-soft mb-1" />
                <p className="text-sm font-medium text-text-muted">
                  Nenhum convite gerado
                </p>
                <p className="text-xs text-text-soft">
                  Clique em "Gerar convite" para criar um link de acesso.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {invites.map((invite) => {
                  const isExpired = new Date(invite.expiresAt) < new Date();
                  const isUsed = !!invite.usedAt;
                  const isActive = !isUsed && !isExpired;
                  return (
                    <div
                      key={invite.id}
                      id={`invite-${invite.id}`}
                      className="flex items-center justify-between px-8 py-4 hover:bg-bg-subtle/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isUsed
                              ? "bg-bg-subtle text-text-muted"
                              : isExpired
                                ? "bg-error-bg text-error-text"
                                : "bg-success-bg text-success-text"
                          }`}
                        >
                          {isUsed ? (
                            <Check className="w-4 h-4" />
                          ) : isExpired ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Link2 className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-mono text-text-muted truncate max-w-[280px]">
                            /join/{invite.token.substring(0, 18)}...
                          </p>
                          <p
                            className={`text-xs mt-0.5 ${
                              isUsed
                                ? "text-text-soft"
                                : isExpired
                                  ? "text-error-text"
                                  : "text-success-text"
                            }`}
                          >
                            {isUsed
                              ? "Utilizado"
                              : isExpired
                                ? "Expirado"
                                : `Ativo · Expira em ${new Date(invite.expiresAt).toLocaleDateString("pt-BR")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <button
                            onClick={() => copyInviteLink(invite.token)}
                            className="cursor-pointer text-xs font-medium text-text-muted bg-bg-subtle hover:bg-bg-hover border border-border-card px-3 py-1.5 rounded-lg transition-all"
                          >
                            {copiedToken === invite.token
                              ? "Copiado!"
                              : "Copiar link"}
                          </button>
                        )}
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          disabled={actionLoading === "revoke-" + invite.id}
                          className="cursor-pointer text-xs text-text-soft hover:text-error-text px-3 py-1.5 rounded-lg hover:bg-error-bg transition-all disabled:opacity-50"
                        >
                          Revogar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "red" | "green";
}) {
  return (
    <div className="text-center">
      <p
        className={`text-2xl font-semibold tracking-tight ${
          color === "red"
            ? "text-error-text"
            : color === "green"
              ? "text-success-text"
              : "text-text-main"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-text-soft mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "ACTIVE"
    | "INACTIVE"
    | "BLOCKED"
    | "PENDING_CREDENTIALS"
    | "PENDING_PAYMENT"
    | "owner";
}) {
  const map: Record<string, { label: string; cls: string }> = {
    owner: { label: "Líder", cls: "bg-bg-subtle text-text-muted" },
    ACTIVE: { label: "Ativo", cls: "bg-success-bg text-success-text" },
    INACTIVE: { label: "Inativo", cls: "bg-bg-subtle text-text-soft" },
    BLOCKED: { label: "Bloqueado", cls: "bg-error-bg text-error-text" },
    PENDING_CREDENTIALS: {
      label: "Aguardando acesso",
      cls: "bg-warning-bg text-warning-text",
    },
    PENDING_PAYMENT: {
      label: "Pag. pendente",
      cls: "bg-bg-subtle text-text-soft",
    },
  };
  const { label, cls } = map[status] ?? {
    label: status,
    cls: "bg-bg-subtle text-text-soft",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
