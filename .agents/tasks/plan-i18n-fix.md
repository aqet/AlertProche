# Plan de correction i18n — AlertProche

> Audit complet effectué le : (date d'exécution)  
> Statut : **PRÊT À IMPLÉMENTER**

---

## 1. État des fichiers de traduction

### 1.1 Clés présentes dans `fr.json` mais absentes dans `en.json`
Après diff complet des deux fichiers : **aucune clé manquante** — les deux fichiers sont parfaitement symétriques en termes de clés.

### 1.2 Clés présentes dans `en.json` mais absentes dans `fr.json`
**Aucune.** Symétrie parfaite.

### 1.3 Clés i18n manquantes (à créer dans les deux fichiers)
Les textes en dur ci-dessous nécessitent la création de clés nouvelles dans `fr.json` et `en.json`.

---

## 2. Audit exhaustif des textes en dur par fichier

### 2.1 `alert-status-badge.component.html`
**Fichier :** `src/app/shared/components/alert-status-badge/alert-status-badge.component.html`

| Texte en dur | Clé à créer | Valeur FR | Valeur EN |
|---|---|---|---|
| `Résolue` | `COMMON.STATUS_RESOLVED` | ✅ existe déjà | ✅ existe déjà |
| `En cours` | `COMMON.STATUS_OPEN` | ✅ existe déjà | ✅ existe déjà |

**Problème :** Le badge utilise des strings en dur au lieu du pipe `| translate`.  
```html
<!-- ACTUEL (faux) -->
{{ isResolved ? 'Résolue' : 'En cours' }}

<!-- CORRIGÉ -->
{{ isResolved ? ('COMMON.STATUS_RESOLVED' | translate) : ('COMMON.STATUS_OPEN' | translate) }}
```

---

### 2.2 `post-card.component.html`
**Fichier :** `src/app/shared/post-card/post-card.component.html`

| Texte en dur | Clé i18n à utiliser |
|---|---|
| `'Retirer des sauvegardes'` (aria-label) | `POST_CARD.ARIA_UNSAVE` (à créer) |
| `'Sauvegarder hors-ligne'` (aria-label) | `POST_CARD.ARIA_SAVE` (à créer) |

Clés à créer :
```json
// fr.json
"POST_CARD": {
  "ARIA_SAVE": "Sauvegarder hors-ligne",
  "ARIA_UNSAVE": "Retirer des sauvegardes"
}

// en.json
"POST_CARD": {
  "ARIA_SAVE": "Save offline",
  "ARIA_UNSAVE": "Remove from saved"
}
```

---

### 2.3 `post-detail.component.html`
**Fichier :** `src/app/features/post-detail/post-detail.component.html`

| Texte en dur | Clé i18n à créer/utiliser |
|---|---|
| `"Vous avez une information ?"` | `POST.CTA_DISPARITION_TITLE` |
| `"Contactez les forces de l'ordre ou laissez un commentaire ci-dessous. Chaque information compte."` | `POST.CTA_DISPARITION_DESC` |
| `"Vous pouvez aider à retrouver cette famille"` | `POST.CTA_APPEL_TITLE` |
| `"Si vous reconnaissez cette personne ou connaissez sa famille, laissez un commentaire..."` | `POST.CTA_APPEL_DESC` |
| `"Informations"` (sidebar title) | `POST.SIDEBAR_INFO_TITLE` |
| Raisons de signalement hardcodées dans le `*ngFor` : `'Contenu haineux ou offensant'`, `'Doxxing / informations personnelles'`, `'Fausse information'`, `'Contenu inapproprié pour des mineurs'`, `'Autre'` | `POST.REPORT_REASONS` (tableau) |

Clés à créer :
```json
// fr.json dans "POST":
"CTA_DISPARITION_TITLE": "Vous avez une information ?",
"CTA_DISPARITION_DESC": "Contactez les forces de l'ordre ou laissez un commentaire ci-dessous. Chaque information compte.",
"CTA_APPEL_TITLE": "Vous pouvez aider à retrouver cette famille",
"CTA_APPEL_DESC": "Si vous reconnaissez cette personne ou connaissez sa famille, laissez un commentaire ou contactez l'établissement concerné.",
"SIDEBAR_INFO_TITLE": "Informations",
"REPORT_REASON_HATE": "Contenu haineux ou offensant",
"REPORT_REASON_DOXXING": "Doxxing / informations personnelles",
"REPORT_REASON_FAKE": "Fausse information",
"REPORT_REASON_MINOR": "Contenu inapproprié pour des mineurs",
"REPORT_REASON_OTHER": "Autre"

// en.json dans "POST":
"CTA_DISPARITION_TITLE": "Do you have information?",
"CTA_DISPARITION_DESC": "Contact law enforcement or leave a comment below. Every piece of information counts.",
"CTA_APPEL_TITLE": "You can help find this family",
"CTA_APPEL_DESC": "If you recognise this person or know their family, leave a comment or contact the relevant establishment.",
"SIDEBAR_INFO_TITLE": "Information",
"REPORT_REASON_HATE": "Hateful or offensive content",
"REPORT_REASON_DOXXING": "Doxxing / personal information",
"REPORT_REASON_FAKE": "False information",
"REPORT_REASON_MINOR": "Content inappropriate for minors",
"REPORT_REASON_OTHER": "Other"
```

**Note importante :** Les raisons de signalement sont utilisées comme valeurs de radio button. Il faut les passer dans le composant TS en tableau d'objets `{key, label}` pour que la valeur envoyée soit stable (ex: la clé anglaise) peu importe la langue. Voir section 4.

---

### 2.4 `dashboard.component.html`
**Fichier :** `src/app/features/dashboard/dashboard.component.html`

| Texte en dur | Clé i18n à créer/utiliser |
|---|---|
| `"souhaite vous ajouter"` (invitation SOS) | `DASHBOARD.SOS_WANTS_TO_ADD` |
| `"Invitations reçues"` | `DASHBOARD.SOS_INVITATIONS_TITLE` |
| `"Ajouter un contact"` | `DASHBOARD.SOS_ADD_CONTACT_TITLE` |
| `"Utilisateur inconnu"` | `COMMON.UNKNOWN` ✅ (existe déjà) |
| `"Je suis contact de confiance de"` | `DASHBOARD.SOS_TRUSTED_BY_TITLE` |
| `"Date"` (header colonne transactions) | `COMMON.DATE` (à créer) |
| **Erreur clé incorrecte :** label du champ "Montant" utilise `'DASHBOARD.WITHDRAW_PHONE_LABEL'` au lieu de `'DASHBOARD.WITHDRAW_AMOUNT_LABEL'` ou une clé dédiée | Corriger le binding — voir section 4 |
| `"Format invalide (ex: 237XXXXXXXXX)"` | `DASHBOARD.WITHDRAW_PHONE_FORMAT_ERROR` |
| `"Prénom NOM"` (placeholder receiverName) | `DASHBOARD.WITHDRAW_RECEIVER_PLACEHOLDER` |

Clés à créer :
```json
// fr.json dans "DASHBOARD":
"SOS_WANTS_TO_ADD": "souhaite vous ajouter",
"SOS_INVITATIONS_TITLE": "Invitations reçues",
"SOS_ADD_CONTACT_TITLE": "Ajouter un contact",
"SOS_TRUSTED_BY_TITLE": "Je suis contact de confiance de",
"WITHDRAW_AMOUNT_LABEL": "Montant à retirer",  // ← existe déjà, corriger le bug dans le HTML
"WITHDRAW_PHONE_FORMAT_ERROR": "Format invalide (ex: 237XXXXXXXXX)",
"WITHDRAW_RECEIVER_PLACEHOLDER": "Prénom NOM",
"WITHDRAW_RECEIVER_LABEL": "Nom du destinataire"

// fr.json dans "COMMON":
"DATE": "Date"

// en.json identique
"SOS_WANTS_TO_ADD": "wants to add you",
"SOS_INVITATIONS_TITLE": "Received invitations",
"SOS_ADD_CONTACT_TITLE": "Add a contact",
"SOS_TRUSTED_BY_TITLE": "I am a trusted contact of",
"WITHDRAW_PHONE_FORMAT_ERROR": "Invalid format (e.g. 237XXXXXXXXX)",
"WITHDRAW_RECEIVER_PLACEHOLDER": "First LAST",
"WITHDRAW_RECEIVER_LABEL": "Recipient name"

// en.json dans "COMMON":
"DATE": "Date"
```

---

### 2.5 `about.component.html`
**Fichier :** `src/app/features/about/about.component.html`

| Texte en dur | Clé i18n à créer |
|---|---|
| `"Fonctionnalités"` (section label) | `ABOUT.FEATURES_LABEL` |
| `"Tout ce que vous pouvez faire"` | `ABOUT.FEATURES_TITLE` |
| `"Une plateforme complète pensée pour l'action immédiate et l'entraide durable."` | `ABOUT.FEATURES_SUB` |
| `"Bouton SOS d'urgence"` | `ABOUT.FEAT_SOS_TITLE` |
| `"Exclusif"` (badge) | `ABOUT.FEAT_BADGE_EXCLUSIVE` |
| SOS feature description (long paragraph) | `ABOUT.FEAT_SOS_DESC` |
| 4 bullet points SOS | `ABOUT.FEAT_SOS_B1..B4` |
| `"Publier un signalement"` | `ABOUT.FEAT_REPORT_TITLE` |
| Report description paragraph | `ABOUT.FEAT_REPORT_DESC` |
| `"Rechercher & Filtrer"` | `ABOUT.FEAT_SEARCH_TITLE` |
| Search description | `ABOUT.FEAT_SEARCH_DESC` |
| `"Soutien communautaire"` | `ABOUT.FEAT_COMMUNITY_TITLE` |
| Community description | `ABOUT.FEAT_COMMUNITY_DESC` |
| `"Application Android"` | `ABOUT.FEAT_ANDROID_TITLE` |
| Android description | `ABOUT.FEAT_ANDROID_DESC` |
| `"Recherche par photo"` | `ABOUT.FEAT_PHOTO_TITLE` |
| Photo search description | `ABOUT.FEAT_PHOTO_DESC` |
| `"Mode d'emploi"` (section label) | `ABOUT.HOW_LABEL` |
| `"Comment ça marche ?"` | `ABOUT.HOW_TITLE` |
| `"Démarrez en moins de 2 minutes..."` | `ABOUT.HOW_SUB` |
| `"Créez un compte"` (step 01) | `ABOUT.STEP1_TITLE` |
| Step 01 description | `ABOUT.STEP1_DESC` |
| `"Publiez un cas"` (step 02) | `ABOUT.STEP2_TITLE` |
| Step 02 description | `ABOUT.STEP2_DESC` |
| `"La communauté réagit"` (step 03) | `ABOUT.STEP3_TITLE` |
| Step 03 description | `ABOUT.STEP3_DESC` |
| `"Ensemble on agit"` (step 04) | `ABOUT.STEP4_TITLE` |
| Step 04 description | `ABOUT.STEP4_DESC` |
| `"Sécurité & confidentialité"` (label) | `ABOUT.SECURITY_LABEL` |
| `"Comment la plateforme vous protège ?"` | `ABOUT.SECURITY_TITLE` |
| `"La sécurité des victimes..."` | `ABOUT.SECURITY_SUB` |
| 6 security card titles and descriptions | `ABOUT.SEC_FILTER_TITLE..DESC`, `ABOUT.SEC_DOXXING_TITLE..DESC`, etc. |
| `"Transparence technique"` (label) | `ABOUT.TECH_LABEL` |
| `"Une plateforme indépendante et transparente"` | `ABOUT.TECH_TITLE` |
| 2 transparency paragraphs | `ABOUT.TECH_P1`, `ABOUT.TECH_P2` |
| `"Questions fréquentes"` (label) | `ABOUT.FAQ_LABEL` |
| `"Vous avez des questions ?"` | `ABOUT.FAQ_TITLE` |
| 6 FAQ questions + answers | `ABOUT.FAQ_Q1..Q6`, `ABOUT.FAQ_A1..A6` |
| `"Prêt à rejoindre la communauté ?"` | `ABOUT.CTA_TITLE` |
| CTA description | `ABOUT.CTA_DESC` |
| `"Soutenir AlertProche"` (modal title) | `ABOUT.SUPPORT_MODAL_TITLE` |
| feature bullet points (mixed: some use `| translate`, others are en dur) | Various |

**Note :** La section "about" est la plus impactée. Elle contient environ 40+ textes en dur. La priorité est maximale car c'est une page vitrine.

---

### 2.6 `post-form.component.html`
**Fichier :** `src/app/features/post-form/post-form.component.html`

| Texte en dur | Clé i18n à créer/utiliser |
|---|---|
| `"Terminer"` (bouton stop enregistrement vocal) | `POST.VOICE_STOP_BTN` |
| `"L'IA analyse votre message vocal…"` | `POST.VOICE_PROCESSING` |
| `"Tapez une ville camerounaise…"` (placeholder location) | `POST.LOCATION_PLACEHOLDER` |
| `"Valider"` (bouton ville libre) | `POST.LOCATION_VALIDATE_BTN` |
| `"Ville absente de la liste - cliquez sur Valider pour vérification IA."` | `POST.LOCATION_AI_HINT` |
| `"Glissez une photo ici"` | `POST.IMAGE_DROP_TITLE` |
| `"ou cliquez pour sélectionner"` | `POST.IMAGE_DROP_LINK` |
| `"JPG, PNG - Max 5 Mo"` | `POST.IMAGE_DROP_HINT` |
| `"L'IA analyse votre image..."` | `POST.IMAGE_ANALYZING` |
| `"Analyse terminée."` | `POST.IMAGE_ANALYZED` |
| `"Modération automatique"` (card header) | `POST.MODERATION_CARD_TITLE` |
| 4 modération bullet points | `POST.MOD_RULE1..4` |
| `"Votre publication sera analysée automatiquement avant d'être publiée."` | `POST.MOD_NOTE` |
| Title placeholder: `"ex: URGENT – Disparition de Kalinda, 7 ans – Yaoundé Centre"` | `POST.TITLE_PLACEHOLDER` |
| Content placeholder: `"Décrivez la situation en détail..."` | `POST.CONTENT_PLACEHOLDER` |
| `"car."` (abréviation caractères) | `POST.CHARS_ABBREV` |

Clés à créer :
```json
// fr.json dans "POST":
"VOICE_STOP_BTN": "Terminer",
"VOICE_PROCESSING": "L'IA analyse votre message vocal…",
"LOCATION_PLACEHOLDER": "Tapez une ville camerounaise…",
"LOCATION_VALIDATE_BTN": "Valider",
"LOCATION_AI_HINT": "Ville absente de la liste — cliquez sur Valider pour vérification IA.",
"IMAGE_DROP_TITLE": "Glissez une photo ici",
"IMAGE_DROP_LINK": "cliquez pour sélectionner",
"IMAGE_DROP_HINT": "JPG, PNG — Max 5 Mo",
"IMAGE_ANALYZING": "L'IA analyse votre image pour en extraire les informations et remplir votre formulaire automatiquement…",
"IMAGE_ANALYZED": "Analyse terminée.",
"MODERATION_CARD_TITLE": "Modération automatique",
"MOD_RULE1": "Filtre anti-discours haineux",
"MOD_RULE2": "Protection anti-doxxing",
"MOD_RULE3": "Blocage des numéros de téléphone",
"MOD_RULE4": "Modération en temps réel",
"MOD_NOTE": "Votre publication sera analysée automatiquement avant d'être publiée.",
"TITLE_PLACEHOLDER": "ex: URGENT – Disparition de Kalinda, 7 ans – Yaoundé Centre",
"CONTENT_PLACEHOLDER": "Décrivez la situation en détail : date, heure, lieu précis, description physique, circonstances...",
"CHARS_ABBREV": "car."

// en.json dans "POST":
"VOICE_STOP_BTN": "Finish",
"VOICE_PROCESSING": "AI is analysing your voice message…",
"LOCATION_PLACEHOLDER": "Type a Cameroonian city…",
"LOCATION_VALIDATE_BTN": "Validate",
"LOCATION_AI_HINT": "City not in the list — click Validate for AI verification.",
"IMAGE_DROP_TITLE": "Drop a photo here",
"IMAGE_DROP_LINK": "click to select",
"IMAGE_DROP_HINT": "JPG, PNG — Max 5 MB",
"IMAGE_ANALYZING": "AI is analysing your image to extract information and fill in your form automatically…",
"IMAGE_ANALYZED": "Analysis complete.",
"MODERATION_CARD_TITLE": "Automatic moderation",
"MOD_RULE1": "Anti-hate speech filter",
"MOD_RULE2": "Anti-doxxing protection",
"MOD_RULE3": "Phone number blocking",
"MOD_RULE4": "Real-time moderation",
"MOD_NOTE": "Your post will be automatically analysed before being published.",
"TITLE_PLACEHOLDER": "e.g. URGENT – Missing: Kalinda, 7 years old – Yaoundé Centre",
"CONTENT_PLACEHOLDER": "Describe the situation in detail: date, time, precise location, physical description, circumstances...",
"CHARS_ABBREV": "chars."
```

---

### 2.7 `moderation.component.html`
**Fichier :** `src/app/features/moderation/moderation.component.html`

| Texte en dur | Clé à créer |
|---|---|
| `"Mon Espace"` (lien retour) | `DASHBOARD.NAV_DASHBOARD` → utiliser `'DASHBOARD.SECTION_PROFILE' | translate` ou créer `MOD.BACK_LINK` |
| `"Espace de Modération"` | `MOD.TITLE` |
| `"Connecté en tant que"` | `MOD.SUBTITLE` |
| `"Actualiser"` | → utiliser `'ADMIN.BTN_REFRESH' | translate` ✅ |
| `"Signalement(s) en attente"` | `MOD.STAT_REPORTS` |
| `"Publication(s) désactivée(s)"` | `MOD.STAT_DISABLED` |
| `"Total publications"` | `MOD.STAT_TOTAL` |
| `"Vos permissions en tant que"` | `MOD.PERMS_INTRO` |
| `"Voir tous les signalements"` | `MOD.PERM_VIEW` |
| `"Désactiver / Réactiver une publication"` | `MOD.PERM_TOGGLE` |
| `"Classer un signalement sans suite"` | `MOD.PERM_DISMISS` |
| `"Supprimer définitivement une publication"` | `MOD.PERM_DELETE` |
| `"Suppression définitive (Admin uniquement)"` | `MOD.PERM_DELETE_DISABLED` |
| `"Chargement des données..."` | → utiliser `'COMMON.LOADING' | translate` ✅ |
| `"Publications signalées"` | `MOD.TAB_REPORTED` |
| `"Publications désactivées"` | `MOD.TAB_DISABLED` |
| `"Aucun signalement en attente"` | `MOD.EMPTY_REPORTED_TITLE` |
| `"Toutes les publications sont conformes..."` | `MOD.EMPTY_REPORTED_DESC` |
| `"Signalé"` (status chip) | `MOD.STATUS_REPORTED` |
| `"Actif"` / `"Désactivé"` (status) | `MOD.STATUS_ACTIVE` / `MOD.STATUS_DISABLED` |
| `"Anonyme"` | → utiliser `'COMMON.ANONYMOUS' | translate` ✅ |
| `"Motifs de signalement :"` | `MOD.REPORT_REASONS_TITLE` |
| `"Voir"` | `MOD.BTN_VIEW` |
| `"Sans suite"` | `MOD.BTN_DISMISS` |
| `"Désactiver"` / `"Réactiver"` | `MOD.BTN_DISABLE` / `MOD.BTN_ENABLE` |
| `"Résoudre"` | `MOD.BTN_RESOLVE` |
| `"Réouvrir"` | `MOD.BTN_REOPEN` |
| `"Supprimer"` | → utiliser `'COMMON.DELETE' | translate` ✅ |
| `"Aucune publication désactivée"` | `MOD.EMPTY_DISABLED_TITLE` |
| `"Toutes les publications sont actuellement visibles."` | `MOD.EMPTY_DISABLED_DESC` |

Clés à créer (namespace `MOD`) :
```json
// fr.json - nouveau namespace "MOD":
"MOD": {
  "TITLE": "Espace de Modération",
  "BACK_LINK": "Mon Espace",
  "SUBTITLE": "Connecté en tant que",
  "STAT_REPORTS": "Signalement(s) en attente",
  "STAT_DISABLED": "Publication(s) désactivée(s)",
  "STAT_TOTAL": "Total publications",
  "PERMS_INTRO": "Vos permissions en tant que",
  "PERM_VIEW": "Voir tous les signalements",
  "PERM_TOGGLE": "Désactiver / Réactiver une publication",
  "PERM_DISMISS": "Classer un signalement sans suite",
  "PERM_DELETE": "Supprimer définitivement une publication",
  "PERM_DELETE_DISABLED": "Suppression définitive (Admin uniquement)",
  "TAB_REPORTED": "Publications signalées",
  "TAB_DISABLED": "Publications désactivées",
  "EMPTY_REPORTED_TITLE": "Aucun signalement en attente",
  "EMPTY_REPORTED_DESC": "Toutes les publications sont conformes. Aucune action requise.",
  "EMPTY_DISABLED_TITLE": "Aucune publication désactivée",
  "EMPTY_DISABLED_DESC": "Toutes les publications sont actuellement visibles.",
  "STATUS_REPORTED": "Signalé",
  "STATUS_ACTIVE": "Actif",
  "STATUS_DISABLED": "Désactivé",
  "REPORT_REASONS_TITLE": "Motifs de signalement :",
  "BTN_VIEW": "Voir",
  "BTN_DISMISS": "Sans suite",
  "BTN_DISABLE": "Désactiver",
  "BTN_ENABLE": "Réactiver",
  "BTN_RESOLVE": "Résoudre",
  "BTN_REOPEN": "Réouvrir"
}

// en.json:
"MOD": {
  "TITLE": "Moderation Space",
  "BACK_LINK": "My Space",
  "SUBTITLE": "Signed in as",
  "STAT_REPORTS": "Pending report(s)",
  "STAT_DISABLED": "Disabled post(s)",
  "STAT_TOTAL": "Total posts",
  "PERMS_INTRO": "Your permissions as",
  "PERM_VIEW": "View all reports",
  "PERM_TOGGLE": "Disable / Re-enable a post",
  "PERM_DISMISS": "Dismiss a report",
  "PERM_DELETE": "Permanently delete a post",
  "PERM_DELETE_DISABLED": "Permanent deletion (Admin only)",
  "TAB_REPORTED": "Reported posts",
  "TAB_DISABLED": "Disabled posts",
  "EMPTY_REPORTED_TITLE": "No pending reports",
  "EMPTY_REPORTED_DESC": "All posts are compliant. No action required.",
  "EMPTY_DISABLED_TITLE": "No disabled posts",
  "EMPTY_DISABLED_DESC": "All posts are currently visible.",
  "STATUS_REPORTED": "Reported",
  "STATUS_ACTIVE": "Active",
  "STATUS_DISABLED": "Disabled",
  "REPORT_REASONS_TITLE": "Report reasons:",
  "BTN_VIEW": "View",
  "BTN_DISMISS": "Dismiss",
  "BTN_DISABLE": "Disable",
  "BTN_ENABLE": "Re-enable",
  "BTN_RESOLVE": "Resolve",
  "BTN_REOPEN": "Reopen"
}
```

---

### 2.8 `feed.component.html`
**Fichier :** `src/app/features/feed/feed.component.html`

| Texte en dur | Clé à créer |
|---|---|
| `"Fil d'actualité"` (titre h1) | `FEED.TITLE` |
| `"Partagez et restez informé de l'activité de la communauté."` | `FEED.SUBTITLE` |
| `"Rejoignez la communauté pour partager et interagir."` | `FEED.AUTH_CTA_MSG` |
| `"Se connecter"` (bouton CTA non-auth) | → utiliser `'NAV.LOGIN' | translate` ✅ |
| `"Supprimer ?"` (confirm delete) | `FEED.CONFIRM_DELETE` |
| `"Oui"` / `"Non"` (confirm) | → utiliser `'COMMON.YES'` / `'COMMON.NO'` ✅ |
| `"Voir moins"` / `"Voir plus"` | `FEED.SEE_LESS` / `FEED.SEE_MORE` |
| `"Chargement..."` (comments loading) | → utiliser `'COMMON.LOADING' | translate` ✅ |
| `"Aucun commentaire encore."` | `FEED.NO_COMMENTS` |
| `"Répondre..."` (placeholder input commentaire) | `FEED.COMMENT_PLACEHOLDER` |
| `"Aucune publication pour l'instant"` | `FEED.EMPTY_TITLE` |
| `"Soyez le premier à partager quelque chose avec la communauté."` | `FEED.EMPTY_DESC` |
| `"Chargement..."` (load more) | → utiliser `'COMMON.LOADING' | translate` ✅ |
| `"Vous avez tout vu !"` | `FEED.END_OF_FEED` |

Clés à créer :
```json
// fr.json - nouveau namespace "FEED":
"FEED": {
  "TITLE": "Fil d'actualité",
  "SUBTITLE": "Partagez et restez informé de l'activité de la communauté.",
  "AUTH_CTA_MSG": "Rejoignez la communauté pour partager et interagir.",
  "CONFIRM_DELETE": "Supprimer ?",
  "SEE_MORE": "Voir plus",
  "SEE_LESS": "Voir moins",
  "NO_COMMENTS": "Aucun commentaire encore.",
  "COMMENT_PLACEHOLDER": "Répondre...",
  "EMPTY_TITLE": "Aucune publication pour l'instant",
  "EMPTY_DESC": "Soyez le premier à partager quelque chose avec la communauté.",
  "END_OF_FEED": "Vous avez tout vu !"
}

// en.json:
"FEED": {
  "TITLE": "News Feed",
  "SUBTITLE": "Share and stay informed about community activity.",
  "AUTH_CTA_MSG": "Join the community to share and interact.",
  "CONFIRM_DELETE": "Delete?",
  "SEE_MORE": "See more",
  "SEE_LESS": "See less",
  "NO_COMMENTS": "No comments yet.",
  "COMMENT_PLACEHOLDER": "Reply...",
  "EMPTY_TITLE": "No posts yet",
  "EMPTY_DESC": "Be the first to share something with the community.",
  "END_OF_FEED": "You've seen it all!"
}
```

---

### 2.9 `sos-response.component.html`
**Fichier :** `src/app/features/sos-response/sos-response.component.html`

| Texte en dur | Clé à créer |
|---|---|
| `"Chargement de l'alerte…"` | `SOS.LOADING` |
| `"Alerte introuvable"` | `SOS.NOT_FOUND` |
| `"🆘 ALERTE SOS EN COURS"` | `SOS.ACTIVE_TITLE` |
| `"✅ Alerte résolue"` | `SOS.RESOLVED_TITLE` |
| `"🔕 Alerte annulée"` | `SOS.CANCELLED_TITLE` |
| `"Déclenchée il y a"` | `SOS.ELAPSED_PREFIX` |
| `"Clôturée le"` | `SOS.CLOSED_AT` |
| `"Niveau"` (badge menace) | `SOS.THREAT_LEVEL_PREFIX` |
| `"Personne en danger"` (card title) | `SOS.EMITTER_CARD_TITLE` |
| `"Personne de confiance liée"` | `SOS.EMITTER_LABEL` |
| `"Message vocal"` | `SOS.VOICE_MSG_LABEL` |
| `"Dernière position connue"` | `SOS.POSITION_TITLE` |
| `"Live"` (badge) | `SOS.LIVE_BADGE` |
| `"Latitude"` / `"Longitude"` | `SOS.LAT` / `SOS.LON` |
| `"Ouvrir dans Google Maps"` | `SOS.BTN_OPEN_MAPS` |
| `"Votre réponse"` | `SOS.YOUR_RESPONSE_TITLE` |
| `"Vous êtes en route"` | `SOS.CONFIRMED_TITLE` |
| `"L'émetteur a été averti que vous arrivez."` | `SOS.CONFIRMED_DESC` |
| `"... a besoin d'aide. Pouvez-vous intervenir ?"` | `SOS.ACTION_DESC` |
| `"J'arrive - Je vais aider"` | `SOS.BTN_ARRIVE` |
| `"Si la personne est en sécurité, vous pouvez clôturer l'alerte."` | `SOS.RESOLVE_HINT` |
| `"Marquer comme résolu"` | `SOS.BTN_RESOLVE` |
| `"Votre alerte"` | `SOS.YOUR_ALERT_TITLE` |
| `"Votre SOS est actif. Vos contacts ont été notifiés..."` | `SOS.OWNER_DESC` |
| `"Je suis en sécurité"` | `SOS.BTN_SAFE` |
| `"Alerte résolue"` / `"Alerte annulée"` | `SOS.RESOLVED_TITLE_CARD` / `SOS.CANCELLED_TITLE_CARD` |
| `"Retour à l'accueil"` | → utiliser `'ABOUT.BACK' | translate` ou créer `COMMON.HOME` |
| `"Personnes en route"` | `SOS.RESPONDERS_TITLE` |
| `"En route"` | `SOS.RESPONDER_STATUS` |
| `"En attente de réponse…"` | `SOS.NO_RESPONDERS` |

Clés à créer — nouveau namespace `SOS` :
```json
// fr.json - nouveau namespace "SOS":
"SOS": {
  "LOADING": "Chargement de l'alerte…",
  "NOT_FOUND": "Alerte introuvable",
  "ACTIVE_TITLE": "🆘 ALERTE SOS EN COURS",
  "RESOLVED_TITLE": "✅ Alerte résolue",
  "CANCELLED_TITLE": "🔕 Alerte annulée",
  "ELAPSED_PREFIX": "Déclenchée il y a",
  "CLOSED_AT": "Clôturée le",
  "THREAT_LEVEL_PREFIX": "Niveau",
  "EMITTER_CARD_TITLE": "Personne en danger",
  "EMITTER_LABEL": "Personne de confiance liée",
  "VOICE_MSG_LABEL": "Message vocal",
  "POSITION_TITLE": "Dernière position connue",
  "LIVE_BADGE": "Live",
  "LAT": "Latitude",
  "LON": "Longitude",
  "BTN_OPEN_MAPS": "Ouvrir dans Google Maps",
  "YOUR_RESPONSE_TITLE": "Votre réponse",
  "CONFIRMED_TITLE": "Vous êtes en route",
  "CONFIRMED_DESC": "L'émetteur a été averti que vous arrivez.",
  "ACTION_DESC": "a besoin d'aide. Pouvez-vous intervenir ?",
  "BTN_ARRIVE": "J'arrive — Je vais aider",
  "RESOLVE_HINT": "Si la personne est en sécurité, vous pouvez clôturer l'alerte.",
  "BTN_RESOLVE": "Marquer comme résolu",
  "YOUR_ALERT_TITLE": "Votre alerte",
  "OWNER_DESC": "Votre SOS est actif. Vos contacts ont été notifiés. Si vous êtes en sécurité, clôturez l'alerte.",
  "BTN_SAFE": "Je suis en sécurité",
  "RESOLVED_TITLE_CARD": "Alerte résolue",
  "CANCELLED_TITLE_CARD": "Alerte annulée",
  "RESPONDERS_TITLE": "Personnes en route",
  "RESPONDER_STATUS": "En route",
  "NO_RESPONDERS": "En attente de réponse…"
}

// en.json:
"SOS": {
  "LOADING": "Loading alert…",
  "NOT_FOUND": "Alert not found",
  "ACTIVE_TITLE": "🆘 ACTIVE SOS ALERT",
  "RESOLVED_TITLE": "✅ Alert resolved",
  "CANCELLED_TITLE": "🔕 Alert cancelled",
  "ELAPSED_PREFIX": "Triggered",
  "CLOSED_AT": "Closed on",
  "THREAT_LEVEL_PREFIX": "Level",
  "EMITTER_CARD_TITLE": "Person in danger",
  "EMITTER_LABEL": "Linked trusted contact",
  "VOICE_MSG_LABEL": "Voice message",
  "POSITION_TITLE": "Last known position",
  "LIVE_BADGE": "Live",
  "LAT": "Latitude",
  "LON": "Longitude",
  "BTN_OPEN_MAPS": "Open in Google Maps",
  "YOUR_RESPONSE_TITLE": "Your response",
  "CONFIRMED_TITLE": "You are on your way",
  "CONFIRMED_DESC": "The sender has been notified that you are coming.",
  "ACTION_DESC": "needs help. Can you intervene?",
  "BTN_ARRIVE": "On my way — I'll help",
  "RESOLVE_HINT": "If the person is safe, you can close the alert.",
  "BTN_RESOLVE": "Mark as resolved",
  "YOUR_ALERT_TITLE": "Your alert",
  "OWNER_DESC": "Your SOS is active. Your contacts have been notified. If you are safe, close the alert.",
  "BTN_SAFE": "I am safe",
  "RESOLVED_TITLE_CARD": "Alert resolved",
  "CANCELLED_TITLE_CARD": "Alert cancelled",
  "RESPONDERS_TITLE": "People on their way",
  "RESPONDER_STATUS": "On the way",
  "NO_RESPONDERS": "Waiting for a response…"
}
```

---

### 2.10 `payment-callback.component.html`
**Fichier :** `src/app/features/payment-callback/payment-callback.component.html`

| Texte en dur | Clé à créer |
|---|---|
| `"Traitement en cours…"` | `PAYMENT.CALLBACK_LOADING_TITLE` |
| `"Votre paiement est en cours de vérification."` | `PAYMENT.CALLBACK_LOADING_DESC` |
| `"Paiement réussi !"` | `PAYMENT.CALLBACK_SUCCESS_TITLE` |
| `"Merci pour votre soutien. Votre don a bien été enregistré..."` | `PAYMENT.CALLBACK_SUCCESS_DESC` |
| `"Référence :"` | `PAYMENT.CALLBACK_REF_LABEL` |
| `"Paiement en attente"` | `PAYMENT.CALLBACK_PENDING_TITLE` |
| `"Votre paiement est en cours de traitement..."` | `PAYMENT.CALLBACK_PENDING_DESC` |
| `"Paiement échoué"` | `PAYMENT.CALLBACK_FAILED_TITLE` |
| `"Votre paiement n'a pas pu être traité..."` | `PAYMENT.CALLBACK_FAILED_DESC` |
| `"Retour à l'accueil"` | `COMMON.BTN_HOME` (à créer) |
| `"En savoir plus"` | `COMMON.BTN_LEARN_MORE` (à créer) |

Clés à créer dans `PAYMENT` :
```json
// fr.json
"CALLBACK_LOADING_TITLE": "Traitement en cours…",
"CALLBACK_LOADING_DESC": "Votre paiement est en cours de vérification.",
"CALLBACK_SUCCESS_TITLE": "Paiement réussi !",
"CALLBACK_SUCCESS_DESC": "Merci pour votre soutien. Votre don a bien été enregistré et contribuera à aider la communauté AlertProche.",
"CALLBACK_REF_LABEL": "Référence :",
"CALLBACK_PENDING_TITLE": "Paiement en attente",
"CALLBACK_PENDING_DESC": "Votre paiement est en cours de traitement. Vous recevrez une confirmation dès qu'il sera finalisé.",
"CALLBACK_FAILED_TITLE": "Paiement échoué",
"CALLBACK_FAILED_DESC": "Votre paiement n'a pas pu être traité. Veuillez réessayer ou utiliser un autre moyen de paiement."

// en.json
"CALLBACK_LOADING_TITLE": "Processing…",
"CALLBACK_LOADING_DESC": "Your payment is being verified.",
"CALLBACK_SUCCESS_TITLE": "Payment successful!",
"CALLBACK_SUCCESS_DESC": "Thank you for your support. Your donation has been recorded and will help the AlertProche community.",
"CALLBACK_REF_LABEL": "Reference:",
"CALLBACK_PENDING_TITLE": "Payment pending",
"CALLBACK_PENDING_DESC": "Your payment is being processed. You will receive a confirmation once it is finalised.",
"CALLBACK_FAILED_TITLE": "Payment failed",
"CALLBACK_FAILED_DESC": "Your payment could not be processed. Please try again or use a different payment method."
```

Clés à créer dans `COMMON` :
```json
// fr.json
"BTN_HOME": "Retour à l'accueil",
"BTN_LEARN_MORE": "En savoir plus"

// en.json
"BTN_HOME": "Back to home",
"BTN_LEARN_MORE": "Learn more"
```

---

### 2.11 `privacy.component.html`
**Fichier :** `src/app/features/privacy/privacy.component.html`

La page de politique de confidentialité est **entièrement en dur** — c'est un contenu éditorial long et statique. Il est acceptable de la laisser en dur pour la version initiale, ou de l'externaliser dans des fichiers de traduction.

**Recommandation :** Créer un namespace `PRIVACY` avec les clés suivantes au minimum :
- Titre, sous-titre, intro
- Titres de sections (01..09)
- Lien de retour

**Textes en dur critiques (visibles dans le header) :**
| Texte | Clé |
|---|---|
| `"Retour à l'accueil"` (lien) | → utiliser `'COMMON.BTN_HOME' | translate` |
| `"Politique de Confidentialité"` (titre) | `PRIVACY.TITLE` |
| `"Dernière mise à jour :"` | `PRIVACY.LAST_UPDATED_LABEL` |
| `"Sommaire"` | `PRIVACY.TOC_TITLE` |
| 9 titres de sections | `PRIVACY.SECTION_TITLE_01..09` |

---

### 2.12 `admin.component.html`
**Fichier :** `src/app/features/admin/admin.component.html`

La majeure partie de ce fichier est déjà traduite. Textes restants en dur :

| Texte en dur | Clé |
|---|---|
| `"Standard"`, `"Modérateur"`, `"Admin"` (role bars) | → Valeurs de la base de données, peuvent être traduits via `ADMIN.ROLE_STANDARD`, `ADMIN.ROLE_MOD`, `ADMIN.ROLE_ADMIN` |
| `"Disparition"`, `"Abus"`, `"Prévention"` (post type chart) | → Valeurs DB, utiliser `POST.TYPE_DISPARITION` etc. ✅ (existent déjà) |
| `"Activité - 30 derniers jours"` | `ADMIN.ACTIVITY_TITLE` |
| `"Standard"` (label rôle dans role bar) | `ADMIN.ROLE_STANDARD` |
| `"Modérateur"` | `ADMIN.ROLE_MOD` |
| `"Admin"` | `ADMIN.ROLE_ADMIN` |
| `"Opérateur"` (colonne tableau paiements) | `ADMIN.PAYOUT_OPERATOR_LABEL` |
| `"Statut"` (colonne tableau) | `ADMIN.PAYOUT_STATUS_LABEL` |
| `"Type"` (colonne tableau) | `ADMIN.TX_TYPE_LABEL` |
| `"Date"` (colonnes multiples) | → utiliser `'COMMON.DATE' | translate` |
| `"Actions"` (colonne) | `ADMIN.COL_ACTIONS` |
| `"Statut"` (colonne posts) | `ADMIN.COL_STATUS` |

Clés à créer dans `ADMIN` :
```json
// fr.json
"ACTIVITY_TITLE": "Activité - 30 derniers jours",
"ROLE_STANDARD": "Standard",
"ROLE_MOD": "Modérateur",
"ROLE_ADMIN": "Admin",
"PAYOUT_OPERATOR_LABEL": "Opérateur",
"PAYOUT_STATUS_LABEL": "Statut",
"TX_TYPE_LABEL": "Type",
"COL_ACTIONS": "Actions",
"COL_STATUS": "Statut"

// en.json
"ACTIVITY_TITLE": "Activity — last 30 days",
"ROLE_STANDARD": "Standard",
"ROLE_MOD": "Moderator",
"ROLE_ADMIN": "Admin",
"PAYOUT_OPERATOR_LABEL": "Operator",
"PAYOUT_STATUS_LABEL": "Status",
"TX_TYPE_LABEL": "Type",
"COL_ACTIONS": "Actions",
"COL_STATUS": "Status"
```

---

### 2.13 `donation-modal.component.html`
**Fichier :** `src/app/shared/components/donation-modal/donation-modal.component.html`

| Texte en dur | Clé |
|---|---|
| `"Paiement sécurisé via digiKUNTZ · MTN / Orange Money"` | `PAYMENT.SECURE_HINT` |

```json
// fr.json dans "PAYMENT":
"SECURE_HINT": "Paiement sécurisé via digiKUNTZ · MTN / Orange Money"
// en.json:
"SECURE_HINT": "Secure payment via digiKUNTZ · MTN / Orange Money"
```

---

### 2.14 `platform-support-modal.component.ts` (template inline)
**Fichier :** `src/app/shared/components/platform-support-modal/platform-support-modal.component.ts`

Ce composant utilise un **template inline** avec des strings **entièrement en dur**. Il ne dispose pas du `TranslateModule`.

| Texte en dur | Clé à utiliser |
|---|---|
| `"Autre montant (min. 100 XAF)"` (placeholder) | `PAYMENT.CUSTOM_AMOUNT_PLACEHOLDER` ✅ (existe) |
| `"Numéro Mobile Money (MTN / Orange)"` (label) | `PAYMENT.PHONE_LABEL` ✅ (existe) |
| `"Ex: 6XXXXXXXX"` (placeholder) | `PAYMENT.PHONE_PLACEHOLDER` ✅ (existe) |
| `"Don de ... XAF"` (recap) | `PAYMENT.RECAP_PREFIX` + `PAYMENT.RECAP_SUFFIX` ✅ |
| `"Valider le don"` (bouton) | `PAYMENT.BTN_DONATE` ✅ (existe) |
| `"Paiement sécurisé via digiKUNTZ · MTN / Orange Money"` | `PAYMENT.SECURE_HINT` |
| `"Montant minimum : 100 XAF."` (erreur) | `PAYMENT.ERR_AMOUNT_MIN` ✅ |
| `"Veuillez entrer un numéro Mobile Money valide."` | `PAYMENT.ERR_PHONE_INVALID` (à créer) |
| `"Une erreur est survenue. Veuillez réessayer."` | `COMMON.ERR_GENERIC` (à créer) |

**Action requise :** Ajouter `TranslateModule` et `TranslateService` à l'import du composant, et remplacer tous les strings en dur par le pipe `| translate` ou `translate.instant()`.

Nouvelles clés :
```json
// fr.json dans "PAYMENT":
"ERR_PHONE_INVALID": "Veuillez entrer un numéro Mobile Money valide."
// fr.json dans "COMMON":
"ERR_GENERIC": "Une erreur est survenue. Veuillez réessayer."

// en.json dans "PAYMENT":
"ERR_PHONE_INVALID": "Please enter a valid Mobile Money number."
// en.json dans "COMMON":
"ERR_GENERIC": "An error occurred. Please try again."
```

---

### 2.15 `chatbot.component.html` + `chatbot.component.ts`
**Fichier :** `src/app/shared/components/chatbot/chatbot.component.html` et `.ts`

**chatbot.component.html — textes en dur :**
| Texte | Clé à créer |
|---|---|
| `"Assistant AlertProche"` (title + aria-label) | `CHATBOT.TITLE` |
| `"En ligne"` (status) | `CHATBOT.STATUS_ONLINE` |
| `"Fermer"` (aria-label bouton) | → utiliser `'COMMON.CLOSE' | translate` ✅ |
| `"Chargement de l'historique..."` | `CHATBOT.LOADING_HISTORY` |
| `"Bonjour ! Je suis votre assistant AlertProche. Comment puis-je vous aider ?"` | `CHATBOT.WELCOME_MSG` |
| `"Votre message..."` (placeholder) | `CHATBOT.INPUT_PLACEHOLDER` |
| `"Envoyer"` (title bouton) | `CHATBOT.BTN_SEND` |
| `"Accéder"` (bouton action lien) | `CHATBOT.BTN_ACCESS` |

**chatbot.component.ts — strings en dur :**
| Texte | Clé/Action |
|---|---|
| `suggestions` array : `'🆘 SOS ?'`, `'📢 Signaler un abus'`, `'👤 Mon profil'`, `"📰 Fil d'actualité"` | Déplacer dans les fichiers i18n sous `CHATBOT.SUGGESTION_1..4`, les charger dynamiquement via `TranslateService` |
| Message d'erreur : `'Désolé, je suis temporairement indisponible...'` | `CHATBOT.ERR_UNAVAILABLE` |

**Problème critique — LanguageService :** Le chatbot ne réagit pas au changement de langue car il utilise des strings littéraux dans le composant TS. Il faut injecter `TranslateService` et recalculer les suggestions avec `computed(() => [...])` qui appellent `translate.instant()`. Il faut aussi écouter `translate.onLangChange` pour rafraîchir les suggestions.

Nouvelles clés :
```json
// fr.json - nouveau namespace "CHATBOT":
"CHATBOT": {
  "TITLE": "Assistant AlertProche",
  "STATUS_ONLINE": "En ligne",
  "LOADING_HISTORY": "Chargement de l'historique...",
  "WELCOME_MSG": "Bonjour ! Je suis votre assistant AlertProche. Comment puis-je vous aider ?",
  "INPUT_PLACEHOLDER": "Votre message...",
  "BTN_SEND": "Envoyer",
  "BTN_ACCESS": "Accéder",
  "SUGGESTION_1": "🆘 SOS ?",
  "SUGGESTION_2": "📢 Signaler un abus",
  "SUGGESTION_3": "👤 Mon profil",
  "SUGGESTION_4": "📰 Fil d'actualité",
  "ERR_UNAVAILABLE": "Désolé, je suis temporairement indisponible. Si vous avez une urgence, appuyez sur le bouton SOS rouge."
}

// en.json:
"CHATBOT": {
  "TITLE": "AlertProche Assistant",
  "STATUS_ONLINE": "Online",
  "LOADING_HISTORY": "Loading history...",
  "WELCOME_MSG": "Hello! I am your AlertProche assistant. How can I help you?",
  "INPUT_PLACEHOLDER": "Your message...",
  "BTN_SEND": "Send",
  "BTN_ACCESS": "Go",
  "SUGGESTION_1": "🆘 SOS?",
  "SUGGESTION_2": "📢 Report abuse",
  "SUGGESTION_3": "👤 My profile",
  "SUGGESTION_4": "📰 News feed",
  "ERR_UNAVAILABLE": "Sorry, I am temporarily unavailable. If you have an emergency, press the red SOS button."
}
```

---

### 2.16 `navbar.component.html` — problème résiduel
Le switcher de langue utilise des strings en dur pour son title :
```html
[title]="lang.currentLang() === 'fr' ? 'Switch to English' : 'Passer en français'"
```
Ces valeurs sont **déjà présentes dans fr.json/en.json** sous `NAV.LANG_SWITCH`. Correction :
```html
[title]="'NAV.LANG_SWITCH' | translate"
```

---

### 2.17 `home.component.html`
Le bouton PWA utilise `pwa.buttonLabel` (valeur calculée dans le service, probablement en dur). À vérifier dans `PwaService` — si la valeur est en dur, extraire vers les clés i18n.

---

## 3. Bugs supplémentaires détectés

### Bug A — `dashboard.component.html` : label de champ inversé
Dans le formulaire modal de retrait, le label du champ **montant** utilise incorrectement `'DASHBOARD.WITHDRAW_PHONE_LABEL'` :
```html
<!-- ACTUEL (BUG) — ligne ~620 -->
<label class="form-label">{{ 'DASHBOARD.WITHDRAW_PHONE_LABEL' | translate }} (XAF) *</label>
<!-- Le champ est pour le MONTANT, pas le téléphone -->

<!-- CORRIGÉ -->
<label class="form-label">{{ 'PAYMENT.WITHDRAW_AMOUNT_LABEL' | translate }} (XAF) *</label>
```

### Bug B — `dashboard.component.html` : clé d'erreur incorrecte pour max amount
```html
<!-- ACTUEL (BUG) -->
<span class="form-error" *ngIf="hasError(payoutForm, 'amount', 'max')">{{ 'CAGNOTTE.WITHDRAW_MIN' | translate }}</span>
<!-- Affiche "Minimum 100 XAF" pour une erreur de MAXIMUM -->

<!-- CORRIGÉ — créer une nouvelle clé -->
<span class="form-error" *ngIf="hasError(payoutForm, 'amount', 'max')">{{ 'PAYMENT.ERR_AMOUNT_MAX' | translate }}</span>
```
Créer la clé :
```json
// fr.json dans "PAYMENT":
"ERR_AMOUNT_MAX": "Montant supérieur au disponible"
// en.json:
"ERR_AMOUNT_MAX": "Amount exceeds available balance"
```

### Bug C — `alert-status-badge.component.ts` : date locale codée en dur
```ts
getResolvedDate(): string {
  return new Date(this.post.resolvedAt).toLocaleDateString('fr-FR', {...});
}
```
La locale `'fr-FR'` est codée en dur. Doit utiliser la langue courante. Injecter `LanguageService` et utiliser `lang === 'fr' ? 'fr-FR' : 'en-GB'`.

### Bug D — Raisons de signalement hardcodées dans `post-detail.component.html`
Les raisons de signalement sont utilisées à la fois comme valeurs de `radio` **et** comme labels :
```html
*ngFor="let r of ['Contenu haineux ou offensant', ...]"
[value]="r"
```
Si ces valeurs changent de langue, la valeur envoyée au backend changera aussi. **Solution :** Utiliser des clés stables comme valeurs (`HATE`, `DOXXING`, etc.) et afficher le label traduit séparément.

---

## 4. Ordre d'implémentation recommandé

### Phase 1 — Corrections de bugs (priorité critique)
1. **`alert-status-badge.component.html`** — Remplacer `'Résolue'`/`'En cours'` par le pipe translate. Simple, 2 lignes.
2. **`dashboard.component.html`** — Corriger le Bug A (label montant), Bug B (erreur max), et tous les textes en dur de la section SOS.
3. **`post-detail.component.html`** — Corriger les raisons de signalement hardcodées (Bug D).

### Phase 2 — Composants partagés (impact global)
4. **`platform-support-modal.component.ts`** — Ajouter `TranslateModule`, inject `TranslateService`, remplacer tous les strings.
5. **`chatbot.component.ts` + `.html`** — Inject `TranslateService`, externaliser les suggestions et tous les textes, corriger la réactivité au changement de langue.
6. **`donation-modal.component.html`** — Ajouter `PAYMENT.SECURE_HINT`.

### Phase 3 — Fichiers de traduction (ajout des clés)
7. Mettre à jour `fr.json` et `en.json` avec tous les nouveaux namespaces et clés listés ci-dessus : `MOD`, `FEED`, `SOS`, `CHATBOT`, `POST_CARD`, + extensions des namespaces existants `POST`, `PAYMENT`, `COMMON`, `DASHBOARD`, `ADMIN`, `ABOUT`.

### Phase 4 — Templates HTML (remplacement des textes en dur)
8. **`moderation.component.html`** — Remplacer tous les ~20 textes en dur (namespace `MOD`).
9. **`feed.component.html`** — Remplacer tous les ~10 textes en dur (namespace `FEED`).
10. **`sos-response.component.html`** — Remplacer tous les ~25 textes en dur (namespace `SOS`).
11. **`post-form.component.html`** — Remplacer ~15 textes en dur.
12. **`payment-callback.component.html`** — Remplacer ~8 textes en dur.
13. **`post-detail.component.html`** — CTAs et sidebar info.

### Phase 5 — Page About (la plus volumineuse)
14. **`about.component.html`** — ~40 textes en dur à remplacer. Seul l'essentiel (sections fonctionnalités, étapes, FAQ, sécurité) doit être traduit. Créer le namespace `ABOUT` étendu.

### Phase 6 — Pages statiques
15. **`privacy.component.html`** — Minimum : header/navigation. Les 9 sections peuvent être externalisées ou laissées en FR pour la v1.

---

## 5. Vérifications spécifiques pour le chatbot

### 5.1 Injection de LanguageService / TranslateService
**Problème actuel :** `chatbot.component.ts` n'injecte ni `LanguageService` ni `TranslateService`. Les suggestions et le message d'erreur sont des strings littéraux qui **ne changent jamais** quelle que soit la langue sélectionnée.

**Solution à implémenter :**
```typescript
// chatbot.component.ts
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';

// Dans le constructor
constructor(
  private translate: TranslateService,
  private lang: LanguageService,
) {}

// Remplacer readonly suggestions = [...] par un computed signal
readonly suggestions = computed(() => {
  // Forcer la réévaluation quand la langue change
  this.lang.currentLang(); // lecture pour créer la dépendance
  return [
    this.translate.instant('CHATBOT.SUGGESTION_1'),
    this.translate.instant('CHATBOT.SUGGESTION_2'),
    this.translate.instant('CHATBOT.SUGGESTION_3'),
    this.translate.instant('CHATBOT.SUGGESTION_4'),
  ];
});
```

### 5.2 Message d'erreur du chatbot
```typescript
// chatbot.component.ts — dans error handler du subscribe
text: this.translate.instant('CHATBOT.ERR_UNAVAILABLE'),
```

### 5.3 systemPrompt côté backend
Le `systemPrompt` est dans `alertproche-api/src/chat/chat.service.ts`. Ce fichier est côté serveur et ne fait pas partie du scope i18n Angular. **Ne pas modifier.**

### 5.4 Textes HTML du chatbot
Dans `chatbot.component.html`, remplacer :
- `title="Assistant AlertProche"` → `[title]="'CHATBOT.TITLE' | translate"`
- `aria-label="Ouvrir l'assistant"` → `[attr.aria-label]="'CHATBOT.TITLE' | translate"`
- `"En ligne"` → `{{ 'CHATBOT.STATUS_ONLINE' | translate }}`
- `"Chargement de l'historique..."` → `{{ 'CHATBOT.LOADING_HISTORY' | translate }}`
- `"Bonjour ! Je suis votre assistant..."` → `{{ 'CHATBOT.WELCOME_MSG' | translate }}`
- `placeholder="Votre message..."` → `[placeholder]="'CHATBOT.INPUT_PLACEHOLDER' | translate"`
- `title="Envoyer"` → `[title]="'CHATBOT.BTN_SEND' | translate"`
- `"Accéder"` → `{{ 'CHATBOT.BTN_ACCESS' | translate }}`

---

## 6. Diff complet des clés i18n (fr.json vs en.json)

**Résultat :** Les deux fichiers sont parfaitement symétriques. Aucune clé n'est manquante dans l'un ou l'autre fichier existant.

**Clés à ajouter dans les DEUX fichiers :**

| Namespace | Clés nouvelles | Quantité |
|---|---|---|
| `COMMON` | `DATE`, `BTN_HOME`, `BTN_LEARN_MORE`, `ERR_GENERIC` | 4 |
| `POST` | `CTA_DISPARITION_TITLE`, `CTA_DISPARITION_DESC`, `CTA_APPEL_TITLE`, `CTA_APPEL_DESC`, `SIDEBAR_INFO_TITLE`, `REPORT_REASON_*` (×5), `VOICE_STOP_BTN`, `VOICE_PROCESSING`, `LOCATION_PLACEHOLDER`, `LOCATION_VALIDATE_BTN`, `LOCATION_AI_HINT`, `IMAGE_DROP_TITLE`, `IMAGE_DROP_LINK`, `IMAGE_DROP_HINT`, `IMAGE_ANALYZING`, `IMAGE_ANALYZED`, `MODERATION_CARD_TITLE`, `MOD_RULE1..4`, `MOD_NOTE`, `TITLE_PLACEHOLDER`, `CONTENT_PLACEHOLDER`, `CHARS_ABBREV` | ~26 |
| `POST_CARD` | `ARIA_SAVE`, `ARIA_UNSAVE` | 2 |
| `PAYMENT` | `SECURE_HINT`, `ERR_PHONE_INVALID`, `ERR_AMOUNT_MAX`, `CALLBACK_*` (×8) | 11 |
| `DASHBOARD` | `SOS_WANTS_TO_ADD`, `SOS_INVITATIONS_TITLE`, `SOS_ADD_CONTACT_TITLE`, `SOS_TRUSTED_BY_TITLE`, `WITHDRAW_PHONE_FORMAT_ERROR`, `WITHDRAW_RECEIVER_PLACEHOLDER`, `WITHDRAW_RECEIVER_LABEL`, `WITHDRAW_AMOUNT_LABEL` (correction) | 8 |
| `ADMIN` | `ACTIVITY_TITLE`, `ROLE_STANDARD`, `ROLE_MOD`, `ROLE_ADMIN`, `PAYOUT_OPERATOR_LABEL`, `PAYOUT_STATUS_LABEL`, `TX_TYPE_LABEL`, `COL_ACTIONS`, `COL_STATUS` | 9 |
| `ABOUT` | `FEATURES_LABEL`, `FEATURES_TITLE`, `FEATURES_SUB`, toutes les feature cards et sections (~40 clés) | ~40 |
| `MOD` (nouveau) | Toutes les clés listées en 2.7 | ~26 |
| `FEED` (nouveau) | Toutes les clés listées en 2.8 | ~11 |
| `SOS` (nouveau) | Toutes les clés listées en 2.9 | ~28 |
| `CHATBOT` (nouveau) | Toutes les clés listées en 2.15 | ~11 |
| `PRIVACY` (nouveau, partiel) | `TITLE`, `LAST_UPDATED_LABEL`, `TOC_TITLE` + section titles | ~12 |

**Total estimé : ~188 nouvelles clés** à créer dans chaque fichier.

---

## 7. Fichiers à créer / modifier — Récapitulatif

| Fichier | Action |
|---|---|
| `public/i18n/fr.json` | Ajouter ~188 clés dans les namespaces existants et nouveaux |
| `public/i18n/en.json` | Idem, avec traductions anglaises |
| `src/app/shared/components/alert-status-badge/alert-status-badge.component.html` | 2 lignes — pipe translate |
| `src/app/shared/components/alert-status-badge/alert-status-badge.component.ts` | Injecter LanguageService pour locale date |
| `src/app/shared/post-card/post-card.component.html` | 2 aria-labels |
| `src/app/shared/components/chatbot/chatbot.component.ts` | Inject TranslateService, suggestions via computed |
| `src/app/shared/components/chatbot/chatbot.component.html` | ~8 textes |
| `src/app/shared/components/platform-support-modal/platform-support-modal.component.ts` | Ajouter TranslateModule + inject, ~8 textes |
| `src/app/shared/components/donation-modal/donation-modal.component.html` | 1 texte |
| `src/app/features/post-detail/post-detail.component.html` | ~8 textes + fix raisons signalement |
| `src/app/features/dashboard/dashboard.component.html` | ~10 textes + bugs A & B |
| `src/app/features/moderation/moderation.component.html` | ~26 textes |
| `src/app/features/feed/feed.component.html` | ~11 textes |
| `src/app/features/post-form/post-form.component.html` | ~16 textes |
| `src/app/features/sos-response/sos-response.component.html` | ~28 textes |
| `src/app/features/payment-callback/payment-callback.component.html` | ~9 textes |
| `src/app/features/about/about.component.html` | ~40 textes |
| `src/app/features/privacy/privacy.component.html` | Minimum 3 textes header (reste optionnel v1) |
| `src/app/features/admin/admin.component.html` | ~9 textes |
| `src/app/shared/navbar/navbar.component.html` | 1 correction `[title]` lang switcher |
