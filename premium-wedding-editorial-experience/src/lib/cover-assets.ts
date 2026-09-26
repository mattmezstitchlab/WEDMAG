import type { Subject } from "@/lib/wedding-data";

export type CoverAssetOverride = {
  imageUrl?: string;
  videoUrl?: string;
  altText?: string;
  updatedAt?: string;
};

export type CoverAssetMap = Record<string, CoverAssetOverride>;

export const coverAssetsStorageKey = "world-wedding-magazine-cover-assets";

/**
 * Generated editorial photography already shipped with the first visual pass.
 * The UI falls back to the legacy image until a cover has its own approved
 * visual; the admin studio makes that state explicit instead of hiding it.
 */
export const generatedCoverImages: Record<string, string> = {
  saxophoniste: "/covers/001-saxophoniste.jpg",
  chateau: "/covers/002-chateau.jpg",
  traiteur: "/covers/003-traiteur.jpg",
  dj: "/covers/004-dj.jpg",
  photographe: "/covers/005-photographe.jpg",
  "ceremonie-laique": "/covers/006-ceremonie-laique.jpg",
  fleuriste: "/covers/007-fleuriste.jpg",
  "wedding-cake": "/covers/008-wedding-cake.jpg",
  videaste: "/covers/009-videaste.jpg",
  decorateur: "/covers/010-decorateur.jpg",
  robe: "/covers/011-robe.jpg",
  costume: "/covers/012-costume.jpg",
  coiffure: "/covers/013-coiffure.jpg",
  maquillage: "/covers/014-maquillage.jpg",
  papeterie: "/covers/015-papeterie.jpg",
  bar: "/covers/016-bar.jpg",
  mobilier: "/covers/017-mobilier.jpg",
  eclairage: "/covers/018-eclairage.jpg",
  officiant: "/covers/019-officiant.jpg",
  hebergement: "/covers/020-hebergement.jpg",
  transport: "/covers/021-transport.jpg",
  "wedding-planner": "/covers/022-wedding-planner.jpg",
  photobooth: "/covers/023-photobooth.jpg",
  "groupe-live": "/covers/024-groupe-live.jpg",
  brunch: "/covers/025-brunch.jpg",
  bijoux: "/covers/026-bijoux.jpg",
  "livre-or": "/covers/027-livre-or.jpg",
  invites: "/covers/028-invites.jpg",
  securite: "/covers/029-securite.jpg",
  assurance: "/covers/030-assurance.jpg",
  preparatifs: "/covers/031-preparatifs.jpg",
  drone: "/covers/032-drone.jpg",
  parking: "/covers/033-parking.jpg",
  bouquet: "/covers/034-bouquet.jpg",
  plage: "/covers/035-plage.jpg",
  "cadeaux-invites": "/covers/036-cadeaux-invites.jpg",
  "cover:037": "/covers/037-lumiere-table.jpg",
  "cover:038": "/covers/038-jardin-mouvement.jpg",
  "cover:039": "/covers/039-geste.jpg",
  "cover:040": "/covers/040-matieres.jpg",
  "cover:041": "/covers/041-silence.jpg",
  "cover:042": "/covers/042-invites-table.jpg",
  "cover:043": "/covers/043-mouvement.jpg",
  "cover:044": "/covers/044-diner.jpg",
  "cover:045": "/covers/045-paysage.jpg",
  "cover:046": "/covers/046-regard.jpg",
  "cover:047": "/covers/047-saison.jpg",
  "cover:048": "/covers/048-musique.jpg",
  "cover:049": "/covers/049-detail.jpg",
  "cover:050": "/covers/050-lendemain.jpg",
  "cover:051": "/covers/051-garden.jpg",
  "cover:052": "/covers/052-first-look.jpg",
  "cover:053": "/covers/053-candlelight.jpg",
  "cover:054": "/covers/054-vows.jpg",
  "cover:055": "/covers/055-open-air.jpg",
  "cover:056": "/covers/056-voices.jpg",
  "cover:057": "/covers/057-circle.jpg",
  "cover:058": "/covers/058-promise.jpg",
  "cover:059": "/covers/059-material.jpg",
  "cover:060": "/covers/060-night.jpg",
  "cover:061": "/covers/061-ombre.jpg",
  "cover:062": "/covers/062-table.jpg",
  "cover:063": "/covers/063-hands.jpg",
  "cover:064": "/covers/064-passage.jpg",
  "cover:065": "/covers/065-instant.jpg",
  "cover:066": "/covers/066-decor.jpg",
  "cover:067": "/covers/067-memoire.jpg",
  "cover:068": "/covers/068-rythme.jpg",
  "cover:069": "/covers/069-lumiere-basse.jpg",
  "cover:070": "/covers/070-lien.jpg",
  "cover:071": "/covers/071-grand-air.jpg",
  "cover:072": "/covers/072-voix.jpg",
  "cover:073": "/covers/073-cercle.jpg",
  "cover:074": "/covers/074-promesse.jpg",
  "cover:075": "/covers/075-matiere.jpg",
  "cover:076": "/covers/076-soir.jpg",
  "cover:077": "/covers/077-matin.jpg",
  "cover:078": "/covers/078-parenthese.jpg",
  "cover:079": "/covers/079-vrai-moment.jpg",
  "cover:080": "/covers/080-trace.jpg",
  "cover:081": "/covers/081-quietude.jpg",
  "cover:082": "/covers/082-saison.jpg",
  "cover:083": "/covers/083-rendez-vous.jpg",
  "cover:084": "/covers/084-table-noire.jpg",
  "cover:085": "/covers/085-gestes.jpg",
  "cover:086": "/covers/086-etoiles.jpg",
  "cover:087": "/covers/087-retour.jpg",
  "cover:088": "/covers/088-proches.jpg",
  "cover:089": "/covers/089-lueur.jpg",
  "cover:090": "/covers/090-transmission.jpg",
  "cover:091": "/covers/091-matinee.jpg",
  "cover:092": "/covers/092-atelier.jpg",
  "cover:093": "/covers/093-palettes.jpg",
  "cover:094": "/covers/094-lieu.jpg",
  "cover:095": "/covers/095-pluie.jpg",
  "cover:096": "/covers/096-soleil.jpg",
  "cover:097": "/covers/097-accueil.jpg",
  "cover:098": "/covers/098-echange.jpg",
  "cover:099": "/covers/099-lumiere.jpg",
  "cover:100": "/covers/100-horizon.jpg",
  "cover:101": "/covers/101-lumiere-basse.jpg",
  "cover:102": "/covers/102-lien.jpg",
  "cover:103": "/covers/103-dehors.jpg",
  "cover:104": "/covers/104-dedans.jpg",
  "cover:105": "/covers/105-rencontre.jpg",
  "cover:106": "/covers/106-temps.jpg",
  "cover:108": "/covers/108-voix.jpg",
  "cover:109": "/covers/109-cercle.jpg",
  "cover:110": "/covers/110-promesse.jpg",
  "cover:111": "/covers/111-matiere.jpg",
  "cover:112": "/covers/112-soir.jpg",
  "cover:113": "/covers/113-matin.jpg",
  "cover:114": "/covers/114-parenthese.jpg",
  "cover:115": "/covers/115-vrai-moment.jpg",
  "cover:116": "/covers/116-trace.jpg",
  "cover:117": "/covers/117-lumiere.jpg",
  "cover:118": "/covers/118-jardin.jpg",
  "cover:119": "/covers/119-table.jpg",
};

export function defaultCoverImage(subject: Pick<Subject, "id" | "image">) {
  return generatedCoverImages[subject.id] ?? subject.image;
}

export function imageForSubject(subject: Pick<Subject, "id" | "image">, overrides: CoverAssetMap = {}) {
  return overrides[subject.id]?.imageUrl?.trim() || defaultCoverImage(subject);
}

export function imageForCover(cover: { id: string; imageUrl: string }, overrides: CoverAssetMap = {}) {
  return overrides[cover.id]?.imageUrl?.trim() || cover.imageUrl;
}

export function coverAssetStatus(cover: { id: string; hasDedicatedVisual: boolean }, overrides: CoverAssetMap = {}) {
  if (overrides[cover.id]?.imageUrl?.trim()) return "edited";
  return cover.hasDedicatedVisual ? "generated" : "to_produce";
}

export function videoForSubject(subjectId: string, overrides: CoverAssetMap = {}) {
  return overrides[subjectId]?.videoUrl?.trim() || "";
}

export function assetStatus(subjectId: string) {
  return generatedCoverImages[subjectId] ? "generated" : "legacy";
}
