import { integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("wedding_projects_session_unique").on(table.sessionId)],
);

/**
 * PACTE Mariage — a structured element of a project. MVP: a preference
 * sourced from the Wedmag catalogue. `subjectId` is a REFERENCE into the
 * catalogue (single source of truth — never a copy of its data), and
 * `source` records the provenance ("wedmag"). The composite primary key
 * makes duplication impossible. Future layers (identities, relations,
 * engagements, documents…) are separate additive tables, not kinds here.
 */
export const weddingProjectItems = pgTable(
  "wedding_project_items",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => weddingProjects.id, { onDelete: "cascade" }),
    subjectId: text("subject_id").notNull(),
    source: text("source").notNull().default("wedmag"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.subjectId] })],
);

