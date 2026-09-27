import { getSubjectProfessional, isMomentHour, isWeddingMoment } from "./wedding-data";
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

/** Hard caps for the contact fields (real values are short; anything longer
 * cannot be honest input and is rejected early). */
const maxContactTextLength = 80;
const maxContactNoteLength = 500;
const maxProfessionalRefLength = 128;
const maxContactIdLength = 64;

const maxProjectNameLength = 80;

export type ProjectRequest =
  | { action: "create"; name: string; situation: string }
  | { action: "attach"; subjectId: string }
  | { action: "detach"; subjectId: string }
  | { action: "set-state"; subjectId: string; state: string }
  | { action: "parcours-step"; subjectId: string }
  | {
      action: "contact-add";
      subjectId: string;
      professionalRef: string | null;
      name: string | null;
      role: string | null;
    }
  | { action: "contact-attest"; subjectId: string; contactId: string; note: string | null }
  | { action: "contact-confirm"; subjectId: string; contactId: string; note: string | null }
  | { action: "contact-proposition"; subjectId: string; contactId: string; note: string | null }
  | { action: "contact-engage"; subjectId: string; contactId: string; note: string | null }
  | { action: "contact-remove"; subjectId: string; contactId: string }
  | { action: "moment-hour"; moment: string; hour: string | null };

export type ProjectRequestParse =
  | { ok: true; request: ProjectRequest }
  | { ok: false; error: string };

export function parseProjectRequest(body: unknown): ProjectRequestParse {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body" };
  }

  const { action, name, situation, subjectId, state, professionalRef, role, contactId, note, moment, hour } = body as {
    action?: unknown;
    name?: unknown;
    situation?: unknown;
    subjectId?: unknown;
    state?: unknown;
    professionalRef?: unknown;
    role?: unknown;
    contactId?: unknown;
    note?: unknown;
    moment?: unknown;
    hour?: unknown;
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

  if (
    action === "contact-add" ||
    action === "contact-attest" ||
    action === "contact-confirm" ||
    action === "contact-proposition" ||
    action === "contact-engage" ||
    action === "contact-remove"
  ) {
    const check = validateSubjectId(subjectId);

    if (!check.ok) {
      return { ok: false, error: check.error };
    }

    if (action === "contact-add") {
      // Identity is EITHER a catalogue reference (belonging to the dossier's
      // own subject) OR a person the couple declares — never both, never
      // neither. No email, phone, price or qualification exists here.
      if (professionalRef !== undefined && professionalRef !== null && typeof professionalRef !== "string") {
        return { ok: false, error: "Invalid professionalRef" };
      }
      const reference = typeof professionalRef === "string" ? professionalRef.trim() : "";

      if (name !== undefined && name !== null && typeof name !== "string") {
        return { ok: false, error: "Invalid name" };
      }
      const declaredName = typeof name === "string" ? name.trim() : "";

      if (role !== undefined && role !== null && typeof role !== "string") {
        return { ok: false, error: "Invalid role" };
      }
      const declaredRole = typeof role === "string" ? role.trim() : "";

      if (reference.length > 0 && declaredName.length > 0) {
        return { ok: false, error: "professionalRef and name are mutually exclusive" };
      }

      if (reference.length > 0) {
        if (reference.length > maxProfessionalRefLength) {
          return { ok: false, error: "Invalid professionalRef" };
        }
        if (!getSubjectProfessional(check.subjectId, reference)) {
          return { ok: false, error: reference.includes(":") ? "Unknown professionalRef" : "Invalid professionalRef" };
        }
        return {
          ok: true,
          request: { action: "contact-add", subjectId: check.subjectId, professionalRef: reference, name: null, role: null },
        };
      }

      if (declaredName.length === 0) {
        return { ok: false, error: "name is required" };
      }
      if (declaredName.length > maxContactTextLength) {
        return { ok: false, error: "name is too long" };
      }
      if (declaredRole.length > maxContactTextLength) {
        return { ok: false, error: "role is too long" };
      }
      return {
        ok: true,
        request: {
          action: "contact-add",
          subjectId: check.subjectId,
          professionalRef: null,
          name: declaredName,
          role: declaredRole.length > 0 ? declaredRole : null,
        },
      };
    }

    // contact-attest / contact-confirm / contact-proposition /
    // contact-engage / contact-remove: all address an existing contact.
    // attest, confirm, proposition and engage carry the same optional note.
    if (typeof contactId !== "string" || contactId.trim().length === 0) {
      return { ok: false, error: "contactId is required" };
    }
    const trimmedContactId = contactId.trim();
    if (trimmedContactId.length > maxContactIdLength) {
      return { ok: false, error: "contactId is too long" };
    }

    if (
      action === "contact-attest" ||
      action === "contact-confirm" ||
      action === "contact-proposition" ||
      action === "contact-engage"
    ) {
      if (note !== undefined && note !== null && typeof note !== "string") {
        return { ok: false, error: "Invalid note" };
      }
      const trimmedNote = typeof note === "string" ? note.trim() : "";
      if (trimmedNote.length > maxContactNoteLength) {
        return { ok: false, error: "note is too long" };
      }
      return {
        ok: true,
        request: {
          action,
          subjectId: check.subjectId,
          contactId: trimmedContactId,
          note: trimmedNote.length > 0 ? trimmedNote : null,
        },
      };
    }

    return { ok: true, request: { action: "contact-remove", subjectId: check.subjectId, contactId: trimmedContactId } };
  }

  if (action === "moment-hour") {
    // C: the couple sets THEIR hour for a moment of the day — or clears it
    // (null = back to the proposed hour). A strict HH:MM or nothing.
    if (!isWeddingMoment(moment)) {
      return { ok: false, error: "Unknown moment" };
    }
    if (hour !== undefined && hour !== null && typeof hour !== "string") {
      return { ok: false, error: "Invalid hour" };
    }
    const value = typeof hour === "string" ? hour.trim() : "";
    if (value.length === 0) {
      return { ok: true, request: { action: "moment-hour", moment, hour: null } };
    }
    if (!isMomentHour(value)) {
      return { ok: false, error: "Invalid hour" };
    }
    return { ok: true, request: { action: "moment-hour", moment, hour: value } };
  }

  return { ok: false, error: "Invalid action" };
}
