import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { weddingSelections } from "@/db/schema";

export const dynamic = "force-dynamic";

const cookieName = "wwm-project";
const validStatuses = new Set(["interested", "contacted", "chosen"]);

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(cookieName)?.value;

  if (!sessionId) {
    return NextResponse.json({ selections: [] });
  }

  try {
    const selections = await db
      .select({ subjectId: weddingSelections.subjectId, status: weddingSelections.status })
      .from(weddingSelections)
      .where(eq(weddingSelections.sessionId, sessionId));

    return NextResponse.json({ selections });
  } catch {
    return NextResponse.json({ selections: [], persistence: "unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { subjectId?: string; status?: string; action?: string };
  const subjectId = body.subjectId?.trim();

  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const existingSession = cookieStore.get(cookieName)?.value;
  const sessionId = existingSession ?? crypto.randomUUID();

  try {
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

    const response = NextResponse.json({ ok: true, subjectId });
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
