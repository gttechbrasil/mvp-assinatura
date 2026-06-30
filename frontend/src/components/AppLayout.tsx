import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { Bell, AlertTriangle } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications.js";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Fecha o menu/notificações ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Iniciais do avatar
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  return (
    <div className="min-h-screen bg-bg-page flex flex-col font-sans text-text-main select-none">
      <header className="h-16 border-b border-border-card bg-bg-card flex items-center justify-end px-16 sticky top-0 z-10">
        {/* Right: nav + notifications + avatar + dropdown */}
        <div className="flex items-center gap-4">
          <Link
            to="/groups"
            id="nav-explorar"
            className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              location.pathname === "/groups"
                ? "bg-bg-subtle text-text-main"
                : "text-text-muted hover:text-text-main hover:bg-bg-hover"
            }`}
          >
            Explorar
          </Link>
          <Link
            to="/my-groups"
            id="nav-meus-grupos"
            className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              location.pathname.startsWith("/my-groups")
                ? "bg-bg-subtle text-text-main"
                : "text-text-muted hover:text-text-main hover:bg-bg-hover"
            }`}
          >
            Meus Grupos
          </Link>
          <Link
            to="/groups/new"
            id="nav-criar-grupo"
            className="cursor-pointer inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all active:scale-[0.98] shadow-sm ml-1"
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
                d="M12 5v14M5 12h14"
              />
            </svg>
            Criar grupo
          </Link>
          {/* Notifications bell */}
          <div className="relative flex items-center" ref={notificationsRef}>
            <button
              id="notifications-btn"
              onClick={() => setNotificationsOpen((o) => !o)}
              className="cursor-pointer p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-main transition-colors relative flex items-center justify-center"
              aria-haspopup="true"
              aria-expanded={notificationsOpen}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full ring-1 ring-bg-card animate-pulse" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-[360px] max-w-[90vw] bg-bg-card border border-border-card rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                id="notifications-dropdown"
              >
                <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-bg-card">
                  <span className="text-xs font-semibold text-text-main">
                    Notificações
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-semibold text-primary hover:text-primary-hover cursor-pointer"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-border-subtle">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-soft">
                      Nenhuma notificação por enquanto
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUrgent = n.type === "URGENT";
                      return (
                        <div
                          key={n.id}
                          className={`p-3.5 flex items-start gap-3 transition-colors text-left ${
                            !n.isRead 
                              ? isUrgent 
                                ? "bg-error-bg/30 hover:bg-error-bg/50" 
                                : "bg-bg-subtle/30 hover:bg-bg-hover"
                              : "hover:bg-bg-hover"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.isRead ? (isUrgent ? "bg-error-text" : "bg-primary") : "bg-transparent"}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {isUrgent && <AlertTriangle className="w-3.5 h-3.5 text-error-text shrink-0" />}
                              <p
                                className={`text-xs leading-snug ${!n.isRead ? "font-semibold" : "font-medium"} ${isUrgent && !n.isRead ? "text-error-text" : "text-text-main"}`}
                              >
                                {n.title}
                              </p>
                            </div>
                            <p className="text-[11px] text-text-soft mt-0.5 leading-normal font-normal">
                              {n.message}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[9px] text-text-soft/80 font-medium">
                                {new Date(n.createdAt).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                              {!n.isRead && (
                                <div className="flex items-center gap-2">
                                  {n.link && (
                                    <Link
                                      to={n.link}
                                      onClick={() => {
                                        markAsRead(n.id);
                                        setNotificationsOpen(false);
                                      }}
                                      className="text-[10px] font-medium text-primary hover:underline cursor-pointer"
                                    >
                                      Acessar
                                    </Link>
                                  )}
                                  <button
                                    onClick={() => markAsRead(n.id)}
                                    className="text-[10px] font-medium text-text-soft hover:text-text-main cursor-pointer"
                                  >
                                    Marcar lida
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative" ref={menuRef}>
            <button
              id="profile-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              className="cursor-pointer flex items-center gap-2 group"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              {/* Avatar bubble */}
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-offset-1 ring-transparent group-hover:ring-border-card"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-bg-hover group-hover:bg-primary-hover text-text-muted flex items-center justify-center text-xs font-bold transition-colors ring-2 ring-offset-1 ring-transparent group-hover:ring-border-card">
                  {initials}
                </div>
              )}
              {/* Chevron */}
              <svg
                className={`w-3.5 h-3.5 text-text-soft transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-52 bg-bg-card border border-border-card rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                id="profile-dropdown"
                role="menu"
              >
                {/* User info header */}
                <div className="px-4 py-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-bg-hover text-text-muted flex items-center justify-center text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-main truncate">
                        {user?.email}
                      </p>
                      <p className="text-[10px] text-text-soft">Conta ativa</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <DropdownItem
                    id="menu-profile"
                    to="/profile"
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    }
                    label="Perfil"
                    description="Dados da conta"
                    onClick={() => setMenuOpen(false)}
                  />
                  <DropdownItem
                    id="menu-credits"
                    to="/credits"
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                    }
                    label="Créditos"
                    description="Saldo e recargas"
                    onClick={() => setMenuOpen(false)}
                  />
                  {user?.role === "ADMIN" && (
                    <DropdownItem
                      id="menu-admin-categories"
                      to="/admin"
                      icon={
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      }
                      label="Painel Admin"
                      description="Categorias e configs"
                      onClick={() => setMenuOpen(false)}
                    />
                  )}
                </div>

                {/* Logout */}
                <div className="border-t border-border-subtle py-1">
                  <button
                    id="logout-btn"
                    role="menuitem"
                    onClick={handleLogout}
                    className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-error-bg group transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-error-bg text-error-text group-hover:bg-error-border transition-colors shrink-0">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs font-medium text-error-text">
                        Sair
                      </p>
                      <p className="text-[10px] text-text-soft">
                        Encerrar sessão
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

function DropdownItem({
  id,
  to,
  icon,
  label,
  description,
  onClick,
}: {
  id: string;
  to: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Link
      id={id}
      to={to}
      role="menuitem"
      onClick={onClick}
      className="cursor-pointer flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover group transition-colors"
    >
      <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-bg-subtle text-text-muted group-hover:bg-bg-hover transition-colors shrink-0">
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium text-text-main">{label}</p>
        <p className="text-[10px] text-text-soft">{description}</p>
      </div>
    </Link>
  );
}
