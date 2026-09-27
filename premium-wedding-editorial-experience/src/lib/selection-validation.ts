import { subjects, type WeddingStatus } from "./wedding-data";

/**
 * Server-side validation for POST /api/wedding/selections.
 *
 * The catalogue in wedding-data.ts is the single source of truth: a
 * subjectId is only valid when it resolves to one of its subjects, which
 * also bounds its length. Nothing may reach the database for a subject
 * that does not exist in the catalogue.
 */

/** The only statuses the application defines (mirrors WeddingStatus). */
export const selectionStatuses = ["interested", "contacted", "chosen"] as const;

const catalogueIds = new Set(subjects.map((subject) => subject.id));

/**
 * Hard cap before any catalogue lookup. Real catalogue ids are short
 * (≤ 17 characters); anything longer cannot exist and is rejected early.
 */
const maxSubjectIdLength = 64;

export type SelectionWrite =
  | { kind: "upsert"; subjectId: string; status: WeddingStatus }
  | { kind: "remove"; subjectId: string };

export type SelectionParse =
  | { ok: true; write: SelectionWrite }
  | { ok: false; error: string };

export function isSelectionStatus(value: unknown): value is WeddingStatus {
  return typeof value === "string" && (selectionStatuses as readonly string[]).includes(value);
}

/**
 * Parses and validates a selection POST body.
 *
 * Rejections never coerce: an invalid status or unknown subject produces an
 * error instead of being silently mapped to a valid value, so an invalid
 * request can never overwrite an existing valid state.
 */
export function parseSelectionRequest(body: unknown): SelectionParse {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body" };
  }

  const { subjectId, status, action } = body as {
    subjectId?: unknown;
    status?: unknown;
    action?: unknown;
  };

  if (typeof subjectId !== "string" || subjectId.trim().length === 0) {
    return { ok: false, error: "subjectId is required" };
  }

  const trimmedId = subjectId.trim();

  if (trimmedId.length > maxSubjectIdLength) {
    return { ok: false, error: "subjectId is too long" };
  }

  if (!catalogueIds.has(trimmedId)) {
    return { ok: false, error: "Unknown subjectId" };
  }

  // A status, when present, must be an officially defined one — even on a
  // removal, so that garbage can never travel through a valid request.
  if (status !== undefined && status !== null && !isSelectionStatus(status)) {
    return { ok: false, error: "Invalid status" };
  }

  if (action !== undefined && action !== null && action !== "remove") {
    return { ok: false, error: "Invalid action" };
  }

  if (action === "remove") {
    return { ok: true, write: { kind: "remove", subjectId: trimmedId } };
  }

  // An absent status keeps the documented default (the schema itself
  // defaults to 'interested'); a present one was validated above.
  return {
    ok: true,
    write: { kind: "upsert", subjectId: trimmedId, status: status ?? "interested" },
  };
}
