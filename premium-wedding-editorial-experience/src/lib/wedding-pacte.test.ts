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

test("keeps the local project when persistence is local_only", () => {
  const merged = mergeRestoredWedding(
    { persistence: "local_only", project: project("Serveur", { dj: { state: "selection", source: "wedmag" } }) },
    project("Local", { traiteur: { state: "selection", source: "wedmag" } }),
    null,
  );
  assert.deepEqual(merged, project("Local", { traiteur: { state: "selection", source: "wedmag" } }));
});

test("keeps the local project when the API was unavailable (503)", () => {
  const merged = mergeRestoredWedding(
    { persistence: "unavailable", project: null },
    project("Local", { dj: { state: "inspiration", source: "wedmag" } }),
    null,
  );
  assert.deepEqual(merged, project("Local", { dj: { state: "inspiration", source: "wedmag" } }));
});

test("a non-null server project is authoritative", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: project("Serveur", { dj: { state: "selection", source: "wedmag" } }) },
    project("Local", { dj: { state: "inspiration", source: "wedmag" }, traiteur: { state: "selection", source: "wedmag" } }),
    null,
  );
  assert.deepEqual(merged, project("Serveur", { dj: { state: "selection", source: "wedmag" } }));
});

test("keeps the local project when the server has none", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: null },
    project("Local", { dj: { state: "selection", source: "wedmag" } }),
    null,
  );
  assert.deepEqual(merged, project("Local", { dj: { state: "selection", source: "wedmag" } }));
});

test("in-flight creation and dossiers win over the restore", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: project("Serveur", { dj: { state: "selection", source: "wedmag" } }) },
    null,
    project("En cours", {
      dj: { state: "inspiration", source: "wedmag" },
      brunch: { state: "selection", source: "wedmag" },
    }),
  );
  assert.deepEqual(merged, project("En cours", {
    dj: { state: "inspiration", source: "wedmag" },
    brunch: { state: "selection", source: "wedmag" },
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
    dj: { state: "selection", source: "wedmag" },
    traiteur: { state: "selection", source: "wedmag" },
  }));
});

test("keeps the dossiers shape as-is and repairs invalid entries", () => {
  const normalized = normalizeWeddingState({
    name: "Mon mariage",
    dossiers: { dj: { state: "contrat", source: "wedmag" }, plage: { state: "bogus", source: 42 } },
  });
  assert.deepEqual(normalized, project("Mon mariage", {
    dj: { state: "contrat", source: "wedmag" },
    plage: { state: "selection", source: "wedmag" },
  }));
});

test("rejects shapes without a usable name", () => {
  for (const value of [null, {}, { name: "" }, { name: 42 }, { dossiers: {} }, "wedding"]) {
    assert.equal(normalizeWeddingState(value), null, `${JSON.stringify(value)} must normalize to null`);
  }
});
