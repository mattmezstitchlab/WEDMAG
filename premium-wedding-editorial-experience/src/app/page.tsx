"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSubject,
  plannedCoverCount,
  publishedCoverCount,
  subjects,
  universes,
  weddingMomentOrder,
  type Subject,
  type WeddingStatus,
} from "@/lib/wedding-data";
import { mergeRestoredProject, sortWeddingSelectionsByMoment } from "@/lib/wedding-project";
import {
  buildDossierParcours,
  buildProjectTimeline,
  weddingPhases,
  contactStatusLabels,
  dossierStateLabels,
  isContactStatus,
  mergeRestoredWedding,
  normalizeWeddingState,
  settableDossierStates,
  type DossierContact,
  type DossierState,
  type WeddingProjectState,
} from "@/lib/wedding-pacte";
import { useDialog } from "@/lib/use-dialog";

type SelectionMap = Record<string, WeddingStatus>;

const storageKey = "world-wedding-magazine-project";
const weddingStorageKey = "world-wedding-magazine-wedding";

function statusClass(status: WeddingStatus) {
  return status === "chosen" ? "status-chosen" : status === "contacted" ? "status-contacted" : "status-interested";
}

function CoverMark({ number, light = false }: { number: number; light?: boolean }) {
  return (
    <div className={`cover-mark ${light ? "cover-mark-light" : ""}`}>
      <span>WORLD</span>
      <span>WEDDING</span>
      <span>MAGAZINE</span>
      <b>{String(number).padStart(3, "0")}</b>
    </div>
  );
}

/**
 * PACTE marriage layer — the single step from editorial inspiration to a
 * structured project. One optional name, nothing else: the system learns
 * progressively from validated actions, never from a giant form.
 */
export default function HomePage() {
  const [project, setProject] = useState<SelectionMap>({});
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [universe, setUniverse] = useState("Tous");
  const [toast, setToast] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // PACTE marriage layer: the structured wedding project (null until the
  // visitor creates it — inspirations live in `project` until then).
  const [wedding, setWedding] = useState<WeddingProjectState | null>(null);
  const [weddingHydrated, setWeddingHydrated] = useState(false);
  // The dossier currently open (its cover stays its visual identity).
  const [activeDossier, setActiveDossier] = useState<Subject | null>(null);
  // Phase A — CONTACT: minimal editorial inputs (no form wall, two fields).
  const [declaredName, setDeclaredName] = useState("");
  const [declaredRole, setDeclaredRole] = useState("");
  const [contactNotes, setContactNotes] = useState<Record<string, string>>({});

  // Escape closes, Tab is trapped, focus is moved in and restored (see
  // use-dialog). Purely keyboard/focus behaviour: no visual change.
  const sheetRef = useDialog(Boolean(activeSubject), () => setActiveSubject(null));
  const drawerRef = useDialog(drawerOpen, () => setDrawerOpen(false));
  const dossierRef = useDialog(Boolean(activeDossier), () => setActiveDossier(null));

  useEffect(() => {
    let cancelled = false;

    // Local storage and the API are both external systems: read them in one
    // async pass and commit a single state update, instead of calling
    // setState synchronously in the effect body (cascading renders).
    const restoreProject = async () => {
      let local: SelectionMap = {};
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) local = JSON.parse(stored) as SelectionMap;
      } catch {
        // The project remains fully usable if browser storage is unavailable.
      }

      let fromServer: SelectionMap = {};
      let serverPersistence: string | undefined;
      try {
        const response = await fetch("/api/wedding/selections");
        if (response.ok) {
          const payload = (await response.json()) as {
            selections?: { subjectId: string; status: WeddingStatus }[];
            persistence?: string;
          };
          serverPersistence = payload.persistence;
          if (payload.selections?.length) {
            fromServer = Object.fromEntries(payload.selections.map((item) => [item.subjectId, item.status]));
          }
        }
      } catch {
        // Server persistence is progressive enhancement.
      }

      let localWedding: WeddingProjectState | null = null;
      try {
        const storedWedding = window.localStorage.getItem(weddingStorageKey);
        // normalizeWeddingState also upgrades the previous shape (`items`)
        // into dossiers, so an existing browser keeps its project.
        if (storedWedding) localWedding = normalizeWeddingState(JSON.parse(storedWedding));
      } catch {
        // The wedding project remains fully usable without browser storage.
      }

      let serverWedding: WeddingProjectState | null = null;
      let weddingPersistence: string | undefined;
      try {
        const response = await fetch("/api/wedding/project");
        if (response.ok) {
          const payload = (await response.json()) as {
            project?: {
              name: string;
              dossiers: {
                id: string;
                subjectId: string;
                state: string;
                source: string;
                parcoursProgress: number;
                contacts: {
                  id: string;
                  professionalRef: string | null;
                  declaredName: string | null;
                  declaredRole: string | null;
                  status: string;
                  note: string | null;
                  attestedAt: string | null;
                  confirmedAt: string | null;
                }[];
              }[];
            } | null;
            persistence?: string;
          };
          weddingPersistence = payload.persistence;
          if (payload.project) {
            serverWedding = {
              name: payload.project.name,
              dossiers: Object.fromEntries(
                payload.project.dossiers.map((dossier) => [
                  dossier.subjectId,
                  {
                    id: typeof dossier.id === "string" ? dossier.id : null,
                    state: dossier.state as DossierState,
                    source: dossier.source,
                    parcoursProgress: typeof dossier.parcoursProgress === "number" ? dossier.parcoursProgress : 0,
                    contacts: Array.isArray(dossier.contacts)
                      ? dossier.contacts.map((contact) => ({
                          id: typeof contact.id === "string" ? contact.id : null,
                          professionalRef: typeof contact.professionalRef === "string" ? contact.professionalRef : null,
                          declaredName: typeof contact.declaredName === "string" ? contact.declaredName : null,
                          declaredRole: typeof contact.declaredRole === "string" ? contact.declaredRole : null,
                          status: isContactStatus(contact.status) ? contact.status : "selectionne",
                          note: typeof contact.note === "string" ? contact.note : null,
                          attestedAt: typeof contact.attestedAt === "string" ? contact.attestedAt : null,
                          confirmedAt: typeof contact.confirmedAt === "string" ? contact.confirmedAt : null,
                        }))
                      : [],
                  },
                ]),
              ),
            };
          }
        }
      } catch {
        // Server persistence is progressive enhancement.
      }

      if (cancelled) return;
      // Deterministic restore rule (see mergeRestoredProject): the server
      // snapshot wins when it has content, localStorage otherwise, and
      // `current` (anything ticked while loading) always wins.
      setProject((current) => mergeRestoredProject(
        { persistence: serverPersistence, selections: fromServer },
        local,
        current,
      ));
      setIsHydrated(true);
      // Same rule for the wedding project itself (mergeRestoredWedding).
      setWedding((current) => mergeRestoredWedding(
        { persistence: weddingPersistence, project: serverWedding },
        localWedding,
        current,
      ));
      setWeddingHydrated(true);
    };

    void restoreProject();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(project));
    } catch {
      // Local persistence is progressive enhancement.
    }
  }, [project, isHydrated]);

  useEffect(() => {
    if (!weddingHydrated) return;
    try {
      window.localStorage.setItem(weddingStorageKey, JSON.stringify(wedding));
    } catch {
      // Local persistence is progressive enhancement.
    }
  }, [wedding, weddingHydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const syncSelection = (subjectId: string, status?: WeddingStatus, action?: "remove") => {
    void fetch("/api/wedding/selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, status, action }),
    }).catch(() => undefined);
  };

  const syncWedding = (body: Record<string, unknown>) => {
    void fetch("/api/wedding/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => undefined);
  };

  // Same call, but the caller needs the answer (contact-add returns the
  // server uuid of the created contact — the anchor for later attestation).
  const syncWeddingJson = async (body: Record<string, unknown>): Promise<{ contactId?: string } | undefined> => {
    try {
      const response = await fetch("/api/wedding/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) return undefined;
      return (await response.json()) as { contactId?: string };
    } catch {
      return undefined;
    }
  };

  // --- Phase A — CONTACT: the dossier's real people ---

  const addContactToDossier = (subject: Subject, contact: DossierContact) => {
    const localId = contact.id ?? crypto.randomUUID();
    setWedding((current) => {
      if (!current) return current;
      const dossier = current.dossiers[subject.id];
      if (!dossier) return current;
      return {
        ...current,
        dossiers: {
          ...current.dossiers,
          [subject.id]: { ...dossier, contacts: [...dossier.contacts, { ...contact, id: localId }] },
        },
      };
    });
    void syncWeddingJson({
      action: "contact-add",
      subjectId: subject.id,
      ...(contact.professionalRef
        ? { professionalRef: contact.professionalRef }
        : { name: contact.declaredName, role: contact.declaredRole ?? "" }),
    }).then((result) => {
      // The server uuid replaces the local one — same person, real anchor.
      if (!result?.contactId) return;
      setWedding((current) => {
        if (!current) return current;
        const dossier = current.dossiers[subject.id];
        if (!dossier) return current;
        return {
          ...current,
          dossiers: {
            ...current.dossiers,
            [subject.id]: {
              ...dossier,
              contacts: dossier.contacts.map((existing) =>
                existing.id === localId ? { ...existing, id: result.contactId as string } : existing,
              ),
            },
          },
        };
      });
    });
    setToast("Cette personne rejoint votre dossier.");
  };

  const addCatalogueContact = (subject: Subject, professionalRef: string) => {
    addContactToDossier(subject, {
      id: null,
      professionalRef,
      declaredName: null,
      declaredRole: null,
      status: "selectionne",
      note: null,
      attestedAt: null,
    });
  };

  const addDeclaredContact = (subject: Subject) => {
    const name = declaredName.trim();
    if (!name) return;
    addContactToDossier(subject, {
      id: null,
      professionalRef: null,
      declaredName: name,
      declaredRole: declaredRole.trim() || null,
      status: "selectionne",
      note: null,
      attestedAt: null,
    });
    setDeclaredName("");
    setDeclaredRole("");
  };

  const attestContact = (subject: Subject, contact: DossierContact) => {
    const contactId = contact.id ?? crypto.randomUUID();
    const note = (contactNotes[contactId] ?? "").trim();
    setWedding((current) => {
      if (!current) return current;
      const dossier = current.dossiers[subject.id];
      if (!dossier) return current;
      return {
        ...current,
        dossiers: {
          ...current.dossiers,
          [subject.id]: {
            ...dossier,
            // The declared fact moves the dossier to Contact — the only
            // path to that state (set-state keeps refusing it).
            state: dossier.state === "contact" ? dossier.state : "contact",
            contacts: dossier.contacts.map((existing) =>
              existing === contact
                ? {
                    ...existing,
                    id: contactId,
                    status: "contacte",
                    note: note || existing.note,
                    attestedAt: new Date().toISOString(),
                  }
                : existing,
            ),
          },
        },
      };
    });
    syncWedding({
      action: "contact-attest",
      subjectId: subject.id,
      contactId,
      ...(note ? { note } : {}),
    });
    setToast("Contact déclaré — votre dossier passe en Contact.");
  };

  // B1: the couple DECLARES the professional confirmed — honest wording,
  // never presented as a verified fact or a contract. The dossier's own
  // state does not move: two distinct facts.
  const confirmContact = (subject: Subject, contact: DossierContact) => {
    const contactId = contact.id ?? crypto.randomUUID();
    const note = (contactNotes[contactId] ?? "").trim();
    setWedding((current) => {
      if (!current) return current;
      const dossier = current.dossiers[subject.id];
      if (!dossier) return current;
      return {
        ...current,
        dossiers: {
          ...current.dossiers,
          [subject.id]: {
            ...dossier,
            contacts: dossier.contacts.map((existing) =>
              existing === contact
                ? {
                    ...existing,
                    id: contactId,
                    status: "confirme",
                    note: note || existing.note,
                    confirmedAt: new Date().toISOString(),
                  }
                : existing,
            ),
          },
        },
      };
    });
    syncWedding({
      action: "contact-confirm",
      subjectId: subject.id,
      contactId,
      ...(note ? { note } : {}),
    });
    setToast("Confirmation déclarée — vous déclarez que ce professionnel a confirmé.");
  };

  const removeContact = (subject: Subject, contact: DossierContact) => {
    setWedding((current) => {
      if (!current) return current;
      const dossier = current.dossiers[subject.id];
      if (!dossier) return current;
      return {
        ...current,
        dossiers: {
          ...current.dossiers,
          [subject.id]: { ...dossier, contacts: dossier.contacts.filter((existing) => existing !== contact) },
        },
      };
    });
    if (contact.id) syncWedding({ action: "contact-remove", subjectId: subject.id, contactId: contact.id });
    setToast("Personne retirée du dossier.");
  };

  const addSubject = (subject: Subject) => {
    if (project[subject.id]) {
      // Already chosen: one click opens THAT dossier — not the general view.
      // (Older picks without a dossier still fall back to the wedding view,
      // which offers to create it.)
      if (wedding?.dossiers[subject.id]) setActiveDossier(subject);
      else setDrawerOpen(true);
      return;
    }
    setProject((current) => ({ ...current, [subject.id]: "interested" }));
    syncSelection(subject.id, "interested");
    // The very first choice creates the wedding itself — one gesture, no
    // form: feuilletter and choose is all the visitor ever has to do.
    const firstChoice = !wedding;
    if (firstChoice) {
      setWedding({ name: "Mon mariage", dossiers: {} });
      syncWedding({ action: "create", name: "Mon mariage" });
    }
    // A cover added to a wedding opens its dossier right away —
    // the act of adding IS the selection (see WEDMAG-DOSSIERS.md).
    if (!wedding?.dossiers[subject.id]) {
      setWedding((current) =>
        current
          ? { ...current, dossiers: { ...current.dossiers, [subject.id]: { id: null, state: "selection", source: "wedmag", parcoursProgress: 0, contacts: [] } } }
          : current,
      );
      syncWedding({ action: "attach", subjectId: subject.id });
      // Editorial transition: the fresh dossier opens on its parcours —
      // the couple immediately sees what this choice has become.
      setActiveDossier(subject);
      setToast(firstChoice
        ? `Votre mariage est créé. Le dossier ${subject.title} s’ouvre avec son parcours.`
        : `Le dossier ${subject.title} est créé. Nous avons préparé un parcours pour vous.`);
      return;
    }
    setToast(`${subject.title} rejoint votre mariage.`);
  };

  const updateStatus = (subjectId: string, status: WeddingStatus) => {
    setProject((current) => ({ ...current, [subjectId]: status }));
    syncSelection(subjectId, status);
  };

  const removeSubject = (subjectId: string) => {
    const label = getSubject(subjectId)?.title ?? "Cet élément";
    setProject((current) => {
      const next = { ...current };
      delete next[subjectId];
      return next;
    });
    syncSelection(subjectId, undefined, "remove");
    // Removing the inspiration also detaches it from the wedding timeline —
    // the project never keeps something the visitor explicitly removed.
    if (wedding?.dossiers[subjectId]) {
      setWedding((current) => {
        if (!current || !current.dossiers[subjectId]) return current;
        const dossiers = { ...current.dossiers };
        delete dossiers[subjectId];
        return { ...current, dossiers };
      });
      syncWedding({ action: "detach", subjectId });
    }
    setToast(`${label} a été retiré.`);
  };

  // --- Dossiers: create, detach, set-state (propose → validate) ---

  const createWedding = () => {
    setWedding({ name: "Mon mariage", dossiers: {} });
    syncWedding({ action: "create", name: "Mon mariage" });
    setToast("Votre mariage est créé. Ajoutez une couverture : son dossier s’ouvrira aussitôt.");
  };

  const attachSubject = (subjectId: string) => {
    const label = getSubject(subjectId)?.title ?? "Cette inspiration";
    setWedding((current) =>
      current
        ? { ...current, dossiers: { ...current.dossiers, [subjectId]: { id: null, state: "selection", source: "wedmag", parcoursProgress: 0, contacts: [] } } }
        : current,
    );
    syncWedding({ action: "attach", subjectId });
    setToast(`Le dossier ${label} est ouvert dans votre mariage.`);
  };

  const detachSubject = (subjectId: string) => {
    const label = getSubject(subjectId)?.title ?? "Cette inspiration";
    setWedding((current) => {
      if (!current || !current.dossiers[subjectId]) return current;
      const dossiers = { ...current.dossiers };
      delete dossiers[subjectId];
      return { ...current, dossiers };
    });
    syncWedding({ action: "detach", subjectId });
    setToast(`Le dossier ${label} retourne parmi vos inspirations.`);
  };

  const validateParcoursStep = (subjectId: string) => {
    setWedding((current) => {
      if (!current) return current;
      const dossier = current.dossiers[subjectId];
      if (!dossier) return current;
      const subject = getSubject(subjectId);
      if (!subject) return current;
      const total = buildDossierParcours(subject).steps.length;
      if (dossier.parcoursProgress >= total) return current;
      return {
        ...current,
        dossiers: {
          ...current.dossiers,
          [subjectId]: { ...dossier, parcoursProgress: dossier.parcoursProgress + 1 },
        },
      };
    });
    syncWedding({ action: "parcours-step", subjectId });
  };

  const setDossierState = (subjectId: string, state: DossierState) => {
    setWedding((current) => {
      if (!current || !current.dossiers[subjectId]) return current;
      return {
        ...current,
        dossiers: { ...current.dossiers, [subjectId]: { ...current.dossiers[subjectId], state } },
      };
    });
    syncWedding({ action: "set-state", subjectId, state });
  };

  const organizedSelections = useMemo(
    () => sortWeddingSelectionsByMoment(
      Object.entries(project).map(([subjectId, status]) => ({ subjectId, status })),
    ),
    [project],
  );

  const selectedSubjects = useMemo(
    () => organizedSelections.flatMap((group) => group.selections.map((selection) => selection.subject)),
    [organizedSelections],
  );

  // --- PACTE marriage layer: timeline + pool of inspirations to attach ---

  const attachedDossiers = useMemo(
    () =>
      wedding
        ? Object.entries(wedding.dossiers).map(([subjectId, dossier]) => ({
            subjectId,
            state: dossier.state,
            source: dossier.source,
          }))
        : [],
    [wedding],
  );

  const timeline = useMemo(() => buildProjectTimeline(attachedDossiers), [attachedDossiers]);

  const unattachedSelections = useMemo(
    () =>
      organizedSelections
        .map((group) => ({
          ...group,
          selections: group.selections.filter((selection) => !wedding?.dossiers[selection.subject.id]),
        }))
        .filter((group) => group.selections.length > 0),
    [organizedSelections, wedding],
  );

  const unattachedCount = useMemo(
    () => unattachedSelections.reduce((count, group) => count + group.selections.length, 0),
    [unattachedSelections],
  );

  const attachedCount = attachedDossiers.length;

  const filteredSubjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return subjects.filter((subject) => {
      const inUniverse = universe === "Tous" || subject.universe === universe;
      const searchable = [subject.title, subject.eyebrow, subject.category, subject.type, subject.style].join(" ").toLowerCase();
      return inUniverse && (!normalized || searchable.includes(normalized));
    });
  }, [query, universe]);

  const insights = useMemo(() => {
    const selectedIds = new Set(selectedSubjects.map((subject) => subject.id));
    const toCheck = Array.from(new Set(selectedSubjects.flatMap((subject) => subject.constraints))).slice(0, 8);
    const linked = selectedSubjects
      .flatMap((subject) => subject.related)
      .filter((id) => !selectedIds.has(id))
      .reduce<Record<string, number>>((count, id) => ({ ...count, [id]: (count[id] ?? 0) + 1 }), {});
    const suggestions = Object.entries(linked)
      .map(([id, links]) => ({ subject: getSubject(id), links }))
      .filter((item): item is { subject: Subject; links: number } => Boolean(item.subject))
      .sort((a, b) => b.links - a.links)
      .slice(0, 5);
    return { toCheck, suggestions };
  }, [selectedSubjects]);

  const scrollToMagazine = () => document.getElementById("magazine")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main>
      <header className="site-header">
        <button className="wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Retour à l’accueil">
          <span>WORLD WEDDING</span><em>MAGAZINE</em>
        </button>
        <nav aria-label="Navigation principale">
          <button onClick={scrollToMagazine}>Le magazine</button>
          <button onClick={() => document.getElementById("method")?.scrollIntoView({ behavior: "smooth" })}>Le principe</button>
        </nav>
        <button className="project-trigger" onClick={() => setDrawerOpen(true)}>
          <span>MON MARIAGE</span>
          <b>{wedding ? attachedCount : selectedSubjects.length}</b>
        </button>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="edition-label">ÉDITION MONDE · 2025—2026</p>
          <h1 id="hero-title">VOTRE MARIAGE<br /><i>COMMENCE PAR</i><br />UNE HISTOIRE.</h1>
          <p className="hero-statement">Vous feuillettez. Vous choisissez. WEDMAG structure.</p>
          <div className="hero-actions">
            <button className="button button-fuchsia" onClick={scrollToMagazine}>COMMENCER À FEUILLETER <span>↓</span></button>
          </div>
        </div>

        <div className="hero-art" aria-label="Sélection de couvertures du magazine">
          <div className="hero-number">365</div>
          <article className="hero-cover cover-back" style={{ backgroundImage: "url(/covers/006-ceremonie-laique.jpg)" }}>
            <CoverMark number={6} light />
            <strong>CÉRÉMONIE<br />LAÏQUE</strong>
          </article>
          <article className="hero-cover cover-front" style={{ backgroundImage: "url(/covers/001-saxophoniste.jpg)" }}>
            <CoverMark number={1} light />
            <div className="cover-front-title"><span>THE</span><strong>SAXOPHONISTE</strong><i>issue</i></div>
            <p>Le détail qui change l’air.</p>
          </article>
          <p className="hero-caption">DES IDÉES À FEUILLETER.<br />DES CHOIX À RELIER.</p>
        </div>
      </section>

      <section className="magazine" id="magazine" aria-labelledby="magazine-title">
        <div className="magazine-head">
          <div>
            <p className="section-kicker">L’INDEX À FEUILLETER</p>
            <h2 id="magazine-title">Les couvertures<br /><i>du moment.</i></h2>
          </div>
          <div className="issue-counter"><b>001—{String(publishedCoverCount).padStart(3, "0")}</b><span>/ {publishedCoverCount} PUBLIÉES</span><em>ÉDITION EN COURS</em></div>
        </div>

        <div className="filter-bar">
          <label className="search-field">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chercher une idée, un métier..." aria-label="Chercher une couverture" />
          </label>
          <div className="filter-scroll" aria-label="Filtrer les couvertures par univers">
            {universes.map((item) => (
              <button key={item} onClick={() => setUniverse(item)} className={universe === item ? "active" : ""}>{item}</button>
            ))}
          </div>
        </div>

        <div className="cover-count-line">
          <span>{filteredSubjects.length} COUVERTURE{filteredSubjects.length > 1 ? "S" : ""} À DÉCOUVRIR</span>
          <span>CHOISISSEZ CE QUI VOUS ATTIRE, PAS CE QUI EST ATTENDU.</span>
        </div>

        {filteredSubjects.length ? (
          <div className="cover-shelf">
            {filteredSubjects.map((subject, index) => {
              const selected = Boolean(project[subject.id]);
              return (
                <article className={`mag-cover cover-${(index % 6) + 1}`} key={subject.id}>
                  <button className="cover-open" onClick={() => setActiveSubject(subject)} aria-label={`Ouvrir la couverture ${subject.title}`}>
                    <div className="cover-photo" style={{ backgroundImage: `url(${subject.image})`, backgroundPosition: subject.imagePosition ?? "center" }} />
                    <div className="cover-shade" />
                    <CoverMark number={subject.coverNumber} light />
                    <div className="cover-content">
                      <p>{subject.universe.toUpperCase()} · {subject.type.toUpperCase()}</p>
                      <h3 className={subject.title.length > 16 ? "cover-title-long" : undefined}>{subject.title}</h3>
                      <span>{subject.eyebrow}</span>
                    </div>
                  </button>
                  <button className={`cover-check ${selected ? "checked" : ""}`} onClick={() => addSubject(subject)} aria-label={selected ? `${subject.title} est dans Mon mariage` : `Ajouter ${subject.title} à Mon mariage`}>
                    {selected ? "✓" : "+"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><p>Aucune couverture ne porte encore ce mot.</p><button onClick={() => { setQuery(""); setUniverse("Tous"); }}>REVOIR TOUTES LES COUVERTURES</button></div>
        )}

        <div className="next-edition">
          <span>{String(publishedCoverCount + 1).padStart(3, "0")}—{plannedCoverCount}</span>
          <p>Le magazine s’étoffe avec vos histoires. Les autres couvertures attendent déjà leur moment.</p>
          <button onClick={() => { setQuery(""); setUniverse("Tous"); scrollToMagazine(); }}>REVENIR À L’INDEX <span>↑</span></button>
        </div>
      </section>

      <section className="manifesto" id="method">
        <p className="section-kicker">COMMENT ÇA MARCHE ?</p>
        <div className="manifesto-grid">
          <h2>Votre magazine<br /><i>devient votre</i><br />dossier de mariage.</h2>
          <div className="manifesto-steps concept-steps">
          <div><span>01</span><div><b>FEUILLETEZ</b><p>Lieux, métiers, savoir-faire, idées — le magazine de votre mariage.</p></div></div>
          <div><span>02</span><div><b>CHOISISSEZ</b><p>Gardez ce qui vous ressemble : votre dossier commence.</p></div></div>
          <div><span>03</span><div><b>VOTRE DOSSIER</b><p>Chaque choix trouve sa place.</p></div></div>
          <div><span>04</span><div><b>VOTRE PARCOURS</b><p>Ce qui vient ensuite, déduit de votre choix.</p></div></div>
          <div><span>05</span><div><b>CE QUI S’EST PASSÉ</b><p>Ce que vous déclarez : sélection, contact, confirmation.</p></div></div>
          </div>
        </div>
      </section>

      <section className="statement" aria-label="Le fil WEDMAG">
        <p className="statement-line">CE QUE VOUS DÉCOUVREZ DANS LE MAGAZINE<br />PEUT DEVENIR CE QUE VOUS VIVEZ DANS VOTRE MARIAGE.</p>
        <div className="flow-chain" aria-hidden="true">
          <span>MAGAZINE</span><i>↓</i>
          <span>MON MARIAGE</span><i>↓</i>
          <span>MON DOSSIER</span><i>↓</i>
          <span>MON PARCOURS</span>
        </div>
      </section>

      <section className="feature-section" aria-labelledby="dossier-title">
        <div className="feature-visual" style={{ backgroundImage: "url(/covers/002-chateau.jpg)" }} aria-hidden="true" />
        <div className="feature-body">
          <h2 id="dossier-title">LE MAGAZINE DEVIENT<br /><i>votre dossier.</i></h2>
          <p className="feature-text">Pas de catalogue à remplir. Vous choisissez — WEDMAG organise.</p>
          <ul className="feature-tags" aria-label="Ce que contient un dossier">
            <li>SUJET</li><li>ÉTAT</li><li>PARCOURS</li><li>PERSONNES</li><li>CHRONOLOGIE</li>
          </ul>
        </div>
      </section>

      <section className="timeline-section" aria-labelledby="timeline-title">
        <h2 id="timeline-title">TOUT RESTE <i>lié.</i></h2>
        <div className="timeline-preview">
          {weddingPhases.map((phase) => (
            <div key={phase.key}>
              <b>{phase.number}</b>
              <h3>{phase.label}</h3>
              <span>{phase.moments.join(" · ")}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="closing-cta">
        <div className="closing-image" style={{ backgroundImage: "url(/covers/010-scenographie.jpg)" }} />
        <div>
          <h2>COMMENCEZ PAR<br /><i>feuilleter.</i></h2>
          <button className="button button-light" onClick={scrollToMagazine}>ENTRER DANS WEDMAG <span>↓</span></button>
        </div>
      </section>

      <footer>
        <div className="wordmark footer-mark"><span>WORLD WEDDING</span><em>MAGAZINE</em></div>
        <p>365 couvertures pour découvrir tout ce qui peut composer un mariage.</p>
        <span>PARIS · LONDON · MILAN · WORLD</span>
      </footer>

      {activeSubject && (
        <div className="overlay" ref={sheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="subject-title">
          <button className="overlay-backdrop" aria-label="Fermer la fiche" onClick={() => setActiveSubject(null)} />
          <article className="subject-sheet">
            <button className="close-sheet" onClick={() => setActiveSubject(null)} aria-label="Fermer">×</button>
            <div className="subject-visual" style={{ backgroundImage: `url(${activeSubject.image})` }}>
              <CoverMark number={activeSubject.coverNumber} light />
              <div><p>{activeSubject.universe.toUpperCase()} / {activeSubject.category.toUpperCase()}</p><h2>{activeSubject.title}</h2></div>
            </div>
            <div className="subject-story">
              <div className="subject-topline"><span>{activeSubject.type}</span><span>{activeSubject.style} · {activeSubject.budget}</span></div>
              <p className="subject-lede">{activeSubject.intro}</p>
              <p className="subject-description">{activeSubject.description}</p>

              <div className="editorial-block">
                <p className="block-title">CE QUE ÇA PEUT APPORTER</p>
                <ul className="impact-list">{activeSubject.brings.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className="sheet-columns">
                <div className="editorial-block"><p className="block-title">SERVICES</p><ul>{activeSubject.services.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div className="editorial-block"><p className="block-title">MOMENTS</p><ul>{activeSubject.moments.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
              <div className="editorial-block"><p className="block-title">À PRÉVOIR</p><div className="tag-list">{activeSubject.toPlan.map((item) => <span key={item}>{item}</span>)}</div></div>
              <div className="editorial-block"><p className="block-title">ASSOCIÉ À</p><div className="relation-list">
                {activeSubject.related.map((id) => {
                  const related = getSubject(id);
                  return related ? <button key={id} onClick={() => setActiveSubject(related)}>{related.title} <span>↗</span></button> : null;
                })}
              </div></div>
              <div className="professional-line"><span>À DÉCOUVRIR AUSSI</span><p>{activeSubject.professionals[0].name} <em>— {activeSubject.professionals[0].role}, {activeSubject.professionals[0].city}</em></p></div>
              {wedding?.dossiers[activeSubject.id] ? (
                <button className="add-wide added" onClick={() => { setActiveDossier(activeSubject); setActiveSubject(null); }}>
                  ✓ DANS MON MARIAGE — OUVRIR LE DOSSIER
                </button>
              ) : (
                <button className="add-wide" onClick={() => addSubject(activeSubject)}>
                  + AJOUTER À MON MARIAGE
                </button>
              )}
            </div>
          </article>
        </div>
      )}

      {drawerOpen && (
        <div className="drawer-layer" role="dialog" aria-modal="true" aria-labelledby="project-title">
          <button className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="Fermer Mon mariage" />
          <aside className="project-drawer" ref={drawerRef} tabIndex={-1}>
            <div className="drawer-head">
              <div><p className="section-kicker">{wedding ? "VOTRE PROJET MARIAGE" : "VOTRE ÉDITION PERSONNELLE"}</p><h2 id="project-title">MON<br /><i>MARIAGE.</i></h2></div>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Fermer">×</button>
            </div>
            {wedding && <p className="project-name">{wedding.name}</p>}
            <div className="project-line">
              <span>{wedding
                ? `${attachedCount} DOSSIER${attachedCount > 1 ? "S" : ""}`
                : `${selectedSubjects.length} ÉLÉMENT${selectedSubjects.length > 1 ? "S" : ""}`}</span>
              <span>{wedding ? "VOTRE MARIAGE SE STRUCTURE" : "VOTRE PROJET SE DESSINE"}</span>
            </div>

            {wedding ? (
              <div className="project-content">
                <section className="project-section">
                  <div className="section-with-note"><p className="block-title">LES DOSSIERS DE VOTRE MARIAGE</p><span>LA TIMELINE</span></div>
                  {attachedCount === 0 && <p className="timeline-hint">Ajoutez une couverture ci-dessous : son dossier s’ouvrira et prendra sa place dans le fil de votre journée.</p>}
                  <div className="project-selections">
                    {timeline.map((phase) => (
                      <div className="timeline-phase" key={phase.key ?? "other"}>
                        <div className="phase-heading">
                          <b>{phase.number ?? "—"}</b>
                          <h3>{phase.label}</h3>
                        </div>
                        {phase.momentGroups.length === 0 ? (
                          <p className="phase-empty">Rien pour l’instant.</p>
                        ) : phase.momentGroups.map((group) => (
                          <div className="moment-group" key={group.moment ?? "other"}>
                            <div className="moment-heading">
                              <b>{group.moment ? String(weddingMomentOrder.indexOf(group.moment) + 1).padStart(2, "0") : "—"}</b>
                              <h3>{group.moment ?? "À organiser"}</h3>
                            </div>
                            {group.subjects.map((subject) => {
                              const dossier = wedding.dossiers[subject.id];
                              return (
                                <article className="project-item" key={dossier?.id ?? subject.id}>
                                  <button className="project-thumb" style={{ backgroundImage: `url(${subject.image})` }} onClick={() => { setActiveDossier(subject); setDrawerOpen(false); }} aria-label={`Ouvrir le dossier ${subject.title}`} />
                                  <div className="project-item-main">
                                    <button onClick={() => { setActiveDossier(subject); setDrawerOpen(false); }}>{subject.title}</button>
                                    <span>Dossier · Source Wedmag</span>
                                  </div>
                                  {dossier && (
                                    <select value={dossier.state} onChange={(event) => setDossierState(subject.id, event.target.value as DossierState)} className={dossier.state === "selection" ? "state-selection" : "state-inspiration"} aria-label={`État du dossier ${subject.title}`}>
                                      {settableDossierStates.map((state) => (
                                        <option key={state} value={state}>{dossierStateLabels[state]}</option>
                                      ))}
                                      {dossier.state === "contact" && <option value="contact" disabled>Contact</option>}
                                    </select>
                                  )}
                                  <button className="remove-item" onClick={() => detachSubject(subject.id)} aria-label={`Retirer le dossier ${subject.title} du mariage`}>×</button>
                                </article>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>

                {unattachedCount > 0 && (
                  <section className="project-section">
                    <div className="section-with-note"><p className="block-title">INSPIRATIONS SANS DOSSIER</p><span>VOUS DÉCIDEZ</span></div>
                    <div className="project-selections">
                      {unattachedSelections.map((group, groupIndex) => (
                        <section className="moment-group" key={group.moment ?? "other"} aria-labelledby={`pool-moment-${groupIndex}`}>
                          <div className="moment-heading">
                            <b>{group.moment ? String(weddingMomentOrder.indexOf(group.moment) + 1).padStart(2, "0") : "—"}</b>
                            <h3 id={`pool-moment-${groupIndex}`}>{group.moment ?? "À organiser"}</h3>
                          </div>
                          {group.selections.map(({ subject, status, moments }) => (
                            <article className="project-item pool-item" key={subject.id}>
                              <button className="project-thumb" style={{ backgroundImage: `url(${subject.image})` }} onClick={() => { setActiveSubject(subject); setDrawerOpen(false); }} aria-label={`Voir ${subject.title}`} />
                              <div className="project-item-main">
                                <button onClick={() => { setActiveSubject(subject); setDrawerOpen(false); }}>{subject.title}</button>
                                <span>{moments.length > 1 ? `Aussi : ${moments.slice(1).join(" · ")}` : subject.universe}</span>
                              </div>
                              <button className="attach-pill" onClick={() => attachSubject(subject.id)} aria-label={`Créer le dossier ${subject.title} dans votre mariage`}>Créer le dossier</button>
                              <select value={status} onChange={(event) => updateStatus(subject.id, event.target.value as WeddingStatus)} className={statusClass(status)} aria-label={`État de ${subject.title}`}>
                                <option value="interested">M’intéresse</option><option value="contacted">Contacté</option><option value="chosen">Choisi</option>
                              </select>
                              <button className="remove-item" onClick={() => removeSubject(subject.id)} aria-label={`Retirer ${subject.title}`}>×</button>
                            </article>
                          ))}
                        </section>
                      ))}
                    </div>
                  </section>
                )}

                <section className="project-section project-reading">
                  <p className="block-title">VOTRE PROJET, À CE STADE</p>
                  <p>Vous avez déjà dessiné <strong>{Array.from(new Set(selectedSubjects.map((subject) => subject.universe))).join(", ")}</strong>. Voici des pistes nées de vos choix — à examiner seulement si elles vous ressemblent.</p>
                </section>

                {insights.toCheck.length > 0 && <section className="project-section check-section">
                  <p className="block-title">À VÉRIFIER</p>
                  <div className="check-list">{insights.toCheck.map((item) => <span key={item}><b>↗</b>{item}</span>)}</div>
                </section>}

                {insights.suggestions.length > 0 && <section className="project-section">
                  <div className="section-with-note"><p className="block-title">ÉLÉMENTS ASSOCIÉS</p><span>LIENS ENTRE VOS CHOIX</span></div>
                  <div className="suggestion-list">{insights.suggestions.map(({ subject, links }) => <article key={subject.id}>
                    <div className="suggestion-image" style={{ backgroundImage: `url(${subject.image})` }} /><div><p>{subject.title}</p><span>Apparaît dans {links} relation{links > 1 ? "s" : ""}</span></div><button onClick={() => addSubject(subject)}>+</button>
                  </article>)}</div>
                </section>}

                <button className="back-to-magazine" onClick={() => { setDrawerOpen(false); scrollToMagazine(); }}>← CONTINUER À FEUILLETER</button>
              </div>
            ) : !selectedSubjects.length ? (
              <div className="project-empty">
                <p>Votre mariage commence ici.</p>
                <span>Cochez une première couverture : votre mariage se crée tout seul, son dossier s’ouvre avec son parcours.</span>
                <button className="button button-fuchsia" onClick={() => { setDrawerOpen(false); scrollToMagazine(); }}>FEUILLETER <span>↓</span></button>
              </div>
            ) : (
              <div className="project-content">
                <section className="project-section">
                  <p className="block-title">CE QUE VOUS AVEZ CHOISI</p>
                  <div className="project-selections">
                    {organizedSelections.map((group, groupIndex) => (
                      <section className="moment-group" key={group.moment ?? "other"} aria-labelledby={`moment-${groupIndex}`}>
                        <div className="moment-heading">
                          <b>{group.moment ? String(weddingMomentOrder.indexOf(group.moment) + 1).padStart(2, "0") : "—"}</b>
                          <h3 id={`moment-${groupIndex}`}>{group.moment ?? "À organiser"}</h3>
                        </div>
                        {group.selections.map(({ subject, status, moments }) => (
                          <article className="project-item" key={subject.id}>
                            <button className="project-thumb" style={{ backgroundImage: `url(${subject.image})` }} onClick={() => { setActiveSubject(subject); setDrawerOpen(false); }} aria-label={`Voir ${subject.title}`} />
                            <div className="project-item-main">
                              <button onClick={() => { setActiveSubject(subject); setDrawerOpen(false); }}>{subject.title}</button>
                              <span>{moments.length > 1 ? `Aussi : ${moments.slice(1).join(" · ")}` : subject.universe}</span>
                            </div>
                            <select value={status} onChange={(event) => updateStatus(subject.id, event.target.value as WeddingStatus)} className={statusClass(status)} aria-label={`État de ${subject.title}`}>
                              <option value="interested">M’intéresse</option><option value="contacted">Contacté</option><option value="chosen">Choisi</option>
                            </select>
                            <button className="remove-item" onClick={() => removeSubject(subject.id)} aria-label={`Retirer ${subject.title}`}>×</button>
                          </article>
                        ))}
                      </section>
                    ))}
                  </div>
                </section>

                <section className="project-section project-reading">
                  <p className="block-title">VOTRE PROJET, À CE STADE</p>
                  <p>Vous avez déjà dessiné <strong>{Array.from(new Set(selectedSubjects.map((subject) => subject.universe))).join(", ")}</strong>. Voici des pistes nées de vos choix — à examiner seulement si elles vous ressemblent.</p>
                </section>

                {insights.toCheck.length > 0 && <section className="project-section check-section">
                  <p className="block-title">À VÉRIFIER</p>
                  <div className="check-list">{insights.toCheck.map((item) => <span key={item}><b>↗</b>{item}</span>)}</div>
                </section>}

                {insights.suggestions.length > 0 && <section className="project-section">
                  <div className="section-with-note"><p className="block-title">ÉLÉMENTS ASSOCIÉS</p><span>LIENS ENTRE VOS CHOIX</span></div>
                  <div className="suggestion-list">{insights.suggestions.map(({ subject, links }) => <article key={subject.id}>
                    <div className="suggestion-image" style={{ backgroundImage: `url(${subject.image})` }} /><div><p>{subject.title}</p><span>Apparaît dans {links} relation{links > 1 ? "s" : ""}</span></div><button onClick={() => addSubject(subject)}>+</button>
                  </article>)}</div>
                </section>}

                <section className="project-section create-section">
                  <p className="section-kicker">VOS CHOIX PEUVENT DEVENIR UN PROJET</p>
                  <button className="add-wide" onClick={createWedding}>CRÉER MON MARIAGE</button>
                </section>

                <button className="back-to-magazine" onClick={() => { setDrawerOpen(false); scrollToMagazine(); }}>← CONTINUER À FEUILLETER</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {activeDossier && wedding && (
        <div className="overlay" ref={dossierRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="dossier-title">
          <button className="overlay-backdrop" aria-label="Fermer le dossier" onClick={() => setActiveDossier(null)} />
          <article className="subject-sheet dossier-sheet">
            <button className="close-sheet" onClick={() => setActiveDossier(null)} aria-label="Fermer">×</button>
            <div className="subject-visual" style={{ backgroundImage: `url(${activeDossier.image})` }}>
              <CoverMark number={activeDossier.coverNumber} light />
              <div>
                <p>DOSSIER · {wedding.name.toUpperCase()}</p>
                <h2 id="dossier-title">{activeDossier.title}</h2>
              </div>
            </div>
            <div className="subject-story">
              <div className="dossier-topline">
                <span>{activeDossier.universe.toUpperCase()} · {activeDossier.category.toUpperCase()}</span>
                <b>{dossierStateLabels[wedding.dossiers[activeDossier.id]?.state ?? "selection"].toUpperCase()}</b>
              </div>
              <p className="subject-lede">{activeDossier.intro}</p>
              <p className="subject-description">{activeDossier.description}</p>

              <div className="editorial-block">
                <p className="block-title">CHRONOLOGIE</p>
                <div className="tag-list">{activeDossier.moments.map((moment) => <span key={moment}>{moment}</span>)}</div>
              </div>

              <div className="editorial-block dossier-state-line">
                <p className="block-title">ÉTAT DU DOSSIER</p>
                <div className="dossier-state-controls">
                  {settableDossierStates.map((state) => (
                    <button
                      key={state}
                      className={`state-pill ${wedding.dossiers[activeDossier.id]?.state === state ? "state-pill-active" : ""}`}
                      onClick={() => setDossierState(activeDossier.id, state)}
                      aria-pressed={wedding.dossiers[activeDossier.id]?.state === state}
                    >
                      {dossierStateLabels[state]}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const entry = wedding.dossiers[activeDossier.id];
                const contacts = entry?.contacts ?? [];
                return (
                  <div className="editorial-block dossier-people">
                    <div className="section-with-note"><p className="block-title">LES PERSONNES</p><span>CE QUI S’EST PASSÉ</span></div>

                    <div className="people-references">
                      {activeDossier.professionals.map((professional) => {
                        const reference = `${activeDossier.id}:${professional.id}`;
                        const followed = contacts.some((contact) => contact.professionalRef === reference);
                        return (
                          <div className="people-reference" key={professional.id}>
                            <div>
                              <p>{professional.name}</p>
                              <span>{professional.role} · {professional.city}</span>
                            </div>
                            {followed ? (
                              <em>Dans votre dossier</em>
                            ) : (
                              <button
                                onClick={() => addCatalogueContact(activeDossier, reference)}
                                aria-label={`Suivre ${professional.name} dans ce dossier`}
                              >+</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="people-hint">Ces personnes illustrent le magazine. Suivre l’une d’elles l’ajoute à votre dossier — ce qui se passe ensuite vous appartient.</p>

                    <div className="people-add">
                      <input
                        value={declaredName}
                        onChange={(event) => setDeclaredName(event.target.value)}
                        placeholder="Une personne que vous avez rencontrée"
                        maxLength={80}
                        aria-label="Nom de la personne rencontrée"
                      />
                      <input
                        value={declaredRole}
                        onChange={(event) => setDeclaredRole(event.target.value)}
                        placeholder="Son métier (optionnel)"
                        maxLength={80}
                        aria-label="Métier de la personne rencontrée"
                      />
                      <button
                        onClick={() => addDeclaredContact(activeDossier)}
                        disabled={!declaredName.trim()}
                        aria-label="Ajouter cette personne au dossier"
                      >+</button>
                    </div>

                    {contacts.length > 0 && (
                      <div className="people-contacts">
                        {contacts.map((contact) => {
                          const professional = contact.professionalRef
                            ? activeDossier.professionals.find((candidate) => `${activeDossier.id}:${candidate.id}` === contact.professionalRef)
                            : undefined;
                          const identity = professional?.name ?? contact.declaredName;
                          const contactKey = contact.id ?? contact.professionalRef ?? contact.declaredName ?? "";
                          const note = contactNotes[contactKey] ?? "";
                          return (
                            <article className="people-contact" key={contactKey}>
                              <div className="people-contact-head">
                                <b>{identity ?? "Référence retirée — à confirmer"}</b>
                                <span className={`contact-status ${contact.status === "contacte" ? "contact-status-live" : ""}`}>
                                  {contactStatusLabels[contact.status]}
                                </span>
                              </div>
                              <span className="people-contact-role">
                                {professional ? `${professional.role} · ${professional.city} · référence du magazine` : (contact.declaredRole || "Personne rencontrée")}
                              </span>
                              {contact.status === "selectionne" ? (
                                <div className="contact-attest">
                                  <input
                                    value={note}
                                    onChange={(event) => setContactNotes((current) => ({ ...current, [contactKey]: event.target.value }))}
                                    placeholder="Ce qui s’est passé (optionnel)"
                                    maxLength={500}
                                    aria-label="Note sur ce contact"
                                  />
                                  <button className="add-wide" onClick={() => attestContact(activeDossier, contact)}>
                                    NOUS L’AVONS CONTACTÉ
                                  </button>
                                </div>
                              ) : contact.status === "contacte" ? (
                                <div className="contact-declared">
                                  {contact.attestedAt && (
                                    <p className="contact-date">Vous avez déclaré l’avoir contactée le {new Date(contact.attestedAt).toLocaleDateString("fr-FR")}.</p>
                                  )}
                                  {contact.note && <p className="contact-note">« {contact.note} »</p>}
                                  <div className="contact-attest">
                                    <input
                                      value={note}
                                      onChange={(event) => setContactNotes((current) => ({ ...current, [contactKey]: event.target.value }))}
                                      placeholder="Sa réponse, en vos mots (optionnel)"
                                      maxLength={500}
                                      aria-label="Note sur la confirmation déclarée"
                                    />
                                    <button className="add-wide" onClick={() => confirmContact(activeDossier, contact)}>
                                      LE PROFESSIONNEL NOUS A CONFIRMÉ
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="contact-declared">
                                  {contact.attestedAt && (
                                    <p className="contact-date">Vous avez déclaré l’avoir contactée le {new Date(contact.attestedAt).toLocaleDateString("fr-FR")}.</p>
                                  )}
                                  {contact.confirmedAt && (
                                    <p className="contact-date">Vous déclarez que ce professionnel a confirmé, le {new Date(contact.confirmedAt).toLocaleDateString("fr-FR")}.</p>
                                  )}
                                  {contact.note && <p className="contact-note">« {contact.note} »</p>}
                                </div>
                              )}
                              <button
                                className="contact-remove"
                                onClick={() => removeContact(activeDossier, contact)}
                                aria-label="Retirer cette personne du dossier"
                              >×</button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const entry = wedding.dossiers[activeDossier.id];
                const parcours = buildDossierParcours(activeDossier);
                const progress = Math.min(entry?.parcoursProgress ?? 0, parcours.steps.length);
                const complete = progress >= parcours.steps.length;
                return (
                  <div className="editorial-block dossier-parcours">
                    <div className="section-with-note"><p className="block-title">VOTRE PARCOURS</p><span>{progress}/{parcours.steps.length}</span></div>
                    {progress === 0 && (
                      <p className="parcours-transition">Votre dossier est créé. Nous avons préparé un parcours pour vous.</p>
                    )}
                    <p className="parcours-lede">{parcours.lede}</p>
                    <ol className="parcours-steps">
                      {parcours.steps.map((step, index) => {
                        const done = index < progress;
                        const current = index === progress;
                        return (
                          <li key={step.title} className={done ? "parcours-done" : current ? "parcours-current" : ""}>
                            <b>{done ? "✓" : current ? "→" : "○"}</b>
                            <div>
                              <p>{step.title}</p>
                              {step.detail && <span>{step.detail}</span>}
                              {current && !complete && <em>maintenant</em>}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    {!complete ? (
                      <button className="add-wide" onClick={() => validateParcoursStep(activeDossier.id)}>
                        {progress === 0 ? "COMMENCER LE PARCOURS" : "VALIDER CETTE ÉTAPE"}
                      </button>
                    ) : (
                      <p className="parcours-complete">Vous avez parcouru ces {parcours.steps.length} étapes. Ce dossier est prêt pour la suite.</p>
                    )}
                  </div>
                );
              })()}

              <p className="dossier-next">Ce dossier pourra bientôt accueillir votre prestataire, votre contrat, vos documents et vos échéances — chaque couche n’arrivera que lorsqu’elle sera réellement nécessaire.</p>

              <button className="add-wide" onClick={() => { setActiveSubject(activeDossier); setActiveDossier(null); }}>
                REVOIR LA COUVERTURE
              </button>
              <button className="dossier-remove" onClick={() => { detachSubject(activeDossier.id); setActiveDossier(null); }}>
                Retirer ce dossier de mon mariage
              </button>
            </div>
          </article>
        </div>
      )}

      {toast && <div className="toast" role="status" aria-live="polite"><span>✓</span>{toast}<button onClick={() => setToast(null)} aria-label="Fermer la notification">×</button></div>}
    </main>
  );
}
