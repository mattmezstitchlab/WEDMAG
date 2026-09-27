import assert from "node:assert/strict";
import test from "node:test";
import { getSubject, weddingMomentOrder, type Subject } from "./wedding-data";
import {
  buildProjectTimeline,
  mergeRestoredWedding,
  weddingPhases,
  type WeddingProjectItem,
  type WeddingProjectState,
} from "./wedding-pacte";

const item = (subjectId: string): WeddingProjectItem => ({ subjectId, source: "wedmag" });
const project = (name: string, items: WeddingProjectState["items"]): WeddingProjectState => ({ name, items });

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
  const timeline = buildProjectTimeline([item("saxophoniste"), item("papeterie"), item("brunch")]);

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
  const timeline = buildProjectTimeline([item("dj")]);
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
  const timeline = buildProjectTimeline([item("brunch")]);
  const jour = timeline.find((phase) => phase.key === "jour");
  assert.ok(jour);
  assert.deepEqual(jour.momentGroups, []);
  assert.equal(timeline.filter((phase) => phase.key !== null).length, 3);
});

test("drops unknown subjects instead of crashing (catalogue is the source of truth)", () => {
  const timeline = buildProjectTimeline([item("does-not-exist"), item("dj")]);
  const jour = timeline.find((phase) => phase.key === "jour");
  assert.ok(jour);
  assert.deepEqual(jour.momentGroups[0].subjects.map((s) => s.id), ["dj"]);
});

test("places a subject without a canonical moment in À organiser", () => {
  const document = fixture({ id: "document", title: "Document administratif", moments: [] });
  const timeline = buildProjectTimeline([item("document")], (id) => (id === document.id ? document : undefined));
  const fallback = timeline.find((phase) => phase.key === null);
  assert.ok(fallback);
  assert.equal(fallback.label, "À organiser");
  assert.equal(fallback.number, null);
});

test("a subject is never duplicated on the timeline (dedup by subject)", () => {
  const timeline = buildProjectTimeline([item("dj"), item("dj"), item("dj")]);
  const all = timeline.flatMap((phase) => phase.momentGroups.flatMap((g) => g.subjects));
  assert.deepEqual(all.map((s) => s.id), ["dj"]);
});

// --- mergeRestoredWedding: restore rule for the wedding project ---

test("keeps the local project when persistence is local_only", () => {
  const merged = mergeRestoredWedding(
    { persistence: "local_only", project: project("Serveur", { dj: { source: "wedmag" } }) },
    project("Local", { traiteur: { source: "wedmag" } }),
    null,
  );
  assert.deepEqual(merged, project("Local", { traiteur: { source: "wedmag" } }));
});

test("keeps the local project when the API was unavailable (503)", () => {
  const merged = mergeRestoredWedding(
    { persistence: "unavailable", project: null },
    project("Local", { dj: { source: "wedmag" } }),
    null,
  );
  assert.deepEqual(merged, project("Local", { dj: { source: "wedmag" } }));
});

test("a non-null server project is authoritative", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: project("Serveur", { dj: { source: "wedmag" } }) },
    project("Local", { dj: { source: "wedmag" }, traiteur: { source: "wedmag" } }),
    null,
  );
  assert.deepEqual(merged, project("Serveur", { dj: { source: "wedmag" } }));
});

test("keeps the local project when the server has none", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: null },
    project("Local", { dj: { source: "wedmag" } }),
    null,
  );
  assert.deepEqual(merged, project("Local", { dj: { source: "wedmag" } }));
});

test("in-flight creation and attachments win over the restore", () => {
  const merged = mergeRestoredWedding(
    { persistence: "server", project: project("Serveur", { dj: { source: "wedmag" } }) },
    null,
    project("En cours", { dj: { source: "wedmag" }, brunch: { source: "wedmag" } }),
  );
  assert.deepEqual(merged, project("En cours", { dj: { source: "wedmag" }, brunch: { source: "wedmag" } }));
});

test("returns null when nothing exists anywhere", () => {
  assert.equal(mergeRestoredWedding({ persistence: "local_only", project: null }, null, null), null);
});
