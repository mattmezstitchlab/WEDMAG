import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { weddingProjectItems, weddingProjects } from "@/db/schema";
import { parseProjectRequest } from "@/lib/project-validation";

export const dynamic = "force-dynamic";

// Same anonymous session as the selections: one identity, one cookie.
const cookieName = "wwm-project";

type StoredProject = {
  id: string;
  name: string;
  items: { subjectId: string; source: string }[];
};

async function loadProject(db: ReturnType<typeof getDb>, sessionId: string): Promise<StoredProject | null> {
  const [project] = await db
    .select()
    .from(weddingProjects)
    .where(eq(weddingProjects.sessionId, sessionId))
    .limit(1);

  if (!project) return null;

  const items = await db
    .select({ subjectId: weddingProjectItems.subjectId, source: weddingProjectItems.source })
    .from(weddingProjectItems)
    .where(eq(weddingProjectItems.projectId, project.id))
    .orderBy(weddingProjectItems.createdAt);

  return { id: project.id, name: project.name, items };
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ project: null, persistence: "local_only" });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(cookieName)?.value;

  if (!sessionId) {
    return NextResponse.json({ project: null, persistence: "server" });
  }

  try {
    const project = await loadProject(getDb(), sessionId);
    return NextResponse.json({ project, persistence: "server" });
  } catch {
    return NextResponse.json({ project: null, persistence: "unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json() as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseProjectRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const action = parsed.request;

  if (!isDatabaseConfigured()) {
    // Honest answer: the browser keeps the project, the server stores nothing.
    return NextResponse.json({ ok: true, persistence: "local_only" });
  }

  const cookieStore = await cookies();
  const existingSession = cookieStore.get(cookieName)?.value;
  const sessionId = existingSession ?? crypto.randomUUID();

  try {
    const db = getDb();

    if (action.action === "create") {
      // Idempotent: the unique session index keeps one project per session.
      await db
        .insert(weddingProjects)
        .values({ sessionId, name: action.name })
        .onConflictDoNothing({ target: weddingProjects.sessionId });
    } else {
      const [project] = await db
        .select()
        .from(weddingProjects)
        .where(eq(weddingProjects.sessionId, sessionId))
        .limit(1);

      if (!project) {
        return NextResponse.json({ error: "No project for this session" }, { status: 400 });
      }

      if (action.action === "attach") {
        // The composite primary key makes duplication impossible; the
        // subjectId was validated against the catalogue before this point.
        await db
          .insert(weddingProjectItems)
          .values({ projectId: project.id, subjectId: action.subjectId, source: "wedmag" })
          .onConflictDoNothing();
      } else {
        await db
          .delete(weddingProjectItems)
          .where(
            and(
              eq(weddingProjectItems.projectId, project.id),
              eq(weddingProjectItems.subjectId, action.subjectId),
            ),
          );
      }

      await db
        .update(weddingProjects)
        .set({ updatedAt: sql`now()` })
        .where(eq(weddingProjects.id, project.id));
    }

    const response = NextResponse.json({ ok: true, persistence: "server" });
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
