import { validateSubjectId } from "./selection-validation";
import {
  isDossierState,
  isProjectSituation,
  projectSituations,
  settableDossierStates,
  settableProjectSituations,
} from "./wedding-pacte";

/**
 * Validation for POST /api/wedding/project (WEDMAG dossiers / PACTE layer).
 *
 * Same philosophy as the selections contract: strict validation against the
 * catalogue, no silent coercion, coherent 400 errors. A project name is the
 * single piece of information the create action may carry — everything else
 * is learned progressively from validated user actions.
 */

/** The only name the create action defaults to when none is given. */
export const defaultProjectName = "Mon mariage";

/** The only situation the create action defaults to — the one that is real. */
export const defaultProjectSituation = "mariage";

const maxProjectNameLength = 80;

export type ProjectRequest =
  | { action: "create"; name: string; situation: string }
  | { action: "attach"; subjectId: string }
  | { action: "detach"; subjectId: string }
  | { action: "set-state"; subjectId: string; state: string }
  | { action: "parcours-step"; subjectId: string };

export type ProjectRequestParse =
  | { ok: true; request: ProjectRequest }
  | { ok: false; error: string };

export function parseProjectRequest(body: unknown): ProjectRequestParse {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body" };
  }

  const { action, name, situation, subjectId, state } = body as {
    action?: unknown;
    name?: unknown;
    situation?: unknown;
    subjectId?: unknown;
    state?: unknown;
  };

  if (action === "create") {
    if (name !== undefined && name !== null && typeof name !== "string") {
      return { ok: false, error: "Invalid name" };
    }

    const trimmed = typeof name === "string" ? name.trim() : "";

    if (trimmed.length > maxProjectNameLength) {
      return { ok: false, error: "name is too long" };
    }

    // The life situation is optional and defaults to the only real one. The
    // whole vocabulary is modelled, but a situation that is not real yet is
    // refused explicitly — never simulated (same rule as reserved states).
    if (situation !== undefined && situation !== null && typeof situation !== "string") {
      return { ok: false, error: "Invalid situation" };
    }

    const situationValue = typeof situation === "string" ? situation.trim() : "";

    if (situationValue.length > 0 && !isProjectSituation(situationValue)) {
      return { ok: false, error: "Invalid situation" };
    }

    if (
      situationValue.length > 0 &&
      !(settableProjectSituations as readonly string[]).includes(situationValue)
    ) {
      return { ok: false, error: "situation is not available yet" };
    }

    return {
      ok: true,
      request: {
        action: "create",
        name: trimmed || defaultProjectName,
        situation: situationValue.length > 0 ? situationValue : defaultProjectSituation,
      },
    };
  }

  if (action === "attach" || action === "detach" || action === "set-state" || action === "parcours-step") {
    const check = validateSubjectId(subjectId);

    if (!check.ok) {
      return { ok: false, error: check.error };
    }

    if (action === "set-state") {
      // The whole lifecycle is modelled, but only the states of the current
      // increment may be written. Reserved states are refused explicitly —
      // never simulated.
      if (!isDossierState(state)) {
        return { ok: false, error: "Invalid state" };
      }

      if (!(settableDossierStates as readonly string[]).includes(state)) {
        return { ok: false, error: "state is not available yet" };
      }

      return { ok: true, request: { action: "set-state", subjectId: check.subjectId, state } };
    }

    return { ok: true, request: { action, subjectId: check.subjectId } };
  }

  return { ok: false, error: "Invalid action" };
}
