import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { SearchSchema } from "@/lib/validations";

export const runtime = "nodejs";

/**
 * GET /api/search?q=...&type=title|content|all&limit=20&offset=0
 *
 * Uses PostgreSQL full-text search via Prisma raw queries.
 * Results are scoped strictly to documents the user owns or collaborates on.
 */
export const GET = withAuth(async (req: NextRequest, { session }: any) => {
  const { searchParams } = new URL(req.url);

  const rawParams = {
    q: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "all",
    limit: searchParams.get("limit") ?? "20",
    offset: searchParams.get("offset") ?? "0",
  };

  const parsed = SearchSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { q, type, limit, offset } = parsed.data;
  const userId = session.user.id;

  // Sanitize query for tsquery (replace spaces with & for AND search)
  const tsQuery = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "") + ":*")
    .join(" & ");

  if (!tsQuery) {
    return NextResponse.json({ results: [], total: 0 });
  }

  // Build search condition based on type
  let searchCondition = "";
  if (type === "title") {
    searchCondition = `to_tsvector('english', d.title) @@ to_tsquery('english', $3)`;
  } else if (type === "content") {
    searchCondition = `to_tsvector('english', COALESCE(d.content, '')) @@ to_tsquery('english', $3)`;
  } else {
    searchCondition = `(
      to_tsvector('english', d.title) @@ to_tsquery('english', $3)
      OR to_tsvector('english', COALESCE(d.content, '')) @@ to_tsquery('english', $3)
    )`;
  }

  // Raw SQL for full-text search — userId scoping prevents data leakage
  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      owner_id: string;
      owner_name: string | null;
      updated_at: Date;
      rank: number;
      snippet: string | null;
    }>
  >(
    `
    SELECT
      d.id,
      d.title,
      d."ownerId" AS owner_id,
      u.name AS owner_name,
      d."updatedAt" AS updated_at,
      ts_rank(
        to_tsvector('english', d.title || ' ' || COALESCE(d.content, '')),
        to_tsquery('english', $3)
      ) AS rank,
      ts_headline(
        'english',
        COALESCE(d.content, d.title),
        to_tsquery('english', $3),
        'MaxWords=20, MinWords=10, StartSel=<mark>, StopSel=</mark>'
      ) AS snippet
    FROM "Document" d
    JOIN "User" u ON d."ownerId" = u.id
    WHERE
      d."isDeleted" = false
      AND (
        d."ownerId" = $1
        OR EXISTS (
          SELECT 1 FROM "Collaborator" c
          WHERE c."documentId" = d.id AND c."userId" = $1
        )
      )
      AND ${searchCondition}
    ORDER BY rank DESC, d."updatedAt" DESC
    LIMIT $4 OFFSET $5
    `,
    userId,
    userId,
    tsQuery,
    limit,
    offset
  );

  // Count query
  const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `
    SELECT COUNT(*) FROM "Document" d
    WHERE
      d."isDeleted" = false
      AND (
        d."ownerId" = $1
        OR EXISTS (
          SELECT 1 FROM "Collaborator" c
          WHERE c."documentId" = d.id AND c."userId" = $1
        )
      )
      AND ${searchCondition}
    `,
    userId,
    userId,
    tsQuery
  );

  const total = Number(countResult[0]?.count ?? 0);

  return NextResponse.json({
    results: results.map((r) => ({
      id: r.id,
      title: r.title,
      ownerId: r.owner_id,
      ownerName: r.owner_name,
      updatedAt: r.updated_at,
      rank: r.rank,
      snippet: r.snippet,
    })),
    total,
    limit,
    offset,
  });
});
