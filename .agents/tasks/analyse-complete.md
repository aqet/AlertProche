# Analyse complète d'AlertProche

## Résumé exécutif

**AlertProche** est une plateforme citoyenne Angular 18 (PWA + Android via Capacitor) dédiée à la protection des personnes vulnérables au Cameroun. Elle combine un système de signalement communautaire, un bouton SOS d'urgence avec géolocalisation temps réel, un fil d'actualité social, un chatbot IA, un système de dons/cagnottes, et un back-office complet d'analytics et de modération. L'application est architecturée en standalone components avec lazy-loading, gère trois rôles (Standard, Modérateur, Admin) et intègre Google Gemini AI pour l'analyse vocale, l'analyse d'image et la validation de villes.

---

## 1. Architecture technique

| Aspect | Détail |
|---|---|
| Framework | Angular 18, standalone components, signals |
| State management | Angular Signals (pas de NgRx/store externe) |
| Routing | Lazy-loading via `loadComponent`, guards auth/modérateur/admin |
| Mobile | PWA (`@angular/service-worker`) + Capacitor Android |
| Backend | API REST (NestJS présumé) sur `environment.apiUrl` |
| Paiements | digiKUNTZ (MTN Mobile Money / Orange Money) |
| IA | Google Gemini (analyse audio, analyse image, validation de ville) |
| Push notifications | Web Push VAPID + Firebase FCM |
| Graphiques | `@swimlane/ngx-charts` |
| Source : `package.json`, `app.config.ts`, `app.routes.ts` ||

---

## 2. Fonctionnalités existantes

### 2.1 Authentification (`/auth`, `auth.service.ts`)

- Inscription en **3 étapes** : envoi OTP par email → vérification OTP → finalisation (pseudo, mot de passe, localisation)
- Connexion JWT stockée en localStorage (`ap_session`)
- Modification du profil (pseudo, ville) et upload de photo de profil
- Guards de route : `authGuard`, `moderatorGuard`, `adminGuard`
- Source : `auth.service.ts`, `auth.component.ts`

### 2.2 Signalements / Alertes (`/`, `/posts/new`, `/posts/:id`)

- **4 types** de signalements : `Disparition`, `Abus`, `Prevention`, `Appel à l'aide`
- Formulaire de création avec : titre, description, localisation (autocomplete + validation IA Gemini), type, photo optionnelle, publication anonyme
- **Remplissage vocal par IA** : enregistrement audio (jusqu'à 2 min) → transcription + extraction automatique des champs via Gemini (`audio-recorder.service.ts`, `post.service.ts::parseAudio`)
- **Analyse d'image par IA** : upload → Gemini extrait les informations et pré-remplit le formulaire (`post.service.ts::analyzeImage`)
- **Recherche par similarité de photo** : recherche d'alertes visuellement proches (via IA Gemini, `home.component.ts::onImageSearchUpload`)
- Filtres : par type, par ville/région, par mot-clé textuel
- Ticker d'urgence sur la page d'accueil (alertes de type Disparition)
- Modération automatique côté client (filtre lexical, anti-doxxing CNI) via `moderation.service.ts`
- Signalement de publication avec motifs (`post.service.ts::reportPost`)
- CRUD complet (create, read, update, delete, toggle actif) pour l'auteur
- Source : `post.service.ts`, `post-form.component.*`, `home.component.*`, `post-detail.component.*`, `post.model.ts`

### 2.3 Commentaires (`comment.service.ts`, `post-detail.component.*`)

- Création et suppression de commentaires sur les alertes
- Publication anonyme possible
- Affichage avec pseudos et timestamps
- Source : `comment.model.ts`, `comment.service.ts`

### 2.4 SOS d'urgence (`/sos/:sosId`, `sos.service.ts`)

- **Bouton SOS flottant** présent sur toutes les pages (`sos-floating-button.component`)
- Déclenchement avec GPS temps réel, niveau de menace (`LOW` / `MEDIUM` / `HIGH` / `CRITICAL`)
- Transcription vocale optionnelle incluse dans l'alerte
- Notification push instantanée vers les **contacts de confiance** (jusqu'à 5) avec son d'alerte (`sos-alert.mp3`)
- **Mise à jour GPS en direct** pendant l'alerte active (`sos.service.ts::updateLocation`)
- Page de réponse SOS (`/sos/:sosId`) : carte Google Maps embarquée, bouton "J'arrive", confirmation de réponse, clôture de l'alerte
- **Signalement batterie faible** (`sos.service.ts::lowBattery`)
- Historique SOS (`/sos/history`) : alertes émises, reçues, répondues
- Source : `sos.service.ts`, `sos-response.component.*`, `sos-history.component.*`, `sos-floating-button.component.*`

### 2.5 Contacts de confiance (Dashboard, `sos.service.ts`)

- Recherche d'utilisateurs par pseudo
- Invitation, acceptation/refus d'invitation
- Limite de 5 contacts actifs
- Vue des utilisateurs qui m'ont désigné + possibilité de se retirer
- Source : `sos.service.ts`, `dashboard.component.*`

### 2.6 Fil d'actualité communautaire (`/feed`, `feed.service.ts`)

- Posts texte + photos + vidéos (multi-médias)
- **Likes**, **commentaires inline**, **partages** avec compteurs
- Lightbox plein écran pour les médias (images et vidéos)
- Chargement infini (pagination scroll)
- Suppression par l'auteur
- Source : `feed.service.ts`, `feed.component.*`, `create-feed-post.component.*`, `feed-detail.component.*`

### 2.7 Système de dons et cagnottes (`/payments/callback`, `payment.service.ts`)

- **Don pour une alerte** : l'auteur d'une alerte reçoit une cagnotte
- **Don de soutien à la plateforme** (modal dédié)
- Paiement via digiKUNTZ (MTN Mobile Money / Orange Money)
- Montants prédéfinis + montant libre (minimum 100 XAF)
- **Demande de retrait** (payout) par l'auteur vers son compte mobile money
- Vue "Mes cagnottes" dans le dashboard : montant collecté, disponible, retiré
- Source : `payment.service.ts`, `payment.model.ts`, `donation-modal.component.*`, `dashboard.component.*`

### 2.8 Chatbot IA (`shared/components/chatbot`)

- FAB flottant sur toutes les pages
- Historique de conversation persisté (utilisateurs connectés) ou session invité
- Réponses avec actions de redirection (`direct_redirect`, `attach_link`)
- Suggestions de questions prédéfinies
- Source : `chat.service.ts`, `chatbot.component.*`

### 2.9 Notifications push (`notification.service.ts`)

- Intégration Web Push VAPID + SW Angular
- Gestion des types : `SOS_TRUSTED`, `SOS_PROXIMITY`, `SOS_RESOLVED`, `LOW_BATTERY`, `TRUSTED_CONTACT_INVITE`, `TRUSTED_CONTACT_RESPONSE`, `NEW_POST`
- Son d'alerte SOS avec preload et retry sur interaction
- Navigation au clic sur notification
- Source : `notification.service.ts`, `permission.service.ts`

### 2.10 Dashboard utilisateur (`/dashboard`)

- **5 onglets** : Mes Publications, Mes Commentaires, Mon Profil, Contacts SOS, Mes Cagnottes
- Édition inline des publications
- Upload de photo de profil (avec aperçu local immédiat)
- Formulaire de retrait de cagnotte (Mobile Money)
- Source : `dashboard.component.*`

### 2.11 Modération (`/moderation`, `moderation.service.ts`)

- Accessible aux Modérateurs et Admins
- Publications signalées : voir les motifs, désactiver/réactiver, classer sans suite
- Publications désactivées : réactiver
- Suppression définitive (Admin uniquement)
- Source : `moderation.component.*`

### 2.12 Administration (`/admin`, `admin.service.ts`)

- **Statistiques globales** : KPIs utilisateurs, publications, commentaires, signalements
- **Statistiques de paiement** : dons alertes, soutien plateforme, en attente de versement
- **Approbation des retraits** (payout)
- **Gestion des utilisateurs** : tableau paginé, recherche, changement de rôle, suppression
- **Gestion des publications** : tableau paginé, filtres, suppression
- **Gestion des versions de l'app** (`version-management.component.*`)
- **Test de notifications push** FCM
- Source : `admin.component.*`, `admin.service.ts`

### 2.13 Analytics (`/admin/analytics`, `analytics.service.ts`)

- Sessions, pageviews, visiteurs uniques, visiteurs nouveaux/récurrents, taux de conversion
- **Tracking temps réel** : sessions actives sur les 5 dernières minutes
- Statistiques par appareil, par source de trafic, géolocalisation
- Activité sur 7/30/90 jours
- Top pages et top posts
- Tracking automatique : sessions, pageviews batchés toutes les 10s, events métier
- Source : `analytics.service.ts`, `analytics.component.*`, `tracking.service.ts`, `tracking.models.ts`

### 2.14 Avis communauté (`/avis`, `review.service.ts`)

- Note de 1 à 5 étoiles + message
- Publication anonyme possible
- Distribution des notes, score moyen
- Source : `reviews.component.*`, `review.model.ts`

### 2.15 PWA et installation (`pwa-install.service.ts`, `install-modal.component.*`)

- Bouton d'installation adaptatif (Android/iOS/Desktop)
- Modal d'installation avec instructions par plateforme
- Compteur de téléchargements visible sur la page d'accueil
- Vérification de mise à jour de l'app (`version-check.service.ts`, `update-modal.component.*`)
- Source : `pwa-install.service.ts`, `version-check.service.ts`

### 2.16 Authentification biométrique

- Dépendance `@capgo/capacitor-native-biometric` présente dans `package.json`
- (Usage exact non visible dans les fichiers lus, mais la dépendance est installée)

---

## 3. Modèles de données principaux

| Modèle | Champs clés |
|---|---|
| `User` | `_id`, `email`, `pseudo`, `role` (Standard/Modérateur/Admin), `location`, `photoUrl` |
| `Post` | `_id`, `title`, `content`, `location`, `type` (4 types), `isAnonymous`, `image_url`, `isActive`, `reportReasons` |
| `Comment` | `_id`, `post_id`, `author_id`, `content`, `isAnonymous` |
| `SosAlert` | `_id`, `userId`, `location` (GeoJSON), `status`, `threatLevel`, `voiceTranscription`, `respondingContacts` |
| `TrustedContact` | `userId`, `status` (PENDING/ACCEPTED/REJECTED) |
| `FeedPost` | `_id`, `author`, `content`, `mediaUrls`, `mediaFileTypes`, `likesCount`, `commentsCount`, `sharesCount` |
| `Review` | `_id`, `rating`, `message`, `isAnonymous` |
| `Cagnotte` | `_id`, `title`, `raisedAmount`, `withdrawnAmount`, `availableAmount` |
| `Transaction` | `_id`, `alertId`, `amount`, `type` (DONATION_ALERT/PLATFORM_SUPPORT/PAYOUT_REQUEST), `status` |

---

## 4. Structure des routes

| Route | Garde | Composant |
|---|---|---|
| `/` | - | HomeComponent |
| `/feed` | - | FeedComponent |
| `/feed/:id` | - | FeedDetailComponent |
| `/auth` | - | AuthComponent |
| `/posts/new` | auth | PostFormComponent |
| `/posts/:id` | - | PostDetailComponent |
| `/dashboard` | auth | DashboardComponent |
| `/moderation` | auth + moderator | ModerationComponent |
| `/admin` | auth + admin | AdminComponent |
| `/admin/analytics` | auth + admin | AnalyticsComponent |
| `/sos/history` | auth | SosHistoryComponent |
| `/sos/:sosId` | auth | SosResponseComponent |
| `/payments/callback` | - | PaymentCallbackComponent |
| `/avis` | - | ReviewsComponent |
| `/a-propos` | - | AboutComponent |
| `/confidentialite` | - | PrivacyComponent |

---

## 5. Points forts et observations

1. **Architecture solide** : standalone components, lazy-loading, signals pour le state local - pas de surcouche inutile.
2. **IA multi-modale** : Gemini est utilisé sur 3 surfaces (audio → formulaire, image → formulaire, photo → recherche similaire). C'est un avantage différenciant rare pour une app citoyenne africaine.
3. **SOS bien pensé** : mise à jour GPS live, niveaux de menace, son d'alerte, réponse des contacts, historique - le flux est complet.
4. **Monétisation présente** : cagnottes + dons plateforme + Mobile Money - rare et bien intégré pour un contexte camerounais.
5. **Modération à deux niveaux** : automatique (front-end) + humaine (espace modération) - bonne approche de défense en profondeur.
6. **Côté feed** : le fil social est fonctionnel mais relativement basique (pas de retweet/partage interne, pas de hashtags, pas de mentions).
7. **Tableau de bord analytique robuste** : tracking sessionné, géo, devices, sources - niveau production.

---

## 6. Nouvelles fonctionnalités proposées

### Priorité haute (impact direct sur la mission principale)

#### F1 - Carte interactive des alertes actives
**Justification** : Les alertes ont toutes une `location` (ville). Afficher une carte choroplèthe ou une carte de points (Leaflet ou Google Maps) permettrait une compréhension géographique immédiate des zones à risque. Les parents et bénévoles pourraient visualiser en un coup d'œil les disparitions dans leur région.  
**Périmètre** : Nouveau composant `map.component` sur la page d'accueil (onglet "Carte" en plus de la grille actuelle), utilisant les données déjà disponibles via `post.service.ts::getAllPosts`. Aucune dépendance lourde : Leaflet (~40kb) ou intégration Google Maps Embed.

#### F2 - Alerte résolue : marquage et archivage
**Justification** : Il n'existe pas de mécanisme clair pour signaler qu'une personne disparue a été retrouvée. Les alertes restent actives indéfiniment. Un bouton "Marquer comme résolu" (par l'auteur ou un modérateur) avec un champ motif (retrouvée, hospitalisation terminée…) et un archivage visuel ("Cas résolu ✅") donnerait une vision plus juste du flux et motiverait la communauté.  
**Périmètre** : Nouveau champ `resolvedAt` + `resolvedReason` sur `Post`, bouton dans `post-detail.component` et dans l'espace modération. Le modèle `Post` a déjà `isActive` - étendre sans casser l'existant.

#### F3 - Notifications push géolocalisées (proximité)
**Justification** : Le type `SOS_PROXIMITY` est déjà défini dans `notification.service.ts` mais semble non exposé à l'utilisateur. Permettre à l'utilisateur de s'abonner aux alertes dans un rayon configurable (ex. "me notifier pour toute Disparition dans ma ville") augmenterait drastiquement l'utilité de la plateforme.  
**Périmètre** : Panneau de préférences de notifications dans le dashboard (tab "Notifications"), envoyé au backend pour filtrage géographique des push.

#### F4 - Partage d'alerte enrichi avec carte d'aperçu (OG/WhatsApp)
**Justification** : Le vecteur de diffusion principal au Cameroun est WhatsApp. Une image de partage générée dynamiquement (Open Graph) avec le type, le titre, la localisation et une carte miniature augmenterait considérablement le taux de partage et la portée des alertes.  
**Périmètre** : Méta-tags Open Graph dynamiques dans `post-detail.component` + route backend de génération d'image OG (ou service tiers type Vercel OG). L'infrastructure de partage côté frontend (`sharePost` dans le feed) est déjà en place.

---

### Priorité moyenne (enrichissement communautaire)

#### F5 - Fil d'actualité : hashtags et mentions
**Justification** : Le feed social est fonctionnel mais manque de discoverabilité. Les hashtags (`#Yaoundé`, `#Disparition`) permettraient de naviguer par thème. Les mentions (`@pseudo`) déclencheraient des notifications et créeraient du lien social.  
**Périmètre** : Parsing côté front du contenu des `FeedPost`, ajout d'un champ `hashtags[]` et `mentions[]` dans le modèle, page `/feed/tag/:tag`.

#### F6 - Messagerie directe entre utilisateurs
**Justification** : Quand un témoin veut contacter discrètement l'auteur d'une alerte (sans exposer les infos en commentaire public), il n'a aucun canal. Une messagerie privée simple (ou basée sur le chatbot existant) permettrait cet échange sécurisé. Le service `chat.service.ts` avec `threadId` est déjà architecturé pour accueillir des threads directs.  
**Périmètre** : Route `/messages/:userId`, nouveau tab "Messages" dans le dashboard, réutilisation du `ChatService` avec un `threadId` = `userId1_userId2`.

#### F7 - Profil public des utilisateurs
**Justification** : Il est impossible de voir le profil et les contributions d'un autre utilisateur. Un profil public `/profil/:pseudo` affichant les alertes publiées (non anonymes), le score de réputation, et le statut "contact de confiance disponible" renforcerait la confiance dans la communauté.  
**Périmètre** : Nouveau composant `public-profile.component`, nouvelle route `/profil/:pseudo`, endpoint backend `GET /auth/users/:pseudo`.

#### F8 - Témoins : signalement d'information complémentaire sur une alerte
**Justification** : Actuellement, les commentaires servent à tout. Permettre à un témoin de soumettre une "mise à jour d'information" structurée (dernière localisation vue, date, description) - distincte d'un commentaire - permettrait à l'auteur et aux modérateurs de centraliser les indices utiles.  
**Périmètre** : Nouveau type `Witness` lié à un `Post`, formulaire dans `post-detail.component`, tab "Témoignages" dans la vue détail.

---

### Priorité basse (aller plus loin)

#### F9 - Mode hors-ligne partiel pour le SOS
**Justification** : Dans les zones à faible couverture réseau (fréquentes au Cameroun), le SOS peut échouer. Stocker le dernier état connu en IndexedDB et envoyer automatiquement dès le retour de connexion (via `@capacitor/network` déjà installé) réduirait ce risque.  
**Périmètre** : `sos-floating-button.component` + écoute des événements `@capacitor/network::getStatus` pour un mode queue offline.

#### F10 - Tableau de bord des organisations (ONG, associations)
**Justification** : Créer un rôle `Organisation` permettrait à des ONG de protection de l'enfance de gérer plusieurs alertes, accéder à des statistiques agrégées sur leur périmètre géographique, et être affichées comme partenaires de confiance sur les alertes qu'elles suivent.  
**Périmètre** : Nouveau rôle dans `User.role`, panneau dédié dans l'admin, badge "Suivi par [ONG]" sur les post-cards.

#### F11 - Gamification : badges et réputation
**Justification** : Encourager la participation active est un défi pour toute plateforme citoyenne. Des badges ("Premier signalement", "10 commentaires utiles", "Contact SOS de confiance de 3 personnes") et un score de réputation affiché sur le profil créeraient une dynamique d'engagement.  
**Périmètre** : Champ `badges[]` dans `User`, service `badge.service.ts`, affichage dans le dashboard et le profil public.

#### F12 - Internationalisation (i18n) : anglais + langues locales
**Justification** : Le Cameroun est bilingue (français/anglais). La page `about.component.html` mentionne déjà une expansion géographique prévue. L'ajout de `@angular/localize` avec au minimum l'anglais doublerait l'audience potentielle dans les régions anglophones du pays.  
**Périmètre** : `@angular/localize`, extraction des chaînes, fichiers `.xlf` pour `fr` (existant) et `en`. Les données (titres, contenus des posts) restent en langue de publication.

#### F13 - Signalement vocal direct depuis la page d'accueil
**Justification** : Pour un utilisateur peu alphabétisé ou en situation d'urgence, ouvrir le formulaire, remplir les champs, puis lancer l'enregistrement vocal est trop long. Un bouton "SOS écrit" dédié sur la page d'accueil ouvrant directement le recorder vocal (déjà opérationnel dans `post-form`) permettrait de créer une alerte en moins de 30 secondes.  
**Périmètre** : Bouton CTA sur `home.component` naviguant vers `/posts/new?autoRecord=true`, le `post-form.component` démarrant l'enregistrement automatiquement si le paramètre est présent.

#### F14 - Centre de ressources (guide de sécurité, contacts d'urgence officiels)
**Justification** : La page `about.component.html` est informative mais il manque un espace centralisé avec les numéros d'urgence camerounais (police, gendarmerie, SOS Enfants, numéros locaux), des guides pratiques ("que faire si un enfant disparaît") et des liens vers les ONG partenaires.  
**Périmètre** : Nouvelle route `/ressources`, composant statique + CMS minimal géré depuis l'interface admin (simple liste de ressources JSON).

#### F15 - Authentification avec compte Google / Apple
**Justification** : L'inscription en 3 étapes (OTP → code → formulaire) est sécurisée mais crée de la friction. Ajouter OAuth Google (très utilisé en Afrique subsaharienne) réduirait ce friction et augmenterait les taux de conversion.  
**Périmètre** : `@angular/fire` ou SDK Google Identity Services côté front, endpoint OAuth dans le backend, modification de `auth.service.ts::register` pour accepter un token OAuth.

---

## 7. Recommandations techniques

1. **Mise à jour GPS SOS** : `sos.service.ts::updateLocation` est défini mais aucun composant lisant ce code ne montre d'intervalle de pooling - vérifier que la mise à jour en direct est bien active dans `sos-floating-button` ou `sos-response.component`.
2. **Modération front-end seulement** : `moderation.service.ts` filtre uniquement en client-side. Le backend devrait dupliquer ce filtre pour être résilient aux appels API directs.
3. **Limite contacts SOS codée en dur à 5** : si des plans premium sont envisagés (F10), cette limite devrait être déplacée côté backend et configurable par rôle.
4. **Pas de tests automatisés visibles** : le projet a Jasmine/Karma (`package.json`) mais aucun fichier `.spec.ts` n'a été trouvé. Ajouter des tests unitaires sur `moderation.service.ts`, `sos.service.ts`, et `auth.service.ts` réduirait les régressions.
5. **Rôle section FAQ commenté** dans `about.component.html` (balise `<!-- ... -->`) - probablement à réactiver quand le rôle Modérateur sera communiqué publiquement.
