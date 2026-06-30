import React, { useEffect, useState } from "react";
import { AppLayout } from "../components/AppLayout.js";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useApi } from "../hooks/useApi.js";
import { useToast } from "../contexts/ToastContext.js";
import { useConfirm } from "../contexts/ConfirmContext.js";
import { 
  Users, 
  Layers, 
  ShieldAlert, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Upload, 
  Briefcase,
  ToggleLeft,
  ToggleRight,
  Compass,
  Wallet
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

interface GlobalGroup {
  id: string;
  name: string;
  service: string;
  maxSlots: number;
  pricePerSlot: string;
  status: "ACTIVE" | "INACTIVE";
  owner: {
    id: string;
    email: string;
    name: string | null;
  };
  category: {
    id: string;
    name: string;
    icon: string;
  } | null;
  _count: {
    members: number;
  };
}

interface FinancialStats {
  totalDeposits: number;
  totalBalances: number;
  totalInCustody: number;
  mrr: number;
  platformRevenue: number;
}

interface RegistrationStat {
  date: string;
  count: number;
}

interface Stats {
  totalUsers: number;
  totalGroups: number;
  totalCategories: number;
  financial: FinancialStats;
  registrationsByDate: RegistrationStat[];
}

interface PlatformService {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  category: { id: string; name: string; icon: string };
}

type Tab = "general" | "categories" | "services" | "users" | "groups" | "withdrawals";

interface AdminWithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  pixKey: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export function AdminPage() {
  const { request } = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats State
  const [stats, setStats] = useState<Stats | null>(null);

  // Users State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [updatingUserRole, setUpdatingUserRole] = useState<string | null>(null);

  // Groups State
  const [groups, setGroups] = useState<GlobalGroup[]>([]);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // Withdrawals State
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);

  // Categories CRUD State
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [submittingCategory, setSubmittingCategory] = useState(false);

  // Services CRUD State
  const [services, setServices] = useState<PlatformService[]>([]);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<PlatformService | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceCategoryId, setServiceCategoryId] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [submittingService, setSubmittingService] = useState(false);

  // Load data depending on active tab
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === "general") {
          const res = await request<{ stats: Stats }>("/admin/stats");
          setStats(res.stats);
        } else if (activeTab === "categories") {
          const res = await request<{ categories: Category[] }>("/categories");
          setCategories(res.categories);
        } else if (activeTab === "services") {
          const [resServices, resCategories] = await Promise.all([
            request<{ services: PlatformService[] }>("/services"),
            request<{ categories: Category[] }>("/categories")
          ]);
          setServices(resServices.services);
          setCategories(resCategories.categories);
        } else if (activeTab === "users") {
          const res = await request<{ users: UserProfile[] }>("/admin/users");
          setUsers(res.users);
        } else if (activeTab === "groups") {
          const res = await request<{ groups: GlobalGroup[] }>("/admin/groups");
          setGroups(res.groups);
        } else if (activeTab === "withdrawals") {
          const res = await request<AdminWithdrawalRequest[]>("/payments/admin/withdrawals");
          setWithdrawals(res);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTab]);

  // User Role Management
  const handleToggleUserRole = async (user: UserProfile) => {
    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (
      nextRole === "USER" &&
      user.email === "admin@email.com" // Prevent self-demoting main admin
    ) {
      toast.warning("Não é possível remover a permissão de administrador deste usuário principal.");
      return;
    }

    const isConfirmed = await confirm({
      title: "Alterar Permissão",
      message: `Deseja alterar o cargo de ${user.email} para ${nextRole}?`,
      confirmText: "Alterar",
    });

    if (!isConfirmed) return;

    setUpdatingUserRole(user.id);
    try {
      await request(`/admin/users/${user.id}/role`, "PATCH", { role: nextRole });
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUpdatingUserRole(null);
    }
  };

  // Group Moderation
  const handleDeleteGroup = async (groupId: string) => {
    const isConfirmed = await confirm({
      title: "Excluir Grupo",
      message: "Tem certeza de que deseja excluir permanentemente este grupo de assinatura? Esta ação não pode ser desfeita.",
      confirmText: "Excluir Grupo",
      isDanger: true,
    });

    if (!isConfirmed) return;

    setDeletingGroupId(groupId);
    try {
      await request(`/admin/groups/${groupId}`, "DELETE");
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeletingGroupId(null);
    }
  };

  // Withdrawal Approval / Rejection Handlers
  const handleApproveWithdrawal = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Aprovar Resgate",
      message: "Confirmar a aprovação deste resgate? O dinheiro será enviado via Pix.",
      confirmText: "Aprovar Resgate",
    });

    if (!isConfirmed) return;
    setProcessingWithdrawalId(id);
    try {
      await request(`/payments/admin/withdrawals/${id}/approve`, "POST");
      toast.success("Resgate aprovado e processado com sucesso!");
      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Rejeitar Resgate",
      message: "Confirmar a rejeição deste resgate? O valor retornará à carteira do usuário.",
      confirmText: "Rejeitar",
      isDanger: true,
    });

    if (!isConfirmed) return;
    setProcessingWithdrawalId(id);
    try {
      await request(`/payments/admin/withdrawals/${id}/reject`, "POST");
      toast.success("Resgate rejeitado e saldo estornado.");
      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  // Category CRUD Handlers
  const handleOpenCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryIcon("");
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryIcon(cat.icon);
    setCategoryModalOpen(true);
  };

  const handleCategoryIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.warning("A imagem é muito grande. Escolha uma imagem menor que 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCategoryIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.warning("Por favor, preencha o nome da categoria.");
      return;
    }
    if (!categoryIcon) {
      toast.warning("Por favor, faça o upload de um ícone.");
      return;
    }

    setSubmittingCategory(true);
    try {
      if (editingCategory) {
        await request(`/categories/${editingCategory.id}`, "PUT", {
          name: categoryName,
          icon: categoryIcon,
        });
      } else {
        await request("/categories", "POST", {
          name: categoryName,
          icon: categoryIcon,
        });
      }
      setCategoryModalOpen(false);
      // Reload categories list
      const res = await request<{ categories: Category[] }>("/categories");
      setCategories(res.categories);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Excluir Categoria",
      message: "Tem certeza que deseja excluir esta categoria? Os grupos vinculados a ela ficarão sem categoria.",
      confirmText: "Excluir",
      isDanger: true,
    });

    if (!isConfirmed) return;
    try {
      await request(`/categories/${id}`, "DELETE");
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleOpenServiceModal = (service?: PlatformService) => {
    if (service) {
      setEditingService(service);
      setServiceName(service.name);
      setServiceCategoryId(service.categoryId);
      setServiceDescription(service.description || "");
    } else {
      setEditingService(null);
      setServiceName("");
      if (categories.length > 0) setServiceCategoryId(categories[0].id);
      setServiceDescription("");
    }
    setServiceModalOpen(true);
  };

  const handleSubmitService = async () => {
    if (!serviceName.trim() || !serviceCategoryId) {
      toast.warning("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSubmittingService(true);
    try {
      if (editingService) {
        await request(`/services/${editingService.id}`, "PUT", {
          name: serviceName,
          categoryId: serviceCategoryId,
          description: serviceDescription || undefined,
        });
      } else {
        await request("/services", "POST", {
          name: serviceName,
          categoryId: serviceCategoryId,
          description: serviceDescription || undefined,
        });
      }
      setServiceModalOpen(false);
      const res = await request<{ services: PlatformService[] }>("/services");
      setServices(res.services);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmittingService(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Excluir Serviço",
      message: "Tem certeza que deseja excluir este serviço? Grupos existentes não serão afetados.",
      confirmText: "Excluir",
      isDanger: true,
    });

    if (!isConfirmed) return;
    try {
      await request(`/services/${id}`, "DELETE");
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AppLayout>
      <div className="w-full max-w-5xl mx-auto px-6 py-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-text-main tracking-tight leading-tight">
            Painel Geral de Manutenção
          </h1>
          <p className="text-base text-text-muted mt-2">
            Administre as métricas do site, gerencie usuários, modere grupos e edite as categorias de assinatura.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1 bg-bg-subtle p-1 rounded-xl w-fit mb-8">
          <button
            onClick={() => setActiveTab("general")}
            className={`cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition-all focus:outline-none ${
              activeTab === "general"
                ? "bg-bg-card text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Métricas Gerais
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition-all focus:outline-none ${
              activeTab === "categories"
                ? "bg-bg-card text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Layers className="w-4 h-4" />
            Categorias
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition-all focus:outline-none ${
              activeTab === "services"
                ? "bg-bg-card text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Compass className="w-4 h-4" />
            Serviços
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition-all focus:outline-none ${
              activeTab === "users"
                ? "bg-bg-card text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition-all focus:outline-none ${
              activeTab === "groups"
                ? "bg-bg-card text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Grupos (Moderação)
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition-all focus:outline-none ${
              activeTab === "withdrawals"
                ? "bg-bg-card text-text-main shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Solicitações de Saque
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error-bg border border-error-border text-error-text text-sm px-5 py-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        {/* Loading overlay inside tab */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 flex-1">
            <div className="w-6 h-6 border-2 border-border-card border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-text-soft">Carregando dados da aba...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* General metrics view */}
            {activeTab === "general" && stats && (
              <div className="w-full space-y-8 animate-in fade-in duration-200">
                {/* Métricas Principais */}
                <div>
                  <h2 className="text-lg font-semibold text-text-main mb-4">Crescimento do App</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <MetricCard
                      title="Usuários Registrados"
                      value={stats.totalUsers}
                      description="Total de contas criadas na plataforma"
                      icon={<Users className="w-6 h-6 text-text-muted" />}
                    />
                    <MetricCard
                      title="Grupos de Assinatura"
                      value={stats.totalGroups}
                      description="Grupos de compartilhamento criados"
                      icon={<Briefcase className="w-6 h-6 text-text-muted" />}
                    />
                    <MetricCard
                      title="Categorias Ativas"
                      value={stats.totalCategories}
                      description="Categorias de classificação ativas"
                      icon={<Layers className="w-6 h-6 text-text-muted" />}
                    />
                  </div>
                </div>

                {/* Métricas Financeiras */}
                <div>
                  <h2 className="text-lg font-semibold text-text-main mb-4">Métricas Financeiras Gerais</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <MetricCard
                      title="MRR (Recorrência)"
                      value={`R$ ${stats.financial.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      description="Valor mensal recorrente ativo"
                      icon={<Compass className="w-6 h-6 text-success-text" />}
                    />
                    <MetricCard
                      title="Lucro da Plataforma"
                      value={`R$ ${stats.financial.platformRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      description="Taxa de comissão total retida"
                      icon={<ShieldAlert className="w-6 h-6 text-primary" />}
                    />
                    <MetricCard
                      title="Saldo em Custódia"
                      value={`R$ ${stats.financial.totalInCustody.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      description="Fundos de membros retidos por 48h"
                      icon={<Wallet className="w-6 h-6 text-warning-text" />}
                    />
                    <MetricCard
                      title="Total em Carteiras"
                      value={`R$ ${stats.financial.totalBalances.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      description="Dinheiro depositado pelos usuários"
                      icon={<Wallet className="w-6 h-6 text-text-muted" />}
                    />
                    <MetricCard
                      title="Total Depositado"
                      value={`R$ ${stats.financial.totalDeposits.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      description="Histórico de recargas Pix"
                      icon={<Plus className="w-6 h-6 text-text-soft" />}
                    />
                  </div>
                </div>

                {/* Gráfico de Cadastros */}
                <div className="bg-bg-card border border-border-card rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-text-main">
                      Usuários Cadastrados por Data
                    </h3>
                    <p className="text-xs text-text-soft">
                      Histórico acumulado de novos registros diários
                    </p>
                  </div>
                  <div className="h-[300px] w-full">
                    {stats.registrationsByDate.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-text-soft italic">
                        Nenhum registro para exibir
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={stats.registrationsByDate.map(r => ({
                            ...r,
                            dateFormatted: new Date(r.date + "T00:00:00").toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short"
                            })
                          }))}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-card)" opacity={0.3} />
                          <XAxis 
                            dataKey="dateFormatted" 
                            stroke="var(--color-text-soft)" 
                            fontSize={12} 
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="var(--color-text-soft)" 
                            fontSize={12} 
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--color-bg-card)",
                              borderColor: "var(--color-border-card)",
                              borderRadius: "12px",
                              color: "var(--color-text-main)",
                              fontSize: "12px"
                            }}
                            labelClassName="font-semibold text-text-main"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            name="Novos Usuários"
                            stroke="#6366f1" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorCount)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Categories CRUD view */}
            {activeTab === "categories" && (
              <div className="flex-1 flex flex-col">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleOpenCreateCategoryModal}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Categoria
                  </button>
                </div>

                {categories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border-card rounded-2xl bg-bg-card/50">
                    <Layers className="w-12 h-12 text-text-soft mb-3" />
                    <p className="text-sm font-medium text-text-muted">Nenhuma categoria cadastrada</p>
                    <p className="text-xs text-text-soft mt-1">Crie categorias para que os usuários possam classificar seus grupos.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-200">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center justify-between hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-border-card bg-bg-page flex items-center justify-center shrink-0">
                            {cat.icon ? (
                              <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-bg-subtle" />
                            )}
                          </div>
                          <p className="text-base font-semibold text-text-main truncate">
                            {cat.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenEditCategoryModal(cat)}
                            className="cursor-pointer p-2 text-text-muted hover:text-text-main hover:bg-bg-subtle rounded-xl transition-all"
                            title="Editar categoria"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="cursor-pointer p-2 text-error-text hover:bg-error-bg rounded-xl transition-all"
                            title="Excluir categoria"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Services CRUD view */}
            {activeTab === "services" && (
              <div className="flex-1 flex flex-col">
                <div className="flex justify-end mb-6">
                  <button
                    onClick={() => handleOpenServiceModal()}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Serviço
                  </button>
                </div>

                {services.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border-card rounded-2xl bg-bg-card/50">
                    <Compass className="w-12 h-12 text-text-soft mb-3" />
                    <p className="text-sm font-medium text-text-muted">Nenhum serviço cadastrado</p>
                    <p className="text-xs text-text-soft mt-1">Crie serviços disponíveis para os usuários criarem grupos.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-200">
                    {services.map((svc) => (
                      <div
                        key={svc.id}
                        className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center justify-between hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-border-card bg-bg-page flex items-center justify-center shrink-0">
                            {svc.category?.icon ? (
                              <img src={svc.category.icon} alt={svc.category.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-bg-subtle" />
                            )}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-text-main truncate">
                              {svc.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenServiceModal(svc)}
                            className="cursor-pointer p-2 text-text-muted hover:text-text-main hover:bg-bg-subtle rounded-xl transition-all"
                            title="Editar serviço"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(svc.id)}
                            className="cursor-pointer p-2 text-error-text hover:bg-error-bg rounded-xl transition-all"
                            title="Excluir serviço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Users list view */}
            {activeTab === "users" && (
              <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-card bg-bg-subtle/50">
                        <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Telefone</th>
                        <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Cargo (Role)</th>
                        <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Registrado em</th>
                        <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-card">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-bg-page/50 transition-colors text-sm">
                          <td className="px-6 py-4 font-medium text-text-main">{u.email}</td>
                          <td className="px-6 py-4 text-text-muted">{u.name || "-"}</td>
                          <td className="px-6 py-4 text-text-muted">{u.phone || "-"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                              u.role === "ADMIN" ? "bg-primary text-white" : "bg-bg-subtle text-text-muted"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-text-soft">
                            {new Date(u.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              disabled={updatingUserRole === u.id}
                              onClick={() => handleToggleUserRole(u)}
                              className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-main disabled:opacity-50"
                            >
                              {u.role === "ADMIN" ? (
                                <>
                                  <ToggleRight className="w-5 h-5 text-primary" />
                                  Tornar Membro
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-5 h-5 text-text-soft" />
                                  Tornar Admin
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Groups moderation view */}
            {activeTab === "groups" && (
              <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-200">
                {groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-bg-card/50">
                    <Briefcase className="w-12 h-12 text-text-soft mb-3" />
                    <p className="text-sm font-medium text-text-muted">Nenhum grupo de assinatura criado ainda</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border-card bg-bg-subtle/50">
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Grupo</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Categoria / Serviço</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Criador (Líder)</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Preço / Vaga</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Vagas Ocupadas</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-card text-sm">
                        {groups.map((g) => (
                          <tr key={g.id} className="hover:bg-bg-page/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-text-main">{g.name}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {g.category?.icon ? (
                                  <img src={g.category.icon} alt={g.category.name} className="w-6 h-6 rounded-full object-cover border border-border-card" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-bg-subtle" />
                                )}
                                <span className="text-text-muted">{g.service}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-text-muted">{g.owner.email}</td>
                            <td className="px-6 py-4 text-text-main font-medium">R$ {Number(g.pricePerSlot).toFixed(2)}</td>
                            <td className="px-6 py-4 text-text-muted">
                              {g._count.members}/{g.maxSlots} vagas
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                                g.status === "ACTIVE" ? "bg-success-bg text-success-text" : "bg-bg-subtle text-text-soft"
                              }`}>
                                {g.status === "ACTIVE" ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                disabled={deletingGroupId === g.id}
                                onClick={() => handleDeleteGroup(g.id)}
                                className="cursor-pointer p-2 text-error-text hover:bg-error-bg rounded-xl transition-all"
                                title="Excluir grupo (Moderação)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Withdrawals pending view */}
            {activeTab === "withdrawals" && (
              <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-200 animate-in fade-in duration-200">
                {withdrawals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-bg-card/50">
                    <Wallet className="w-12 h-12 text-text-soft mb-3" />
                    <p className="text-sm font-medium text-text-muted">Nenhuma solicitação de saque pendente</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border-card bg-bg-subtle/50">
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Usuário</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Valor</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Chave Pix</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Data de Solicitação</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-card text-sm">
                        {withdrawals.map((w) => (
                          <tr key={w.id} className="hover:bg-bg-page/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-text-main">{w.user.name || "Líder"}</div>
                              <div className="text-xs text-text-soft">{w.user.email}</div>
                            </td>
                            <td className="px-6 py-4 text-text-main font-semibold">R$ {Number(w.amount).toFixed(2)}</td>
                            <td className="px-6 py-4 text-text-muted font-mono">{w.pixKey}</td>
                            <td className="px-6 py-4 text-text-soft">
                              {new Date(w.createdAt).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-bg-subtle text-text-muted">
                                PENDENTE
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                type="button"
                                disabled={processingWithdrawalId === w.id}
                                onClick={() => handleApproveWithdrawal(w.id)}
                                className="cursor-pointer text-xs font-bold text-white bg-success-text hover:bg-success-text/90 px-3 py-1.5 rounded-xl disabled:opacity-50 transition-all"
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                disabled={processingWithdrawalId === w.id}
                                onClick={() => handleRejectWithdrawal(w.id)}
                                className="cursor-pointer text-xs font-bold text-white bg-error-text hover:bg-error-text/90 px-3 py-1.5 rounded-xl disabled:opacity-50 transition-all"
                              >
                                Rejeitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Categories Modal Form */}
        {categoryModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card border border-border-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-border-card flex items-center justify-between">
                <h3 className="text-base font-semibold text-text-main">
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </h3>
                <button
                  onClick={() => setCategoryModalOpen(false)}
                  className="cursor-pointer p-1.5 hover:bg-bg-hover text-text-soft hover:text-text-main rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} className="p-6">
                <div className="space-y-5">
                  {/* Name field */}
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Nome da Categoria
                    </label>
                    <input
                      type="text"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Ex: Streaming, IA, Design..."
                      className="w-full bg-bg-page border border-border-card rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all text-text-main placeholder:text-text-soft"
                      required
                    />
                  </div>

                  {/* Icon Upload field */}
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Ícone (Imagem)
                    </label>
                    
                    <div className="flex items-center gap-4">
                      {/* Image Preview */}
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-border-card bg-bg-page flex items-center justify-center shrink-0">
                        {categoryIcon ? (
                          <img src={categoryIcon} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-6 h-6 text-text-soft" />
                        )}
                      </div>

                      {/* File Input */}
                      <div className="flex-1">
                        <label className="cursor-pointer inline-flex items-center gap-2 bg-bg-subtle hover:bg-bg-hover text-text-muted hover:text-text-main text-xs font-medium px-4 py-2 rounded-xl transition-all border border-border-card">
                          <Upload className="w-3.5 h-3.5" />
                          Selecionar imagem
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCategoryIconUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-text-soft mt-1.5 leading-normal">
                          PNG, JPG ou SVG recomendados. Máx. 2MB.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(false)}
                    className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-main hover:bg-bg-subtle rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCategory}
                    className="cursor-pointer bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                  >
                    {submittingCategory ? "Salvando..." : "Salvar Categoria"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Services Modal Form */}
        {serviceModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card border border-border-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-border-card flex items-center justify-between">
                <h3 className="text-base font-semibold text-text-main">
                  {editingService ? "Editar Serviço" : "Novo Serviço"}
                </h3>
                <button
                  onClick={() => setServiceModalOpen(false)}
                  className="cursor-pointer p-1.5 hover:bg-bg-hover text-text-soft hover:text-text-main rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-5">
                  {/* Name field */}
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Nome do Serviço
                    </label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="Ex: Netflix, Spotify..."
                      className="w-full bg-bg-page border border-border-card rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all text-text-main placeholder:text-text-soft"
                      required
                    />
                  </div>

                  {/* Category field */}
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Categoria
                    </label>
                    <select
                      value={serviceCategoryId}
                      onChange={(e) => setServiceCategoryId(e.target.value)}
                      className="w-full bg-bg-page border border-border-card rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all text-text-main"
                      required
                    >
                      <option value="" disabled>Selecione uma categoria...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description field */}
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Descrição <span className="text-[10px] text-text-soft font-normal lowercase">(opcional)</span>
                    </label>
                    <textarea
                      value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)}
                      placeholder="Ex: Assinatura de streaming de vídeo."
                      rows={3}
                      className="w-full bg-bg-page border border-border-card rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all text-text-main placeholder:text-text-soft resize-none"
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setServiceModalOpen(false)}
                    className="cursor-pointer flex-1 py-2.5 rounded-xl font-medium text-sm text-text-main bg-bg-page border border-border-card hover:bg-bg-subtle transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitService}
                    disabled={submittingService}
                    className="cursor-pointer flex-1 py-2.5 rounded-xl font-medium text-sm text-white bg-primary hover:bg-primary-hover disabled:opacity-50 transition-all shadow-sm"
                  >
                    {submittingService ? "Salvando..." : "Salvar Serviço"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}

function MetricCard({ title, value, description, icon }: MetricCardProps) {
  return (
    <div className="bg-bg-card border border-border-card rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-start">
        <span className="text-sm font-semibold text-text-muted leading-tight">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-bg-subtle flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-bold text-text-main tracking-tight leading-none">
          {value}
        </h3>
        <p className="text-xs text-text-soft mt-2 leading-normal">
          {description}
        </p>
      </div>
    </div>
  );
}
