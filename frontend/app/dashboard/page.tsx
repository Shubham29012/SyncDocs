import type { Metadata } from "next";
import DocumentList from "@/components/documents/DocumentList";

export const metadata: Metadata = {
  title: "Dashboard — SyncDocs",
  description: "Manage your documents",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = rawFilter ?? "all";

  const titles: Record<string, string> = {
    all: "All Documents",
    owned: "My Documents",
    shared: "Shared with Me",
    archived: "Archived",
  };

  const subtitles: Record<string, string> = {
    all: "Everything you own and collaborate on",
    owned: "Documents where you are the owner",
    shared: "Documents others have shared with you",
    archived: "Archived documents",
  };

  return (
    <div>
      <h1 className="page-title">{titles[filter] ?? "Documents"}</h1>
      <p className="page-subtitle">{subtitles[filter] ?? ""}</p>
      <DocumentList filter={filter} />
    </div>
  );
}
