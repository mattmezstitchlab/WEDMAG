export type WeddingStatus = "interested" | "contacted" | "chosen";

export type Subject = {
  id: string;
  coverNumber: number;
  title: string;
  eyebrow: string;
  universe: string;
  category: string;
  type: "Métier" | "Lieu" | "Service" | "Objet" | "Expérience" | "Inspiration";
  style: string;
  budget: "Essentiel" | "Signature" | "Exception";
  image: string;
  imagePosition?: string;
  intro: string;
  description: string;
  moments: string[];
  services: string[];
  brings: string[];
  toPlan: string[];
  constraints: string[];
  resources: string[];
  related: string[];
  professionals: { name: string; role: string; city: string }[];
};

export const images = [
  "https://images.pexels.com/photos/28815661/pexels-photo-28815661.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=900",
  "https://images.pexels.com/photos/32632264/pexels-photo-32632264.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=900",
  "https://images.pexels.com/photos/31573559/pexels-photo-31573559.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=900",
  "https://images.pexels.com/photos/10256498/pexels-photo-10256498.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=900",
  "https://images.pexels.com/photos/34362976/pexels-photo-34362976.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=900",
  "https://images.pexels.com/photos/16762673/pexels-photo-16762673.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=900",
  "https://images.pexels.com/photos/34746774/pexels-photo-34746774.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=900",
  "https://images.pexels.com/photos/8516921/pexels-photo-8516921.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=900",
];

const pro = (name: string, role: string, city: string) => ({ name, role, city });

export const subjects: Subject[] = [
  {
    id: "saxophoniste", coverNumber: 1, title: "Saxophoniste", eyebrow: "Le détail qui change l’air", universe: "Musique", category: "Live", type: "Métier", style: "Solaire", budget: "Signature", image: images[0],
    intro: "Une présence live, libre et immédiate — du premier verre à la dernière danse.",
    description: "Le saxophoniste ne définit pas une ambiance à lui seul. Il la fait respirer. En solo à la cérémonie, au milieu des invités pendant le cocktail ou aux côtés d’un DJ, il introduit une chaleur organique dans les temps forts de la journée.",
    moments: ["Cérémonie", "Cocktail", "Dîner", "Première danse", "Soirée"], services: ["Prestation live", "Set cocktail", "Cérémonie sur mesure", "Accompagnement DJ", "Intervention surprise"], brings: ["Une émotion immédiate", "Un rythme vivant", "Une transition mémorable"], toPlan: ["L’espace de jeu", "Les accès", "Les horaires d’intervention", "Le répertoire"], constraints: ["Sonorisation éventuelle", "Alimentation électrique", "Niveau sonore autorisé"], resources: ["Espace scène", "Prise électrique", "Système audio"], related: ["dj", "chateau", "ceremonie-laique", "eclairage"], professionals: [pro("Léo Hartmann", "Saxophoniste live", "Paris"), pro("Golden Notes", "Collectif musical", "Lyon")]
  },
  {
    id: "chateau", coverNumber: 2, title: "Château", eyebrow: "Le lieu devient récit", universe: "Lieux", category: "Réception", type: "Lieu", style: "Patrimoine", budget: "Exception", image: images[4],
    intro: "Des murs, des perspectives et une journée entière pour imaginer votre propre usage du lieu.",
    description: "Un château est bien davantage qu’un décor. Son parc, ses salons, ses accès et sa lumière influencent le rythme du mariage. C’est le point de départ d’une composition : cérémonie, dîner, nuit, lendemain.",
    moments: ["Préparatifs", "Cérémonie", "Cocktail", "Dîner", "Soirée", "Lendemain"], services: ["Privatisation", "Hébergement", "Mise à disposition du parc", "Coordination sur place"], brings: ["Une architecture forte", "Des séquences multiples", "Un cadre pour recevoir"], toPlan: ["Le plan B météo", "Le stationnement", "Les horaires", "Les hébergements"], constraints: ["Restrictions sonores", "Accès prestataires", "Assurance", "Capacité d’accueil"], resources: ["Parking", "Électricité", "Mobilier", "Espace traiteur"], related: ["traiteur", "fleuriste", "mobilier", "dj", "photographe", "hebergement", "eclairage"], professionals: [pro("Château de Vaumarcé", "Domaine de réception", "Val de Loire"), pro("Les Terres Hautes", "Domaine & hôtellerie", "Provence")]
  },
  {
    id: "traiteur", coverNumber: 3, title: "Traiteur", eyebrow: "Le goût, en mouvement", universe: "Restauration", category: "Cuisine", type: "Métier", style: "Contemporain", budget: "Signature", image: images[3],
    intro: "Un repas qui tient autant à son tempo qu’à ses assiettes.",
    description: "Du verre d’accueil au brunch du lendemain, le traiteur compose une hospitalité. Les formats — dîner servi, grandes tablées, stations culinaires — racontent chacun une façon différente de réunir les invités.",
    moments: ["Cocktail", "Dîner", "Brunch"], services: ["Cocktail dînatoire", "Dîner servi", "Ateliers culinaires", "Brunch", "Équipe de salle"], brings: ["Un fil gourmand", "Le soin de l’accueil", "Le rythme du repas"], toPlan: ["Le nombre d’invités", "Les régimes alimentaires", "Le timing", "La dégustation"], constraints: ["Office de cuisine", "Chambre froide", "Accès livraison", "Eau"], resources: ["Cuisine", "Tables", "Verrerie", "Électricité"], related: ["chateau", "wedding-cake", "bar", "mobilier", "papeterie"], professionals: [pro("Studio Culinaire", "Traiteur créatif", "Paris"), pro("Nourrir l’Instant", "Cuisine de réception", "Bordeaux")]
  },
  {
    id: "dj", coverNumber: 4, title: "DJ", eyebrow: "La nuit commence ici", universe: "Musique", category: "Soirée", type: "Métier", style: "Électrique", budget: "Signature", image: images[7],
    intro: "Une direction musicale précise, pour faire basculer la réception en fête.",
    description: "Un bon DJ lit une salle sans l’écraser. Il relie les générations, accompagne les changements de lumière et imagine une énergie qui appartient au couple plutôt qu’à une playlist préfabriquée.",
    moments: ["Cocktail", "Dîner", "Première danse", "Soirée"], services: ["DJ set", "Direction musicale", "Sonorisation", "Lumière de soirée", "Micro cérémonie"], brings: ["Un fil musical", "Une piste vivante", "Des transitions fluides"], toPlan: ["Les goûts musicaux", "Le déroulé", "Le matériel", "Les titres importants"], constraints: ["Coupure sonore", "Puissance électrique", "Montage", "Acoustique"], resources: ["Régie DJ", "Électricité", "Espace danse", "Éclairage"], related: ["saxophoniste", "chateau", "eclairage", "ceremonie-laique", "photographe"], professionals: [pro("Mina Moods", "DJ & direction musicale", "Paris"), pro("Atelier Tempo", "Collectif DJ", "Marseille")]
  },
  {
    id: "photographe", coverNumber: 5, title: "Photographe", eyebrow: "Ce qui restera", universe: "Image", category: "Photographie", type: "Métier", style: "Documentaire", budget: "Signature", image: images[1],
    intro: "Regarder la journée de près, sans jamais la faire sortir de son cours.",
    description: "Le photographe construit une mémoire avant de livrer des images. Des préparatifs au dernier verre, sa présence est une manière de préserver les gestes, les regards et l’énergie d’une journée impossible à rejouer.",
    moments: ["Préparatifs", "Cérémonie", "Couple", "Cocktail", "Dîner", "Soirée"], services: ["Reportage journée", "Séance couple", "Argentique", "Album", "Second photographe"], brings: ["Une mémoire sensible", "Les détails invisibles", "Un récit à transmettre"], toPlan: ["Le temps de couple", "La liste famille", "La lumière", "Les autorisations"], constraints: ["Droit à l’image", "Accès aux lieux", "Lumière basse", "Timing"], resources: ["Espace préparation", "Temps dédié", "Plan de journée"], related: ["videaste", "chateau", "ceremonie-laique"], professionals: [pro("Camille Novae", "Photographe documentaire", "Paris"), pro("Noor Studio", "Photo & argentique", "Nice")]
  },
  {
    id: "ceremonie-laique", coverNumber: 6, title: "Cérémonie laïque", eyebrow: "Inventer son oui", universe: "Cérémonie", category: "Engagement", type: "Expérience", style: "Intime", budget: "Essentiel", image: images[5],
    intro: "Une séquence écrite à votre mesure, dans le lieu et avec les mots qui vous ressemblent.",
    description: "Une cérémonie laïque laisse la place à une voix, à des proches, à une musique et à un rituel. Sa force est dans son rythme : suffisamment préparée pour être simple, suffisamment libre pour être juste.",
    moments: ["Cérémonie"], services: ["Écriture", "Officiant", "Rituel symbolique", "Musique live", "Coordination"], brings: ["Un moment personnel", "La voix des proches", "Un commencement fort"], toPlan: ["Les prises de parole", "La durée", "Le plan de pluie", "Le son"], constraints: ["Chaises", "Microphones", "Météo", "Accessibilité"], resources: ["Arche", "Assises", "Sonorisation", "Ombre"], related: ["officiant", "saxophoniste", "fleuriste", "chateau", "papeterie"], professionals: [pro("Ariane Verne", "Officiante", "France"), pro("Words & Vows", "Cérémonies écrites", "Bruxelles")]
  },
  {
    id: "fleuriste", coverNumber: 7, title: "Fleuriste", eyebrow: "Le vivant, placé juste", universe: "Fleurs", category: "Design floral", type: "Métier", style: "Sauvage", budget: "Signature", image: images[5],
    intro: "Bouquet, gestes de table, arche : une seule écriture botanique pour faire tenir l’ensemble.",
    description: "Le fleuriste transforme une palette et une saison en présence. La fleur ne sert pas à remplir : elle guide les regards, anime une table et relie la cérémonie à la fête.",
    moments: ["Préparatifs", "Cérémonie", "Cocktail", "Dîner"], services: ["Bouquet", "Arche", "Centres de table", "Boutonnières", "Installation"], brings: ["Une palette vivante", "Du rythme dans l’espace", "Des gestes à photographier"], toPlan: ["La saison", "Les volumes", "La réutilisation", "La livraison"], constraints: ["Chaleur", "Eau", "Temps de pose", "Démontage"], resources: ["Vases", "Points d’eau", "Stockage frais"], related: ["chateau", "ceremonie-laique", "decorateur", "photographe", "wedding-cake"], professionals: [pro("Herbier Moderne", "Design floral", "Paris"), pro("Maison Pollen", "Fleurs de saison", "Lille")]
  },
  {
    id: "wedding-cake", coverNumber: 8, title: "Wedding cake", eyebrow: "Le dernier geste sucré", universe: "Gâteau", category: "Pâtisserie", type: "Service", style: "Sculptural", budget: "Signature", image: images[2],
    intro: "Une pièce à regarder, partager, photographier — avant même d’être dégustée.",
    description: "Le wedding cake joue un rôle de ponctuation. Il peut rejoindre le dîner, ouvrir la soirée ou devenir le centre d’une table de desserts pensée comme un décor.",
    moments: ["Dîner", "Soirée", "Brunch"], services: ["Gâteau sur mesure", "Table de desserts", "Décor comestible", "Livraison"], brings: ["Un final visuel", "Un rituel de partage", "Une signature gourmande"], toPlan: ["Le nombre de parts", "Le style", "Le moment de découpe", "La conservation"], constraints: ["Réfrigération", "Table stable", "Accès livraison", "Température"], resources: ["Table gâteau", "Chambre froide", "Couteau de découpe"], related: ["traiteur", "fleuriste", "photographe", "papeterie", "bar"], professionals: [pro("Clara Gâteaux", "Pâtisserie sur mesure", "Paris"), pro("Atelier Crème", "Pâtisserie événementielle", "Lyon")]
  },
  {
    id: "videaste", coverNumber: 9, title: "Vidéaste", eyebrow: "L’émotion en mouvement", universe: "Image", category: "Film", type: "Métier", style: "Cinématique", budget: "Signature", image: images[0],
    intro: "Le son des vœux, un voile qui traverse le cadre, le mouvement d’une fête : tout ce que l’image fixe ne dit pas.",
    description: "Le film de mariage n’est pas un résumé. C’est une interprétation vivante de la journée, nourrie de voix, de sons et de séquences qui seront différentes à chaque revisionnage.",
    moments: ["Préparatifs", "Cérémonie", "Cocktail", "Soirée"], services: ["Film long", "Teaser", "Super 8", "Prises de son", "Drone"], brings: ["Des voix conservées", "Une mémoire en mouvement", "Un autre regard"], toPlan: ["La présence photo", "Le déroulé", "Les autorisations", "Le son des vœux"], constraints: ["Droit à l’image", "Drone autorisé", "Lumière", "Espace de travail"], resources: ["Prises électriques", "Accès", "Plan de journée"], related: ["photographe", "ceremonie-laique", "dj", "drone"], professionals: [pro("Hors Champ Films", "Film documentaire", "Bordeaux"), pro("Studio Slow", "Super 8 & vidéo", "Paris")]
  },
  {
    id: "decorateur", coverNumber: 10, title: "Scénographie", eyebrow: "Donner une ligne au lieu", universe: "Décoration", category: "Design", type: "Métier", style: "Éditorial", budget: "Exception", image: images[2],
    intro: "Mobilier, matières, signes : l’art de rendre un lieu profondément vôtre.",
    description: "La scénographie dessine un parcours, du premier accueil à la dernière table. Elle ne masque pas un lieu : elle trouve sa ligne de dialogue avec lui.",
    moments: ["Cérémonie", "Cocktail", "Dîner", "Soirée"], services: ["Direction artistique", "Plans de tables", "Installation", "Location mobilier", "Signalétique"], brings: ["Une vision cohérente", "Des espaces lisibles", "Un décor habité"], toPlan: ["Les flux", "La palette", "Les dimensions", "Le démontage"], constraints: ["Accès camion", "Temps de montage", "Sécurité", "Stockage"], resources: ["Mobilier", "Éclairage", "Équipe de pose"], related: ["fleuriste", "mobilier", "eclairage", "chateau", "papeterie"], professionals: [pro("Bureau Forme", "Scénographie", "Paris"), pro("Les Assemblages", "Design d’événements", "Nantes")]
  },
  {
    id: "robe", coverNumber: 11, title: "La robe", eyebrow: "Une allure, à votre façon", universe: "Mode", category: "Mariée", type: "Objet", style: "Couture", budget: "Exception", image: images[2],
    intro: "Le vêtement n’achève pas une silhouette : il ouvre une manière d’habiter sa journée.",
    description: "Choisir une robe, c’est imaginer le mouvement, la lumière, la météo, la danse. Entre création sur mesure et sélection de maison, l’essentiel est dans ce que l’on ressent quand on l’oublie enfin.",
    moments: ["Préparatifs", "Cérémonie", "Dîner", "Soirée"], services: ["Sur mesure", "Retouches", "Voile", "Deuxième tenue", "Essayages"], brings: ["Une allure personnelle", "Une mémoire tactile", "La liberté de bouger"], toPlan: ["Les essayages", "Les chaussures", "La météo", "La tenue de soirée"], constraints: ["Délais atelier", "Transport", "Retouches", "Confort"], resources: ["Housse", "Miroir", "Espace préparation"], related: ["coiffure", "maquillage", "bijoux", "photographe"], professionals: [pro("Atelier June", "Créatrice", "Paris"), pro("Nara Studio", "Maison de robe", "Bruxelles")]
  },
  {
    id: "costume", coverNumber: 12, title: "Le costume", eyebrow: "La coupe du jour", universe: "Mode", category: "Marié", type: "Objet", style: "Tailoring", budget: "Signature", image: images[6],
    intro: "Une silhouette précise qui gagne en caractère à mesure que la journée avance.",
    description: "Un costume de mariage se choisit par son tombé, mais se confirme dans le mouvement. Les bons détails restent discrets : une matière, une coupe, une paire de souliers qui tient toute une nuit.",
    moments: ["Préparatifs", "Cérémonie", "Dîner", "Soirée"], services: ["Sur mesure", "Retouches", "Accessoires", "Essayage privé"], brings: ["Une présence affirmée", "Du confort", "Un style intemporel"], toPlan: ["Les délais", "Les chaussures", "Les accessoires", "Le second look"], constraints: ["Retouches", "Saison", "Transport", "Confort"], resources: ["Housse", "Miroir", "Espace préparation"], related: ["robe", "coiffure", "photographe", "bijoux", "papeterie"], professionals: [pro("Ligne 13", "Tailleur", "Paris"), pro("Atelier Nord", "Costume sur mesure", "Lyon")]
  },
  {
    id: "coiffure", coverNumber: 13, title: "Coiffure", eyebrow: "La touche qui tient", universe: "Beauté", category: "Mise en beauté", type: "Métier", style: "Naturel", budget: "Essentiel", image: images[1],
    intro: "Une coiffure qui accompagne la journée, plutôt qu’elle ne la fige.",
    description: "La mise en beauté est un temps à soi avant la fête. Essai, texture, accessoires et rythme du matin permettent d’imaginer une coiffure fidèle à votre allure et stable jusqu’à la dernière image.",
    moments: ["Préparatifs", "Cérémonie", "Soirée"], services: ["Essai", "Coiffure jour J", "Retouches", "Accessoires cheveux"], brings: ["Un temps de préparation", "Une cohérence de silhouette", "De la confiance"], toPlan: ["L’essai", "Le lieu de préparation", "Le timing", "Les accessoires"], constraints: ["Lumière", "Prise électrique", "Temps disponible"], resources: ["Miroir", "Chaise", "Électricité"], related: ["maquillage", "robe", "photographe", "bijoux", "fleuriste"], professionals: [pro("Anna Faye", "Hair artist", "Paris"), pro("Studio Lisse", "Coiffure événementielle", "Nice")]
  },
  {
    id: "maquillage", coverNumber: 14, title: "Maquillage", eyebrow: "Le visage, en lumière", universe: "Beauté", category: "Mise en beauté", type: "Métier", style: "Lumineux", budget: "Essentiel", image: images[1],
    intro: "Une mise en beauté pensée pour être vue de près, vécue longtemps et photographiée partout.",
    description: "Un maquillage de mariage s’accorde à la peau, à la lumière du lieu et à l’énergie de la personne qui le porte. L’essai est le moment où l’on fait coïncider ces trois choses.",
    moments: ["Préparatifs", "Cérémonie", "Soirée"], services: ["Essai", "Maquillage jour J", "Retouches", "Mise en beauté invités"], brings: ["Une lumière maîtrisée", "Un rituel de calme", "Un rendu photo naturel"], toPlan: ["L’essai", "Les soins préparatoires", "Le timing", "Les retouches"], constraints: ["Lumière naturelle", "Hygiène", "Espace calme"], resources: ["Miroir", "Chaise", "Lumière"], related: ["coiffure", "robe", "photographe", "preparatifs", "bijoux"], professionals: [pro("Lina Caron", "Make-up artist", "Paris"), pro("Peau Studio", "Mise en beauté", "Lille")]
  },
  {
    id: "papeterie", coverNumber: 15, title: "Papeterie", eyebrow: "Le premier signe", universe: "Papeterie", category: "Imprimés", type: "Service", style: "Graphique", budget: "Essentiel", image: images[7],
    intro: "Avant même le lieu, une lettre de votre mariage arrive chez vos invités.",
    description: "Du save the date au menu, la papeterie construit une voix. Elle peut être minimale, tactile, typographique ou illustrée : l’important est qu’elle donne le ton sans tout raconter.",
    moments: ["Avant le mariage", "Cérémonie", "Dîner", "Après le mariage"], services: ["Faire-part", "Menus", "Plan de table", "Marque-places", "Remerciements"], brings: ["Une identité", "Des repères invités", "Un souvenir papier"], toPlan: ["Les adresses", "Le plan de table", "Les délais", "Les textes"], constraints: ["Impression", "Délais postaux", "Corrections", "Quantités"], resources: ["Fichiers invités", "Imprimeur", "Signalétique"], related: ["decorateur", "traiteur", "ceremonie-laique", "wedding-cake", "photographe"], professionals: [pro("Éditions Épure", "Papeterie", "Paris"), pro("Le Trait Juste", "Studio graphique", "Bordeaux")]
  },
  {
    id: "bar", coverNumber: 16, title: "Bar à cocktails", eyebrow: "L’accueil a son verre", universe: "Boissons", category: "Bar", type: "Service", style: "Festif", budget: "Signature", image: images[3],
    intro: "Un cocktail bien pensé est une façon de donner le premier tempo de la fête.",
    description: "Bar mobile, cocktails signatures, champagne ou sélection de vins : les boissons accompagnent les passages de la journée. Elles peuvent être discrètes ou devenir un rendez-vous à part entière.",
    moments: ["Cocktail", "Dîner", "Soirée", "Brunch"], services: ["Cocktails signatures", "Bar mobile", "Service champagne", "Sans alcool", "Mixologie"], brings: ["Un geste d’accueil", "Une expérience partagée", "Un détail vivant"], toPlan: ["Les quantités", "Les options sans alcool", "Le timing", "Le verre"], constraints: ["Licence", "Eau", "Glace", "Stockage"], resources: ["Comptoir", "Réfrigération", "Verrerie"], related: ["traiteur", "chateau", "dj", "mobilier"], professionals: [pro("Miroir Bar", "Cocktails & service", "Paris"), pro("Le Comptoir Nomade", "Bar mobile", "Lyon")]
  },
  {
    id: "mobilier", coverNumber: 17, title: "Mobilier", eyebrow: "Recevoir avec intention", universe: "Décoration", category: "Location", type: "Objet", style: "Design", budget: "Signature", image: images[7],
    intro: "Assises, tables et matières changent la façon dont les invités se rencontrent.",
    description: "Le mobilier compose l’hospitalité. Une grande tablée, un salon bas, quelques bancs sous les arbres : ces choix définissent les conversations et les mouvements de la fête.",
    moments: ["Cérémonie", "Cocktail", "Dîner", "Soirée"], services: ["Location tables", "Assises", "Art de la table", "Salons", "Livraison"], brings: ["Du confort", "Un rythme spatial", "Une vraie signature"], toPlan: ["Le nombre d’invités", "Les plans", "Les livraisons", "Le démontage"], constraints: ["Accès camion", "Sol", "Stockage", "Montage"], resources: ["Plan d’implantation", "Équipe de pose", "Accès"], related: ["decorateur", "chateau", "traiteur", "eclairage", "ceremonie-laique"], professionals: [pro("Formes Libres", "Location design", "Paris"), pro("Tableau Studio", "Mobilier de réception", "Lyon")]
  },
  {
    id: "eclairage", coverNumber: 18, title: "Éclairage", eyebrow: "La nuit, bien vue", universe: "Décoration", category: "Lumière", type: "Service", style: "Nocturne", budget: "Signature", image: images[4],
    intro: "Quand la lumière baisse, le lieu peut commencer une autre histoire.",
    description: "L’éclairage fait passer une réception de l’après-midi à la nuit. Guirlandes, bougies, projecteurs doux ou lumière de piste : chaque source crée un usage et une émotion.",
    moments: ["Cérémonie", "Cocktail", "Dîner", "Soirée"], services: ["Lumière architecturale", "Piste de danse", "Guirlandes", "Bougies", "Régie"], brings: ["De la profondeur", "De la sécurité", "Une atmosphère nocturne"], toPlan: ["Les zones à éclairer", "Le coucher du soleil", "Les couleurs", "Le montage"], constraints: ["Électricité", "Sécurité", "Extérieur", "Coupure sonore"], resources: ["Puissance électrique", "Accès technique", "Échelle"], related: ["dj", "decorateur", "chateau", "photographe", "mobilier"], professionals: [pro("Lumen Club", "Design lumière", "Paris"), pro("Nuit Blanche", "Éclairage événementiel", "Aix")]
  },
  {
    id: "officiant", coverNumber: 19, title: "Officiant", eyebrow: "Faire entendre l’essentiel", universe: "Cérémonie", category: "Engagement", type: "Métier", style: "Littéraire", budget: "Essentiel", image: images[5],
    intro: "Une voix qui relie vos histoires, vos proches et l’instant où vous vous engagez.",
    description: "L’officiant écoute avant d’écrire. Il trouve la juste place entre les mots préparés et ce qui arrive réellement, pour que la cérémonie reste intime même au milieu de tous.",
    moments: ["Cérémonie"], services: ["Entretiens", "Écriture", "Animation", "Rituels", "Coordination des proches"], brings: ["Un récit singulier", "Un cadre apaisant", "Des paroles justes"], toPlan: ["Les rendez-vous", "Les intervenants", "Le texte", "Le son"], constraints: ["Microphones", "Météo", "Durée", "Accessibilité"], resources: ["Sonorisation", "Chaises", "Pupitre"], related: ["ceremonie-laique", "saxophoniste", "fleuriste", "papeterie", "chateau"], professionals: [pro("Ariane Verne", "Officiante", "France"), pro("Les Mots Dits", "Officiant & écriture", "Paris")]
  },
  {
    id: "hebergement", coverNumber: 20, title: "Hébergement", eyebrow: "Prolonger la parenthèse", universe: "Lieux", category: "Hospitalité", type: "Service", style: "Slow", budget: "Signature", image: images[0],
    intro: "Une nuit sur place transforme une réception en véritable week-end partagé.",
    description: "Prévoir où dorment les proches, c’est prolonger les conversations et alléger les départs. Des chambres sur site, des navettes et un brunch peuvent créer une expérience de mariage plus vaste que la soirée.",
    moments: ["Veille du mariage", "Soirée", "Lendemain"], services: ["Chambres sur place", "Bloc hôtel", "Accueil invités", "Petit-déjeuner", "Brunch"], brings: ["Du temps ensemble", "Une logistique douce", "Un lendemain facile"], toPlan: ["Les réservations", "Les chambres prioritaires", "Les navettes", "Le petit-déjeuner"], constraints: ["Capacité", "Check-in", "Accessibilité", "Bruit"], resources: ["Liste invités", "Transport", "Signalétique"], related: ["chateau", "transport", "brunch", "wedding-planner", "invites"], professionals: [pro("Maison des Rives", "Hôtellerie de charme", "Bourgogne"), pro("Le Grand Week-end", "Conciergerie", "France")]
  },
  {
    id: "transport", coverNumber: 21, title: "Transport", eyebrow: "Le passage entre les lieux", universe: "Transport", category: "Mobilité", type: "Service", style: "Pratique", budget: "Essentiel", image: images[6],
    intro: "Le bon trajet disparaît — et laisse aux invités le plaisir d’être là, simplement.",
    description: "Voiture d’arrivée, navettes de nuit, transport PMR : organiser les déplacements est un détail qui rend la journée fluide pour tout le monde.",
    moments: ["Avant le mariage", "Cérémonie", "Soirée", "Lendemain"], services: ["Voiture avec chauffeur", "Navettes", "Bus invités", "Transport PMR", "Vélos"], brings: ["Des arrivées sereines", "Une fête plus sûre", "De l’attention aux invités"], toPlan: ["Les horaires", "Les trajets", "Les personnes prioritaires", "Les retours"], constraints: ["Permis", "Parking", "Accès", "Capacité"], resources: ["Itinéraires", "Signalétique", "Liste passagers"], related: ["chateau", "hebergement", "invites", "wedding-planner", "parking"], professionals: [pro("Bonsoir Navettes", "Transport invités", "Paris"), pro("Moteur Doux", "Chauffeur privé", "Lyon")]
  },
  {
    id: "wedding-planner", coverNumber: 22, title: "Wedding planner", eyebrow: "Tenir le fil", universe: "Organisation", category: "Coordination", type: "Métier", style: "Précis", budget: "Signature", image: images[7],
    intro: "Une personne pour regarder l’ensemble, afin que vous restiez dans votre journée.",
    description: "Le wedding planner est le point de passage entre vos envies et leur exécution. Il orchestre les interlocuteurs, anticipe les flux et vous rend disponible à ce qui compte vraiment.",
    moments: ["Avant le mariage", "Préparatifs", "Cérémonie", "Dîner", "Soirée"], services: ["Conception", "Recherche prestataires", "Budget", "Coordination jour J", "Production"], brings: ["De la clarté", "Du temps", "Un projet cohérent"], toPlan: ["Le brief", "Les priorités", "Le budget", "Le calendrier"], constraints: ["Disponibilités", "Contrats", "Assurances", "Délais"], resources: ["Planning", "Contacts", "Plan B"], related: ["chateau", "traiteur", "decorateur", "transport", "securite"], professionals: [pro("Studio Serein", "Wedding planning", "Paris"), pro("Les Jours Clairs", "Coordination", "Bordeaux")]
  },
  {
    id: "photobooth", coverNumber: 23, title: "Photobooth", eyebrow: "Des images qui circulent", universe: "Animations", category: "Photo", type: "Expérience", style: "Spontané", budget: "Essentiel", image: images[3],
    intro: "L’appareil devient un prétexte pour réunir les générations, une pose après l’autre.",
    description: "Un photobooth peut être graphique, argentique, discret ou joyeusement excessif. Il laisse aux invités leur propre angle sur la fête et offre des souvenirs qui sortent immédiatement des téléphones.",
    moments: ["Cocktail", "Dîner", "Soirée"], services: ["Tirages instantanés", "Studio portrait", "Livre d’or photo", "Galerie digitale"], brings: ["De l’interaction", "Des souvenirs immédiats", "Des images inattendues"], toPlan: ["L’emplacement", "Le fond", "Les tirages", "La livraison"], constraints: ["Électricité", "Espace", "Réseau", "Accès"], resources: ["Prise", "Table", "Fond photo"], related: ["photographe", "decorateur", "livre-or", "dj"], professionals: [pro("Flash Club", "Photobooth", "Paris"), pro("Pose Studio", "Portrait instantané", "Lyon")]
  },
  {
    id: "groupe-live", coverNumber: 24, title: "Groupe live", eyebrow: "Un refrain collectif", universe: "Musique", category: "Live", type: "Métier", style: "Généreux", budget: "Exception", image: images[3],
    intro: "Un groupe qui transforme le dîner ou la soirée en moment de scène partagé.",
    description: "Pop, soul, jazz ou musique du monde : un groupe live apporte une présence physique et une générosité qui se propage très vite dans une salle.",
    moments: ["Cocktail", "Dîner", "Soirée"], services: ["Duo acoustique", "Groupe soirée", "Première danse live", "Reprises sur mesure"], brings: ["Une énergie collective", "De l’imprévu", "Une scène partagée"], toPlan: ["Le répertoire", "Les balances", "L’espace", "Les transitions"], constraints: ["Sonorisation", "Loges", "Électricité", "Niveau sonore"], resources: ["Scène", "Régie", "Accès technique"], related: ["dj", "saxophoniste", "chateau", "eclairage", "ceremonie-laique"], professionals: [pro("The Kind of Blue", "Groupe live", "Paris"), pro("Sunday Players", "Soul & pop", "Lyon")]
  },
  {
    id: "brunch", coverNumber: 25, title: "Le lendemain", eyebrow: "Rester un peu", universe: "Restauration", category: "Brunch", type: "Expérience", style: "Détendu", budget: "Essentiel", image: images[0],
    intro: "Une dernière tablée, plus douce, pour raconter la nuit et se retrouver autrement.",
    description: "Le brunch libère le lendemain de l’obligation. Café, musique douce, repas tardif et visages encore heureux : il offre une sortie de fête sans vraiment avoir à se quitter.",
    moments: ["Lendemain"], services: ["Brunch buffet", "Café nomade", "Food truck", "Déjeuner au jardin"], brings: ["Un temps en plus", "Une sortie douce", "Des conversations lentes"], toPlan: ["Le nombre de présents", "Les horaires", "Le lieu", "Le rangement"], constraints: ["Fatigue équipes", "Météo", "Réservation", "Nettoyage"], resources: ["Tables", "Cuisine", "Ombre"], related: ["traiteur", "hebergement", "chateau", "transport", "photographe"], professionals: [pro("Bonjour Club", "Brunch de réception", "Provence"), pro("Nourrir l’Instant", "Cuisine de réception", "Bordeaux")]
  },
  {
    id: "bijoux", coverNumber: 26, title: "Bijoux", eyebrow: "Les signes qui restent", universe: "Mode", category: "Accessoires", type: "Objet", style: "Intemporel", budget: "Signature", image: images[5],
    intro: "Des pièces proches du corps, choisies pour cette journée et toutes celles qui suivent.",
    description: "Alliance, boucle d’oreille, pièce de famille ou création unique : les bijoux ponctuent une silhouette et deviennent, souvent, la trace matérielle la plus durable du jour.",
    moments: ["Préparatifs", "Cérémonie", "Dîner"], services: ["Alliances", "Création sur mesure", "Gravure", "Prêt de bijoux"], brings: ["Une trace intime", "Une histoire familiale", "Un détail lumineux"], toPlan: ["Les tailles", "La gravure", "L’assurance", "La livraison"], constraints: ["Délais atelier", "Sécurité", "Ajustement"], resources: ["Écrin", "Assurance"], related: ["robe", "costume", "coiffure", "photographe", "ceremonie-laique"], professionals: [pro("Orphée Atelier", "Joaillerie", "Paris"), pro("Ligne d’Or", "Alliances", "Lyon")]
  },
  {
    id: "livre-or", coverNumber: 27, title: "Livre d’or", eyebrow: "Vos proches, en mots", universe: "Souvenirs", category: "Mémoire", type: "Objet", style: "Tactile", budget: "Essentiel", image: images[7],
    intro: "Un objet discret, ouvert toute la soirée, qui vous rendra leurs voix bien après.",
    description: "Papier, polaroids, messages audio ou vidéo : le livre d’or ne demande qu’un geste aux invités. Son intérêt est justement dans ces mots qui n’auraient peut-être jamais été dits autrement.",
    moments: ["Cocktail", "Dîner", "Soirée"], services: ["Livre papier", "Messages audio", "Livre photo", "Personnalisation"], brings: ["Des voix conservées", "Un rituel doux", "Un souvenir collectif"], toPlan: ["L’emplacement", "Les consignes", "Le matériel", "La récupération"], constraints: ["Espace calme", "Stylo", "Batterie", "Signalétique"], resources: ["Table", "Éclairage", "Papeterie"], related: ["photobooth", "papeterie", "decorateur", "photographe"], professionals: [pro("Mémoires Parlées", "Livre d’or audio", "Paris"), pro("Papier Souvenir", "Objets imprimés", "Lyon")]
  },
  {
    id: "invites", coverNumber: 28, title: "Invités & attention", eyebrow: "Recevoir chacun", universe: "Invités", category: "Hospitalité", type: "Service", style: "Attentionné", budget: "Essentiel", image: images[0],
    intro: "Penser aux enfants, aux aînés et à toutes les façons d’être présent rend la fête plus ouverte.",
    description: "L’hospitalité se joue dans les détails : une navette, un coin calme, un repas adapté, une attention aux personnes à mobilité réduite. Des choix discrets qui changent profondément l’expérience.",
    moments: ["Avant le mariage", "Cérémonie", "Dîner", "Soirée"], services: ["Accueil enfants", "Accessibilité", "Garde d’enfants", "Coin calme", "Conciergerie"], brings: ["Une fête inclusive", "Du confort pour tous", "Des invités disponibles"], toPlan: ["Les besoins spécifiques", "Les enfants", "Les aînés", "Les trajets"], constraints: ["PMR", "Allergies", "Sécurité", "Horaires"], resources: ["Assises", "Signalétique", "Transport"], related: ["transport", "hebergement", "traiteur", "chateau", "wedding-planner"], professionals: [pro("Les Petits Convives", "Animation enfants", "France"), pro("Grand Angle", "Accessibilité événementielle", "Paris")]
  },
  {
    id: "securite", coverNumber: 29, title: "Sécurité", eyebrow: "La tranquillité, en coulisses", universe: "Logistique", category: "Production", type: "Service", style: "Discret", budget: "Essentiel", image: images[6],
    intro: "Parce qu’une fête se savoure mieux quand l’essentiel est anticipé, sans être visible.",
    description: "Gestion des accès, sécurité de nuit, premiers secours et circulation : la production permet à chacun de vivre l’événement avec une vraie légèreté.",
    moments: ["Cérémonie", "Dîner", "Soirée"], services: ["Gestion accès", "Sécurité soirée", "Prévention", "Coordination technique"], brings: ["De la sérénité", "Des flux fluides", "Une fête protégée"], toPlan: ["La jauge", "Les accès", "Les horaires", "Les contacts d’urgence"], constraints: ["Réglementation", "Assurance", "Évacuation", "Voisinage"], resources: ["Plan de site", "Éclairage", "Parking"], related: ["chateau", "wedding-planner", "transport", "eclairage", "assurance"], professionals: [pro("Veille Studio", "Production événementielle", "Paris"), pro("Nuit Sûre", "Sécurité réception", "Lyon")]
  },
  {
    id: "assurance", coverNumber: 30, title: "Assurance", eyebrow: "Prévoir sans assombrir", universe: "Administratif", category: "Protection", type: "Service", style: "Serein", budget: "Essentiel", image: images[6],
    intro: "Le cadre qui permet de garder l’esprit libre, même quand les imprévus existent.",
    description: "Assurance annulation, responsabilité civile, matériel : ces sujets restent rarement les plus inspirants, mais ils libèrent une tranquillité qui laisse toute la place au plaisir.",
    moments: ["Avant le mariage"], services: ["Assurance événement", "Responsabilité civile", "Annulation", "Conseil contrats"], brings: ["Un filet de sécurité", "De la clarté", "Un cadre solide"], toPlan: ["Les contrats", "Les prestataires", "La météo", "Les échéances"], constraints: ["Délais", "Justificatifs", "Montants", "Conditions"], resources: ["Contrats", "Factures", "Contacts"], related: ["chateau", "wedding-planner", "securite", "traiteur", "transport"], professionals: [pro("Pacte Serein", "Assurance événement", "France"), pro("Cadre & Vous", "Conseil contrats", "Paris")]
  },
  {
    id: "preparatifs", coverNumber: 31, title: "Préparatifs", eyebrow: "Le matin du grand jour", universe: "Organisation", category: "Rituel", type: "Expérience", style: "Intime", budget: "Essentiel", image: images[1],
    intro: "La première scène de la journée : un espace calme, des proches choisis, le temps de s’installer.",
    description: "Les préparatifs méritent une intention. Une belle pièce, de la lumière, de quoi manger et une chronologie respirable font de ces heures un moment en soi — et non une course.",
    moments: ["Préparatifs"], services: ["Suite préparation", "Petit-déjeuner", "Planning beauté", "Photoreportage"], brings: ["Un début serein", "Des images vraies", "Du temps ensemble"], toPlan: ["Le lieu", "Le nombre de personnes", "La lumière", "Le repas"], constraints: ["Timing", "Miroirs", "Rangements", "Accès"], resources: ["Suite", "Miroirs", "Petit-déjeuner"], related: ["coiffure", "maquillage", "photographe", "videaste", "robe"], professionals: [pro("Maison des Rives", "Suite & hospitalité", "Bourgogne"), pro("Studio Serein", "Coordination", "Paris")]
  },
  {
    id: "drone", coverNumber: 32, title: "Vue d’ensemble", eyebrow: "Voir plus large", universe: "Image", category: "Drone", type: "Service", style: "Panoramique", budget: "Essentiel", image: images[0],
    intro: "Une perspective ample sur le lieu, la table et tous ceux qui composent ce paysage temporaire.",
    description: "Le drone offre une échelle différente : l’arrivée dans le domaine, les convives dans un jardin, la géométrie d’un dîner. Il reste un outil au service du récit, jamais une fin en soi.",
    moments: ["Cérémonie", "Cocktail", "Dîner"], services: ["Prises aériennes", "Film drone", "Photo aérienne", "Repérage"], brings: ["Une échelle spectaculaire", "Le lieu dans son contexte", "Un autre point de vue"], toPlan: ["Les autorisations", "La météo", "Les horaires", "La discrétion"], constraints: ["Réglementation drone", "Zone aérienne", "Vent", "Vie privée"], resources: ["Autorisation", "Zone décollage", "Plan météo"], related: ["videaste", "photographe", "chateau", "assurance", "securite"], professionals: [pro("Vue Libre", "Opérateur drone", "France"), pro("Hors Champ Films", "Film documentaire", "Bordeaux")]
  },
  {
    id: "parking", coverNumber: 33, title: "Arrivées", eyebrow: "La première impression", universe: "Logistique", category: "Accueil", type: "Service", style: "Fluide", budget: "Essentiel", image: images[6],
    intro: "Un accueil clair dès les premiers mètres, pour que personne n’ait à chercher sa place.",
    description: "Parking, voiturier, signalétique et accueil : l’arrivée est le premier rythme donné aux invités. Une logistique fluide permet à chacun d’entrer dans la fête sans détour.",
    moments: ["Cérémonie", "Cocktail", "Dîner"], services: ["Voiturier", "Signalétique", "Gestion parking", "Accueil invités"], brings: ["Des arrivées apaisées", "De la fluidité", "Un premier geste d’hospitalité"], toPlan: ["La capacité", "Les accès", "La signalétique", "Les personnes PMR"], constraints: ["Terrain", "Éclairage", "Voisinage", "Sécurité"], resources: ["Panneaux", "Éclairage", "Équipe accueil"], related: ["chateau", "transport", "securite", "invites", "wedding-planner"], professionals: [pro("Accueil Club", "Hospitalité événementielle", "Paris"), pro("Veille Studio", "Production", "Paris")]
  },
  {
    id: "bouquet", coverNumber: 34, title: "Le bouquet", eyebrow: "Une fleur à garder en main", universe: "Fleurs", category: "Mariée", type: "Objet", style: "Sensible", budget: "Essentiel", image: images[5],
    intro: "Un objet de fleurs, très personnel, qui traverse la journée et ses images.",
    description: "Le bouquet donne une échelle intime au design floral. Une ligne, une texture, parfois une fleur inattendue : il accompagne la silhouette avant de devenir un geste de fête.",
    moments: ["Préparatifs", "Cérémonie", "Cocktail"], services: ["Bouquet sur mesure", "Rubans", "Fleurs à sécher", "Réplique"], brings: ["Une signature personnelle", "Un geste de cérémonie", "Un détail photographique"], toPlan: ["La palette", "La prise en main", "La livraison", "La conservation"], constraints: ["Chaleur", "Eau", "Transport"], resources: ["Vase", "Eau", "Boîte de transport"], related: ["fleuriste", "robe", "photographe", "ceremonie-laique", "coiffure"], professionals: [pro("Herbier Moderne", "Design floral", "Paris"), pro("Maison Pollen", "Fleurs de saison", "Lille")]
  },
  {
    id: "plage", coverNumber: 35, title: "Mariage à la plage", eyebrow: "L’horizon comme décor", universe: "Lieux", category: "Destination", type: "Lieu", style: "Solaire", budget: "Exception", image: images[0],
    intro: "Le vent, le sel, la lumière : une célébration qui commence avec le paysage.",
    description: "Une plage est une promesse de liberté, mais elle demande une vraie précision de production. Marée, vent, accès et confort des invités permettent de garder au lieu toute sa simplicité.",
    moments: ["Cérémonie", "Cocktail", "Dîner", "Soirée"], services: ["Privatisation", "Cérémonie plage", "Dîner pieds nus", "Plan B intérieur"], brings: ["Une sensation d’évasion", "Une lumière singulière", "Un décor naturel"], toPlan: ["La marée", "Le vent", "Les accès", "Le plan B"], constraints: ["Autorisation", "Météo", "Sable", "Niveau sonore"], resources: ["Ombre", "Électricité", "Sanitaires", "Passerelles"], related: ["transport", "eclairage", "traiteur", "assurance", "ceremonie-laique"], professionals: [pro("Les Dunes Privées", "Lieu de réception", "Biarritz"), pro("Horizon Production", "Destination wedding", "Sud-Ouest")]
  },
  {
    id: "cadeaux-invites", coverNumber: 36, title: "Cadeaux d’invités", eyebrow: "Une trace à emporter", universe: "Souvenirs", category: "Attention", type: "Objet", style: "Artisanal", budget: "Essentiel", image: images[4],
    intro: "Un geste discret, utile ou gourmand, qui prolonge votre attention au-delà de la fête.",
    description: "Les cadeaux d’invités n’ont pas besoin d’être nombreux pour être justes. Un produit local, une pièce imprimée, une attention pour le retour : ils deviennent une dernière phrase de votre accueil.",
    moments: ["Dîner", "Après le mariage"], services: ["Objets personnalisés", "Produits locaux", "Emballage", "Pose à table"], brings: ["Une attention finale", "Un souvenir tangible", "Un lien avec le lieu"], toPlan: ["Les quantités", "La personnalisation", "La livraison", "La pose"], constraints: ["Délais", "Stockage", "Budget", "Transport"], resources: ["Étiquettes", "Tables", "Stockage"], related: ["papeterie", "traiteur", "decorateur", "livre-or", "brunch"], professionals: [pro("Petit Geste", "Cadeaux artisanaux", "France"), pro("Éditions Épure", "Objets imprimés", "Paris")]
  }
];

export const universes = ["Tous", ...Array.from(new Set(subjects.map((subject) => subject.universe)))];

/** Covers actually written and shippable today. Derived, never hardcoded. */
export const publishedCoverCount = subjects.length;
/** The full edition the magazine is building towards. */
export const plannedCoverCount = 365;

export const statusLabel: Record<WeddingStatus, string> = {
  interested: "M’intéresse",
  contacted: "Contacté",
  chosen: "Choisi",
};

export function getSubject(id: string) {
  return subjects.find((subject) => subject.id === id);
}
