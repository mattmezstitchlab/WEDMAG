"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSubject,
  images,
  plannedCoverCount,
  publishedCoverCount,
  subjects,
  universes,
  type Subject,
  type WeddingStatus,
} from "@/lib/wedding-data";

type SelectionMap = Record<string, WeddingStatus>;

const storageKey = "world-wedding-magazine-project";

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

export default function HomePage() {
  const [project, setProject] = useState<SelectionMap>({});
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [universe, setUniverse] = useState("Tous");
  const [toast, setToast] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

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
      try {
        const response = await fetch("/api/wedding/selections");
        if (response.ok) {
          const payload = (await response.json()) as {
            selections?: { subjectId: string; status: WeddingStatus }[];
          };
          if (payload.selections?.length) {
            fromServer = Object.fromEntries(payload.selections.map((item) => [item.subjectId, item.status]));
          }
        }
      } catch {
        // Server persistence is progressive enhancement.
      }

      if (cancelled) return;
      // `current` wins: anything ticked while loading must not be discarded.
      setProject((current) => ({ ...fromServer, ...local, ...current }));
      setIsHydrated(true);
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

  const addSubject = (subject: Subject) => {
    if (project[subject.id]) {
      setDrawerOpen(true);
      return;
    }
    setProject((current) => ({ ...current, [subject.id]: "interested" }));
    syncSelection(subject.id, "interested");
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
    setToast(`${label} a été retiré.`);
  };

  const selectedSubjects = useMemo(
    () => Object.keys(project).map(getSubject).filter((subject): subject is Subject => Boolean(subject)),
    [project],
  );

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
          <b>{selectedSubjects.length}</b>
        </button>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="edition-label">ÉDITION MONDE · 2025—2026</p>
          <h1 id="hero-title">WORLD<br /><i>WEDDING</i><br />MAGAZINE</h1>
          <p className="hero-statement">365 couvertures pour découvrir votre mariage.</p>
          <div className="hero-actions">
            <button className="button button-fuchsia" onClick={scrollToMagazine}>FEUILLETER LE MAGAZINE <span>↓</span></button>
            <button className="button button-ghost" onClick={() => setDrawerOpen(true)}>MON MARIAGE <span>{selectedSubjects.length}</span></button>
          </div>
          <p className="hero-note">Je feuillette. Je coche ce qui m’intéresse.<br />Mon mariage se construit.</p>
        </div>

        <div className="hero-art" aria-label="Sélection de couvertures du magazine">
          <div className="hero-number">365</div>
          <article className="hero-cover cover-back" style={{ backgroundImage: `url(${images[4]})` }}>
            <CoverMark number={35} light />
            <strong>MARIAGE<br />À LA PLAGE</strong>
          </article>
          <article className="hero-cover cover-front" style={{ backgroundImage: `url(${images[0]})` }}>
            <CoverMark number={1} light />
            <div className="cover-front-title"><span>THE</span><strong>SAXOPHONISTE</strong><i>issue</i></div>
            <p>Le détail qui change l’air.</p>
          </article>
          <p className="hero-caption">DES IDÉES À FEUILLETER.<br />DES CHOIX À RELIER.</p>
        </div>
      </section>

      <section className="manifesto" id="method">
        <p className="section-kicker">UN MAGAZINE QUI VOUS SUIT</p>
        <div className="manifesto-grid">
          <h2>Un plaisir de<br /><i>découvrir.</i><br />Une manière simple<br />de choisir.</h2>
          <div className="manifesto-steps">
            <div><span>01</span><p>Feuilletez des couvertures, comme autant de portes d’entrée dans votre mariage.</p></div>
            <div><span>02</span><p>Un sujet vous parle ? Cochez-le. Il rejoint votre édition personnelle.</p></div>
            <div><span>03</span><p>Nous révélons les liens, les pistes et les détails à regarder ensemble.</p></div>
          </div>
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
                      <h3>{subject.title}</h3>
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

      <section className="closing-cta">
        <div className="closing-image" style={{ backgroundImage: `url(${images[3]})` }} />
        <div>
          <p className="section-kicker">VOTRE ÉDITION PERSONNELLE</p>
          <h2>Ce qui vous plaît<br />est déjà en train de<br /><i>faire projet.</i></h2>
          <button className="button button-light" onClick={() => setDrawerOpen(true)}>OUVRIR MON MARIAGE <span>{selectedSubjects.length}</span></button>
        </div>
      </section>

      <footer>
        <div className="wordmark footer-mark"><span>WORLD WEDDING</span><em>MAGAZINE</em></div>
        <p>365 couvertures pour découvrir tout ce qui peut composer un mariage.</p>
        <span>PARIS · LONDON · MILAN · WORLD</span>
      </footer>

      {activeSubject && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="subject-title">
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
              <div className="editorial-block plan-block"><p className="block-title">À PRÉVOIR</p><div className="tag-list">{activeSubject.toPlan.map((item) => <span key={item}>{item}</span>)}</div></div>
              <div className="editorial-block"><p className="block-title">ASSOCIÉ À</p><div className="relation-list">
                {activeSubject.related.map((id) => {
                  const related = getSubject(id);
                  return related ? <button key={id} onClick={() => setActiveSubject(related)}>{related.title} <span>↗</span></button> : null;
                })}
              </div></div>
              <div className="professional-line"><span>À DÉCOUVRIR AUSSI</span><p>{activeSubject.professionals[0].name} <em>— {activeSubject.professionals[0].role}, {activeSubject.professionals[0].city}</em></p></div>
              <button className={`add-wide ${project[activeSubject.id] ? "added" : ""}`} onClick={() => addSubject(activeSubject)}>
                {project[activeSubject.id] ? "✓ DANS MON MARIAGE — VOIR LE PROJET" : "+ AJOUTER À MON MARIAGE"}
              </button>
            </div>
          </article>
        </div>
      )}

      {drawerOpen && (
        <div className="drawer-layer" role="dialog" aria-modal="true" aria-labelledby="project-title">
          <button className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="Fermer Mon mariage" />
          <aside className="project-drawer">
            <div className="drawer-head">
              <div><p className="section-kicker">VOTRE ÉDITION PERSONNELLE</p><h2 id="project-title">MON<br /><i>MARIAGE.</i></h2></div>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Fermer">×</button>
            </div>
            <div className="project-line"><span>{selectedSubjects.length} ÉLÉMENT{selectedSubjects.length > 1 ? "S" : ""}</span><span>VOTRE PROJET SE DESSINE</span></div>

            {!selectedSubjects.length ? (
              <div className="project-empty">
                <p>Votre édition est encore blanche.</p>
                <span>Feuilletez les couvertures, cochez ce qui vous touche. Ici, les relations commenceront à apparaître.</span>
                <button className="button button-fuchsia" onClick={() => { setDrawerOpen(false); scrollToMagazine(); }}>FEUILLETER <span>↓</span></button>
              </div>
            ) : (
              <div className="project-content">
                <section className="project-section selected-section">
                  <p className="block-title">CE QUE VOUS AVEZ CHOISI</p>
                  <div className="project-selections">
                    {selectedSubjects.map((subject) => (
                      <article className="project-item" key={subject.id}>
                        <button className="project-thumb" style={{ backgroundImage: `url(${subject.image})` }} onClick={() => { setActiveSubject(subject); setDrawerOpen(false); }} aria-label={`Voir ${subject.title}`} />
                        <div className="project-item-main"><button onClick={() => { setActiveSubject(subject); setDrawerOpen(false); }}>{subject.title}</button><span>{subject.universe}</span></div>
                        <select value={project[subject.id]} onChange={(event) => updateStatus(subject.id, event.target.value as WeddingStatus)} className={statusClass(project[subject.id])} aria-label={`État de ${subject.title}`}>
                          <option value="interested">M’intéresse</option><option value="contacted">Contacté</option><option value="chosen">Choisi</option>
                        </select>
                        <button className="remove-item" onClick={() => removeSubject(subject.id)} aria-label={`Retirer ${subject.title}`}>×</button>
                      </article>
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

                {insights.suggestions.length > 0 && <section className="project-section suggestion-section">
                  <div className="section-with-note"><p className="block-title">ÉLÉMENTS ASSOCIÉS</p><span>LIENS ENTRE VOS CHOIX</span></div>
                  <div className="suggestion-list">{insights.suggestions.map(({ subject, links }) => <article key={subject.id}>
                    <div className="suggestion-image" style={{ backgroundImage: `url(${subject.image})` }} /><div><p>{subject.title}</p><span>Apparaît dans {links} relation{links > 1 ? "s" : ""}</span></div><button onClick={() => addSubject(subject)}>+</button>
                  </article>)}</div>
                </section>}

                <button className="back-to-magazine" onClick={() => { setDrawerOpen(false); scrollToMagazine(); }}>← CONTINUER À FEUILLETER</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {toast && <div className="toast"><span>✓</span>{toast}<button onClick={() => setToast(null)}>×</button></div>}
    </main>
  );
}
