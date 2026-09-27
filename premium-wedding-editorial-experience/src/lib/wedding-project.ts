import {
  getSubject,
  weddingMomentOrder,
  type Subject,
  type WeddingMoment,
  type WeddingStatus,
} from "@/lib/wedding-data";

export type WeddingSelection = {
  subjectId: string;
  status: WeddingStatus;
};

export type OrganizedWeddingSelection = {
  subject: Subject;
  status: WeddingStatus;
  primaryMoment: WeddingMoment | null;
  moments: WeddingMoment[];
};

export type WeddingSelectionGroup = {
  moment: WeddingMoment | null;
  selections: OrganizedWeddingSelection[];
};

/** Snapshot of GET /api/wedding/selections as seen by the client. */
export type RestoredServerProject = {
  persistence?: string;
  selections: Record<string, WeddingStatus>;
};

/**
 * Deterministic restore rule for the project loaded from localStorage and
 * the server (see README, "Restore rule"):
 *
 * - `local_only`, `unavailable` or a failed fetch → localStorage is the
 *   project; no server state exists to compete with it.
 * - `server` with a non-empty snapshot → the server snapshot is
 *   authoritative. A selection removed from another browser therefore
 *   disappears here instead of being resurrected by stale localStorage.
 * - `server` with an empty snapshot → localStorage is kept: an empty
 *   snapshot cannot distinguish "never synced" from "everything was
 *   removed elsewhere", and the non-destructive choice wins.
 * - Anything ticked while the restore was in flight (`current`) always
 *   wins: loading must never discard live choices.
 *
 * Known, accepted limitation: selections made while offline (their POST
 * failed silently) can be dropped from the view when a non-empty server
 * snapshot is later restored.
 */
export function mergeRestoredProject(
  server: RestoredServerProject,
  local: Record<string, WeddingStatus>,
  current: Record<string, WeddingStatus>,
): Record<string, WeddingStatus> {
  const serverIsAuthoritative =
    server.persistence === "server" && Object.keys(server.selections).length > 0;
  return { ...(serverIsAuthoritative ? server.selections : local), ...current };
}

const momentPosition = new Map<WeddingMoment, number>(
  weddingMomentOrder.map((moment, index) => [moment, index]),
);

/**
 * Organizes a project without mutating its selections or catalogue subjects.
 * Subject identity — not cover number nor selection order — is the deduplication
 * key. Unknown moment labels are retained on the Subject but cannot determine a
 * chronological position until they belong to the canonical vocabulary.
 */
export function sortWeddingSelectionsByMoment(
  selections: readonly WeddingSelection[],
  resolveSubject: (id: string) => Subject | undefined = getSubject,
): WeddingSelectionGroup[] {
  const uniqueSelections = new Map<string, WeddingSelection>();

  for (const selection of selections) {
    uniqueSelections.set(selection.subjectId, { ...selection });
  }

  const organized: OrganizedWeddingSelection[] = [];

  for (const selection of uniqueSelections.values()) {
    const subject = resolveSubject(selection.subjectId);
    if (!subject) continue;

    const moments = weddingMomentOrder.filter((moment) => subject.moments.includes(moment));
    organized.push({
      subject,
      status: selection.status,
      primaryMoment: moments[0] ?? null,
      moments,
    });
  }

  organized.sort((left, right) => {
    const leftPosition = left.primaryMoment === null ? Number.POSITIVE_INFINITY : momentPosition.get(left.primaryMoment)!;
    const rightPosition = right.primaryMoment === null ? Number.POSITIVE_INFINITY : momentPosition.get(right.primaryMoment)!;
    return leftPosition - rightPosition || left.subject.title.localeCompare(right.subject.title, "fr");
  });

  const groups: WeddingSelectionGroup[] = weddingMomentOrder
    .map((moment) => ({
      moment,
      selections: organized.filter((selection) => selection.primaryMoment === moment),
    }))
    .filter((group) => group.selections.length > 0);

  const withoutMoment = organized.filter((selection) => selection.primaryMoment === null);
  if (withoutMoment.length > 0) groups.push({ moment: null, selections: withoutMoment });

  return groups;
}
