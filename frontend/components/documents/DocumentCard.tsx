"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Document } from "@/types";
import { useDeleteDocument, useDuplicateDocument, useUpdateDocument } from "@/hooks/useDocument";
import { useState } from "react";

interface DocumentCardProps {
  document: Document;
  onOpen?: () => void;
}

const roleColors: Record<string, string> = {
  OWNER: "badge-owner",
  EDITOR: "badge-editor",
  VIEWER: "badge-viewer",
};

export default function DocumentCard({ document, onOpen }: DocumentCardProps) {
  const deleteMutation = useDeleteDocument();
  const duplicateMutation = useDuplicateDocument();
  const updateMutation = useUpdateDocument(document.id);
  const [showMenu, setShowMenu] = useState(false);

  const collaboratorAvatars = (document.collaborators ?? []).slice(0, 4);

  return (
    <div
      className="doc-card"
      onClick={() => onOpen?.()}
    >
      {/* Top accent line via ::before CSS */}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateMutation.mutate({ isStarred: !document.isStarred });
            }}
            className="btn btn-ghost btn-icon"
            style={{ padding: "4px 8px", fontSize: "1.1rem", color: document.isStarred ? "var(--amber)" : "var(--text-muted)" }}
            aria-label={document.isStarred ? "Unstar document" : "Star document"}
          >
            ★
          </button>
          <Link
            href={`/documents/${document.id}`}
            className="doc-card-title"
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1 }}
          >
            {document.title}
          </Link>
        </div>

        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <button
            id={`doc-menu-${document.id}`}
            className="btn btn-ghost btn-icon"
            style={{ padding: "4px" }}
            onClick={() => setShowMenu((v) => !v)}
            aria-label="Document options"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 20 }}
                onClick={() => setShowMenu(false)}
              />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-bright)",
                  borderRadius: "var(--radius)",
                  padding: "4px",
                  minWidth: "160px",
                  boxShadow: "var(--shadow)",
                  zIndex: 30,
                }}
              >
                <Link
                  href={`/documents/${document.id}`}
                  className="sidebar-item"
                  style={{ fontSize: "0.82rem" }}
                  onClick={() => setShowMenu(false)}
                >
                  Open
                </Link>
                <button
                  className="sidebar-item"
                  style={{ fontSize: "0.82rem" }}
                  onClick={() => {
                    setShowMenu(false);
                    duplicateMutation.mutate(document.id);
                  }}
                >
                  Duplicate
                </button>
                {document.myRole === "OWNER" && (
                  <>
                    <Link
                      href={`/documents/${document.id}?share=1`}
                      className="sidebar-item"
                      style={{ fontSize: "0.82rem" }}
                      onClick={() => setShowMenu(false)}
                    >
                      Share
                    </Link>
                    <button
                      className="sidebar-item"
                      style={{ fontSize: "0.82rem", color: "var(--rose)" }}
                      onClick={() => {
                        setShowMenu(false);
                        if (confirm("Delete this document?")) {
                          deleteMutation.mutate(document.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="doc-card-meta">
        <span>by {document.owner?.name ?? "Unknown"}</span>
        <span>·</span>
        <span>{formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}</span>
      </div>

      <div className="doc-card-footer">
        <div className="avatar-stack">
          {collaboratorAvatars.map((c) => (
            <div key={c.user.id} className="avatar" title={c.user.name ?? c.user.email}>
              {c.user.image ? (
                <img src={c.user.image} alt={c.user.name ?? ""} />
              ) : (
                c.user.name?.[0]?.toUpperCase() ?? "?"
              )}
            </div>
          ))}
          {(document._count?.collaborators ?? 0) > 4 && (
            <div className="avatar" style={{ fontSize: "0.65rem" }}>
              +{(document._count?.collaborators ?? 0) - 4}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            className={`badge ${roleColors[document.myRole ?? "VIEWER"] ?? "badge-viewer"}`}
          >
            {document.myRole ?? "VIEWER"}
          </span>
          {(document._count?.versions ?? 0) > 0 && (
            <span className="badge" style={{ background: "var(--glass)", color: "var(--text-muted)" }}>
              <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              {document._count?.versions}v
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
