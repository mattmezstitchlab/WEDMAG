import assert from "node:assert/strict";
import test from "node:test";
import { getSubject, subjects, weddingMomentOrder, type Subject, type WeddingStatus } from "./wedding-data";
import {
  mergeRestoredProject,
  sortWeddingSelectionsByMoment,
  type WeddingSelection,
} from "./wedding-project";

const selected = (subjectId: string, status: WeddingSelection["status"] = "interested"): WeddingSelection => ({ subjectId, status });
const flattened = (input: readonly WeddingSelection[]) => sortWeddingSelectionsByMoment(input).flatMap((group) => group.selections);

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

test("uses the exact twelve canonical moments", () => {
  assert.deepEqual(weddingMomentOrder, [
    "Avant le mariage", "Veille du mariage", "Préparatifs", "Cérémonie",
    "Cocktail", "Couple", "Dîner", "Première danse", "Soirée",
    "Lendemain", "Brunch", "Après le mariage",
  ]);
});

test("places a simple Saxophoniste selection under Cérémonie", () => {
  const groups = sortWeddingSelectionsByMoment([selected("saxophoniste")]);
  assert.equal(groups[0].moment, "Cérémonie");
  assert.equal(groups[0].selections[0].subject.title, "Saxophoniste");
});

test("sorts random selections by primary moment, never by input or cover order", () => {
  const result = flattened([
    selected("dj"), selected("traiteur"), selected("saxophoniste"),
    selected("photographe"), selected("chateau"),
  ]);
  assert.deepEqual(result.map((item) => item.subject.id), [
    "chateau", "photographe", "saxophoniste", "dj", "traiteur",
  ]);
  assert.deepEqual(result.map((item) => item.primaryMoment), [
    "Préparatifs", "Préparatifs", "Cérémonie", "Cocktail", "Cocktail",
  ]);
});

test("keeps one multi-moment Subject and all its canonical moments", () => {
  const result = flattened([selected("saxophoniste")]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].moments, ["Cérémonie", "Cocktail", "Dîner", "Première danse", "Soirée"]);
});

test("deduplicates two discoveries resolving to the same Subject", () => {
  const result = flattened([selected("saxophoniste"), selected("saxophoniste")]);
  assert.equal(result.length, 1);
});

test("places a Subject without a canonical moment in À organiser", () => {
  const document = fixture({ id: "document", title: "Document administratif", moments: [] });
  const groups = sortWeddingSelectionsByMoment([selected("document")], (id) => id === document.id ? document : undefined);
  assert.equal(groups[0].moment, null);
  assert.equal(groups[0].selections[0].subject.id, "document");
});

test("preserves status through chronological organization", () => {
  const result = flattened([selected("saxophoniste", "contacted")]);
  assert.equal(result[0].status, "contacted");
});

test("positions Photographe at Préparatifs while preserving Couple", () => {
  const result = flattened([selected("photographe")]);
  assert.equal(result[0].primaryMoment, "Préparatifs");
  assert.ok(result[0].moments.includes("Couple"));
});

test("does not merge Lendemain and Brunch", () => {
  const nextDay = fixture({ id: "next-day", title: "Lendemain", moments: ["Lendemain"] });
  const brunch = fixture({ id: "brunch-only", title: "Brunch", moments: ["Brunch"] });
  const catalogue = new Map([[nextDay.id, nextDay], [brunch.id, brunch]]);
  const groups = sortWeddingSelectionsByMoment(
    [selected("brunch-only"), selected("next-day")],
    (id) => catalogue.get(id),
  );
  assert.deepEqual(groups.map((group) => group.moment), ["Lendemain", "Brunch"]);
});

test("does not mutate selections or catalogue Subjects", () => {
  const input = [selected("dj"), selected("photographe")];
  const snapshot = structuredClone(input);
  const subjectSnapshot = structuredClone(subjects);
  sortWeddingSelectionsByMoment(input, getSubject);
  assert.deepEqual(input, snapshot);
  assert.deepEqual(subjects, subjectSnapshot);
});

// --- mergeRestoredProject: localStorage / server restore rule (audit M3) ---

const project = (entries: Record<string, WeddingStatus>) => entries;

test("keeps localStorage when persistence is local_only", () => {
  const merged = mergeRestoredProject(
    { persistence: "local_only", selections: project({ dj: "chosen" }) },
    project({ traiteur: "interested" }),
    project({}),
  );
  assert.deepEqual(merged, project({ traiteur: "interested" }));
});

test("keeps localStorage when the API was unavailable (503)", () => {
  const merged = mergeRestoredProject(
    { persistence: "unavailable", selections: project({}) },
    project({ traiteur: "interested" }),
    project({}),
  );
  assert.deepEqual(merged, project({ traiteur: "interested" }));
});

test("treats a non-empty server snapshot as authoritative", () => {
  // Regression (audit M3): a selection removed from another browser used to
  // resurrect because stale localStorage always won. The server snapshot
  // now wins when it has content — keys it no longer contains disappear.
  const merged = mergeRestoredProject(
    { persistence: "server", selections: project({ dj: "chosen" }) },
    project({ dj: "chosen", traiteur: "interested" }),
    project({}),
  );
  assert.deepEqual(merged, project({ dj: "chosen" }));
});

test("lets in-flight choices win over the server snapshot", () => {
  const merged = mergeRestoredProject(
    { persistence: "server", selections: project({ dj: "interested" }) },
    project({}),
    project({ dj: "chosen", saxophoniste: "interested" }),
  );
  assert.deepEqual(merged, project({ dj: "chosen", saxophoniste: "interested" }));
});

test("keeps localStorage when the server snapshot is empty", () => {
  // Empty cannot distinguish "never synced" from "all removed elsewhere";
  // the non-destructive choice wins.
  const merged = mergeRestoredProject(
    { persistence: "server", selections: project({}) },
    project({ traiteur: "interested" }),
    project({}),
  );
  assert.deepEqual(merged, project({ traiteur: "interested" }));
});

test("server values win per key when both sides have them", () => {
  const merged = mergeRestoredProject(
    { persistence: "server", selections: project({ dj: "contacted" }) },
    project({ dj: "chosen", traiteur: "interested" }),
    project({}),
  );
  assert.deepEqual(merged, project({ dj: "contacted" }));
});
