import { index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * A project is deliberately anonymous in the prototype. The browser owns a
 * stable session token, so selections made from a cover, search, or relation
 * always resolve to the same universal subject in the same wedding project.
 */
export const weddingSelections = pgTable(
  "wedding_selections",
  {
    sessionId: text("session_id").notNull(),
    subjectId: text("subject_id").notNull(),
    status: text("status").notNull().default("interested"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.subjectId] })],
);

/**
 * PACTE Mariage — the wedding project itself (the central OBJECT everything
 * will attach to). Owned by the same anonymous session as the selections
 * (same `wwm-project` cookie); one project per session in this increment.
 * The `name` is the seed of the future IDENTITY layer (see PACTE-MARIAGE.md).
 */
export const weddingProjects = pgTable(
  "wedding_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: text("session_id").notNull(),
    name: text("name").notNull(),
    /**
     * Eden du Mont Noir / programmes de vie: the LIFE SITUATION this project
     * accompanies (see WEDMAG-DOSSIERS.md). The full vocabulary is modelled
     * (projectSituations) but only "mariage" is real today — every existing
     * project IS a wedding, which is a fact recorded, never an invention.
     * Future situations (naissance, deuil…) stay un-settable until real
     * content exists for them.
     */
    situation: text("situation").notNull().default("mariage"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("wedding_projects_session_unique").on(table.sessionId)],
);

/**
 * PACTE Mariage / WEDMAG dossiers — a DOSSIER is the living unit of a
 * wedding project (see WEDMAG-DOSSIERS.md). Born from a cover added to the
 * wedding, it keeps the catalogue subject as its visual and editorial
 * identity (single source of truth — `subjectId` is a REFERENCE, never a
 * copy) and carries its own lifecycle state. Its stable `id` is the anchor
 * every future layer (prestataire, contrat, documents, paiements,
 * échéances) will attach to. Evolved in place from the MVP
 * `wedding_project_items` table (non-destructive migration 0002).
 */
export const weddingDossiers = pgTable(
  "wedding_dossiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => weddingProjects.id, { onDelete: "cascade" }),
    subjectId: text("subject_id").notNull(),
    state: text("state").notNull().default("selection"),
    source: text("source").notNull().default("wedmag"),
    /**
     * Parcours (accompaniment layer): number of steps the couple has
     * validated. The steps themselves are DERIVED from the catalogue
     * subject at runtime (buildDossierParcours — single source of truth,
     * nothing duplicated); this column only records the human-validated
     * progress on the dossier it belongs to.
     */
    parcoursProgress: integer("parcours_progress").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("wedding_dossiers_project_subject_unique").on(table.projectId, table.subjectId)],
);

/**
 * PHASE A — CONTACT: the real people of a dossier (see WEDMAG-DOSSIERS.md).
 * A contact is NOT a CRM record: it exists only inside its dossier, attached
 * to the dossier's stable id (the business anchor). Identity is either a
 * catalogue REFERENCE (professional_ref = "subjectId:professionalId",
 * resolved live at render — never a copy) or a person the couple declares
 * they met (declared_name, never presented as belonging to the magazine).
 * No email, phone, price, availability or qualification is stored or may
 * ever be deduced. `status` records what the couple declared: "selectionne"
 * (interested in this person), "contacte" (the couple declared they made
 * contact — the system verifies nothing), "confirme" (reserved, Phase B).
 */
export const weddingDossierContacts = pgTable(
  "wedding_dossier_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dossierId: uuid("dossier_id")
      .notNull()
      .references(() => weddingDossiers.id, { onDelete: "cascade" }),
    professionalRef: text("professional_ref"),
    declaredName: text("declared_name"),
    declaredRole: text("declared_role"),
    status: text("status").notNull().default("selectionne"),
    note: text("note"),
    /**
     * B1: REAL persistent timestamps — never a substitute via updated_at.
     * attested_at = when the couple declared they made contact;
     * confirmed_at = when the couple declared the professional confirmed
     * (a declaration BY the couple — WEDMAG has no channel to collect the
     * professional's answer and verifies nothing).
     */
    attestedAt: timestamp("attested_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    /**
     * B2: proposition_at = when the couple declared they received the
     * professional's proposition (the fact only — content/price never
     * stored); engaged_at = when the couple declared they chose this
     * person. Both are the couple's words, verified by no one.
     */
    propositionAt: timestamp("proposition_at", { withTimezone: true }),
    engagedAt: timestamp("engaged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("wedding_dossier_contacts_dossier_idx").on(table.dossierId),
    // One catalogue professional followed at most once per dossier. Declared
    // persons tolerate homonyms on purpose (distinct real people, no global
    // person registry — that would be a CRM).
    uniqueIndex("wedding_dossier_contacts_dossier_professional_unique")
      .on(table.dossierId, table.professionalRef)
      .where(sql`${table.professionalRef} IS NOT NULL`),
  ],
);

