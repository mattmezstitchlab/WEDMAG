import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

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
