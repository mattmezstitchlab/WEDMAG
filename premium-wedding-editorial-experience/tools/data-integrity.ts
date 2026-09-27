/**
 * Data-integrity checks for the WEDMAG editorial catalogue.
 * Run with: npx tsx tools/data-integrity.ts (from the app dir)
 * Scratch tool used for the 2026-09-27 audit; not part of the app.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  images,
  subjects,
  weddingMomentOrder,
  getSubject,
  type Subject,
} from "../src/lib/wedding-data";

const problems: string[] = [];
const warns: string[] = [];

// 1. Duplicate ids / cover numbers
const ids = new Set<string>();
const covers = new Set<number>();
for (const s of subjects) {
  if (ids.has(s.id)) problems.push(`duplicate subject id: ${s.id}`);
  ids.add(s.id);
  if (covers.has(s.coverNumber)) problems.push(`duplicate coverNumber: ${s.coverNumber}`);
  covers.add(s.coverNumber);
}

// 2. Cover numbers contiguous 1..N?
const nums = subjects.map((s) => s.coverNumber).sort((a, b) => a - b);
nums.forEach((n, i) => {
  if (n !== i + 1) warns.push(`cover numbers not contiguous: expected ${i + 1}, got ${n} at index ${i}`);
});

// 3. Orphan `related` references
for (const s of subjects) {
  for (const r of s.related) {
    if (!getSubject(r)) problems.push(`${s.id}: related "${r}" does not resolve`);
  }
}

// 4. Moments outside canonical vocabulary
for (const s of subjects) {
  for (const m of s.moments) {
    if (!(weddingMomentOrder as readonly string[]).includes(m))
      problems.push(`${s.id}: non-canonical moment "${m}"`);
  }
}

// 5. Images: local files must exist on disk; external hosts flagged
let external = 0;
let local = 0;
const usedLocal = new Set<string>();
for (const s of subjects) {
  const src = s.image;
  if (src.startsWith("/")) {
    local++;
    usedLocal.add(src);
    if (!existsSync(join(process.cwd(), "public", src)))
      problems.push(`${s.id}: local image missing on disk: ${src}`);
  } else {
    external++;
    if (!src.startsWith("https://images.pexels.com/"))
      warns.push(`${s.id}: non-Pexels external image: ${src}`);
  }
}
for (const heroSrc of images) usedLocal.add(heroSrc);

// 6. Unused files in public/covers
const coverFiles = [
  "001-saxophoniste.jpg", "002-chateau.jpg", "003-traiteur.jpg", "004-dj.jpg",
  "006-ceremonie-laique.jpg", "008-wedding-cake.jpg", "009-videaste.jpg",
  "010-scenographie.jpg", "018-eclairage.jpg", "019-officiant.jpg",
  "111-matiere.jpg", "112-soir.jpg", "113-matin.jpg", "114-parenthese.jpg",
  "115-vrai-moment.jpg", "116-trace.jpg", "117-lumiere.jpg", "118-jardin.jpg",
  "119-table.jpg",
];
const unused = coverFiles.filter((f) => !usedLocal.has(`/covers/${f}`));
if (unused.length) warns.push(`unused files in public/covers: ${unused.join(", ")}`);

// 7. professionals referenced in the sheet: page.tsx renders professionals[0] unguarded
for (const s of subjects) {
  if (!s.professionals?.length)
    problems.push(`${s.id}: professionals[] empty — page.tsx renders professionals[0] unguarded`);
}

// 8. Empty editorial fields
for (const s of subjects) {
  for (const field of ["intro", "description", "eyebrow"] as const) {
    if (!s[field].trim()) warns.push(`${s.id}: empty ${field}`);
  }
  for (const field of ["services", "brings", "toPlan", "moments", "related"] as const) {
    if (!s[field].length) warns.push(`${s.id}: empty ${field}[]`);
  }
}

// 9. Symmetry of relations (informational)
let asymmetric = 0;
for (const s of subjects) {
  for (const r of s.related) {
    const other = getSubject(r);
    if (other && !other.related.includes(s.id)) asymmetric++;
  }
}
warns.push(`asymmetric relations (one-way links): ${asymmetric}`);

// 10. Universes distribution
const universeCount = new Map<string, number>();
for (const s of subjects) universeCount.set(s.universe, (universeCount.get(s.universe) ?? 0) + 1);

console.log(`subjects: ${subjects.length}, local images: ${local}, external images: ${external}`);
console.log("universes:", [...universeCount.entries()].map(([u, c]) => `${u}(${c})`).join(" "));
console.log(`\nPROBLEMS (${problems.length}):`);
problems.forEach((p) => console.log("  ✗ " + p));
console.log(`\nWARNINGS (${warns.length}):`);
warns.forEach((w) => console.log("  ⚠ " + w));
