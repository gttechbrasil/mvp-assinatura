import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout.js";
import { useApi } from "../hooks/useApi.js";
import { Search, ChevronLeft, Compass } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface PlatformService {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  category: { id: string; name: string; icon: string };
}

export function ServiceSelectorPage() {
  const navigate = useNavigate();
  const { request } = useApi();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<PlatformService[]>([]);

  useEffect(() => {
    Promise.all([
      request<{ categories: Category[] }>("/categories"),
      request<{ services: PlatformService[] }>("/services")
    ])
      .then(([cats, svcs]) => {
        setCategories(cats.categories);
        setServices(svcs.services);
      })
      .catch(() => {});
  }, [request]);

  const categoryPills = useMemo(() => {
    return categories;
  }, [categories]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch = search === "" || s.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategoryId || s.categoryId === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [services, search, selectedCategoryId]);

  function handleSelectService(service: PlatformService) {
    const params = new URLSearchParams({
      service: service.name,
      categoryId: service.categoryId,
    });
    navigate(`/groups/new/form?${params.toString()}`);
  }

  return (
    <AppLayout>
      <div className="w-full max-w-5xl mx-auto px-6 py-10">
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
            Criar Grupo
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            Escolha o serviço que deseja compartilhar ou crie um grupo personalizado.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-soft w-5 h-5" />
          <input
            id="service-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar serviços..."
            className="w-full pl-12 pr-4 py-3.5 text-sm bg-bg-card border border-border-card rounded-2xl text-text-main placeholder:text-text-soft focus:outline-none focus:border-text-soft transition-colors shadow-sm"
          />
        </div>

        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            Categorias
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                selectedCategoryId === null
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-bg-card text-text-muted border-border-card hover:border-text-soft hover:text-text-main"
              }`}
            >
              Todos
            </button>
            {categoryPills.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setSelectedCategoryId(
                    selectedCategoryId === cat.id ? null : cat.id
                  )
                }
                className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  selectedCategoryId === cat.id
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-bg-card text-text-muted border-border-card hover:border-text-soft hover:text-text-main"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Services grid */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            Serviços
          </h2>

          {filteredServices.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Search className="w-8 h-8 text-text-soft" />
              <p className="text-sm text-text-muted font-medium">
                Nenhum serviço encontrado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  id={`service-${service.name.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => handleSelectService(service)}
                  className="cursor-pointer group bg-bg-card border border-border-card rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-primary/50 hover:shadow-md transition-all duration-200 text-center active:scale-[0.97]"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-border-card bg-bg-page flex items-center justify-center text-primary group-hover:border-primary/50 transition-colors">
                    {service.category?.icon ? (
                      <img src={service.category.icon} alt={service.name} className="w-full h-full object-cover" />
                    ) : (
                      <Compass className="w-6 h-6 text-text-soft" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-main leading-tight">
                      {service.name}
                    </p>
                    {service.description && (
                      <p className="text-xs text-text-soft mt-1.5 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
