import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/middleware";
import { CreateVersionSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/documents/:id/versions — List version timeline
export const GET = withRole(Role.VIEWER)(async (req: NextRequest, { params, session }: any) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const [versions, total] = await Promise.all([
    prisma.version.findMany({
      where: { documentId: params.id },
      select: {
        id: true,
        label: true,
        textContent: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.version.count({ where: { documentId: params.id } }),
  ]);

  return NextResponse.json({ versions, total, limit, offset });
});

// POST /api/documents/:id/versions — Create named snapshot
export const POST = withRole(Role.EDITOR)(async (req: NextRequest, { params, session }: any) => {
  const body = await req.json();
  const parsed = CreateVersionSchema.safeParse({ ...body, documentId: params.id });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Get current document state to snapshot
  const doc = await prisma.document.findFirst({
    where: { id: params.id, isDeleted: false },
    select: { yjsState: true, content: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (!doc.yjsState) {
    return NextResponse.json(
      { error: "Document has no content to snapshot" },
      { status: 400 }
    );
  }

  const version = await prisma.version.create({
    data: {
      documentId: params.id,
      label: parsed.data.label ?? "Snapshot",
      snapshot: doc.yjsState,
      textContent: doc.content?.slice(0, 5_000) ?? null,
      createdById: session.user.id,
    },
    select: {
      id: true,
      label: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, image: true } },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      documentId: params.id,
      userId: session.user.id,
      action: "VERSION_CREATED",
      metadata: { versionId: version.id, label: version.label },
    },
  });

  return NextResponse.json({ version }, { status: 201 });
});
