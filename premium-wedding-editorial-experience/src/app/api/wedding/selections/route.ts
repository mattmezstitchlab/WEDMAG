import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { weddingSelections } from "@/db/schema";

export const dynamic = "force-dynamic";

const cookieName = "wwm-project";
const validStatuses = new Set(["interested", "contacted", "chosen"]);

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ selections: [], persistence: "local_only" });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(cookieName)?.value;

  if (!sessionId) {
    return NextResponse.json({ selections: [], persistence: "server" });
  }

  try {
    const selections = await getDb()
      .select({ subjectId: weddingSelections.subjectId, status: weddingSelections.status })
      .from(weddingSelections)
      .where(eq(weddingSelections.sessionId, sessionId));

    return NextResponse.json({ selections, persistence: "server" });
  } catch {
    return NextResponse.json({ selections: [], persistence: "unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: { subjectId?: string; status?: string; action?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subjectId = body.subjectId?.trim();

  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    // Honest answer: the browser keeps the project, the server stores nothing.
    return NextResponse.json({ ok: true, subjectId, persistence: "local_only" });
  }

  const cookieStore = await cookies();
  const existingSession = cookieStore.get(cookieName)?.value;
  const sessionId = existingSession ?? crypto.randomUUID();

  try {
    const db = getDb();

    if (body.action === "remove") {
      await db
        .delete(weddingSelections)
        .where(and(eq(weddingSelections.sessionId, sessionId), eq(weddingSelections.subjectId, subjectId)));
    } else {
      const status = validStatuses.has(body.status ?? "") ? (body.status as string) : "interested";
      await db
        .insert(weddingSelections)
        .values({ sessionId, subjectId, status })
        .onConflictDoUpdate({
          target: [weddingSelections.sessionId, weddingSelections.subjectId],
          set: { status, updatedAt: sql`now()` },
        });
    }

    const response = NextResponse.json({ ok: true, subjectId, persistence: "server" });
    if (!existingSession) {
      response.cookies.set(cookieName, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    return response;
  } catch {
    return NextResponse.json({ ok: false, persistence: "unavailable" }, { status: 503 });
  }
}
