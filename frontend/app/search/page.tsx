"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";

export default function SearchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "title" | "content">("all");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["search", submitted, type],
    queryFn: () => searchApi.search({ q: submitted, type }),
    enabled: submitted.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSubmitted(query.trim());
  };

  return (
    <div className="app-layout">
      <Navbar />
      <Sidebar />
      <main className="main-content">
        <h1 className="page-title">Search</h1>
        <p className="page-subtitle">Search across all your documents</p>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            id="search-input"
            type="search"
            className="input"
            placeholder="Search documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="input"
            style={{ width: "140px", flexShrink: 0 }}
          >
            <option value="all">All fields</option>
            <option value="title">Title only</option>
            <option value="content">Content only</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={!query.trim()}>
            Search
          </button>
        </form>

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "var(--radius)" }} />
            ))}
          </div>
        )}

        {data && (
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              {data.total} result{data.total !== 1 ? "s" : ""} for "{submitted}"
            </p>
            {data.results.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">🔍</span>
                <p>No results found</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {data.results.map((r) => (
                  <div
                    key={r.id}
                    className="glass-card"
                    style={{ padding: "20px", cursor: "pointer" }}
                    onClick={() => router.push(`/documents/${r.id}`)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>
                        {r.title}
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0, marginLeft: "16px" }}>
                        {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                    {r.snippet && (
                      <div
                        className="search-result"
                        style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.6" }}
                        dangerouslySetInnerHTML={{ __html: r.snippet }}
                      />
                    )}
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px" }}>
                      by {r.ownerName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
