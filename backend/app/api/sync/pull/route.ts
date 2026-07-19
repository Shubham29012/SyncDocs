import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { SyncPullSchema } from "@/lib/validations";

export const runtime = "nodejs";

/**
 * GET /api/sync/pull?documentId=...&stateVector=...
 *
 * Returns the server's authoritative Yjs state (or a diff if stateVector provided).
 * Client merges this with its local Y.Doc using Y.applyUpdate().
 */
export const GET = withAuth(async (req: NextRequest, { session }: any) => {
  const { searchParams } = new URL(req.url);

  const rawParams = {
    documentId: searchParams.get("documentId") ?? "",
    stateVector: searchParams.get("stateVector") ?? undefined,
  };

  const parsed = SyncPullSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { documentId, stateVector } = parsed.data;
  const userId = session.user.id;

  // RBAC: viewer+
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      isDeleted: false,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    },
    select: { id: true, yjsState: true, updatedAt: true },
  });

  if (!doc) {
    return NextResponse.json(
      { error: "Document not found or access denied" },
      { status: 404 }
    );
  }

  if (!doc.yjsState) {
    // Document has no server state yet — return empty
    return NextResponse.json({
      update: null,
      serverUpdatedAt: doc.updatedAt.toISOString(),
      isEmpty: true,
    });
  }

  let updateToSend: Uint8Array;

  if (stateVector) {
    // Send only the diff (updates the client hasn't seen)
    try {
      const Y = await import("yjs");
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, new Uint8Array(doc.yjsState));

      const clientStateVector = new Uint8Array(Buffer.from(stateVector, "base64"));
      updateToSend = Y.encodeStateAsUpdate(ydoc, clientStateVector);
    } catch {
      // Fallback: send full state if state vector is corrupt
      updateToSend = new Uint8Array(doc.yjsState);
    }
  } else {
    // No state vector — send full document state
    updateToSend = new Uint8Array(doc.yjsState);
  }

  return NextResponse.json({
    update: Buffer.from(updateToSend).toString("base64"),
    serverUpdatedAt: doc.updatedAt.toISOString(),
    isEmpty: false,
  });
});
