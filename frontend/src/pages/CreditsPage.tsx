import { useState, useEffect } from "react";
import { AppLayout } from "../components/AppLayout.js";
import { useApi } from "../hooks/useApi.js";
import { useToast } from "../contexts/ToastContext.js";
import { useConfirm } from "../contexts/ConfirmContext.js";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  Copy,
  Check,
  Send,
  AlertCircle,
} from "lucide-react";

const CREDIT_OPTIONS = [10, 25, 50, 100, 200];

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  date: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  pixKey: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string;
}

export function CreditsPage() {
  const { request } = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [balance, setBalance] = useState<number>(0);
  const [lockedInGroups, setLockedInGroups] = useState<number>(0);
  const [pendingDeposits, setPendingDeposits] = useState<number>(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // Modal visibility states
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("PENDING");

  // Pix Loader & QR Code Modal
  const [loadingPix, setLoadingPix] = useState(false);
  const [pixData, setPixData] = useState<{
    pixCopyPaste: string;
    pixQrCodeBase64: string;
    amount: number;
    paymentId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Saque
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  const amount = custom ? Number(custom) : selected;

  const loadData = async () => {
    try {
      const data = await request<{
        balance: number;
        lockedInGroups: number;
        pendingDeposits: number;
        transactions: any[];
        withdrawals: any[];
      }>("/payments/balance");
      setBalance(data.balance);
      setLockedInGroups(data.lockedInGroups || 0);
      setPendingDeposits(data.pendingDeposits || 0);
      setTransactions(
        data.transactions.map((t) => ({
          id: t.id,
          type: t.type.toLowerCase() as "credit" | "debit",
          amount: t.amount,
          description: t.description,
          date: t.createdAt,
        })),
      );
      setWithdrawals(data.withdrawals);
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!pixData) {
      setPaymentStatus("PENDING");
      return;
    }

    let intervalId: any;

    const checkStatus = async () => {
      try {
        const response = await request<{ status: string }>(`/payments/status/${pixData.paymentId}`);
        if (response.status === "CONFIRMED") {
          setPaymentStatus("CONFIRMED");
          toast.success(`Depósito de R$ ${pixData.amount.toFixed(2)} confirmado!`);
          loadData();
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Erro ao verificar status do pagamento:", err);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [pixData]);

  const handleAddCredits = async () => {
    if (!amount || amount <= 0) return;
    setLoadingPix(true);
    try {
      const response = await request<{
        paymentId: string;
        amount: number;
        invoiceUrl: string;
        pixCopyPaste: string;
        pixQrCodeBase64: string;
      }>("/payments/add-credits", "POST", { amount });

      setPixData(response);
      setCustom("");
      setSelected(null);
      setIsDepositModalOpen(false); // Fecha o modal de depósito ao gerar Pix
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar cobrança Pix.");
    } finally {
      setLoadingPix(false);
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const val = Number(withdrawAmount);
    if (!val || val <= 0) {
      toast.error("Insira um valor válido de resgate.");
      return;
    }
    if (val > balance) {
      toast.error("Saldo insuficiente para realizar o resgate.");
      return;
    }
    if (!pixKey.trim()) {
      toast.error("A chave Pix é obrigatória.");
      return;
    }

    setLoadingWithdraw(true);
    try {
      await request("/payments/withdraw", "POST", { amount: val, pixKey });
      toast.success("Solicitação de resgate enviada com sucesso!");
      setWithdrawAmount("");
      setPixKey("");
      setIsWithdrawModalOpen(false); // Fecha o modal de saque ao finalizar
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar saque.");
    } finally {
      setLoadingWithdraw(false);
    }
  };

  const handleCancelWithdraw = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Cancelar Resgate",
      message: "Tem certeza que deseja cancelar esta solicitação de resgate?",
      confirmText: "Sim, cancelar",
      isDanger: true,
    });
    if (!isConfirmed) return;

    try {
      await request(`/payments/withdraw/${id}/cancel`, "POST");
      toast.success("Solicitação de resgate cancelada com sucesso!");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar solicitação de resgate.");
    }
  };

  const handleCopyPix = () => {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.pixCopyPaste);
    setCopied(true);
    toast.success("Código Copia e Cola copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Calcular estatísticas simples

  return (
    <AppLayout>
      <div className="w-full max-w-6xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text-main tracking-tight">
            Créditos e Financeiro
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            Gerencie seu saldo, realize depósitos e solicite resgates de suas
            participações.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN — Carteira & Ações */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-bg-card border border-border-card rounded-2xl p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-soft">
                    Carteira
                  </h3>
                  <p className="text-xs text-text-soft">
                    Gerenciamento de saldo
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-text-soft uppercase tracking-wider">
                  Saldo disponível
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-semibold text-text-main tracking-tight">
                    R$ {balance.toFixed(2)}
                  </span>
                  <span className="text-sm text-text-soft pb-1">BRL</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-card">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-soft uppercase tracking-wider">
                    Bloqueado em grupos
                  </p>
                  <p className="text-lg font-semibold text-text-muted">
                    R$ {lockedInGroups.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-soft uppercase tracking-wider">
                    Pendente pagamento
                  </p>
                  <p className="text-lg font-semibold text-text-muted">
                    R$ {pendingDeposits.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border-card">
                <button
                  onClick={() => setIsDepositModalOpen(true)}
                  className="cursor-pointer flex-1 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3.5 rounded-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
                >
                  <TrendingUp className="w-4 h-4" />
                  Depositar
                </button>
                <button
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="cursor-pointer flex-1 bg-bg-subtle hover:bg-bg-hover text-text-main border border-border-card text-sm font-medium py-3.5 rounded-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <TrendingDown className="w-4 h-4" />
                  Sacar
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Histórico */}
          <div className="lg:col-span-7 space-y-6">
            {/* Histórico de transações */}
            <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden flex flex-col">
              <div className="px-8 py-5 border-b border-border-card">
                <h2 className="text-base font-semibold text-text-main">
                  Histórico de transações
                </h2>
                <p className="text-xs text-text-soft mt-0.5">
                  {transactions.length} movimentação(ões) registrada(s).
                </p>
              </div>

              {transactions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-8">
                  <div className="w-16 h-16 bg-bg-subtle rounded-2xl flex items-center justify-center text-text-muted mb-4 border border-border-card">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <p className="text-base font-medium text-text-muted mb-1.5">
                    Nenhuma transação registrada
                  </p>
                  <p className="text-sm text-text-soft text-center max-w-xs">
                    Suas recargas e débitos de assinatura aparecerão aqui em
                    tempo real.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border-card overflow-auto max-h-[350px]">
                  {transactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </div>
              )}
            </div>

            {/* Histórico de saques */}
            {withdrawals.length > 0 && (
              <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden flex flex-col">
                <div className="px-8 py-5 border-b border-border-card">
                  <h2 className="text-base font-semibold text-text-main">
                    Solicitações de Resgate
                  </h2>
                  <p className="text-xs text-text-soft mt-0.5">
                    Acompanhe o processamento das transferências PIX.
                  </p>
                </div>
                <div className="divide-y divide-border-card overflow-auto max-h-[300px]">
                  {withdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between px-8 py-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-main">
                          Chave: {w.pixKey}
                        </p>
                        <p className="text-xs text-text-soft mt-0.5">
                          {new Date(w.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="text-sm font-semibold text-text-main">
                          R$ {w.amount.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {w.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleCancelWithdraw(w.id)}
                              className="cursor-pointer text-[10px] font-semibold text-error-text hover:underline"
                            >
                              Cancelar
                            </button>
                          )}
                          <span
                            className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              w.status === "PENDING"
                                ? "bg-bg-subtle text-text-muted border border-border-card"
                                : w.status === "APPROVED"
                                  ? "bg-success-bg text-success-text border border-success-border"
                                  : w.status === "CANCELLED"
                                    ? "bg-error-bg text-error-text border border-error-border opacity-70"
                                    : "bg-error-bg text-error-text border border-error-border"
                            }`}
                          >
                            {w.status === "PENDING"
                              ? "Pendente"
                              : w.status === "APPROVED"
                                ? "Aprovado"
                                : w.status === "CANCELLED"
                                  ? "Cancelado"
                                  : "Rejeitado"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Depositar */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-bg-card border border-border-card rounded-2xl max-w-lg w-full p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDepositModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-main cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="border-b border-border-card pb-4">
              <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Depositar Créditos
              </h2>
              <p className="text-xs text-text-soft mt-1">
                Escolha um valor rápido ou insira manualmente para adicionar
                saldo e pagar suas assinaturas.
              </p>
            </div>

            <div className="space-y-6">
              {/* Preset chips */}
              <div>
                <p className="text-xs font-semibold text-text-soft uppercase tracking-wider mb-3">
                  Valores rápidos
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {CREDIT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      id={`credit-opt-${opt}`}
                      onClick={() => {
                        setSelected(opt);
                        setCustom("");
                      }}
                      className={`cursor-pointer py-3 rounded-xl text-sm font-medium border transition-all ${
                        selected === opt && !custom
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-bg-subtle text-text-muted border-border-card hover:border-border-card hover:bg-bg-hover"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <label
                  htmlFor="custom-amount"
                  className="block text-xs font-semibold text-text-soft uppercase tracking-wider mb-2"
                >
                  Outro valor
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-soft">
                    R$
                  </span>
                  <input
                    id="custom-amount"
                    type="number"
                    min={1}
                    step={0.01}
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      setSelected(null);
                    }}
                    placeholder="0,00"
                    className="w-full text-sm border border-border-card rounded-xl pl-10 pr-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors"
                  />
                </div>
              </div>

              {/* Preview */}
              {amount && amount > 0 ? (
                <div className="bg-bg-subtle border border-border-card rounded-xl px-5 py-4 space-y-2">
                  <p className="text-xs font-semibold text-text-soft uppercase tracking-wider">
                    Resumo do depósito
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Valor a depositar</span>
                    <span className="font-semibold text-text-main">
                      R$ {Number(amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Saldo atual</span>
                    <span className="text-text-muted">
                      R$ {balance.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-border-card pt-2 flex justify-between text-sm">
                    <span className="font-medium text-text-muted">
                      Saldo após depósito
                    </span>
                    <span className="font-bold text-success-text">
                      R$ {(balance + Number(amount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-bg-subtle border border-dashed border-border-card rounded-xl px-5 py-4">
                  <p className="text-sm text-text-soft text-center">
                    Selecione ou digite um valor acima para prosseguir.
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsDepositModalOpen(false)}
                  className="cursor-pointer flex-1 bg-bg-subtle hover:bg-bg-hover text-text-main border border-border-card text-sm font-medium py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  id="add-credits-btn"
                  onClick={handleAddCredits}
                  disabled={!amount || amount <= 0 || loadingPix}
                  className="cursor-pointer flex-1 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3 rounded-xl transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm animate-pulse-subtle"
                >
                  {loadingPix ? "Gerando..." : "Confirmar Depósito"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Sacar */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-bg-card border border-border-card rounded-2xl max-w-lg w-full p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-main cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="border-b border-border-card pb-4">
              <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-text-muted" />
                Resgatar Saldo (Saque Pix)
              </h2>
              <p className="text-xs text-text-soft mt-1">
                Solicite a transferência dos seus créditos acumulados para sua
                conta bancária via Pix.
              </p>
            </div>

            <form onSubmit={handleWithdrawRequest} className="space-y-6">
              <div>
                <label
                  htmlFor="withdraw-val"
                  className="block text-xs font-semibold text-text-soft uppercase tracking-wider mb-2"
                >
                  Valor do resgate
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-soft">
                    R$
                  </span>
                  <input
                    id="withdraw-val"
                    type="number"
                    min={1}
                    step={0.01}
                    placeholder="0,00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full text-sm border border-border-card rounded-xl pl-10 pr-4 py-3 text-text-main focus:outline-none focus:border-text-soft"
                  />
                </div>
                <p className="text-[11px] text-text-soft mt-1.5 flex justify-between">
                  <span>Saldo disponível: R$ {balance.toFixed(2)}</span>
                </p>
              </div>

              <div>
                <label
                  htmlFor="withdraw-key"
                  className="block text-xs font-semibold text-text-soft uppercase tracking-wider mb-2"
                >
                  Sua Chave Pix (CPF, E-mail ou Telefone)
                </label>
                <input
                  id="withdraw-key"
                  type="text"
                  placeholder="Insira a chave para transferência"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full text-sm border border-border-card rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-text-soft"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="cursor-pointer flex-1 bg-bg-subtle hover:bg-bg-hover text-text-main border border-border-card text-sm font-medium py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingWithdraw || !withdrawAmount || !pixKey}
                  className="cursor-pointer flex-1 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  {loadingWithdraw ? "Processando..." : "Confirmar Saque"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pix Modal (QR Code & Payload) */}
      {pixData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-bg-card border border-border-card rounded-2xl max-w-md w-full p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => {
                setPixData(null);
                loadData();
              }}
              className="absolute top-4 right-4 text-text-muted hover:text-text-main cursor-pointer"
            >
              ✕
            </button>
            {paymentStatus === "CONFIRMED" ? (
              <div className="text-center space-y-6 py-6 animate-scale-in">
                <div className="w-20 h-20 bg-success-bg/25 border border-success-border text-success-text rounded-full flex items-center justify-center mx-auto animate-bounce-subtle">
                  <Check className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-text-main">
                    Pagamento Confirmado!
                  </h3>
                  <p className="text-sm text-text-soft max-w-sm mx-auto">
                    O depósito de <strong className="text-text-main">R$ {pixData.amount.toFixed(2)}</strong> foi confirmado com sucesso. Seu saldo já está atualizado.
                  </p>
                </div>
                <div className="inline-block bg-bg-subtle border border-border-card rounded-xl px-6 py-3">
                  <p className="text-xs text-text-soft uppercase tracking-wider font-semibold">Novo Saldo</p>
                  <p className="text-xl font-bold text-success-text mt-0.5">R$ {balance.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => {
                    setPixData(null);
                    loadData();
                  }}
                  className="cursor-pointer w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3.5 rounded-xl transition-all shadow-sm mt-4"
                >
                  Excelente!
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="w-12 h-12 bg-success-bg/20 text-success-text rounded-full flex items-center justify-center mx-auto mb-3">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-main">
                    Pagamento via Pix Gerado
                  </h3>
                  <p className="text-sm text-text-soft mt-1">
                    Escaneie o QR Code abaixo ou utilize o código Copia e Cola.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-border-card max-w-[220px] mx-auto">
                  <img
                    src={`data:image/png;base64,${pixData.pixQrCodeBase64}`}
                    alt="QR Code do Pix"
                    className="w-full h-auto aspect-square object-contain"
                  />
                </div>

                <div className="text-center font-semibold text-2xl text-text-main">
                  R$ {pixData.amount.toFixed(2)}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-text-soft uppercase tracking-wider text-left">
                    Código Copia e Cola
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixData.pixCopyPaste}
                      className="flex-1 text-xs border border-border-card bg-bg-subtle rounded-xl px-3 py-2.5 text-text-muted focus:outline-none select-all"
                    />
                    <button
                      onClick={handleCopyPix}
                      className="bg-primary hover:bg-primary-hover text-white px-3.5 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-bg-subtle border border-border-card rounded-xl p-4 text-xs text-text-soft flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-text-muted mt-0.5" />
                  <p className="text-left leading-relaxed">
                    Após efetuar o pagamento do Pix, seu saldo será atualizado automaticamente em alguns segundos. Você pode fechar esta janela com segurança.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setPixData(null);
                    loadData();
                  }}
                  className="cursor-pointer w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3 rounded-xl transition-all shadow-sm"
                >
                  Fechar e Voltar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.type === "credit";
  return (
    <div className="flex items-center justify-between px-8 py-4 hover:bg-bg-subtle/70 transition-colors">
      <div className="flex items-center gap-4">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm border ${
            isCredit
              ? "bg-success-bg text-success-text border-success-border"
              : "bg-error-bg text-error-text border-error-border"
          }`}
        >
          {isCredit ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownLeft className="w-4 h-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-text-main">{tx.description}</p>
          <p className="text-xs text-text-soft mt-0.5">
            {new Date(tx.date).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
      <span
        className={`text-sm font-semibold ${isCredit ? "text-success-text" : "text-error-text"}`}
      >
        {isCredit ? "+" : "-"}R$ {tx.amount.toFixed(2)}
      </span>
    </div>
  );
}
