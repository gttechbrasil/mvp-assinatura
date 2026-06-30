import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout.js";
import { useApi } from "../hooks/useApi.js";
import { useAuth } from "../contexts/AuthContext.js";
import { FolderOpen } from "lucide-react";
import { ServiceIcon } from "../components/ServiceIcon.js";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Group {
  id: string;
  name: string;
  service: string;
  maxSlots: number;
  pricePerSlot: string;
  status: "ACTIVE" | "INACTIVE";
  ownerId: string;
  _count: { members: number };
  categoryId?: string | null;
  category?: Category | null;
}

export function GroupListPage() {
  const { request } = useApi();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentGroups, setRecentGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories once on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await request<{ categories: Category[] }>("/categories");
        setCategories(res.categories);
      } catch (err) {
        console.error("Erro ao carregar categorias:", err);
      }
    }
    fetchCategories();
  }, [request]);

  // Fetch recently viewed groups once on mount
  useEffect(() => {
    request<{ groups: Group[] }>("/groups/recently-viewed")
      .then((res) => setRecentGroups(res.groups))
      .catch(() => {});
  }, [request]);

  // Fetch groups whenever the selected category changes
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedCategoryId
        ? `/groups?categoryId=${selectedCategoryId}`
        : "/groups";
      const res = await request<{ groups: Group[] }>(url);
      setGroups(res.groups);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, request]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const visibleGroups = groups.filter((g) => g.ownerId !== user?.id);

  return (
    <AppLayout>
      <div className="w-full max-w-5xl mx-auto px-6 py-10">
        {/* Hero header */}
        <div className="mb-10 text-left">
          <h1 className="text-3xl font-semibold text-text-main tracking-tight leading-tight">
            Vitrine de Assinaturas
          </h1>
          <p className="text-base text-text-muted mt-2">
            Explore grupos ativos com vagas disponíveis e economize dividindo
            suas assinaturas.
          </p>
        </div>

        {/* Categories horizontal selector */}
        {!error && categories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
              Categorias
            </h2>
            <div className="flex gap-5 overflow-x-auto pb-2 no-scrollbar">
              {/* All bubble */}
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="flex flex-col items-center gap-2 cursor-pointer shrink-0 group focus:outline-none"
              >
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all ${
                    selectedCategoryId === null
                      ? "bg-primary border-primary text-white shadow-sm"
                      : "bg-bg-card border-border-card text-text-muted hover:border-text-muted hover:bg-bg-subtle"
                  }`}
                >
                  <FolderOpen className="w-6 h-6" />
                </div>
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    selectedCategoryId === null
                      ? "text-text-main font-semibold"
                      : "text-text-soft group-hover:text-text-main"
                  }`}
                >
                  Todas
                </span>
              </button>

              {/* Category bubbles */}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="flex flex-col items-center gap-2 cursor-pointer shrink-0 group focus:outline-none"
                >
                  <div
                    className={`w-20 h-20 rounded-full overflow-hidden border-2 transition-all flex items-center justify-center shrink-0 p-2.5 ${
                      selectedCategoryId === cat.id
                        ? "border-primary shadow-sm bg-bg-subtle"
                        : "border-border-card hover:border-text-muted bg-bg-subtle"
                    }`}
                  >
                    {cat.icon ? (
                      <img
                        src={cat.icon}
                        alt={cat.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-bg-subtle" />
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium transition-colors ${
                      selectedCategoryId === cat.id
                        ? "text-text-main font-semibold"
                        : "text-text-soft group-hover:text-text-main"
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-6 h-6 border-2 border-border-card border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-text-soft">Carregando grupos...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-error-bg border border-error-border text-error-text text-sm px-5 py-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Selecionados para você — shown when no results OR always as top section */}
        {!loading && !error && visibleGroups.length === 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-text-main">
                Selecionados para você
              </h2>
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="text-[13px] font-semibold text-sky-500 hover:text-sky-600 transition-colors cursor-pointer"
              >
                Ver Tudo
              </button>
            </div>

            <div className="w-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-border-card rounded-[24px] bg-bg-card/50">
              <FolderOpen className="w-8 h-8 text-text-soft mb-2" />
              <p className="text-sm font-medium text-text-muted">
                Nenhum grupo ativo encontrado nesta categoria
              </p>
            </div>
          </div>
        )}

        {/* Group grid */}
        {!loading && !error && visibleGroups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-text-main">
                Selecionados para você
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {visibleGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </div>
        )}

        {/* Grupos visualizados recentemente */}
        {recentGroups.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-main">
                  Grupos que você viu recentemente
                </h2>
                <p className="text-xs text-text-soft mt-0.5">
                  Continue de onde parou
                </p>
              </div>
            </div>

            <div className="relative group/carousel">
              <div
                id="recent-container"
                className="flex gap-5 overflow-x-auto pb-6 pt-2 no-scrollbar scroll-smooth"
              >
                {recentGroups.map((group) => (
                  <div key={group.id} className="w-[230px] shrink-0">
                    <GroupCard group={group} />
                  </div>
                ))}
              </div>

              {recentGroups.length > 3 && (
                <button
                  onClick={() => {
                    const container =
                      document.getElementById("recent-container");
                    if (container) {
                      container.scrollBy({ left: 240, behavior: "smooth" });
                    }
                  }}
                  className="absolute right-[-18px] top-1/2 -translate-y-1/2 w-9 h-9 bg-white border border-border-card rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:shadow-md active:scale-95 transition-all z-10 cursor-pointer shadow-sm opacity-0 group-hover/carousel:opacity-100"
                  aria-label="Scroll right"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function GroupCard({ group }: { group: Group }) {
  const usedSlots = group._count.members;
  const isFull = usedSlots >= group.maxSlots;

  return (
    <Link
      to={`/groups/${group.id}`}
      id={`group-card-${group.id}`}
      className="cursor-pointer group block bg-bg-card border border-border-card rounded-[24px] p-6 hover:border-border-card hover:shadow-md transition-all duration-200 flex flex-col items-center text-center h-full"
    >
      {/* Circular Avatar */}
      <div className="w-20 h-20 rounded-full relative mb-4 flex items-center justify-center border border-border-card bg-bg-subtle shrink-0">
        <div className="w-10 h-10 text-text-muted flex items-center justify-center">
          <ServiceIcon service={group.service} className="w-8 h-8" />
        </div>
      </div>

      {/* Name */}
      <p className="font-semibold text-text-main text-[15px] leading-tight truncate w-full group-hover:text-text-muted transition-colors">
        {group.name}
      </p>

      {/* Vacancies */}
      <p className="text-xs text-text-soft mt-1">
        {group.maxSlots - usedSlots} Vagas
      </p>

      {/* Price */}
      <p className="font-bold text-text-main text-base mt-4">
        R$ {Number(group.pricePerSlot).toFixed(2).replace(".", ",")}
      </p>

      {/* Pill Badge */}
      <div
        className={`mt-4 text-[11px] font-semibold px-4 py-1.5 rounded-full transition-colors ${
          isFull
            ? "bg-bg-subtle text-text-soft"
            : "bg-bg-subtle text-text-muted"
        }`}
      >
        {isFull ? "Lotado" : "Assinado, com vagas"}
      </div>
    </Link>
  );
}
