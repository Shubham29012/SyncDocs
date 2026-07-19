import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { CreateDocumentSchema } from "@/lib/validations";

export const runtime = "nodejs";

// GET /api/documents — List owned + shared documents
export const GET = withAuth(async (req, { session }) => {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all"; // all | owned | shared | archived
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const userId = session.user.id;

  let whereClause: any = {};

  if (filter === "owned") {
    whereClause = { ownerId: userId, isDeleted: false, isArchived: false };
  } else if (filter === "shared") {
    whereClause = {
      isDeleted: false,
      isArchived: false,
      collaborators: { some: { userId } },
    };
  } else if (filter === "archived") {
    whereClause = { ownerId: userId, isDeleted: false, isArchived: true };
  } else if (filter === "starred") {
    whereClause = {
      isDeleted: false,
      isArchived: false,
      isStarred: true,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    };
  } else {
    // All: owned + shared
    whereClause = {
      isDeleted: false,
      OR: [
        { ownerId: userId, isArchived: false },
        { collaborators: { some: { userId } }, isArchived: false },
      ],
    };
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        ownerId: true,
        isArchived: true,
        isStarred: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true, image: true } },
        collaborators: {
          select: {
            role: true,
            user: { select: { id: true, name: true, image: true } },
          },
          take: 5, // preview avatars
        },
        _count: { select: { versions: true, collaborators: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.document.count({ where: whereClause }),
  ]);

  // Attach current user's role
  const docsWithRole = documents.map((doc) => {
    const myCollaboration = doc.collaborators.find((c) => c.user.id === userId);
    return {
      ...doc,
      myRole: doc.ownerId === userId ? "OWNER" : myCollaboration?.role ?? "VIEWER",
    };
  });

  return NextResponse.json({ documents: docsWithRole, total, limit, offset });
});

// POST /api/documents — Create new document
export const POST = withAuth(async (req, { session }) => {
  const body = await req.json();
  const parsed = CreateDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const document = await prisma.document.create({
    data: {
      title: parsed.data.title,
      ownerId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      documentId: document.id,
      userId: session.user.id,
      action: "CREATED",
    },
  });

  return NextResponse.json({ document }, { status: 201 });
});
