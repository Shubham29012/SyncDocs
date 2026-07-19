"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/client";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import toast from "react-hot-toast";

const notifIcons: Record<string, string> = {
  DOCUMENT_SHARED: "📄",
  ROLE_UPDATED: "🔑",
  SYNC_FAILED: "⚠️",
  SYNC_COMPLETED: "✅",
};

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: () => notificationsApi.list({ unread: false, limit: 50 }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="app-layout">
      <Navbar />
      <Sidebar />
      <main className="main-content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">
              {unread > 0 ? `${unread} unread` : "All caught up!"}
            </p>
          </div>
          {unread > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all as read
            </button>
          )}
        </div>

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "72px", borderRadius: "var(--radius)" }} />
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">🔔</span>
            <p style={{ color: "var(--text-secondary)", fontWeight: "600" }}>No notifications</p>
            <p style={{ fontSize: "0.875rem" }}>You'll be notified when documents are shared with you.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              id={`notif-${notif.id}`}
              className={`notification-item ${!notif.isRead ? "unread" : ""}`}
              onClick={() => {
                if (!notif.isRead) markRead.mutate(notif.id);
                if (notif.documentId) router.push(`/documents/${notif.documentId}`);
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>
                {notifIcons[notif.type] ?? "🔔"}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.875rem", fontWeight: notif.isRead ? "400" : "600", marginBottom: "2px" }}>
                  {notif.title}
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {notif.message}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                </span>
                {!notif.isRead && <div className="notif-dot" />}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
