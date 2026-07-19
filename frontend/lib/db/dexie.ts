import Dexie, { type Table } from "dexie";
import type { LocalDocument, SyncQueueEntry } from "@/types";

// ─── Schema ────────────────────────────────────────────────────────────────────
// Version must increment if schema changes

export interface DBDocument {
  id: string; // Primary key (matches server document ID)
  title: string;
  yjsState: Uint8Array | null; // Full Yjs binary state
  updatedAt: number; // Unix ms
  syncedAt: number | null; // When last confirmed by server
  isArchived: boolean;
  ownerId: string;
  myRole: string;
}

export interface DBSyncQueue {
  id?: number; // Auto-increment
  docId: string;
  update: string; // Base64-encoded Yjs update
  status: "PENDING" | "SYNCED" | "FAILED";
  retryCount: number;
  createdAt: number; // Unix ms
  errorMsg?: string;
}

export interface DBSession {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  expiresAt: number;
}

class SyncDocsDB extends Dexie {
  documents!: Table<DBDocument>;
  syncQueue!: Table<DBSyncQueue>;
  sessions!: Table<DBSession>;

  constructor() {
    super("SyncDocsDB");

    this.version(1).stores({
      // Primary key + indexed fields
      documents: "id, updatedAt, syncedAt, ownerId, isArchived",
      syncQueue: "++id, docId, status, createdAt",
      sessions: "id, userId, expiresAt",
    });
  }
}

// Singleton instance
export const db = new SyncDocsDB();

// ─── Helper functions ──────────────────────────────────────────────────────────

export async function upsertDocument(doc: DBDocument): Promise<void> {
  await db.documents.put(doc);
}

export async function getDocument(id: string): Promise<DBDocument | undefined> {
  return db.documents.get(id);
}

export async function getAllDocuments(): Promise<DBDocument[]> {
  return db.documents.orderBy("updatedAt").reverse().toArray();
}

export async function deleteDocument(id: string): Promise<void> {
  await db.documents.delete(id);
  await db.syncQueue.where("docId").equals(id).delete();
}

export async function updateDocumentYjsState(
  id: string,
  yjsState: Uint8Array,
  updatedAt: number
): Promise<void> {
  await db.documents.update(id, { yjsState, updatedAt });
}

export async function markDocumentSynced(id: string): Promise<void> {
  await db.documents.update(id, { syncedAt: Date.now() });
}

// ─── Sync queue helpers ────────────────────────────────────────────────────────

export async function enqueueUpdate(docId: string, update: string): Promise<void> {
  await db.syncQueue.add({
    docId,
    update,
    status: "PENDING",
    retryCount: 0,
    createdAt: Date.now(),
  });
}

export async function getPendingUpdates(docId?: string): Promise<DBSyncQueue[]> {
  const query = docId
    ? db.syncQueue.where("[docId+status]").equals([docId, "PENDING"])
    : db.syncQueue.where("status").equals("PENDING");
  return query.sortBy("createdAt");
}

export async function markUpdateSynced(id: number): Promise<void> {
  await db.syncQueue.update(id, { status: "SYNCED" });
}

export async function markUpdateFailed(id: number, errorMsg: string): Promise<void> {
  await db.syncQueue.update(id, {
    status: "FAILED",
    errorMsg,
    retryCount: ((await db.syncQueue.get(id))?.retryCount ?? 0) + 1,
  });
}

export async function resetFailedUpdates(docId: string): Promise<void> {
  await db.syncQueue
    .where("docId")
    .equals(docId)
    .filter((e) => e.status === "FAILED" && e.retryCount < 5)
    .modify({ status: "PENDING" });
}

export async function clearSyncedUpdates(): Promise<void> {
  await db.syncQueue.where("status").equals("SYNCED").delete();
}
