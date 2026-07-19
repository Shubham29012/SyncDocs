// =============================================================
// SHARED TYPE DEFINITIONS — SyncDocs
// =============================================================

export type Role = "OWNER" | "EDITOR" | "VIEWER";

export type SyncStatus = "PENDING" | "SYNCED" | "FAILED";

export type NotificationType =
  | "DOCUMENT_SHARED"
  | "ROLE_UPDATED"
  | "SYNC_FAILED"
  | "SYNC_COMPLETED";

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt?: string;
}

export interface Document {
  id: string;
  title: string;
  ownerId: string;
  isArchived: boolean;
  content?: string | null; // Plain text for search and diff
  createdAt: string;
  updatedAt: string;
  owner?: Pick<User, "id" | "name" | "image">;
  collaborators?: CollaboratorEntry[];
  myRole?: Role;
  yjsState?: string | null; // base64 encoded
  shareToken?: string | null;
  _count?: {
    versions: number;
    collaborators: number;
  };
}

export interface CollaboratorEntry {
  id: string;
  role: Role;
  invitedAt: string;
  user: Pick<User, "id" | "name" | "email" | "image">;
}

export interface Version {
  id: string;
  label: string | null;
  textContent: string | null;
  snapshot?: string; // base64
  createdAt: string;
  createdBy: Pick<User, "id" | "name" | "image">;
}

export interface ActivityLog {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  user: Pick<User, "id" | "name" | "image">;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  documentId: string | null;
  document?: { id: string; title: string } | null;
}

export interface SearchResult {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string | null;
  updatedAt: string;
  rank: number;
  snippet: string | null;
}

// Sync engine types
export interface SyncQueueEntry {
  id?: number;
  docId: string;
  update: string; // base64 Yjs update
  status: SyncStatus;
  retryCount: number;
  createdAt: number; // Unix ms
}

export interface LocalDocument {
  id: string;
  title: string;
  yjsState: Uint8Array | null;
  updatedAt: number; // Unix ms
  syncedAt: number | null;
}

export interface AIRequest {
  documentId: string;
  text: string;
  targetLanguage?: string;
}

export interface AIResponse {
  result: string;
  action: string;
  inputLength: number;
  outputLength: number;
}

// Editor types
export interface CollaboratorCursor {
  userId: string;
  name: string;
  color: string;
  image?: string;
}

export type NetworkStatus = "online" | "offline";

export type SyncEngineStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
