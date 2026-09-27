# Crédits et sources des images — `public/covers/`

## Couvertures locales (001–019)

`001-saxophoniste.jpg` à `019-officiant.jpg` sont les assets de couverture
livrés avec le dépôt (une couverture par sujet du catalogue, nomenclature
`NNN-slug.jpg`). Ils appartiennent au projet.

## Pool d'images externes (Pexels)

Les sujets du catalogue qui n'ont pas encore de couverture dédiée, ainsi que
les visuels hero et de clôture, réutilisent un pool de 8 photographies
déclarées dans `src/lib/wedding-data.ts` (tableau `images[]`) et servies par
hotlink depuis `images.pexels.com` :

| # | Photo (ID Pexels) | URL source |
|---|---|---|
| 1 | 28815661 | https://www.pexels.com/photo/28815661/ |
| 2 | 32632264 | https://www.pexels.com/photo/32632264/ |
| 3 | 31573559 | https://www.pexels.com/photo/31573559/ |
| 4 | 10256498 | https://www.pexels.com/photo/10256498/ |
| 5 | 34362976 | https://www.pexels.com/photo/34362976/ |
| 6 | 16762673 | https://www.pexels.com/photo/16762673/ |
| 7 | 34746774 | https://www.pexels.com/photo/34746774/ |
| 8 | 8516921  | https://www.pexels.com/photo/8516921/ |

Licence Pexels (https://www.pexels.com/license/) : utilisation gratuite,
modification et usage commercial autorisés, attribution non requise.
Les URL complètes (avec paramètres de recadrage) restent dans
`src/lib/wedding-data.ts`, unique source de vérité du catalogue.

> Chantier restant, documenté dans le README : rapatrier ces 8 fichiers en
> local (`public/covers/`) pour supprimer la dépendance au hotlink, puis
> passer au format optimisé. Ce fichier servira alors de registre de
> provenance.
