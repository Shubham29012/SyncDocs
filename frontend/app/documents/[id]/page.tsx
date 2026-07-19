"use client";

import { useState, useEffect, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDocument, useUpdateDocument } from "@/hooks/useDocument";
import { useCreateVersion } from "@/hooks/useVersionHistory";
import CollaboratorCursors from "@/components/editor/CollaboratorCursors";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("@/components/editor/TiptapEditor"), {
  ssr: false,
});
import ShareDialog from "@/components/documents/ShareDialog";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { getDocument } from "@/lib/db/dexie";
import type { CollaboratorCursor } from "@/types";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { activityApi } from "@/lib/api/client";

interface EditorPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}

export default function EditorPage({ params: paramsPromise, searchParams: searchParamsPromise }: EditorPageProps) {
  const params = use(paramsPromise);
  const searchParams = use(searchParamsPromise);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data: docData, isLoading } = useDocument(params.id);
  const updateDoc = useUpdateDocument(params.id);
  const createVersion = useCreateVersion(params.id);

  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [showShare, setShowShare] = useState(!!searchParams.share);
  const [cursors, setCursors] = useState<CollaboratorCursor[]>([]);
  const [localYjsState, setLocalYjsState] = useState<Uint8Array | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [showActivity, setShowActivity] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const { data: activityData, isLoading: logsLoading } = useQuery({
    queryKey: ["activity", params.id],
    queryFn: () => activityApi.list(params.id),
    enabled: showActivity,
    refetchInterval: 15_000,
  });

  const logs = activityData?.logs ?? [];

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Load from IndexedDB first (offline-first)
  useEffect(() => {
    getDocument(params.id).then((localDoc) => {
      if (localDoc?.yjsState) {
        setLocalYjsState(new Uint8Array(localDoc.yjsState));
      }
    });
  }, [params.id]);

  // Set title when doc loads
  useEffect(() => {
    if (docData?.document?.title) {
      setTitle(docData.document.title);
    }
  }, [docData?.document?.title]);

  // Focus title input when editing
  useEffect(() => {
    if (editingTitle) titleRef.current?.select();
  }, [editingTitle]);

  const handleTitleBlur = async () => {
    setEditingTitle(false);
    const trimmed = title.trim();
    if (!trimmed || trimmed === docData?.document?.title) return;
    try {
      await updateDoc.mutateAsync({ title: trimmed });
    } catch {
      setTitle(docData?.document?.title ?? "Untitled Document");
    }
  };

  const handleCreateVersion = async () => {
    const label = prompt("Version label (optional):", `v${Date.now()}`);
    if (label === null) return; // Cancelled
    await createVersion.mutateAsync(label || undefined);
  };

  if (status === "loading" || isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="spinner" style={{ width: "32px", height: "32px" }} />
        </div>
      </div>
    );
  }

  const doc = docData?.document;
  const myRole = doc?.myRole ?? "VIEWER";
  const isOwner = myRole === "OWNER";
  const canEdit = myRole === "OWNER" || myRole === "EDITOR";

  // Build Yjs state: server takes priority over local if server has more recent state
  const serverYjsState = doc?.yjsState
    ? new Uint8Array(Buffer.from(doc.yjsState, "base64"))
    : null;
  const initialYjsState = serverYjsState ?? localYjsState;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <Navbar />

      {/* Editor Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-secondary)",
          position: "sticky",
          top: "60px",
          zIndex: 40,
        }}
      >
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          style={{
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Docs
        </Link>
        <span style={{ color: "var(--border)" }}>/</span>

        {/* Editable title */}
        {editingTitle ? (
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === "Enter" && titleRef.current?.blur()}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "1rem",
              fontWeight: "600",
              outline: "none",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              boxShadow: "0 0 0 2px var(--accent)",
              width: "300px",
            }}
          />
        ) : (
          <button
            className="btn btn-ghost"
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              padding: "4px 8px",
              color: "var(--text-primary)",
            }}
            onClick={() => canEdit && setEditingTitle(true)}
            title={canEdit ? "Click to rename" : undefined}
          >
            {title || "Untitled Document"}
            {canEdit && (
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ marginLeft: "6px", opacity: 0.5 }}
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            )}
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Word count */}
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          {wordCount} words
        </span>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href={`/documents/${params.id}/versions`}
            className="btn btn-secondary btn-sm"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            History
          </Link>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowActivity((v) => !v)}
            title="View activity logs"
          >
            📋 Logs
          </button>

          {canEdit && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCreateVersion}
              disabled={createVersion.isPending}
              title="Save a named snapshot"
            >
              {createVersion.isPending ? (
                <span className="spinner" style={{ width: "12px", height: "12px" }} />
              ) : (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              )}
              Snapshot
            </button>
          )}

          <button
            id="share-btn"
            className="btn btn-primary btn-sm"
            onClick={() => setShowShare(true)}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Collaborator presence */}
      <CollaboratorCursors cursors={cursors} />

      {/* Editor & Logs layout */}
      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        <div style={{ flex: 1 }}>
          {doc ? (
            <TiptapEditor
              docId={params.id}
              initialYjsState={initialYjsState}
              editable={canEdit}
              onWordCount={setWordCount}
            />
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon">⚠️</span>
              <p style={{ color: "var(--rose)" }}>Document not found</p>
              <Link href="/dashboard" className="btn btn-secondary btn-sm" style={{ marginTop: "8px" }}>
                Back to dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Activity Logs Sidebar */}
        {showActivity && (
          <div
            style={{
              width: "300px",
              borderLeft: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              height: "calc(100vh - 120px)",
              position: "sticky",
              top: "120px",
              overflowY: "auto",
              zIndex: 30,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700" }}>Activity Logs</h3>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowActivity(false)}
                style={{ padding: "4px" }}
              >
                ✕
              </button>
            </div>
            {logsLoading ? (
              <span className="spinner" style={{ width: "20px", height: "20px", margin: "20px auto" }} />
            ) : logs.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>No logs yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {logs.map((log: any) => (
                  <div key={log.id} style={{ fontSize: "0.8rem", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                    <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{log.user?.name || log.user?.email || "Unknown User"}</div>
                    <div style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
                      {log.action} {log.metadata?.newTitle ? `to "${log.metadata.newTitle}"` : ""}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Dialog */}
      {showShare && (
        <ShareDialog
          docId={params.id}
          isOwner={isOwner}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
