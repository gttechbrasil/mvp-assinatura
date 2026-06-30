import { useState, useEffect } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "../components/AppLayout.js";
import { useApi } from "../hooks/useApi.js";
import { ChevronLeft } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface GroupFormData {
  name: string;
  service: string;
  description: string;
  maxSlots: number;
  pricePerSlot: string;
  categoryId: string;
}

const INITIAL_FORM: GroupFormData = {
  name: "",
  service: "",
  description: "",
  maxSlots: 2,
  pricePerSlot: "",
  categoryId: "",
};

export function GroupFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { request } = useApi();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState<GroupFormData>(INITIAL_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMembers, setHasMembers] = useState(false);

  // Load categories and prefill group details if editing or via query params
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const catsData = await request<{ categories: Category[] }>("/categories");
        setCategories(catsData.categories);

        if (isEditing && id) {
          const groupData = await request<{ group: { name: string; service: string; description: string | null; maxSlots: number; pricePerSlot: string; categoryId: string | null; _count?: { members: number } } }>(`/groups/${id}`);
          setForm({
            name: groupData.group.name,
            service: groupData.group.service,
            description: groupData.group.description ?? "",
            maxSlots: groupData.group.maxSlots,
            pricePerSlot: String(groupData.group.pricePerSlot),
            categoryId: groupData.group.categoryId ?? "",
          });
          setHasMembers((groupData.group._count?.members ?? 0) > 0);
        } else {
          const queryService = searchParams.get("service") || "";
          const queryCategoryId = searchParams.get("categoryId") || "";
          setForm({
            name: queryService ? `${queryService} Compartilhado` : "",
            service: queryService,
            description: "",
            maxSlots: 2,
            pricePerSlot: "",
            categoryId: queryCategoryId,
          });
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, isEditing, request, searchParams]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "maxSlots" ? Number(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        pricePerSlot: Number(form.pricePerSlot),
      };
      if (isEditing) {
        await request(`/groups/${id}`, "PUT", payload);
      } else {
        await request("/groups", "POST", payload);
      }
      navigate("/groups");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="w-full max-w-2xl mx-auto px-6 py-10 select-none">
        {/* Back */}
        <Link
          to="/groups"
          id="back-to-groups"
          className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-text-soft hover:text-text-muted mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para grupos
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text-main tracking-tight">
            {isEditing ? "Editar Grupo" : "Criar Novo Grupo"}
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            {isEditing
              ? "Atualize as informações do grupo de assinatura."
              : "Configure um novo grupo de assinatura compartilhada."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-bg border border-error-border text-error-text text-sm px-5 py-4 rounded-xl">
              {error}
            </div>
          )}

          {/* Card: info básica */}
          <div className="bg-bg-card border border-border-card rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Informações básicas
            </h2>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-muted mb-2">
                Nome do grupo <span className="text-error-text">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Netflix em família"
                className="w-full text-sm border border-border-card rounded-xl px-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Serviço Selecionado
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.service || "Personalizado"}
                  className="w-full text-sm border border-border-card rounded-xl px-4 py-3 bg-bg-subtle text-text-soft focus:outline-none transition-colors cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-text-muted mb-2">
                  Categoria
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  required
                  value={form.categoryId}
                  disabled
                  className="w-full text-sm border border-border-card rounded-xl px-4 py-3 bg-bg-subtle text-text-soft focus:outline-none transition-colors cursor-not-allowed appearance-none"
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text-muted mb-2">
                Descrição <span className="text-text-soft font-normal">(opcional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                placeholder="Regras, informações adicionais..."
                className="w-full text-sm border border-border-card rounded-xl px-4 py-3 text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors resize-none"
              />
            </div>
          </div>

          {/* Card: vagas e preço */}
          <div className="bg-bg-card border border-border-card rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Vagas e valores
            </h2>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label htmlFor="maxSlots" className="block text-sm font-medium text-text-muted mb-2">
                  Número de vagas <span className="text-error-text">*</span>
                </label>
                <input
                  id="maxSlots"
                  name="maxSlots"
                  type="number"
                  min={2}
                  max={100}
                  required
                  value={form.maxSlots}
                  onChange={handleChange}
                  className="w-full text-sm border border-border-card rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-text-soft transition-colors"
                />
                <p className="text-xs text-text-soft mt-1.5">Mínimo 2 vagas</p>
              </div>
              <div>
                <label htmlFor="pricePerSlot" className="block text-sm font-medium text-text-muted mb-2">
                  Preço por vaga (R$) <span className="text-error-text">*</span>
                </label>
                <input
                  id="pricePerSlot"
                  name="pricePerSlot"
                  type="number"
                  min={0}
                  step={0.01}
                  required
                  value={form.pricePerSlot}
                  onChange={handleChange}
                  disabled={hasMembers}
                  className={`w-full text-sm border rounded-xl px-4 py-3 text-text-main focus:outline-none transition-colors ${hasMembers ? "bg-bg-subtle border-border-card cursor-not-allowed text-text-soft" : "border-border-card focus:border-text-soft"}`}
                />
                {hasMembers ? (
                  <p className="text-xs text-error-text mt-1.5 font-medium">Não é possível alterar após a entrada de membros.</p>
                ) : (
                  <p className="text-xs text-text-soft mt-1.5">Informativo nesta fase</p>
                )}
              </div>
            </div>

            {/* Preview */}
            {form.maxSlots >= 2 && Number(form.pricePerSlot) > 0 && (
              <div className="bg-bg-subtle border border-border-subtle rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-text-soft uppercase tracking-wider mb-2">Resumo</p>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Vagas disponíveis</span>
                  <span className="font-medium text-text-muted">{form.maxSlots}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-text-muted">Receita estimada</span>
                  <span className="font-semibold text-text-main">
                    R$ {(form.maxSlots * Number(form.pricePerSlot)).toFixed(2)}/mês
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            id="submit-group-btn"
            disabled={loading}
            className="cursor-pointer w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3.5 rounded-xl transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isEditing ? "Salvando..." : "Criando grupo..."}
              </span>
            ) : isEditing ? "Salvar alterações" : "Criar grupo"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
