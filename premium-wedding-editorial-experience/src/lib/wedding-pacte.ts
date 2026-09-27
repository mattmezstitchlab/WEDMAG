import { getSubject, weddingMomentOrder, type Subject, type WeddingMoment, type WeddingStatus } from "./wedding-data";
import { sortWeddingSelectionsByMoment } from "./wedding-project";

/**
 * WEDMAG dossiers / PACTE Mariage — client-facing domain of the wedding
 * project layer (internal model documented in PACTE-MARIAGE.md and
 * WEDMAG-DOSSIERS.md; the UI deliberately exposes only a small vocabulary).
 */

/**
 * The full lifecycle of a dossier. Modelled entirely, exposed
 * progressively: only the first states are user-settable in this increment
 * (`settableDossierStates`); the rest is reserved for the future layers
 * (prestataire, contrat, documents, paiements…) and is never simulated.
 */
export const dossierStates = [
  "inspiration",
  "selection",
  "contact",
  "proposition",
  "engagement",
  "contrat",
  "confirme",
  "preparation",
  "jour-j",
  "archive",
] as const;

export type DossierState = (typeof dossierStates)[number];

/** Editorial labels — the only vocabulary shown to the user. */
export const dossierStateLabels: Record<DossierState, string> = {
  inspiration: "Inspiration",
  selection: "Sélection",
  contact: "Contact",
  proposition: "Proposition",
  engagement: "Engagement",
  contrat: "Contrat",
  confirme: "Confirmé",
  preparation: "Préparation",
  "jour-j": "Jour J",
  archive: "Archive",
};

/** States the user may actually set in this increment (Phase 1). */
export const settableDossierStates = ["inspiration", "selection"] as const;

export function isDossierState(value: unknown): value is DossierState {
  return typeof value === "string" && (dossierStates as readonly string[]).includes(value);
}

/**
 * A dossier of the wedding project. Born from a cover added to the wedding,
 * it keeps the catalogue subject as its identity (reference, never a copy).
 */
export type WeddingDossier = {
  subjectId: string;
  state: DossierState;
  source: string;
};

/** Client shape of the wedding project (server rows flattened to a map). */
export type WeddingProjectState = {
  name: string;
  dossiers: Record<string, { state: DossierState; source: string }>;
};

/**
 * Normalizes a possibly older localStorage mirror: the previous shape kept
 * `items` (the PACTE MVP inspirations) — each becomes a dossier in its
 * default state. Nothing is invented: the attachment existed, it simply
 * gains its dossier state.
 */
export function normalizeWeddingState(value: unknown): WeddingProjectState | null {
  if (typeof value !== "object" || value === null) return null;

  const { name, items, dossiers } = value as {
    name?: unknown;
    items?: unknown;
    dossiers?: unknown;
  };

  if (typeof name !== "string" || !name.trim()) return null;

  const normalized: WeddingProjectState = { name, dossiers: {} };

  const fill = (entries: Record<string, { state?: unknown; source?: unknown }> | null | undefined) => {
    if (typeof entries !== "object" || entries === null) return;
    for (const [subjectId, entry] of Object.entries(entries)) {
      normalized.dossiers[subjectId] = {
        state: isDossierState(entry?.state) ? entry.state : "selection",
        source: typeof entry?.source === "string" ? entry.source : "wedmag",
      };
    }
  };

  fill(items as Record<string, { source?: unknown }>);
  fill(dossiers as Record<string, { state?: unknown; source?: unknown }>);

  return normalized;
}

/** Snapshot of GET /api/wedding/project as seen by the client. */
export type RestoredWeddingProject = {
  persistence?: string;
  project: WeddingProjectState | null;
};

/**
 * The three phases of the wedding timeline. They partition the twelve
 * canonical moments (the wedding's functional progression, not a calendar)
 * and are the backbone of the project space: AVANT / LE JOUR / APRÈS.
 */
export const weddingPhases = [
  {
    key: "avant",
    number: "01",
    label: "Avant le mariage",
    moments: ["Avant le mariage", "Veille du mariage", "Préparatifs"],
  },
  {
    key: "jour",
    number: "02",
    label: "Le jour du mariage",
    moments: ["Cérémonie", "Cocktail", "Couple", "Dîner", "Première danse", "Soirée"],
  },
  {
    key: "apres",
    number: "03",
    label: "Après le mariage",
    moments: ["Lendemain", "Brunch", "Après le mariage"],
  },
] as const;

export type WeddingPhaseKey = (typeof weddingPhases)[number]["key"];

export type TimelineMomentGroup = {
  moment: WeddingMoment | null;
  subjects: Subject[];
};

export type TimelinePhase = {
  key: WeddingPhaseKey | null;
  number: string | null;
  label: string;
  momentGroups: TimelineMomentGroup[];
};

const phaseByMoment = new Map<WeddingMoment, WeddingPhaseKey>(
  weddingPhases.flatMap((phase) =>
    phase.moments.map((moment) => [moment, phase.key] as const),
  ),
);

/**
 * Builds the project timeline from the wedding's dossiers, reusing the
 * single chronological engine (`sortWeddingSelectionsByMoment`): subjects
 * keep their canonical primary moment, grouped under their phase. Dossiers
 * that do not resolve to a catalogue subject (or have no canonical moment)
 * fall back to a trailing "À organiser" phase instead of disappearing
 * silently.
 */
export function buildProjectTimeline(
  dossiers: readonly Pick<WeddingDossier, "subjectId">[],
  resolveSubject: (id: string) => Subject | undefined = getSubject,
): TimelinePhase[] {
  const selections = dossiers.map((dossier) => ({
    subjectId: dossier.subjectId,
    status: "interested" as WeddingStatus,
  }));

  const groups = sortWeddingSelectionsByMoment(selections, resolveSubject);

  const byPhase = new Map<WeddingPhaseKey | null, TimelineMomentGroup[]>();

  for (const group of groups) {
    const phase = group.moment === null ? null : (phaseByMoment.get(group.moment) ?? null);
    const bucket = byPhase.get(phase) ?? [];
    bucket.push({ moment: group.moment, subjects: group.selections.map((s) => s.subject) });
    byPhase.set(phase, bucket);
  }

  const phases: TimelinePhase[] = weddingPhases.map((phase) => ({
    key: phase.key,
    number: phase.number,
    label: phase.label,
    momentGroups: byPhase.get(phase.key) ?? [],
  }));

  const unsorted = byPhase.get(null) ?? [];
  if (unsorted.length > 0) {
    phases.push({ key: null, number: null, label: "À organiser", momentGroups: unsorted });
  }

  return phases;
}

/**
 * Deterministic restore rule for the wedding project, mirroring the
 * selections rule (mergeRestoredProject):
 *
 * - `local_only` or unavailable API → localStorage is the project;
 * - a non-null `server` project is authoritative (a project created on
 *   another visit of this session wins over a stale local mirror);
 * - anything created or attached while the restore was in flight wins.
 *
 * Known, accepted limitation (same as selections): an item detached while
 * loading can be resurrected by the merge, and a project created while the
 * database was unavailable is not replayed to the server.
 */
export function mergeRestoredWedding(
  server: RestoredWeddingProject,
  local: WeddingProjectState | null,
  current: WeddingProjectState | null,
): WeddingProjectState | null {
  const base = server.persistence === "server" && server.project ? server.project : local;

  if (!current) return base;
  if (!base) return current;

  return {
    name: current.name || base.name,
    dossiers: { ...base.dossiers, ...current.dossiers },
  };
}
