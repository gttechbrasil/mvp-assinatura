import { useState, useEffect, useCallback } from "react";
import { useApi } from "./useApi.js";
import { useAuth } from "../contexts/AuthContext.js";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "URGENT";
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export function useNotifications() {
  const { request } = useApi();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    
    try {
      const data = await request<{ notifications: Notification[] }>("/notifications");
      setNotifications(data.notifications);
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
    } finally {
      setLoading(false);
    }
  }, [user, request]);

  useEffect(() => {
    fetchNotifications();
    // Pooling a cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Otimista
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await request(`/notifications/${id}/read`, "PATCH");
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
      // Reverter se falhar (opcional, manter simples por agora)
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    // Otimista
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await request(`/notifications/read-all`, "PATCH");
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
      fetchNotifications();
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
