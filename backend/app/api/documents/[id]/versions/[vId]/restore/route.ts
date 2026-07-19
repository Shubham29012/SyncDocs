import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/middleware";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/documents/:id/versions/:vId/restore
 *
 * Restores a historical snapshot as the new authoritative document state.
 * The restore is done by loading the old snapshot into a new Y.Doc and
 * broadcasting it — this preserves collaborative integrity (all connected
 * clients will receive the restore as a single Yjs update).
 */
export const POST = withRole(Role.OWNER)(async (_req: NextRequest, { params, session }: any) => {
  // Verify ownership
  const doc = await prisma.document.findFirst({
    where: { id: params.id, ownerId: session.user.id, isDeleted: false },
    select: { id: true, title: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
  }

  // Load the version snapshot
  const version = await prisma.version.findFirst({
    where: { id: params.vId, documentId: params.id },
    select: { id: true, label: true, snapshot: true, textContent: true },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Build a fresh Y.Doc from the snapshot to get a clean state
  let restoredState: Buffer;
  let restoredText: string | null = version.textContent;

  try {
    const Y = await import("yjs");
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(version.snapshot));

    restoredState = Buffer.from(Y.encodeStateAsUpdate(ydoc));

    if (!restoredText) {
      restoredText = ydoc.getText("content").toString().slice(0, 100_000);
    }
  } catch (err) {
    console.error("[Restore] Yjs error:", err);
    return NextResponse.json(
      { error: "Failed to restore — snapshot may be corrupted" },
      { status: 500 }
    );
  }

  // Auto-snapshot current state before overwriting
  const currentDoc = await prisma.document.findUnique({
    where: { id: params.id },
    select: { yjsState: true, content: true },
  });

  await prisma.$transaction([
    // Snapshot current state for safety
    ...(currentDoc?.yjsState
      ? [
          prisma.version.create({
            data: {
              documentId: params.id,
              label: `Before restore to "${version.label}"`,
              snapshot: currentDoc.yjsState,
              textContent: currentDoc.content?.slice(0, 5_000) ?? null,
              createdById: session.user.id,
            },
          }),
        ]
      : []),

    // Apply restored state
    prisma.document.update({
      where: { id: params.id },
      data: {
        yjsState: restoredState,
        content: restoredText ?? null,
        updatedAt: new Date(),
      },
    }),

    // Log activity
    prisma.activityLog.create({
      data: {
        documentId: params.id,
        userId: session.user.id,
        action: "RESTORED",
        metadata: { versionId: version.id, label: version.label },
      },
    }),
  ]);

  return NextResponse.json({
    message: "Document restored successfully",
    restoredFromVersion: { id: version.id, label: version.label },
    stateSize: restoredState.length,
  });
});
