import { and, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { weddingDossierContacts, weddingDossiers, weddingProjects } from "@/db/schema";
import { parseProjectRequest } from "@/lib/project-validation";
import { buildDossierParcours } from "@/lib/wedding-pacte";
import { getSubject } from "@/lib/wedding-data";

export const dynamic = "force-dynamic";

// Same anonymous session as the selections: one identity, one cookie.
const cookieName = "wwm-project";

type StoredContact = {
  id: string;
  professionalRef: string | null;
  declaredName: string | null;
  declaredRole: string | null;
  status: string;
  note: string | null;
  attestedAt: string | null;
  confirmedAt: string | null;
};

type StoredDossier = {
  id: string;
  subjectId: string;
  state: string;
  source: string;
  parcoursProgress: number;
  contacts: StoredContact[];
};

type StoredProject = {
  id: string;
  name: string;
  situation: string;
  dossiers: StoredDossier[];
};

async function loadProject(db: ReturnType<typeof getDb>, sessionId: string): Promise<StoredProject | null> {
  const [project] = await db
    .select({
      id: weddingProjects.id,
      name: weddingProjects.name,
      situation: weddingProjects.situation,
    })
    .from(weddingProjects)
    .where(eq(weddingProjects.sessionId, sessionId))
    .limit(1);

  if (!project) return null;

  const dossierRows = await db
    .select({
      id: weddingDossiers.id,
      subjectId: weddingDossiers.subjectId,
      state: weddingDossiers.state,
      source: weddingDossiers.source,
      parcoursProgress: weddingDossiers.parcoursProgress,
    })
    .from(weddingDossiers)
    .where(eq(weddingDossiers.projectId, project.id))
    .orderBy(weddingDossiers.createdAt);

  // The dossier's real people, loaded in one pass and grouped per dossier.
  // `attestedAt` is only meaningful once the couple declared the contact.
  const contactRows = dossierRows.length
    ? await db
        .select({
          dossierId: weddingDossierContacts.dossierId,
          id: weddingDossierContacts.id,
          professionalRef: weddingDossierContacts.professionalRef,
          declaredName: weddingDossierContacts.declaredName,
          declaredRole: weddingDossierContacts.declaredRole,
          status: weddingDossierContacts.status,
          note: weddingDossierContacts.note,
          attestedAt: weddingDossierContacts.attestedAt,
          confirmedAt: weddingDossierContacts.confirmedAt,
        })
        .from(weddingDossierContacts)
        .where(inArray(weddingDossierContacts.dossierId, dossierRows.map((dossier) => dossier.id)))
        .orderBy(weddingDossierContacts.createdAt)
    : [];

  const contactsByDossier = new Map<string, StoredContact[]>();
  for (const row of contactRows) {
    const bucket = contactsByDossier.get(row.dossierId) ?? [];
    bucket.push({
      id: row.id,
      professionalRef: row.professionalRef,
      declaredName: row.declaredName,
      declaredRole: row.declaredRole,
      status: row.status,
      note: row.note,
      // Normalize the raw PostgreSQL timestamps to ISO — the client renders
      // them with the browser's locale.
      attestedAt: row.attestedAt ? new Date(row.attestedAt).toISOString() : null,
      confirmedAt: row.confirmedAt ? new Date(row.confirmedAt).toISOString() : null,
    });
    contactsByDossier.set(row.dossierId, bucket);
  }

  const dossiers: StoredDossier[] = dossierRows.map((dossier) => ({
    ...dossier,
    contacts: contactsByDossier.get(dossier.id) ?? [],
  }));

  return { id: project.id, name: project.name, situation: project.situation, dossiers };
}

/**
 * Loads a project's dossier for a subject — the anchor every contact
 * action requires (a contact only exists inside its dossier).
 */
async function loadDossier(
  db: ReturnType<typeof getDb>,
  projectId: string,
  subjectId: string,
): Promise<{ id: string; state: string } | null> {
  const [dossier] = await db
    .select({ id: weddingDossiers.id, state: weddingDossiers.state })
    .from(weddingDossiers)
    .where(and(eq(weddingDossiers.projectId, projectId), eq(weddingDossiers.subjectId, subjectId)))
    .limit(1);
  return dossier ?? null;
}

async function touchProject(db: ReturnType<typeof getDb>, projectId: string) {
  await db
    .update(weddingProjects)
    .set({ updatedAt: sql`now()` })
    .where(eq(weddingProjects.id, projectId));
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
    let contactId: string | undefined;

    if (action.action === "create") {
      // Idempotent: the unique session index keeps one project per session.
      // The situation was validated against the modelled vocabulary before
      // this point — only real situations ever reach the database.
      await db
        .insert(weddingProjects)
        .values({ sessionId, name: action.name, situation: action.situation })
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
        // Adding a cover to the wedding opens its dossier (initial state
        // "selection" — the act of adding IS the selection). The unique
        // (project, subject) index makes duplication impossible; the
        // subjectId was validated against the catalogue before this point.
        await db
          .insert(weddingDossiers)
          .values({ projectId: project.id, subjectId: action.subjectId, state: "selection", source: "wedmag" })
          .onConflictDoNothing();
      } else if (action.action === "parcours-step") {
        // Validates the NEXT parcours step (sequential, human-validated).
        // The bound comes from the same derivation the client uses — one
        // source of truth for the arc — and returning() keeps the answer
        // honest when the dossier does not exist or is already complete.
        const [dossier] = await db
          .select({ id: weddingDossiers.id, parcoursProgress: weddingDossiers.parcoursProgress })
          .from(weddingDossiers)
          .where(
            and(
              eq(weddingDossiers.projectId, project.id),
              eq(weddingDossiers.subjectId, action.subjectId),
            ),
          )
          .limit(1);

        if (!dossier) {
          return NextResponse.json({ error: "No dossier for this subject" }, { status: 400 });
        }

        const subject = getSubject(action.subjectId);
        if (!subject) {
          return NextResponse.json({ error: "Unknown subjectId" }, { status: 400 });
        }

        const steps = buildDossierParcours(subject).steps;
        if (dossier.parcoursProgress >= steps.length) {
          return NextResponse.json({ error: "Parcours already complete" }, { status: 400 });
        }

        await db
          .update(weddingDossiers)
          .set({ parcoursProgress: dossier.parcoursProgress + 1, updatedAt: sql`now()` })
          .where(eq(weddingDossiers.id, dossier.id));
      } else if (action.action === "contact-add") {
        // A person enters the dossier: either a catalogue reference (already
        // validated against the dossier's own subject) or a person the
        // couple declares they met. Nothing else is recorded — no
        // coordinates, no qualification, never a CRM.
        const dossier = await loadDossier(db, project.id, action.subjectId);
        if (!dossier) {
          return NextResponse.json({ error: "No dossier for this subject" }, { status: 400 });
        }

        if (action.professionalRef) {
          const [existing] = await db
            .select({ id: weddingDossierContacts.id })
            .from(weddingDossierContacts)
            .where(
              and(
                eq(weddingDossierContacts.dossierId, dossier.id),
                eq(weddingDossierContacts.professionalRef, action.professionalRef),
              ),
            )
            .limit(1);
          if (existing) {
            return NextResponse.json({ error: "Professional already in this dossier" }, { status: 400 });
          }
        }

        const [inserted] = await db
          .insert(weddingDossierContacts)
          .values({
            dossierId: dossier.id,
            professionalRef: action.professionalRef,
            declaredName: action.name,
            declaredRole: action.role,
            status: "selectionne",
          })
          .returning({ id: weddingDossierContacts.id });
        contactId = inserted.id;
      } else if (action.action === "contact-attest") {
        // The couple DECLARES they made contact. WEDMAG records the
        // declaration (with its timestamp) — it verifies and certifies
        // nothing. The declaration and the dossier's move to the contact
        // state are ONE atomic fact: either both happen or neither does.
        const dossier = await loadDossier(db, project.id, action.subjectId);
        if (!dossier) {
          return NextResponse.json({ error: "No dossier for this subject" }, { status: 400 });
        }

        const [contact] = await db
          .select({ id: weddingDossierContacts.id, status: weddingDossierContacts.status, note: weddingDossierContacts.note })
          .from(weddingDossierContacts)
          .where(
            and(
              eq(weddingDossierContacts.dossierId, dossier.id),
              eq(weddingDossierContacts.id, action.contactId),
            ),
          )
          .limit(1);

        if (!contact) {
          return NextResponse.json({ error: "Unknown contact" }, { status: 400 });
        }
        if (contact.status === "contacte") {
          return NextResponse.json({ error: "Contact already attested" }, { status: 400 });
        }
        if (contact.status === "confirme") {
          return NextResponse.json({ error: "Contact is not attesting anymore" }, { status: 400 });
        }

        await db.transaction(async (tx) => {
          await tx
            .update(weddingDossierContacts)
            .set({
              status: "contacte",
              note: action.note ?? contact.note,
              attestedAt: sql`now()`,
              updatedAt: sql`now()`,
            })
            .where(eq(weddingDossierContacts.id, contact.id));

          // The dossier reaches the contact state ONLY through this declared
          // fact — never through set-state (which keeps refusing it).
          if (dossier.state !== "contact") {
            await tx
              .update(weddingDossiers)
              .set({ state: "contact", updatedAt: sql`now()` })
              .where(eq(weddingDossiers.id, dossier.id));
          }
        });
      } else if (action.action === "contact-confirm") {
        // B1: the couple DECLARES the professional confirmed. WEDMAG has no
        // channel to collect the professional's answer — this is the
        // couple's words, recorded with its own timestamp, never a verified
        // fact and never a contract. The contact's status and the dossier's
        // state stay two distinct facts: the dossier does NOT move.
        const dossier = await loadDossier(db, project.id, action.subjectId);
        if (!dossier) {
          return NextResponse.json({ error: "No dossier for this subject" }, { status: 400 });
        }

        const [contact] = await db
          .select({ id: weddingDossierContacts.id, status: weddingDossierContacts.status, note: weddingDossierContacts.note })
          .from(weddingDossierContacts)
          .where(
            and(
              eq(weddingDossierContacts.dossierId, dossier.id),
              eq(weddingDossierContacts.id, action.contactId),
            ),
          )
          .limit(1);

        if (!contact) {
          return NextResponse.json({ error: "Unknown contact" }, { status: 400 });
        }
        // Strict sequence: selection → contacte → confirme. No intermediate
        // "answered" status exists, and a confirmation can only be declared
        // on an attested contact.
        if (contact.status === "selectionne") {
          return NextResponse.json({ error: "Contact is not attested yet" }, { status: 400 });
        }
        if (contact.status === "confirme") {
          return NextResponse.json({ error: "Contact already confirmed" }, { status: 400 });
        }

        await db
          .update(weddingDossierContacts)
          .set({
            status: "confirme",
            note: action.note ?? contact.note,
            confirmedAt: sql`now()`,
            updatedAt: sql`now()`,
          })
          .where(eq(weddingDossierContacts.id, contact.id));
      } else if (action.action === "contact-remove") {
        // Removing a person never rewrites history: the dossier keeps its
        // state (the couple may go back via Inspiration/Selection — a human
        // decision, never an automatic regression).
        const dossier = await loadDossier(db, project.id, action.subjectId);
        if (!dossier) {
          return NextResponse.json({ error: "No dossier for this subject" }, { status: 400 });
        }

        const removed = await db
          .delete(weddingDossierContacts)
          .where(
            and(
              eq(weddingDossierContacts.dossierId, dossier.id),
              eq(weddingDossierContacts.id, action.contactId),
            ),
          )
          .returning({ id: weddingDossierContacts.id });

        if (removed.length === 0) {
          return NextResponse.json({ error: "Unknown contact" }, { status: 400 });
        }
      } else if (action.action === "set-state") {
        // returning() tells us whether the dossier actually existed — a
        // set-state on a subject with no dossier must not answer ok:true.
        const updated = await db
          .update(weddingDossiers)
          .set({ state: action.state, updatedAt: sql`now()` })
          .where(
            and(
              eq(weddingDossiers.projectId, project.id),
              eq(weddingDossiers.subjectId, action.subjectId),
            ),
          )
          .returning({ id: weddingDossiers.id });

        if (updated.length === 0) {
          return NextResponse.json({ error: "No dossier for this subject" }, { status: 400 });
        }
      } else {
        await db
          .delete(weddingDossiers)
          .where(
            and(
              eq(weddingDossiers.projectId, project.id),
              eq(weddingDossiers.subjectId, action.subjectId),
            ),
          );
      }

      await touchProject(db, project.id);
    }

    const response = NextResponse.json({ ok: true, persistence: "server", ...(contactId ? { contactId } : {}) });
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
