# Plan i18n — Composants restants AlertProche

> Généré après lecture exhaustive des fichiers source et des fichiers de traduction.

---

## Résultat de l'audit préliminaire

| Fichier | État réel |
|---|---|
| `home.component.html` | ✅ Entièrement traduit — rien à faire |
| `auth.component.html` | ✅ Entièrement traduit — rien à faire |
| `post-form.component.html` | ✅ Entièrement traduit — rien à faire |
| `moderation.component.html` | ✅ Entièrement traduit — rien à faire |
| `feed.component.html` | ✅ Entièrement traduit — rien à faire |
| `sos-response.component.html` | ✅ Entièrement traduit — rien à faire |
| `payment-callback.component.html` | ✅ Entièrement traduit — rien à faire |
| `chatbot.component.html` | ✅ Entièrement traduit — rien à faire |
| `platform-support-modal.component.ts` | ✅ Entièrement traduit (template inline) — rien à faire |
| **`feed-detail.component.html`** | ❌ Textes hardcodés en français + `TranslateModule` absent du `.ts` |
| **`privacy.component.html`** | ❌ Corps entier hardcodé en français (titres de section seuls traduits) |

---

## Ordre de traitement recommandé

1. **feed-detail** (priorité haute) — composant actif avec textes UI hardcodés dans le HTML et manque d'import dans le `.ts`
2. **privacy** (priorité normale) — contenu long mais statique ; les clés de titres existent déjà, il faut uniquement traduire le corps

---

## Groupe 1 — `feed-detail.component.html`

**Fichiers concernés :**
- `src/app/features/feed/feed-detail/feed-detail.component.html`
- `src/app/features/feed/feed-detail/feed-detail.component.ts`
- `public/i18n/fr.json` (namespace `FEED` existant)
- `public/i18n/en.json` (namespace `FEED` existant)

### 1.1 Ajouter `TranslateModule` dans le `.ts`

Le fichier `.ts` actuel déclare :
```typescript
imports: [CommonModule, FormsModule],
```
Il faut ajouter `TranslateModule` :
```typescript
import { TranslateModule } from '@ngx-translate/core';
// …
imports: [CommonModule, FormsModule, TranslateModule],
```

### 1.2 Textes hardcodés à remplacer dans le HTML

| Ligne (approximative) | Texte hardcodé | Clé i18n à utiliser |
|---|---|---|
| `<span>Publication</span>` (×3 occurrences — barre de retour) | "Publication" | `FEED.DETAIL_BACK_LABEL` |
| `<button … (click)="goBack()">Retour</button>` (état erreur) | "Retour" | `COMMON.BACK` ✅ déjà existante |
| `<span *ngIf="post()!.likesCount > 0"> … J'aime` | "J'aime" | `FEED.DETAIL_LIKES` |
| `<span *ngIf="post()!.commentsCount > 0"> … Commentaires` | "Commentaires" | `FEED.DETAIL_COMMENTS` |
| `<span *ngIf="(post()!.sharesCount ?? 0) > 0"> … Partages` | "Partages" | `FEED.DETAIL_SHARES` |
| `<span>J'aime</span>` (bouton action) | "J'aime" | `FEED.DETAIL_LIKES` |
| `<span>Partager</span>` (bouton action) | "Partager" | `POST.BTN_SHARE` ✅ déjà existante |
| `placeholder="Répondre..."` (input commentaire) | "Répondre..." | `FEED.COMMENT_PLACEHOLDER` ✅ déjà existante |
| `<span>Chargement des réponses...</span>` | "Chargement des réponses..." | `FEED.DETAIL_LOADING_COMMENTS` |
| `<p>Aucune réponse pour l'instant.</p>` | "Aucune réponse pour l'instant." | `FEED.NO_COMMENTS` ✅ déjà existante |
| `alt="Média"` (lightbox img) | "Média" | `FEED.DETAIL_MEDIA_ALT` |

**Clés réutilisables existantes (aucune nouvelle clé nécessaire) :**
- `COMMON.BACK` → "Retour" / "Back"
- `POST.BTN_SHARE` → "Partager" / "Share"
- `FEED.COMMENT_PLACEHOLDER` → "Répondre..." / "Reply..."
- `FEED.NO_COMMENTS` → "Aucun commentaire encore." / "No comments yet."

### 1.3 Nouvelles clés à créer

À ajouter dans le bloc `"FEED"` des deux fichiers JSON :

**fr.json :**
```json
"DETAIL_BACK_LABEL": "Publication",
"DETAIL_LIKES": "J'aime",
"DETAIL_COMMENTS": "Commentaires",
"DETAIL_SHARES": "Partages",
"DETAIL_LOADING_COMMENTS": "Chargement des réponses…",
"DETAIL_MEDIA_ALT": "Média",
"DETAIL_NOT_FOUND": "Publication introuvable."
```

**en.json :**
```json
"DETAIL_BACK_LABEL": "Post",
"DETAIL_LIKES": "Likes",
"DETAIL_COMMENTS": "Comments",
"DETAIL_SHARES": "Shares",
"DETAIL_LOADING_COMMENTS": "Loading replies…",
"DETAIL_MEDIA_ALT": "Media",
"DETAIL_NOT_FOUND": "Post not found."
```

> Note : le texte hardcodé `'Publication introuvable.'` existe aussi dans le `.ts` (méthode `ngOnInit` error handler). Le remplacer par `this.translate.instant('FEED.DETAIL_NOT_FOUND')` dans `feed-detail.component.ts` après avoir injecté `TranslateService`.

### 1.4 Modifications HTML — exemple de remplacement

```html
<!-- AVANT -->
<span>Publication</span>

<!-- APRÈS -->
<span>{{ 'FEED.DETAIL_BACK_LABEL' | translate }}</span>
```

```html
<!-- AVANT -->
<button class="btn btn-primary btn-sm" (click)="goBack()">Retour</button>

<!-- APRÈS -->
<button class="btn btn-primary btn-sm" (click)="goBack()">{{ 'COMMON.BACK' | translate }}</button>
```

```html
<!-- AVANT -->
<span *ngIf="post()!.likesCount > 0">
  <strong>{{ post()!.likesCount }}</strong> J'aime
</span>

<!-- APRÈS -->
<span *ngIf="post()!.likesCount > 0">
  <strong>{{ post()!.likesCount }}</strong> {{ 'FEED.DETAIL_LIKES' | translate }}
</span>
```

```html
<!-- AVANT -->
<span>J'aime</span>  <!-- dans le bouton action -->

<!-- APRÈS -->
<span>{{ 'FEED.DETAIL_LIKES' | translate }}</span>
```

```html
<!-- AVANT -->
<span>Partager</span>

<!-- APRÈS -->
<span>{{ 'POST.BTN_SHARE' | translate }}</span>
```

```html
<!-- AVANT -->
<input … placeholder="Répondre...">

<!-- APRÈS -->
<input … [placeholder]="'FEED.COMMENT_PLACEHOLDER' | translate">
```

```html
<!-- AVANT -->
<span>Chargement des réponses...</span>

<!-- APRÈS -->
<span>{{ 'FEED.DETAIL_LOADING_COMMENTS' | translate }}</span>
```

```html
<!-- AVANT -->
<p>Aucune réponse pour l'instant.</p>

<!-- APRÈS -->
<p>{{ 'FEED.NO_COMMENTS' | translate }}</p>
```

```html
<!-- AVANT -->
<img … alt="Média">

<!-- APRÈS -->
<img … [attr.alt]="'FEED.DETAIL_MEDIA_ALT' | translate">
```

### 1.5 Modification `.ts` — injection TranslateService + message d'erreur

```typescript
import { TranslateModule, TranslateService } from '@ngx-translate/core';
// …
private translate = inject(TranslateService);
// …
// Dans ngOnInit, remplacer :
this.error.set('Publication introuvable.');
// Par :
this.error.set(this.translate.instant('FEED.DETAIL_NOT_FOUND'));
```

---

## Groupe 2 — `privacy.component.html`

**Fichiers concernés :**
- `src/app/features/privacy/privacy.component.html`
- `src/app/features/privacy/privacy.component.ts`
- `public/i18n/fr.json` (namespace `PRIVACY` existant — clés de section seulement)
- `public/i18n/en.json` (namespace `PRIVACY` existant — clés de section seulement)

`TranslateModule` est **déjà importé** dans le `.ts` — aucune modification du `.ts` nécessaire sauf la date.

### 2.1 État actuel du namespace `PRIVACY`

Les clés suivantes existent déjà dans les deux fichiers JSON et sont déjà utilisées dans le template :
- `PRIVACY.TITLE`, `PRIVACY.LAST_UPDATED_LABEL`, `PRIVACY.TOC_TITLE`, `PRIVACY.BACK_LINK`
- `PRIVACY.SECTION_TITLE_01` … `PRIVACY.SECTION_TITLE_09`

Ce qui **n'existe pas encore** : toutes les introductions, paragraphes, items de liste, notes, et liens du corps.

### 2.2 Textes hardcodés restants à remplacer

#### En-tête

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"AlertProche s'engage à protéger la vie privée…"` (intro) | `PRIVACY.INTRO` |

#### Sommaire (aside)

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Sommaire"` (titre `<h3>`) | `PRIVACY.TOC_TITLE` ✅ déjà existante |
| `"01. Données collectées"` | `PRIVACY.TOC_01` |
| `"02. Navigation anonymisée"` | `PRIVACY.TOC_02` |
| `"03. Utilisation des données"` | `PRIVACY.TOC_03` |
| `"04. Images et contenus"` | `PRIVACY.TOC_04` |
| `"05. Anonymat"` | `PRIVACY.TOC_05` |
| `"06. Modération"` | `PRIVACY.TOC_06` |
| `"07. Vos droits"` | `PRIVACY.TOC_07` |
| `"08. Sécurité"` | `PRIVACY.TOC_08` |
| `"09. Contact"` | `PRIVACY.TOC_09` |

#### Section 01 — Données collectées

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Données collectées"` (h2) | `PRIVACY.SECTION_TITLE_01` ✅ déjà existante |
| `"Lors de votre inscription…"` (intro paragraphe) | `PRIVACY.S01_INTRO` |
| `"Adresse email - utilisée uniquement…"` | `PRIVACY.S01_ITEM_EMAIL` |
| `"Pseudo - identifiant public…"` | `PRIVACY.S01_ITEM_PSEUDO` |
| `"Mot de passe - stocké sous forme…"` | `PRIVACY.S01_ITEM_PASSWORD` |
| `"Contenus publiés - publications…"` | `PRIVACY.S01_ITEM_CONTENT` |
| `"Données techniques - horodatage…"` | `PRIVACY.S01_ITEM_TECH` |
| `"Nous ne collectons pas de données…"` (note) | `PRIVACY.S01_NOTE` |

#### Section 02 — Navigation anonymisée

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Données de navigation anonymisées"` (h2) | `PRIVACY.SECTION_TITLE_02` ✅ déjà existante |
| `"Pour améliorer l'expérience…"` (intro) | `PRIVACY.S02_INTRO` |
| `"Ce qui est collecté"` (h3) | `PRIVACY.S02_COLLECTED_TITLE` |
| `"Pages visitées…"` | `PRIVACY.S02_ITEM_PAGES` |
| `"Type d'appareil…"` | `PRIVACY.S02_ITEM_DEVICE` |
| `"Navigateur et système d'exploitation"` | `PRIVACY.S02_ITEM_BROWSER` |
| `"Pays et ville d'origine approximatifs…"` | `PRIVACY.S02_ITEM_GEO` |
| `"Source de trafic…"` | `PRIVACY.S02_ITEM_SOURCE` |
| `"Ce qui n'est PAS stocké"` (h3) | `PRIVACY.S02_NOT_STORED_TITLE` |
| `"Votre adresse IP en clair…"` | `PRIVACY.S02_NOT_IP` |
| `"Votre nom, email ou toute information…"` | `PRIVACY.S02_NOT_PII` |
| `"Ces données sont automatiquement supprimées après 90 jours"` (note) | `PRIVACY.S02_NOTE` |
| `"Cette collecte est fondée sur…"` | `PRIVACY.S02_LEGAL_BASIS` |

#### Section 03 — Utilisation des données

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Utilisation des données"` (h2) | `PRIVACY.SECTION_TITLE_03` ✅ déjà existante |
| `"Vos données sont utilisées exclusivement pour :"` | `PRIVACY.S03_INTRO` |
| `"Permettre l'authentification…"` | `PRIVACY.S03_ITEM_AUTH` |
| `"Afficher vos publications…"` | `PRIVACY.S03_ITEM_DISPLAY` |
| `"Assurer la modération automatique…"` | `PRIVACY.S03_ITEM_MOD` |
| `"Garantir la sécurité…"` | `PRIVACY.S03_ITEM_SECURITY` |
| `"Vos données ne sont jamais vendues…"` | `PRIVACY.S03_NO_SALE` |

#### Section 04 — Images et contenus

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Responsabilité sur les images…"` (h2) | `PRIVACY.SECTION_TITLE_04` ✅ déjà existante |
| `"Clause de non-responsabilité…"` (titre banner) | `PRIVACY.S04_DISCLAIMER_TITLE` |
| `"AlertProche est une plateforme de mise en relation…"` | `PRIVACY.S04_DISCLAIMER_DESC` |
| `"Images publiées par les utilisateurs"` (h3) | `PRIVACY.S04_IMAGES_TITLE` |
| `"Toute image téléversée est publiée sous…"` | `PRIVACY.S04_IMAGES_INTRO` |
| `"Être l'auteur ou disposer des droits…"` | `PRIVACY.S04_ITEM_RIGHTS` |
| `"Avoir obtenu le consentement…"` | `PRIVACY.S04_ITEM_CONSENT` |
| `"Que l'image ne viole pas les droits…"` | `PRIVACY.S04_ITEM_DIGNITY` |
| `"Que l'image ne contient pas de contenu illicite…"` | `PRIVACY.S04_ITEM_ILLEGAL` |
| `"AlertProche décline toute responsabilité…"` (note) | `PRIVACY.S04_NOTE` |

#### Section 05 — Anonymat

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Anonymat et pseudonymat"` (h2) | `PRIVACY.SECTION_TITLE_05` ✅ déjà existante |
| `"AlertProche offre une option de publication anonyme…"` | `PRIVACY.S05_INTRO` |
| `"Votre pseudo n'est pas affiché…"` | `PRIVACY.S05_ITEM_PSEUDO` |
| `'La mention "Anonyme" est affichée…'` | `PRIVACY.S05_ITEM_ANON` |
| `"Votre identité reste connue…"` | `PRIVACY.S05_ITEM_IDENTITY` |
| `"L'anonymat public ne signifie pas…"` (note) | `PRIVACY.S05_NOTE` |

#### Section 06 — Modération

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Modération et signalement"` (h2) | `PRIVACY.SECTION_TITLE_06` ✅ déjà existante |
| `"La plateforme dispose d'un système…"` | `PRIVACY.S06_INTRO` |
| `"Modération automatique - filtre…"` | `PRIVACY.S06_ITEM_AUTO` |
| `"Modération humaine - les modérateurs…"` | `PRIVACY.S06_ITEM_HUMAN` |
| `"Tout utilisateur peut signaler…"` | `PRIVACY.S06_OUTRO` |

#### Section 07 — Vos droits

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Vos droits"` (h2) | `PRIVACY.SECTION_TITLE_07` ✅ déjà existante |
| `"Vous disposez des droits suivants :"` | `PRIVACY.S07_INTRO` |
| `"Droit d'accès - consulter vos données…"` | `PRIVACY.S07_ITEM_ACCESS` |
| `"Droit de rectification - modifier…"` | `PRIVACY.S07_ITEM_RECTIF` |
| `"Droit à l'effacement - supprimer…"` | `PRIVACY.S07_ITEM_ERASE` |
| `"Droit à la portabilité - demander…"` | `PRIVACY.S07_ITEM_PORTABILITY` |
| `"La suppression de votre compte…"` | `PRIVACY.S07_OUTRO` |

#### Section 08 — Sécurité

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Sécurité des données"` (h2) | `PRIVACY.SECTION_TITLE_08` ✅ déjà existante |
| `"Nous mettons en œuvre les mesures…"` | `PRIVACY.S08_INTRO` |
| `"Chiffrement des mots de passe…"` | `PRIVACY.S08_ITEM_BCRYPT` |
| `"Authentification par jetons JWT…"` | `PRIVACY.S08_ITEM_JWT` |
| `"Communications chiffrées via HTTPS/TLS"` | `PRIVACY.S08_ITEM_HTTPS` |
| `"Base de données hébergée sur MongoDB…"` | `PRIVACY.S08_ITEM_DB` |
| `"Validation et assainissement…"` | `PRIVACY.S08_ITEM_VALIDATION` |

#### Section 09 — Contact

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Contact"` (h2) | `PRIVACY.SECTION_TITLE_09` ✅ déjà existante |
| `"Pour toute question relative à cette politique…"` | `PRIVACY.S09_INTRO` |
| `"Cette politique peut être mise à jour…"` (note) | `PRIVACY.S09_NOTE` |

#### Footer

| Texte FR hardcodé | Clé i18n |
|---|---|
| `"Accueil"` (lien footer) | `COMMON.BTN_HOME` ✅ déjà existante → adapter libellé ou utiliser `NAV.HOME` |
| `"À propos"` (lien footer) | `NAV.ABOUT` ✅ déjà existante |

> **Décision** : pour "Accueil" dans le footer, utiliser `NAV.HOME` (FR: "Accueil", EN: "Home") qui existe déjà.

### 2.3 Valeur de `lastUpdated`

Actuellement hardcodé dans le `.ts` : `lastUpdated = 'Juin 2026'`. Ce n'est pas une chaîne UI à traduire — c'est une donnée. Le laisser tel quel (la date s'affiche telle quelle dans les deux langues) ou, si une traduction est souhaitée, externaliser `'Juin 2026'` et `'June 2026'` dans les fichiers JSON sous `PRIVACY.LAST_UPDATED_VALUE`. **Recommandation : laisser hardcodé**, c'est une date de document.

### 2.4 Nouvelles clés à ajouter dans `fr.json` (bloc `PRIVACY`)

```json
"INTRO": "AlertProche s'engage à protéger la vie privée de ses utilisateurs. Ce document décrit comment nous collectons, utilisons et protégeons vos données personnelles.",
"TOC_01": "01. Données collectées",
"TOC_02": "02. Navigation anonymisée",
"TOC_03": "03. Utilisation des données",
"TOC_04": "04. Images et contenus",
"TOC_05": "05. Anonymat",
"TOC_06": "06. Modération",
"TOC_07": "07. Vos droits",
"TOC_08": "08. Sécurité",
"TOC_09": "09. Contact",
"S01_INTRO": "Lors de votre inscription et utilisation de la plateforme, nous collectons les données suivantes :",
"S01_ITEM_EMAIL": "Adresse email — utilisée uniquement pour l'authentification. Elle n'est jamais affichée publiquement.",
"S01_ITEM_PSEUDO": "Pseudo — identifiant public choisi par l'utilisateur. Peut être masqué via l'option d'anonymisation.",
"S01_ITEM_PASSWORD": "Mot de passe — stocké sous forme de hachage cryptographique (bcrypt). Nous n'avons pas accès à votre mot de passe en clair.",
"S01_ITEM_CONTENT": "Contenus publiés — publications, commentaires et images soumis volontairement.",
"S01_ITEM_TECH": "Données techniques — horodatage des publications et connexions.",
"S01_NOTE": "Nous ne collectons pas de données de localisation GPS, de cookies de tracking, ni de données comportementales à des fins publicitaires.",
"S02_INTRO": "Pour améliorer l'expérience utilisateur, AlertProche collecte automatiquement des données de navigation anonymisées.",
"S02_COLLECTED_TITLE": "Ce qui est collecté",
"S02_ITEM_PAGES": "Pages visitées — pages consultées et durée de consultation",
"S02_ITEM_DEVICE": "Type d'appareil — mobile, tablette ou ordinateur",
"S02_ITEM_BROWSER": "Navigateur et système d'exploitation",
"S02_ITEM_GEO": "Pays et ville d'origine approximatifs — déduits de l'adresse IP",
"S02_ITEM_SOURCE": "Source de trafic — comment vous avez trouvé la plateforme",
"S02_NOT_STORED_TITLE": "Ce qui n'est PAS stocké",
"S02_NOT_IP": "Votre adresse IP en clair — elle est transformée en empreinte SHA-256 non réversible",
"S02_NOT_PII": "Votre nom, email ou toute information personnelle identifiable directement",
"S02_NOTE": "Ces données sont automatiquement supprimées après 90 jours.",
"S02_LEGAL_BASIS": "Cette collecte est fondée sur l'intérêt légitime d'AlertProche à assurer le bon fonctionnement de la plateforme, conformément aux principes de minimisation des données.",
"S03_INTRO": "Vos données sont utilisées exclusivement pour :",
"S03_ITEM_AUTH": "Permettre l'authentification et la gestion de votre compte",
"S03_ITEM_DISPLAY": "Afficher vos publications et commentaires",
"S03_ITEM_MOD": "Assurer la modération automatique des contenus",
"S03_ITEM_SECURITY": "Garantir la sécurité et l'intégrité de la plateforme",
"S03_NO_SALE": "Vos données ne sont jamais vendues, louées ou partagées avec des tiers à des fins commerciales.",
"S04_DISCLAIMER_TITLE": "Clause de non-responsabilité — Contenus générés par les utilisateurs",
"S04_DISCLAIMER_DESC": "AlertProche est une plateforme de mise en relation citoyenne. Les contenus publiés sont soumis et contrôlés par leurs auteurs.",
"S04_IMAGES_TITLE": "Images publiées par les utilisateurs",
"S04_IMAGES_INTRO": "Toute image téléversée est publiée sous la responsabilité exclusive de l'utilisateur qui la soumet. En publiant une image, l'utilisateur garantit :",
"S04_ITEM_RIGHTS": "Être l'auteur ou disposer des droits nécessaires à sa publication",
"S04_ITEM_CONSENT": "Avoir obtenu le consentement des personnes photographiées",
"S04_ITEM_DIGNITY": "Que l'image ne viole pas les droits à l'image ni la dignité des personnes",
"S04_ITEM_ILLEGAL": "Que l'image ne contient pas de contenu illicite ou portant atteinte à la dignité humaine",
"S04_NOTE": "AlertProche décline toute responsabilité quant au contenu des images publiées par les utilisateurs. Tout abus peut être signalé via le bouton « Signaler ».",
"S05_INTRO": "AlertProche offre une option de publication anonyme. Lorsque cette option est activée :",
"S05_ITEM_PSEUDO": "Votre pseudo n'est pas affiché sur la publication ou le commentaire",
"S05_ITEM_ANON": "La mention « Anonyme » est affichée à la place",
"S05_ITEM_IDENTITY": "Votre identité reste connue uniquement de la plateforme à des fins de modération",
"S05_NOTE": "L'anonymat public ne signifie pas l'anonymat total. En cas de signalement d'activité illicite par les autorités compétentes, les informations d'identification peuvent être communiquées dans le cadre légal applicable.",
"S06_INTRO": "La plateforme dispose d'un système de modération à deux niveaux :",
"S06_ITEM_AUTO": "Modération automatique — filtre lexical (termes haineux, insultes) et filtre anti-doxxing (numéros de téléphone, identifiants officiels).",
"S06_ITEM_HUMAN": "Modération humaine — les modérateurs et administrateurs peuvent désactiver ou supprimer tout contenu signalé.",
"S06_OUTRO": "Tout utilisateur peut signaler une publication via le bouton « Signaler » disponible sur chaque publication.",
"S07_INTRO": "Vous disposez des droits suivants :",
"S07_ITEM_ACCESS": "Droit d'accès — consulter vos données via votre espace personnel",
"S07_ITEM_RECTIF": "Droit de rectification — modifier votre pseudo depuis votre profil",
"S07_ITEM_ERASE": "Droit à l'effacement — supprimer vos publications et commentaires",
"S07_ITEM_PORTABILITY": "Droit à la portabilité — demander l'export de vos données",
"S07_OUTRO": "La suppression de votre compte entraîne l'anonymisation de vos publications afin de préserver l'intégrité des alertes communautaires.",
"S08_INTRO": "Nous mettons en œuvre les mesures techniques suivantes :",
"S08_ITEM_BCRYPT": "Chiffrement des mots de passe (bcrypt, facteur de coût 12)",
"S08_ITEM_JWT": "Authentification par jetons JWT à durée limitée",
"S08_ITEM_HTTPS": "Communications chiffrées via HTTPS/TLS",
"S08_ITEM_DB": "Base de données hébergée sur MongoDB Atlas avec contrôle d'accès strict",
"S08_ITEM_VALIDATION": "Validation et assainissement de toutes les entrées utilisateur",
"S09_INTRO": "Pour toute question relative à cette politique, vous pouvez nous contacter via le formulaire de signalement disponible sur chaque publication, ou depuis votre espace personnel.",
"S09_NOTE": "Cette politique peut être mise à jour. Toute modification significative sera notifiée aux utilisateurs inscrits."
```

### 2.5 Nouvelles clés à ajouter dans `en.json` (bloc `PRIVACY`)

```json
"INTRO": "AlertProche is committed to protecting the privacy of its users. This document describes how we collect, use and protect your personal data.",
"TOC_01": "01. Data collected",
"TOC_02": "02. Anonymous browsing",
"TOC_03": "03. Use of data",
"TOC_04": "04. Images and content",
"TOC_05": "05. Anonymity",
"TOC_06": "06. Moderation",
"TOC_07": "07. Your rights",
"TOC_08": "08. Security",
"TOC_09": "09. Contact",
"S01_INTRO": "When you register and use the platform, we collect the following data:",
"S01_ITEM_EMAIL": "Email address — used solely for authentication. It is never displayed publicly.",
"S01_ITEM_PSEUDO": "Username — public identifier chosen by the user. Can be hidden via the anonymisation option.",
"S01_ITEM_PASSWORD": "Password — stored as a cryptographic hash (bcrypt). We have no access to your plaintext password.",
"S01_ITEM_CONTENT": "Published content — posts, comments and images submitted voluntarily.",
"S01_ITEM_TECH": "Technical data — timestamps of posts and connections.",
"S01_NOTE": "We do not collect GPS location data, tracking cookies, or behavioural data for advertising purposes.",
"S02_INTRO": "To improve the user experience, AlertProche automatically collects anonymised browsing data.",
"S02_COLLECTED_TITLE": "What is collected",
"S02_ITEM_PAGES": "Pages visited — pages viewed and time spent",
"S02_ITEM_DEVICE": "Device type — mobile, tablet or computer",
"S02_ITEM_BROWSER": "Browser and operating system",
"S02_ITEM_GEO": "Approximate country and city of origin — inferred from IP address",
"S02_ITEM_SOURCE": "Traffic source — how you found the platform",
"S02_NOT_STORED_TITLE": "What is NOT stored",
"S02_NOT_IP": "Your plaintext IP address — it is converted to a non-reversible SHA-256 fingerprint",
"S02_NOT_PII": "Your name, email or any directly identifiable personal information",
"S02_NOTE": "This data is automatically deleted after 90 days.",
"S02_LEGAL_BASIS": "This collection is based on AlertProche's legitimate interest in ensuring the platform works correctly, in accordance with data minimisation principles.",
"S03_INTRO": "Your data is used exclusively to:",
"S03_ITEM_AUTH": "Enable authentication and account management",
"S03_ITEM_DISPLAY": "Display your posts and comments",
"S03_ITEM_MOD": "Ensure automatic content moderation",
"S03_ITEM_SECURITY": "Guarantee the security and integrity of the platform",
"S03_NO_SALE": "Your data is never sold, rented or shared with third parties for commercial purposes.",
"S04_DISCLAIMER_TITLE": "Disclaimer — User-generated content",
"S04_DISCLAIMER_DESC": "AlertProche is a citizen networking platform. Published content is submitted and controlled by its authors.",
"S04_IMAGES_TITLE": "Images published by users",
"S04_IMAGES_INTRO": "Any uploaded image is published under the exclusive responsibility of the user who submits it. By publishing an image, the user guarantees:",
"S04_ITEM_RIGHTS": "Being the author or holding the necessary rights to publish it",
"S04_ITEM_CONSENT": "Having obtained the consent of the people photographed",
"S04_ITEM_DIGNITY": "That the image does not violate image rights or the dignity of persons",
"S04_ITEM_ILLEGAL": "That the image does not contain illegal content or content that infringes human dignity",
"S04_NOTE": "AlertProche declines all responsibility for the content of images published by users. Any abuse can be reported via the 'Report' button.",
"S05_INTRO": "AlertProche offers an anonymous publishing option. When this option is enabled:",
"S05_ITEM_PSEUDO": "Your username is not displayed on the post or comment",
"S05_ITEM_ANON": "The word 'Anonymous' is displayed instead",
"S05_ITEM_IDENTITY": "Your identity is known only to the platform for moderation purposes",
"S05_NOTE": "Public anonymity does not mean total anonymity. In the event of a report of illegal activity by the competent authorities, identification information may be communicated within the applicable legal framework.",
"S06_INTRO": "The platform has a two-level moderation system:",
"S06_ITEM_AUTO": "Automatic moderation — lexical filter (hate speech, insults) and anti-doxxing filter (phone numbers, official identifiers).",
"S06_ITEM_HUMAN": "Human moderation — moderators and administrators can disable or delete any reported content.",
"S06_OUTRO": "Any user can report a post via the 'Report' button available on each post.",
"S07_INTRO": "You have the following rights:",
"S07_ITEM_ACCESS": "Right of access — view your data via your personal space",
"S07_ITEM_RECTIF": "Right of rectification — modify your username from your profile",
"S07_ITEM_ERASE": "Right to erasure — delete your posts and comments",
"S07_ITEM_PORTABILITY": "Right to portability — request an export of your data",
"S07_OUTRO": "Deleting your account results in the anonymisation of your posts in order to preserve the integrity of community alerts.",
"S08_INTRO": "We implement the following technical measures:",
"S08_ITEM_BCRYPT": "Password encryption (bcrypt, cost factor 12)",
"S08_ITEM_JWT": "Authentication via time-limited JWT tokens",
"S08_ITEM_HTTPS": "Encrypted communications via HTTPS/TLS",
"S08_ITEM_DB": "Database hosted on MongoDB Atlas with strict access control",
"S08_ITEM_VALIDATION": "Validation and sanitisation of all user inputs",
"S09_INTRO": "For any question relating to this policy, you can contact us via the report form available on each post, or from your personal space.",
"S09_NOTE": "This policy may be updated. Any significant change will be notified to registered users."
```

### 2.6 Exemple de remplacement HTML pour la section privacy

```html
<!-- AVANT -->
<p class="privacy-intro">
  AlertProche s'engage à protéger la vie privée de ses utilisateurs. Ce document décrit comment nous collectons,
  utilisons et protégeons vos données personnelles.
</p>

<!-- APRÈS -->
<p class="privacy-intro">{{ 'PRIVACY.INTRO' | translate }}</p>
```

```html
<!-- AVANT -->
<h3><i class="fas fa-list"></i> Sommaire</h3>
<nav>
  <a href="#collecte">01. Données collectées</a>
  …
</nav>

<!-- APRÈS -->
<h3><i class="fas fa-list"></i> {{ 'PRIVACY.TOC_TITLE' | translate }}</h3>
<nav>
  <a href="#collecte">{{ 'PRIVACY.TOC_01' | translate }}</a>
  <a href="#navigation">{{ 'PRIVACY.TOC_02' | translate }}</a>
  …
</nav>
```

```html
<!-- AVANT -->
<h2>Données collectées</h2>
<p>Lors de votre inscription et utilisation…</p>
<ul>
  <li><strong>Adresse email</strong> - utilisée uniquement pour l'authentification…</li>
  …
</ul>

<!-- APRÈS -->
<h2>{{ 'PRIVACY.SECTION_TITLE_01' | translate }}</h2>
<p>{{ 'PRIVACY.S01_INTRO' | translate }}</p>
<ul>
  <li [innerHTML]="'PRIVACY.S01_ITEM_EMAIL' | translate"></li>
  …
</ul>
```

> **Note sur `[innerHTML]`** : les items de liste contiennent des balises `<strong>`. Utiliser `[innerHTML]="'PRIVACY.S01_ITEM_EMAIL' | translate"` pour que le HTML soit rendu. Ceci est safe car les valeurs sont entièrement contrôlées dans les fichiers JSON du projet.

```html
<!-- AVANT (footer) -->
<a routerLink="/" class="btn btn-ghost btn-sm"><i class="fas fa-house"></i> Accueil</a>
<a routerLink="/a-propos" class="btn btn-ghost btn-sm"><i class="fas fa-circle-info"></i> À propos</a>

<!-- APRÈS -->
<a routerLink="/" class="btn btn-ghost btn-sm"><i class="fas fa-house"></i> {{ 'NAV.HOME' | translate }}</a>
<a routerLink="/a-propos" class="btn btn-ghost btn-sm"><i class="fas fa-circle-info"></i> {{ 'NAV.ABOUT' | translate }}</a>
```

---

## Commandes de build et vérification

### Après chaque groupe
```bash
cd "c:\code\New folder (3) - Copy\AlertProche"
npm run build
```
Un build sans erreur confirme que les pipes `| translate` sont correctement résolus et que `TranslateModule` est bien importé là où il est utilisé.

### Build de développement (plus rapide)
```bash
ng build --configuration development
```

### Vérification visuelle
```bash
npm start
```
Puis naviguer sur `/feed/<id>` pour vérifier feed-detail et sur `/confidentialite` pour vérifier privacy, en alternant les langues avec le sélecteur de langue.

---

## Résumé des fichiers à modifier

| Fichier | Action |
|---|---|
| `src/app/features/feed/feed-detail/feed-detail.component.ts` | Ajouter `TranslateModule` dans `imports[]`, injecter `TranslateService`, remplacer le message d'erreur hardcodé |
| `src/app/features/feed/feed-detail/feed-detail.component.html` | Remplacer 9 textes hardcodés par des pipes `translate` |
| `public/i18n/fr.json` | Ajouter 7 clés dans `FEED` + 55 clés dans `PRIVACY` |
| `public/i18n/en.json` | Ajouter 7 clés dans `FEED` + 55 clés dans `PRIVACY` |
| `src/app/features/privacy/privacy.component.html` | Remplacer ~60 textes hardcodés par des pipes `translate` + `[innerHTML]` pour les items à balisage interne |

Aucune modification nécessaire pour :
`home`, `auth`, `post-form`, `moderation`, `feed`, `sos-response`, `payment-callback`, `chatbot`, `platform-support-modal`.
