"use client";

import { useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDocument } from "@/hooks/useDocument";
import { useVersionHistory, useCreateVersion } from "@/hooks/useVersionHistory";
import VersionTimeline from "@/components/versions/VersionTimeline";
import VersionDiff from "@/components/versions/VersionDiff";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import type { Version } from "@/types";

interface VersionsPageProps {
  params: Promise<{ id: string }>;
}

export default function VersionsPage({ params: paramsPromise }: VersionsPageProps) {
  const params = use(paramsPromise);
  const { data: session } = useSession();
  const { data: docData } = useDocument(params.id);
  const createVersion = useCreateVersion(params.id);
  const [diffVersion, setDiffVersion] = useState<Version | null>(null);

  const doc = docData?.document;
  const isOwner = doc?.myRole === "OWNER";
  const currentText = doc?.content ?? "";

  const handleCreateSnapshot = async () => {
    const label = prompt("Name this snapshot:", `Snapshot ${new Date().toLocaleDateString()}`);
    if (label === null) return;
    await createVersion.mutateAsync(label || undefined);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 24px", width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <Link href={`/documents/${params.id}`} className="btn btn-ghost btn-sm">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to editor
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "28px" }}>
          <div>
            <h1 className="page-title">Version History</h1>
            <p className="page-subtitle">
              {doc?.title ?? "Document"} — all saved snapshots
            </p>
          </div>
          {(isOwner || doc?.myRole === "EDITOR") && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreateSnapshot}
              disabled={createVersion.isPending}
            >
              {createVersion.isPending ? (
                <span className="spinner" style={{ width: "14px", height: "14px" }} />
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New snapshot
                </>
              )}
            </button>
          )}
        </div>

        {/* Info card */}
        <div
          style={{
            background: "var(--accent-dim)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: "var(--radius)",
            padding: "14px 18px",
            marginBottom: "28px",
            fontSize: "0.82rem",
            color: "var(--text-accent)",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span>💡</span>
          <span>
            Restoring a version auto-saves the current state first. All restores are
            collaborative — connected editors will see the restored content immediately.
          </span>
        </div>

        <VersionTimeline
          docId={params.id}
          isOwner={isOwner}
          onViewDiff={setDiffVersion}
        />
      </div>

      {diffVersion && (
        <VersionDiff
          currentText={currentText}
          version={diffVersion}
          onClose={() => setDiffVersion(null)}
        />
      )}
    </div>
  );
}
