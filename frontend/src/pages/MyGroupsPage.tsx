import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout.js";
import { useApi } from "../hooks/useApi.js";
import { useAuth } from "../contexts/AuthContext.js";
import { FolderOpen, Link2 } from "lucide-react";
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
  _count: { members: number };
  categoryId?: string | null;
  category?: Category | null;
}

type Tab = "owned" | "joined";

export function MyGroupsPage() {
  const { request } = useApi();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("owned");
  const [ownedGroups, setOwnedGroups] = useState<Group[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [owned, joined] = await Promise.all([
        request<{ groups: Group[] }>("/groups/my"),
        request<{ groups: Group[] }>("/groups/joined"),
      ]);
      setOwnedGroups(owned.groups);
      setJoinedGroups(joined.groups);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const groups = tab === "owned" ? ownedGroups : joinedGroups;
  const totalParticipating = joinedGroups.length;
  const totalSlots = ownedGroups.reduce((acc, g) => acc + g._count.members, 0);

  return (
    <AppLayout>
      <div className="w-full max-w-5xl mx-auto px-6 py-10">
        {/* Hero header */}
        <div className="mb-10">
          <p className="text-sm text-text-soft font-medium mb-1">
            Olá, {user?.email.split("@")[0]}
          </p>
          <h1 className="text-3xl font-semibold text-text-main tracking-tight leading-tight">
            Meus Grupos
          </h1>
          <p className="text-base text-text-muted mt-2">
            Gerencie seus grupos compartilhados como líder ou acompanhe onde
            você participa.
          </p>
        </div>

        {/* Summary stats */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            <SummaryCard
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              }
              value={String(ownedGroups.length)}
              label="Grupos criados"
            />
            <SummaryCard
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
              value={String(totalSlots)}
              label="Membros nos meus grupos"
            />
            <SummaryCard
              icon={
                <svg
                  className="w-5 h-5"
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
              }
              value={String(totalParticipating)}
              label="Grupos que participo"
            />
          </div>
        )}

        {/* Tabs + CTA */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-bg-subtle p-1 rounded-xl">
            <TabButton
              id="tab-owned"
              active={tab === "owned"}
              onClick={() => setTab("owned")}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              Líder
              {ownedGroups.length > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${tab === "owned" ? "bg-bg-hover text-text-muted" : "bg-bg-hover text-text-soft"}`}
                >
                  {ownedGroups.length}
                </span>
              )}
            </TabButton>
            <TabButton
              id="tab-joined"
              active={tab === "joined"}
              onClick={() => setTab("joined")}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Participante
              {joinedGroups.length > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${tab === "joined" ? "bg-bg-hover text-text-muted" : "bg-bg-hover text-text-soft"}`}
                >
                  {joinedGroups.length}
                </span>
              )}
            </TabButton>
          </div>

          <Link
            to="/groups/new"
            id="create-group-btn"
            className="cursor-pointer inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all active:scale-[0.98] shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 5v14M5 12h14"
              />
            </svg>
            Novo Grupo
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-6 h-6 border-2 border-border-card border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-text-soft">Carregando grupos...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-error-bg border border-error-border text-error-text text-sm px-5 py-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border-card rounded-2xl bg-bg-card/50">
            <div className="w-16 h-16 bg-bg-subtle rounded-2xl flex items-center justify-center mb-4 text-text-muted">
              {tab === "owned" ? (
                <FolderOpen className="w-8 h-8" />
              ) : (
                <Link2 className="w-8 h-8" />
              )}
            </div>
            <p className="text-base font-medium text-text-muted mb-1">
              {tab === "owned"
                ? "Nenhum grupo criado ainda"
                : "Você ainda não participa de nenhum grupo"}
            </p>
            <p className="text-sm text-text-soft mb-5 text-center max-w-xs">
              {tab === "owned"
                ? "Crie seu primeiro grupo e comece a compartilhar assinaturas."
                : "Entre em um grupo usando um link de convite."}
            </p>
            {tab === "owned" && (
              <Link
                to="/groups/new"
                className="cursor-pointer inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 5v14M5 12h14"
                  />
                </svg>
                Criar primeiro grupo
              </Link>
            )}
          </div>
        )}

        {/* Group grid */}
        {!loading && !error && groups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}

            {/* Create new card */}
            {tab === "owned" && (
              <Link
                to="/groups/new"
                className="cursor-pointer flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border-card rounded-2xl p-8 hover:border-border-card hover:bg-bg-subtle/50 transition-all group min-h-[180px]"
              >
                <div className="w-10 h-10 bg-bg-subtle group-hover:bg-bg-hover rounded-xl flex items-center justify-center transition-colors">
                  <svg
                    className="w-5 h-5 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 5v14M5 12h14"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-text-muted group-hover:text-text-main transition-colors">
                  Criar novo grupo
                </p>
              </Link>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center gap-4">
      <div className="w-11 h-11 bg-bg-subtle rounded-xl flex items-center justify-center text-text-muted shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-text-main leading-none">
          {value}
        </p>
        <p className="text-xs text-text-soft mt-1">{label}</p>
      </div>
    </div>
  );
}

function TabButton({
  id,
  active,
  onClick,
  children,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
        active
          ? "bg-bg-card text-text-main shadow-sm"
          : "text-text-muted hover:text-text-main"
      }`}
    >
      {children}
    </button>
  );
}

function GroupCard({ group }: { group: Group }) {
  const usedSlots = group._count.members;
  const slotsPercent = Math.round((usedSlots / group.maxSlots) * 100);
  const isFull = usedSlots >= group.maxSlots;

  return (
    <Link
      to={`/groups/${group.id}`}
      id={`group-card-${group.id}`}
      className="cursor-pointer group block bg-bg-card border border-border-card rounded-2xl p-6 hover:border-border-card hover:shadow-md transition-all duration-200"
    >
      {/* Service icon + status */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-border-card bg-bg-page flex items-center justify-center text-text-muted transition-colors shrink-0">
          {group.category?.icon ? (
            <img
              src={group.category.icon}
              alt={group.category.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ServiceIcon service={group.service} className="w-6 h-6" />
          )}
        </div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            group.status === "ACTIVE"
              ? "bg-success-bg text-success-text"
              : "bg-bg-subtle text-text-soft"
          }`}
        >
          {group.status === "ACTIVE" ? "Ativo" : "Inativo"}
        </span>
      </div>

      {/* Name + service */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-text-soft mb-0.5">
        {group.service}
      </p>
      <p className="text-base font-semibold text-text-main truncate group-hover:text-text-muted transition-colors">
        {group.name}
      </p>

      {/* Price */}
      <p className="text-sm text-text-muted mt-1">
        <span className="font-semibold text-text-main">
          R$ {Number(group.pricePerSlot).toFixed(2)}
        </span>
        <span className="text-text-soft"> / vaga</span>
      </p>

      {/* Slots progress */}
      <div className="mt-5">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-text-soft">Ocupação</span>
          <span
            className={`font-semibold ${isFull ? "text-error-text" : "text-text-muted"}`}
          >
            {usedSlots}/{group.maxSlots} vagas
          </span>
        </div>
        <div className="w-full h-2 bg-bg-subtle rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
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

      {/* Arrow */}
      <div className="flex justify-end mt-4">
        <svg
          className="w-4 h-4 text-text-soft group-hover:text-text-muted group-hover:translate-x-0.5 transition-all"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
