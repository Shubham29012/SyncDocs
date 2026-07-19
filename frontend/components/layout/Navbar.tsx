"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SyncStatusBar from "./SyncStatusBar";
import { notificationsApi } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { signOutUser } from "@/lib/auth-helpers";

interface NavbarProps {
  onMenuToggle?: () => void;
  showMenu?: boolean;
}

export default function Navbar({ onMenuToggle, showMenu }: NavbarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => notificationsApi.list({ unread: true, limit: 5 }),
    enabled: !!session,
    refetchInterval: 30_000,
  });

  const unreadCount = notifData?.unreadCount ?? 0;

  return (
    <nav className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {onMenuToggle && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
            style={{ display: "none" }}
            id="menu-toggle"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <Link href="/dashboard" className="navbar-logo">
          ⚡ SyncDocs
        </Link>
      </div>

      <div className="navbar-actions">
        <SyncStatusBar />

        {/* Notifications bell */}
        {session && (
          <Link href="/notifications" style={{ position: "relative" }}>
            <button className="btn btn-ghost btn-icon" aria-label="Notifications">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    width: "16px",
                    height: "16px",
                    background: "var(--accent)",
                    borderRadius: "50%",
                    fontSize: "0.65rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </Link>
        )}

        {session ? (
          <div style={{ position: "relative" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setShowUserMenu((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px" }}
            >
              <div className="avatar" style={{ width: "32px", height: "32px", margin: 0 }}>
                {session.user?.image ? (
                  <img src={session.user.image} alt={session.user.name ?? "User"} />
                ) : (
                  session.user?.name?.[0]?.toUpperCase() ?? "U"
                )}
              </div>
              <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session.user?.name ?? session.user?.email}
              </span>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showUserMenu && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 80 }}
                  onClick={() => setShowUserMenu(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-bright)",
                    borderRadius: "var(--radius-lg)",
                    padding: "8px",
                    minWidth: "180px",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 90,
                    animation: "slideUp 0.15s ease",
                  }}
                >
                  <Link
                    href="/profile"
                    className="sidebar-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="sidebar-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                  </Link>
                  <button
                    className="sidebar-item"
                    style={{ color: "var(--rose)" }}
                    onClick={() => {
                      setShowUserMenu(false);
                      signOutUser();
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href="/login" className="btn btn-secondary btn-sm">Sign in</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Sign up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
