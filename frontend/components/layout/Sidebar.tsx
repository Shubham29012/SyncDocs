"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useCreateDocument } from "@/hooks/useDocument";
import { useRouter } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "All Documents",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    href: "/dashboard?filter=shared",
    label: "Shared with me",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/dashboard?filter=starred",
    label: "Starred",
    icon: (
      <svg width="16" height="16" fill="currentColor" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" style={{ color: "var(--amber)" }}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard?filter=archived",
    label: "Archived",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const createDoc = useCreateDocument();

  const handleNew = async () => {
    const result = await createDoc.mutateAsync(undefined);
    if (result?.document?.id) {
      router.push(`/documents/${result.document.id}`);
    }
  };

  return (
    <aside className="sidebar">
      <button
        id="new-document-btn"
        className="btn btn-primary"
        style={{ width: "100%", marginBottom: "16px" }}
        onClick={handleNew}
        disabled={createDoc.isPending}
      >
        {createDoc.isPending ? (
          <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
        ) : (
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
        New Document
      </button>

      <span className="sidebar-section-label">Navigation</span>

      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx("sidebar-item", pathname === item.href.split("?")[0] && "active")}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}

      <div style={{ flex: 1 }} />

      <div
        style={{
          padding: "12px",
          borderRadius: "var(--radius)",
          background: "var(--accent-dim)",
          border: "1px solid rgba(124,58,237,0.2)",
          marginTop: "16px",
        }}
      >
        <p style={{ fontSize: "0.75rem", color: "var(--text-accent)", fontWeight: "600", marginBottom: "4px" }}>
          ⚡ Offline-First
        </p>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
          All edits are saved locally and synced automatically.
        </p>
      </div>
    </aside>
  );
}
