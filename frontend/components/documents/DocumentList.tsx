"use client";

import { useRouter } from "next/navigation";
import { useDocuments } from "@/hooks/useDocument";
import DocumentCard from "./DocumentCard";
import type { Document } from "@/types";

interface DocumentListProps {
  filter?: string;
}

export default function DocumentList({ filter }: DocumentListProps) {
  const router = useRouter();
  const { data, isLoading, error } = useDocuments(filter);

  if (isLoading) {
    return (
      <div className="docs-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: "160px", borderRadius: "var(--radius-lg)" }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">⚠️</span>
        <p style={{ color: "var(--rose)", fontWeight: "600" }}>Failed to load documents</p>
        <p style={{ fontSize: "0.875rem" }}>Check your connection and try again</p>
      </div>
    );
  }

  const documents: Document[] = data?.documents ?? [];

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">📄</span>
        <p style={{ color: "var(--text-secondary)", fontWeight: "600", fontSize: "1.1rem" }}>
          No documents yet
        </p>
        <p style={{ fontSize: "0.875rem", maxWidth: "300px" }}>
          Create your first document using the "New Document" button in the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="docs-grid">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onOpen={() => router.push(`/documents/${doc.id}`)}
        />
      ))}
    </div>
  );
}
