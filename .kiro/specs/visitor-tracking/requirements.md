# Requirements Document

## Introduction

Ce module ajoute un système de tracking complet pour la plateforme AlertProche (Angular 18 + NestJS + MongoDB). Il collecte des données comportementales sur les visiteurs connectés et non connectés, anonymise les données personnelles conformément aux lois sur la vie privée, et expose une page d'analytics dédiée `/admin/analytics` accessible uniquement aux administrateurs. Le tracking est conçu pour être transparent pour l'utilisateur (fire-and-forget) et n'impacte pas les performances de l'expérience utilisateur.

## Glossary

- **Tracking_Service** : Service Angular singleton responsable de la collecte et de l'envoi des événements de tracking depuis le frontend.
- **Analytics_API** : Module NestJS (`/tracking`) exposant les endpoints de collecte et de restitution des données analytiques.
- **Session** : Période de navigation continue d'un visiteur, identifiée par un `sessionId` UUID généré côté client, valide tant que la fenêtre est ouverte ou jusqu'à 30 minutes d'inactivité.
- **Visitor** : Toute personne accédant à la plateforme, qu'elle soit authentifiée (utilisateur avec JWT) ou anonyme.
- **Anonymous_Visitor** : Visiteur non connecté, identifié uniquement par un `visitorId` UUID persisté en `localStorage`.
- **PageView** : Événement enregistrant la visite d'une page, comprenant l'URL, la durée de consultation, le timestamp et l'identifiant de session.
- **TrackingEvent** : Événement d'action clé (création de post, commentaire, signalement, recherche par image, connexion, inscription).
- **Analytics_Page** : Page dédiée `/admin/analytics` accessible uniquement aux utilisateurs avec le rôle `Admin`.
- **Session_Document** : Document MongoDB représentant une session complète avec son parcours de navigation et ses métadonnées.
- **IP_Hash** : Empreinte non réversible de l'adresse IP (SHA-256 tronqué) utilisée pour la géolocalisation et la déduplication, jamais l'IP complète.
- **GeoData** : Données de géolocalisation déduites de l'IP (pays, ville, région), sans identification individuelle.
- **TTL_Index** : Index MongoDB à durée de vie automatique, configuré à 90 jours pour les données de tracking.
- **TrafficSource** : Catégorie d'origine du visiteur (Direct, Organic Search, Referral, Social, Email, Unknown).
- **Heatmap** : Carte de chaleur mondiale affichant la densité géographique des visiteurs par pays/région.

---

## Requirements

### Requirement 1: Collecte de session et identification du visiteur

**User Story:** En tant que système de tracking, je veux identifier chaque visiteur de manière persistante et créer une session de navigation, afin de pouvoir retracer le parcours complet d'un visiteur sur la plateforme.

#### Acceptance Criteria

1. WHEN un visiteur arrive sur la plateforme pour la première fois, THE Tracking_Service SHALL générer un `visitorId` UUID v4 unique et le persister dans le `localStorage` du navigateur.
2. WHEN un visiteur revient sur la plateforme, THE Tracking_Service SHALL réutiliser le `visitorId` existant depuis le `localStorage` pour associer la nouvelle session au même visiteur.
3. WHEN une session de navigation démarre, THE Tracking_Service SHALL générer un `sessionId` UUID v4 unique pour cette session.
4. WHEN un utilisateur est authentifié avec un JWT valide, THE Tracking_Service SHALL associer le `userId` à la session en cours.
5. THE Tracking_Service SHALL collecter les métadonnées du navigateur : type d'appareil (mobile/tablet/desktop), nom du navigateur, version du navigateur, et système d'exploitation.
6. WHEN la session démarre, THE Tracking_Service SHALL enregistrer la page d'entrée (première URL visitée), la source de trafic déduite du `document.referrer`, et le timestamp de début.
7. WHEN la fenêtre du navigateur est fermée ou l'onglet quitté, THE Tracking_Service SHALL envoyer un événement de fin de session avec la dernière page visitée comme page de sortie et la durée totale de la session en millisecondes.
8. IF le `localStorage` est inaccessible (mode privé avec restrictions), THEN THE Tracking_Service SHALL fonctionner en mode session-only sans persister le `visitorId`.

---

### Requirement 2: Tracking des pages visitées

**User Story:** En tant qu'administrateur, je veux connaître quelles pages sont visitées, dans quel ordre et pendant combien de temps, afin d'identifier les pages les plus consultées et les parcours de navigation typiques.

#### Acceptance Criteria

1. WHEN le routeur Angular détecte un changement de route, THE Tracking_Service SHALL enregistrer un événement `pageview` contenant l'URL normalisée, le timestamp d'entrée sur la page, et l'identifiant de session.
2. WHEN un visiteur quitte une page (route change ou fermeture), THE Tracking_Service SHALL calculer la durée de consultation de cette page en millisecondes et l'inclure dans le `pageview` event.
3. THE Tracking_Service SHALL normaliser les URLs dynamiques avant envoi : les segments contenant des identifiants MongoDB ObjectId (24 caractères hexadécimaux) SHALL être remplacés par `:id` (ex. `/posts/507f1f77bcf86cd799439011` → `/posts/:id`).
4. THE Analytics_API SHALL maintenir un classement des pages les plus consultées, calculé à partir du nombre total de `pageview` events par URL normalisée.
5. IF un événement de tracking échoue à être envoyé au serveur (erreur réseau, timeout), THEN THE Tracking_Service SHALL abandonner l'envoi silencieusement sans afficher d'erreur à l'utilisateur ni bloquer la navigation.

---

### Requirement 3: Tracking des actions clés

**User Story:** En tant qu'administrateur, je veux savoir quelles actions significatives les visiteurs effectuent sur la plateforme, afin de mesurer l'engagement et identifier les fonctionnalités les plus utilisées.

#### Acceptance Criteria

1. WHEN un utilisateur crée un post avec succès, THE Tracking_Service SHALL enregistrer un `TrackingEvent` de type `post_created`.
2. WHEN un utilisateur publie un commentaire avec succès, THE Tracking_Service SHALL enregistrer un `TrackingEvent` de type `comment_posted`.
3. WHEN un utilisateur soumet un signalement d'un post, THE Tracking_Service SHALL enregistrer un `TrackingEvent` de type `post_reported`.
4. WHEN un utilisateur lance une recherche par similarité d'image, THE Tracking_Service SHALL enregistrer un `TrackingEvent` de type `image_search_performed`.
5. WHEN un utilisateur se connecte avec succès (réponse JWT reçue), THE Tracking_Service SHALL enregistrer un `TrackingEvent` de type `user_login`.
6. WHEN un utilisateur finalise son inscription avec succès (réponse JWT reçue à l'étape 3 d'inscription), THE Tracking_Service SHALL enregistrer un `TrackingEvent` de type `user_registered`.
7. THE Analytics_API SHALL agréger les `TrackingEvent` par type sur les 30 derniers jours pour alimenter les métriques d'engagement.

---

### Requirement 4: Collecte des métadonnées techniques et géolocalisation

**User Story:** En tant qu'administrateur, je veux comprendre d'où viennent les visiteurs géographiquement et quels appareils/navigateurs ils utilisent, afin d'optimiser la plateforme pour les usages réels.

#### Acceptance Criteria

1. THE Tracking_Service SHALL détecter et transmettre au serveur le type d'appareil en analysant le `user-agent` : `mobile` si écran < 768px ou user-agent mobile détecté, `tablet` si entre 768px et 1024px, `desktop` sinon.
2. THE Analytics_API SHALL résoudre la géolocalisation (pays, ville, région) à partir de l'IP de la requête HTTP en utilisant une base de données GeoIP locale (ex. `maxmind/geoip2`, `geoip-lite`).
3. THE Analytics_API SHALL stocker uniquement un hash SHA-256 tronqué aux 16 premiers caractères de l'adresse IP, jamais l'IP complète en clair.
4. WHEN la géolocalisation échoue ou que l'IP est une adresse privée (localhost, 127.x.x.x, 192.168.x.x), THEN THE Analytics_API SHALL stocker `country: 'Unknown'`, `city: 'Unknown'` sans lever d'erreur.
5. THE Tracking_Service SHALL extraire la source de trafic depuis `document.referrer` selon les règles suivantes : absence de referrer → `Direct`, referrer contenant `google`, `bing`, `duckduckgo`, `yahoo` → `Organic Search`, referrer contenant `facebook`, `twitter`, `instagram`, `linkedin`, `tiktok`, `whatsapp` → `Social`, referrer contenant le domaine d'AlertProche → navigation interne (non comptabilisé comme source externe), tout autre referrer → `Referral`.
6. WHERE l'en-tête `X-Forwarded-For` est présent dans la requête HTTP, THE Analytics_API SHALL utiliser la première IP de cet en-tête pour la géolocalisation.

---

### Requirement 5: Stockage des données et conformité

**User Story:** En tant qu'administrateur, je veux que les données de tracking soient stockées de manière conforme et performante, afin d'assurer la légalité du système et éviter une croissance incontrôlée de la base de données.

#### Acceptance Criteria

1. THE Analytics_API SHALL stocker les sessions dans une collection MongoDB `tracking_sessions` avec un index TTL de 90 jours sur le champ `createdAt`.
2. THE Analytics_API SHALL stocker les événements de tracking dans une collection MongoDB `tracking_events` avec un index TTL de 90 jours sur le champ `createdAt`.
3. THE Analytics_API SHALL ne jamais stocker d'adresse IP complète dans aucune collection MongoDB.
4. THE Analytics_API SHALL ne jamais stocker d'informations personnelles identifiables directes (nom, email) dans les collections de tracking — uniquement le `userId` sous forme de référence ObjectId optionnelle.
5. WHEN un utilisateur est supprimé de la plateforme, THE Analytics_API SHALL conserver les données de tracking associées en anonymisant uniquement le champ `userId` (mis à `null`), préservant ainsi les statistiques agrégées.
6. THE Analytics_API SHALL accepter les événements de tracking depuis des sessions non authentifiées (pas de JWT requis pour les endpoints de collecte).
7. THE Analytics_API SHALL valider que le `sessionId` est bien un UUID v4 valide avant de persister tout événement.

---

### Requirement 6: Page analytics `/admin/analytics`

**User Story:** En tant qu'administrateur, je veux accéder à une page dédiée d'analytics visuels, afin de surveiller l'activité de la plateforme, comprendre les comportements des visiteurs et prendre des décisions éclairées.

#### Acceptance Criteria

1. THE Analytics_Page SHALL être accessible uniquement aux utilisateurs avec le rôle `Admin`, protégée par le guard `adminGuard` existant.
2. THE Analytics_Page SHALL être chargée en lazy-loading via une route dédiée `/admin/analytics` distincte de la route `/admin` existante.
3. THE Analytics_Page SHALL afficher une carte de chaleur mondiale (heatmap) représentant la densité des visiteurs par pays, en utilisant les données de géolocalisation agrégées.
4. THE Analytics_Page SHALL afficher les métriques temps réel suivantes avec auto-rafraîchissement toutes les 60 secondes : visiteurs actifs actuellement (session ouverte dans les 5 dernières minutes), nombre de sessions du jour.
5. THE Analytics_Page SHALL afficher les courbes d'activité (sessions et pageviews) par jour sur les 30 derniers jours sous forme de graphique linéaire.
6. THE Analytics_Page SHALL afficher le classement des 10 pages les plus consultées avec leur nombre de vues total.
7. THE Analytics_Page SHALL afficher la répartition des sources de trafic (Direct, Organic Search, Social, Referral) sous forme de graphique circulaire ou à barres.
8. THE Analytics_Page SHALL afficher la répartition des appareils (mobile/tablet/desktop) sous forme de graphique.
9. THE Analytics_Page SHALL afficher le taux de conversion visiteur → inscription calculé comme `(nombre de sessions ayant généré un event user_registered) / (nombre total de sessions) * 100`.
10. THE Analytics_Page SHALL afficher les 10 posts les plus consultés (par nombre de `pageview` sur `/posts/:id`).
11. THE Analytics_Page SHALL permettre de filtrer les données par période : 7 jours, 30 jours, 90 jours.
12. WHEN les données analytics sont en cours de chargement, THE Analytics_Page SHALL afficher des indicateurs de chargement sans bloquer l'affichage du reste de la page.
13. THE Analytics_Page SHALL afficher les statistiques de visiteurs uniques vs visiteurs récurrents (basé sur la présence ou non du `visitorId` en base) sur la période sélectionnée.

---

### Requirement 7: Performance et impact UX

**User Story:** En tant qu'utilisateur de la plateforme, je veux que le système de tracking n'affecte pas la vitesse ou la réactivité de l'application, afin de ne pas dégrader mon expérience.

#### Acceptance Criteria

1. THE Tracking_Service SHALL envoyer tous les événements de manière asynchrone en utilisant `navigator.sendBeacon()` en priorité, avec fallback sur `fetch()` en mode `keepalive` pour les événements de fin de session.
2. THE Tracking_Service SHALL regrouper les `pageview` events en batch et les envoyer toutes les 10 secondes maximum, ou immédiatement lors d'un changement de route.
3. THE Analytics_API SHALL répondre aux requêtes de collecte d'événements avec un statut HTTP `202 Accepted` en moins de 100ms, sans attendre la fin de la persistance MongoDB.
4. THE Analytics_API SHALL persister les données de tracking de manière asynchrone (non bloquante pour la réponse HTTP) en utilisant des opérations MongoDB `insertOne` sans await sur la réponse finale.
5. THE Tracking_Service SHALL ne pas ajouter de dépendance externe au bundle Angular principal — les librairies de tracking doivent être chargées dans des chunks séparés si nécessaire.

---

### Requirement 8: Conformité et transparence

**User Story:** En tant que visiteur de la plateforme, je veux être informé des données collectées me concernant, afin de comprendre comment ma vie privée est respectée.

#### Acceptance Criteria

1. THE Privacy_Page (page `/confidentialite` existante) SHALL être mise à jour pour mentionner explicitement la collecte de données de navigation anonymisées (pages visitées, durée, appareil, pays d'origine via IP hashée).
2. THE Privacy_Page SHALL préciser que les adresses IP ne sont pas stockées en clair et que les données de navigation sont supprimées automatiquement après 90 jours.
3. THE Privacy_Page SHALL indiquer la finalité du tracking : amélioration de l'expérience utilisateur et sécurité de la plateforme.
4. WHEN un visiteur navigue sur la plateforme, THE Tracking_Service SHALL démarrer automatiquement sans demander de consentement explicite, le tracking étant limité à des données anonymisées conformes aux bases légales d'intérêt légitime.
