"use client";

import { useState } from "react";
import { documentsApi } from "@/lib/api/client";
import {
  useCollaborators,
  useInviteCollaborator,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
} from "@/hooks/useCollaborators";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface ShareDialogProps {
  docId: string;
  isOwner: boolean;
  onClose: () => void;
}

export default function ShareDialog({ docId, isOwner, onClose }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);

  const { data } = useCollaborators(docId);
  const invite = useInviteCollaborator(docId);
  const updateRole = useUpdateCollaboratorRole(docId);
  const removeCollab = useRemoveCollaborator(docId);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await invite.mutateAsync({ email: email.trim(), role });
    setEmail("");
  };

  const handleGenerateLink = async () => {
    setLoadingLink(true);
    try {
      const result = await documentsApi.shareLink(docId);
      setShareUrl(result.shareUrl);
    } catch {
      toast.error("Failed to generate share link");
    } finally {
      setLoadingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "520px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h2 className="modal-title">Share Document</h2>
            <p className="modal-desc" style={{ margin: 0 }}>Invite collaborators by email</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isOwner && (
          <>
            <form onSubmit={handleInvite} style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              <input
                id="invite-email"
                type="email"
                className="input"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
                className="input"
                style={{ width: "120px", flexShrink: 0 }}
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={invite.isPending}
                style={{ flexShrink: 0 }}
              >
                {invite.isPending ? <span className="spinner" style={{ width: "14px", height: "14px" }} /> : "Invite"}
              </button>
            </form>

            {/* Share link */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "16px",
                marginBottom: "24px",
              }}
            >
              <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>
                Share link
              </p>
              {shareUrl ? (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    className="input"
                    value={shareUrl}
                    readOnly
                    style={{ fontSize: "0.78rem" }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={handleCopyLink}>Copy</button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleGenerateLink}
                  disabled={loadingLink}
                >
                  {loadingLink ? <span className="spinner" style={{ width: "12px", height: "12px" }} /> : "Generate link"}
                </button>
              )}
            </div>
          </>
        )}

        {/* Collaborator list */}
        <div>
          <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>
            People with access
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Owner */}
            {data?.owner && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
                <div className="avatar" style={{ margin: 0 }}>
                  {data.owner.image ? <img src={data.owner.image} alt="" /> : data.owner.name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: "500" }}>{data.owner.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{data.owner.email}</p>
                </div>
                <span className="badge badge-owner">Owner</span>
              </div>
            )}

            {/* Collaborators */}
            {(data?.collaborators ?? []).map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
                <div className="avatar" style={{ margin: 0 }}>
                  {c.user.image ? <img src={c.user.image} alt="" /> : c.user.name?.[0] ?? "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: "500" }}>{c.user.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.user.email}</p>
                </div>
                {isOwner ? (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <select
                      value={c.role}
                      onChange={(e) =>
                        updateRole.mutate({ userId: c.user.id, role: e.target.value as "EDITOR" | "VIEWER" })
                      }
                      className="input"
                      style={{ width: "100px", padding: "4px 8px", fontSize: "0.8rem" }}
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ color: "var(--rose)" }}
                      onClick={() => {
                        if (confirm(`Remove ${c.user.name}?`)) {
                          removeCollab.mutate(c.user.id);
                        }
                      }}
                      aria-label={`Remove ${c.user.name}`}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <span className={`badge ${c.role === "EDITOR" ? "badge-editor" : "badge-viewer"}`}>{c.role}</span>
                )}
              </div>
            ))}

            {(data?.collaborators ?? []).length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
                No collaborators yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
