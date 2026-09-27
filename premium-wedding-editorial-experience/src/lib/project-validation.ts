import { validateSubjectId } from "./selection-validation";

/**
 * Validation for POST /api/wedding/project (PACTE marriage layer).
 *
 * Same philosophy as the selections contract: strict validation against the
 * catalogue, no silent coercion, coherent 400 errors. A project name is the
 * single piece of information the create action may carry — everything else
 * is learned progressively from validated user actions.
 */

/** The only name the create action defaults to when none is given. */
export const defaultProjectName = "Mon mariage";

const maxProjectNameLength = 80;

export type ProjectRequest =
  | { action: "create"; name: string }
  | { action: "attach"; subjectId: string }
  | { action: "detach"; subjectId: string };

export type ProjectRequestParse =
  | { ok: true; request: ProjectRequest }
  | { ok: false; error: string };

export function parseProjectRequest(body: unknown): ProjectRequestParse {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body" };
  }

  const { action, name, subjectId } = body as {
    action?: unknown;
    name?: unknown;
    subjectId?: unknown;
  };

  if (action === "create") {
    if (name !== undefined && name !== null && typeof name !== "string") {
      return { ok: false, error: "Invalid name" };
    }

    const trimmed = typeof name === "string" ? name.trim() : "";

    if (trimmed.length > maxProjectNameLength) {
      return { ok: false, error: "name is too long" };
    }

    return { ok: true, request: { action: "create", name: trimmed || defaultProjectName } };
  }

  if (action === "attach" || action === "detach") {
    const check = validateSubjectId(subjectId);

    if (!check.ok) {
      return { ok: false, error: check.error };
    }

    return { ok: true, request: { action, subjectId: check.subjectId } };
  }

  return { ok: false, error: "Invalid action" };
}
