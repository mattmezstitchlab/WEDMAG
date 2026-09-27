import assert from "node:assert/strict";
import test from "node:test";
import { getSubjectProfessional, subjects } from "./wedding-data";

/**
 * Phase A — CONTACT: the catalogue's professionals are EDITORIAL REFERENCES.
 * These tests pin the properties the contact layer depends on: a stable id
 * per professional, unique within its subject, and a resolver that only
 * accepts a (subjectId, professionalId) pair belonging to the same subject.
 */

test("every catalogue professional carries a stable, per-subject-unique id", () => {
  let total = 0;
  for (const subject of subjects) {
    assert.ok(subject.professionals.length >= 1, `${subject.id} has no professional`);
    const ids = subject.professionals.map((professional) => professional.id);
    for (const id of ids) {
      assert.ok(typeof id === "string" && id.length > 0, `${subject.id} has an empty professional id`);
      assert.ok(/^[a-z0-9-]+$/.test(id), `${subject.id}:${id} is not a slug`);
    }
    assert.equal(new Set(ids).size, ids.length, `${subject.id} has duplicate professional ids`);
    total += ids.length;
  }
  assert.equal(total, 72);
});

test("nine professional names are deliberately shared by two subjects — a reference is a pair, never a name", () => {
  const names = subjects.flatMap((subject) => subject.professionals.map((professional) => professional.name));
  const shared = new Map<string, number>();
  for (const name of names) shared.set(name, (shared.get(name) ?? 0) + 1);
  const duplicated = [...shared.entries()].filter(([, count]) => count > 1);
  // Editorial cross-references (Ariane Verne on ceremonie-laique AND
  // officiant, etc.): referencing by name would be ambiguous, hence the
  // (subjectId, professionalId) pair.
  assert.equal(duplicated.length, 9);
  for (const [name, count] of duplicated) assert.equal(count, 2, `${name} is shared by ${count} subjects`);
});

test("getSubjectProfessional resolves a pair only within the dossier's own subject", () => {
  const photographer = subjects.find((subject) => subject.id === "photographe");
  assert.ok(photographer);
  const reference = `photographe:${photographer.professionals[0].id}`;

  assert.deepEqual(getSubjectProfessional("photographe", reference), photographer.professionals[0]);

  // A reference from another subject's universe is unknown for this subject.
  assert.equal(getSubjectProfessional("dj", reference), undefined);
  // Unknown professional id.
  assert.equal(getSubjectProfessional("photographe", "photographe:inconnu"), undefined);
  // Malformed references (no pair).
  assert.equal(getSubjectProfessional("photographe", "camille-novae"), undefined);
  assert.equal(getSubjectProfessional("photographe", "photographe:"), undefined);
  assert.equal(getSubjectProfessional("photographe", ":camille-novae"), undefined);
  assert.equal(getSubjectProfessional("photographe", ""), undefined);
  // Unknown subject.
  assert.equal(getSubjectProfessional("inexistant", "inexistant:qui"), undefined);
});
