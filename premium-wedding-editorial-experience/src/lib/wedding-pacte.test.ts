import assert from "node:assert/strict";
import test from "node:test";
import { getSubject, weddingMomentOrder, type Subject } from "./wedding-data";
import {
  buildProjectTimeline,
  dossierStateLabels,
  dossierStates,
  isDossierState,
  mergeRestoredWedding,
  normalizeWeddingState,
  settableDossierStates,
  weddingPhases,
  type WeddingDossier,
  type WeddingProjectState,
} from "./wedding-pacte";

const dossier = (subjectId: string, state: WeddingDossier["state"] = "selection"): WeddingDossier => ({
  subjectId,
  state,
  source: "wedmag",
  id: null,
});
const project = (
  name: string,
  dossiers: WeddingProjectState["dossiers"],
): WeddingProjectState => ({ name, dossiers });

function fixture(overrides: Partial<Subject> & Pick<Subject, "id" | "title" | "moments">): Subject {
  return {
    coverNumber: 999,
    eyebrow: "",
    universe: "Test",
    category: "Test",
    type: "Service",
    style: "Test",
    budget: "Essentiel",
    image: "",
    intro: "",
    description: "",
    services: [],
    brings: [],
    toPlan: [],
    constraints: [],
    resources: [],
    related: [],
    professionals: [],
    ...overrides,
  };
}

test("the three phases partition the twelve canonical moments exactly once", () => {
  const covered = weddingPhases.flatMap((phase) => phase.moments);
  assert.deepEqual([...covered].sort(), [...weddingMomentOrder].sort());
  assert.equal(covered.length, weddingMomentOrder.length);
  assert.equal(weddingPhases.length, 3);
});

test("places attached subjects under their phase and canonical moment", () => {
  const timeline = buildProjectTimeline([dossier("saxophoniste"), dossier("papeterie"), dossier("brunch")]);

  const avant = timeline.find((phase) => phase.key === "avant");
  const jour = timeline.find((phase) => phase.key === "jour");
  const apres = timeline.find((phase) => phase.key === "apres");

  assert.ok(avant && jour && apres);
  // Papeterie's primary moment is "Avant le mariage" → phase AVANT.
  assert.deepEqual(avant.momentGroups.map((g) => g.moment), ["Avant le mariage"]);
  // Saxophoniste's primary moment is "Cérémonie" → phase LE JOUR.
  assert.deepEqual(jour.momentGroups.map((g) => g.moment), ["Cérémonie"]);
  assert.deepEqual(jour.momentGroups[0].subjects.map((s) => s.id), ["saxophoniste"]);
  // The "brunch" cover ("Le lendemain") has primary moment "Lendemain" → phase APRÈS.
  assert.deepEqual(apres.momentGroups.map((g) => g.moment), ["Lendemain"]);
});

test("keeps phases in AVANT / LE JOUR / APRÈS order with labels and numbers", () => {
  const timeline = buildProjectTimeline([dossier("dj")]);
  assert.deepEqual(
    timeline.filter((phase) => phase.key !== null).map((phase) => phase.number),
    ["01", "02", "03"],
  );
  assert.deepEqual(
    timeline.filter((phase) => phase.key !== null).map((phase) => phase.label),
    ["Avant le mariage", "Le jour du mariage", "Après le mariage"],
  );
});

test("omits empty phases' moment groups but keeps the phase skeleton visible", () => {
  const timeline = buildProjectTimeline([dossier("brunch")]);
  const jour = timeline.find((phase) => phase.key === "jour");
  assert.ok(jour);
  assert.deepEqual(jour.momentGroups, []);
  assert.equal(timeline.filter((phase) => phase.key !== null).length, 3);
});

test("drops unknown subjects instead of crashing (catalogue is the source of truth)", () => {
  const timeline = buildProjectTimeline([dossier("does-not-exist"), dossier("dj")]);
  const jour = timeline.find((phase) => phase.key === "jour");
  assert.ok(jour);
  assert.deepEqual(jour.momentGroups[0].subjects.map((s) => s.id), ["dj"]);
});

test("places a subject without a canonical moment in À organiser", () => {
  const document = fixture({ id: "document", title: "Document administratif", moments: [] });
  const timeline = buildProjectTimeline([dossier("document")], (id) => (id === document.id ? document : undefined));
  const fallback = timeline.find((phase) => phase.key === null);
  assert.ok(fallback);
  assert.equal(fallback.label, "À organiser");
  assert.equal(fallback.number, null);
});

test("a subject is never duplicated on the timeline (dedup by subject)", () => {
  const timeline = buildProjectTimeline([dossier("dj"), dossier("dj"), dossier("dj")]);
  const all = timeline.flatMap((phase) => phase.momentGroups.flatMap((g) => g.subjects));
  assert.deepEqual(all.map((s) => s.id), ["dj"]);
});

// --- mergeRestoredWedding: restore rule for the wedding project ---

const entry = (id: string | null, state: "selection" | "inspiration" = "selection") => ({
  id,
  state,
  source: "wedmag",
});

test("keeps the local project when persistence is local_only", () => {
  const merged = mergeRestoredWedding(
    { persistence: "local_only", project: project("Serveur", { dj: entry("uuid-dj") }) },
    project("Local", { traiteur: entry(null) }),
    null,
  );
  assert.deepEqual(merged, project("Local", { traiteur: entry(null) }));
});

test("keeps the local project when the API was unavailable (503)", () => {
  const merged = mergeRestoredWedding(
    { persistence: "unavailable", project: null },
    project("Local", { dj: entry(null, "inspiration") }),
    null,
  );
  assert.deepEqual(merged, project("Local", { dj: entry(null, "inspiration") }));
});

test("a non-null server project is authoritative", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: project("Serveur", { dj: entry("uuid-dj") }) },
    project("Local", { dj: entry(null, "inspiration"), traiteur: entry(null) }),
    null,
  );
  assert.deepEqual(merged, project("Serveur", { dj: entry("uuid-dj") }));
});

test("keeps the local project when the server has none", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: null },
    project("Local", { dj: entry(null) }),
    null,
  );
  assert.deepEqual(merged, project("Local", { dj: entry(null) }));
});

test("in-flight creation and dossiers win over the restore, keeping server ids", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: project("Serveur", { dj: entry("uuid-dj") }) },
    null,
    project("En cours", {
      dj: entry(null, "inspiration"),
      brunch: entry(null),
    }),
  );
  // The in-flight state wins, but the dossier keeps its server identity.
  assert.deepEqual(merged, project("En cours", {
    dj: entry("uuid-dj", "inspiration"),
    brunch: entry(null),
  }));
});


test("returns null when nothing exists anywhere", () => {
  assert.equal(mergeRestoredWedding({ persistence: "local_only", project: null }, null, null), null);
});

// --- Dossier lifecycle: modelled entirely, exposed progressively ---

test("the dossier lifecycle models the ten documented states in order", () => {
  assert.deepEqual([...dossierStates], [
    "inspiration", "selection", "contact", "proposition", "engagement",
    "contrat", "confirme", "preparation", "jour-j", "archive",
  ]);
  for (const state of dossierStates) {
    assert.ok(dossierStateLabels[state], `label missing for ${state}`);
    assert.ok(isDossierState(state));
  }
  assert.equal(isDossierState("Choisi"), false);
  assert.equal(isDossierState(42), false);
});

test("phase 1 only exposes inspiration and selection as settable", () => {
  assert.deepEqual([...settableDossierStates], ["inspiration", "selection"]);
});

// --- normalizeWeddingState: localStorage upgrade ---

test("upgrades the previous `items` shape into dossiers with default state", () => {
  const upgraded = normalizeWeddingState({
    name: "Mon mariage",
    items: { dj: { source: "wedmag" }, traiteur: { source: "wedmag" } },
  });
  assert.deepEqual(upgraded, project("Mon mariage", {
    dj: entry(null),
    traiteur: entry(null),
  }));
});

test("keeps the dossiers shape as-is and repairs invalid entries", () => {
  const normalized = normalizeWeddingState({
    name: "Mon mariage",
    dossiers: { dj: { state: "contrat", source: "wedmag" }, plage: { state: "bogus", source: 42 } },
  });
  assert.deepEqual(normalized, project("Mon mariage", {
    dj: { id: null, state: "contrat", source: "wedmag" },
    plage: entry(null),
  }));
});

test("rejects shapes without a usable name", () => {
  for (const value of [null, {}, { name: "" }, { name: 42 }, { dossiers: {} }, "wedding"]) {
    assert.equal(normalizeWeddingState(value), null, `${JSON.stringify(value)} must normalize to null`);
  }
});

// --- Phase 1.1: the dossier's stable identity (uuid) ---

test("an in-flight entry without id inherits the server uuid", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: project("Serveur", { dj: entry("server-uuid") }) },
    null,
    project("En cours", { dj: entry(null, "inspiration") }),
  );
  assert.deepEqual(merged, project("En cours", { dj: entry("server-uuid", "inspiration") }));
});

test("normalizeWeddingState keeps a valid dossier id and nulls an invalid one", () => {
  const normalized = normalizeWeddingState({
    name: "Mon mariage",
    dossiers: {
      dj: { id: "6abb1bdd-2c77-4784-ae32-baf010007961", state: "selection", source: "wedmag" },
      traiteur: { id: 42, state: "selection", source: "wedmag" },
      plage: { id: "", state: "inspiration", source: "wedmag" },
    },
  });
  assert.deepEqual(normalized, project("Mon mariage", {
    dj: entry("6abb1bdd-2c77-4784-ae32-baf010007961"),
    traiteur: entry(null),
    plage: entry(null, "inspiration"),
  }));
});

test("upgrading the previous items shape yields dossiers without server id", () => {
  const upgraded = normalizeWeddingState({
    name: "Mon mariage",
    items: { dj: { source: "wedmag" } },
  });
  assert.deepEqual(upgraded, project("Mon mariage", { dj: entry(null) }));
});

// --- §17: subject/dossier and wedding/dossier relations ---

test("a dossier references its catalogue subject and inherits its timeline place", () => {
  const saxo: WeddingDossier = { subjectId: "saxophoniste", state: "selection", source: "wedmag", id: "uuid-1" };
  const timeline = buildProjectTimeline([saxo]);
  const jour = timeline.find((phase) => phase.key === "jour");
  assert.ok(jour);
  assert.deepEqual(jour.momentGroups[0].subjects.map((s) => s.id), ["saxophoniste"]);
});

test("a dossier for an unknown subject never appears on the timeline", () => {
  const unknown: WeddingDossier = { subjectId: "inexistant", state: "selection", source: "wedmag", id: "uuid-x" };
  const timeline = buildProjectTimeline([unknown]);
  assert.ok(timeline.every((phase) => phase.momentGroups.length === 0));
});

test("two weddings keep independent dossier maps (no shared state)", () => {
  const a = project("Mariage A", { dj: entry("uuid-a") });
  const b = project("Mariage B", { dj: entry("uuid-b", "inspiration") });
  assert.notEqual(a.dossiers.dj.id, b.dossiers.dj.id);
  assert.notEqual(a.dossiers.dj.state, b.dossiers.dj.state);
});
