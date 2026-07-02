# Implementation Plan: Visitor Tracking

## Overview

Implémentation complète du système de tracking pour AlertProche (Angular 18 + NestJS + MongoDB). Le plan suit l'ordre logique : backend d'abord (API + schemas), puis frontend (service + composant analytics), puis intégration. Chaque property-based test est placé immédiatement après l'implémentation de la fonction testée pour une validation incrémentale.

---

## Tasks

- [x] 1. Backend — Créer le module tracking de base
  - Créer `src/tracking/tracking.module.ts`, `tracking.controller.ts`, `tracking.service.ts`
  - Définir le module NestJS avec imports nécessaires (MongooseModule, ConfigModule)
  - Déclarer les routes de base dans le controller (stubs vides)
  - _Requirements: 5.1, 5.2_

- [x] 2. Backend — Définir les schemas MongoDB
  - [x] 2.1 Créer schema `tracking-session.schema.ts`
    - Définir les champs selon le design (`sessionId`, `visitorId`, `userId`, `ipHash`, `country`, `city`, `device`, `browser`, `os`, `entryPage`, `exitPage`, `trafficSource`, `isNewVisitor`, `duration`, `startedAt`, `endedAt`)
    - Ajouter TTL index de 90 jours sur `createdAt`
    - _Requirements: 5.1, 5.3, 5.4_
  
  - [x] 2.2 Créer schema `tracking-event.schema.ts`
    - Définir les champs selon le design (`sessionId`, `visitorId`, `userId`, `type`, `url`, `duration`, `metadata`, `timestamp`)
    - Ajouter TTL index de 90 jours sur `createdAt`
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 3. Backend — Créer les DTOs de validation
  - [x] 3.1 Créer `dto/create-session.dto.ts`
    - Définir les champs et decorators `class-validator` selon le design
    - Valider `sessionId` et `visitorId` comme UUID v4 valides
    - _Requirements: 1.1, 1.3, 5.7_
  
  - [x] 3.2 Créer `dto/create-event.dto.ts`
    - Définir les champs et decorators `class-validator` selon le design
    - Valider `sessionId` et `visitorId` comme UUID v4 valides
    - _Requirements: 3.1-3.6, 5.7_

- [x] 4. Backend — Implémenter les fonctions utilitaires du TrackingService
  - [x] 4.1 Implémenter `hashIp(ip: string): string`
    - Utiliser `crypto.createHash('sha256')` pour hasher l'IP
    - Tronquer le hash à 16 premiers caractères hexadécimaux
    - _Requirements: 4.3, 5.3_
  
  - [ ]* 4.2 Property test pour hashIp
    - **Property 3: Hash IP — format invariant**
    - **Validates: Requirements 4.3, 5.3**
    - Générer IPs aléatoires (IPv4 + IPv6) avec `fc.ipV4()` et `fc.ipV6()`
    - Vérifier longueur = 16 et format hexadécimal
  
  - [x] 4.3 Implémenter `resolveGeo(ip: string): { country: string; city: string }`
    - Utiliser `geoip-lite` pour résoudre la géolocalisation
    - Fallback vers `{country: 'Unknown', city: 'Unknown'}` si résolution échoue ou IP privée
    - _Requirements: 4.2, 4.4_
  
  - [x] 4.4 Implémenter `extractSourceFromForwardedFor(req: Request): string`
    - Extraire première IP de l'header `X-Forwarded-For` si présent
    - Sinon retourner `req.ip`
    - _Requirements: 4.6_

- [x] 5. Backend — Implémenter les endpoints de collecte (publics)
  - [x] 5.1 Implémenter `POST /tracking/session`
    - Retourner `202 Accepted` immédiatement
    - Extraire l'IP (via `extractSourceFromForwardedFor`)
    - Hasher l'IP (via `hashIp`)
    - Résoudre la géolocalisation (via `resolveGeo`)
    - Persister en arrière-plan avec `.catch(() => {})` silencieux
    - _Requirements: 1.1-1.7, 5.6, 7.3, 7.4_
  
  - [x] 5.2 Implémenter `POST /tracking/pageview`
    - Retourner `202 Accepted` immédiatement
    - Créer un `TrackingEvent` de type `pageview` avec les données reçues
    - Persister en arrière-plan avec `.catch(() => {})` silencieux
    - _Requirements: 2.1, 2.2, 7.3, 7.4_
  
  - [x] 5.3 Implémenter `POST /tracking/event`
    - Retourner `202 Accepted` immédiatement
    - Créer un `TrackingEvent` avec le type reçu (post_created, comment_posted, etc.)
    - Persister en arrière-plan avec `.catch(() => {})` silencieux
    - _Requirements: 3.1-3.7, 7.3, 7.4_
  
  - [x] 5.4 Implémenter `PATCH /tracking/session/:sessionId/end`
    - Retourner `202 Accepted` immédiatement
    - Mettre à jour la session avec `exitPage`, `endedAt`, `duration`
    - Persister en arrière-plan avec `.catch(() => {})` silencieux
    - _Requirements: 1.7_
  
  - [ ]* 5.5 Property test pour validation invariante PII
    - **Property 7: Invariante PII — documents persistés**
    - **Validates: Requirements 4.3, 5.3, 5.4**
    - Générer des objets session/event aléatoires
    - Vérifier qu'aucun champ `ip` n'existe et qu'aucune IP complète n'est présente dans les strings

- [x] 6. Backend — Implémenter les endpoints analytics (JWT + Admin)
  - [x] 6.1 Implémenter `GET /tracking/analytics/overview?period=30d`
    - Protéger avec guards JWT + Roles Admin
    - Calculer métriques : total sessions, total pageviews, visiteurs uniques, taux conversion
    - Filtrer par période (7d, 30d, 90d)
    - _Requirements: 6.4, 6.9, 6.13_
  
  - [x] 6.2 Implémenter `GET /tracking/analytics/pages?period=30d`
    - Protéger avec guards JWT + Roles Admin
    - Agréger pageviews par URL normalisée
    - Retourner top 10 pages avec nombre de vues
    - _Requirements: 2.4, 6.6_
  
  - [x] 6.3 Implémenter `GET /tracking/analytics/geo?period=30d`
    - Protéger avec guards JWT + Roles Admin
    - Agréger sessions par pays et ville
    - Retourner données pour heatmap
    - _Requirements: 6.3_
  
  - [x] 6.4 Implémenter `GET /tracking/analytics/devices?period=30d`
    - Protéger avec guards JWT + Roles Admin
    - Agréger sessions par type d'appareil (mobile/tablet/desktop)
    - _Requirements: 6.8_
  
  - [x] 6.5 Implémenter `GET /tracking/analytics/sources?period=30d`
    - Protéger avec guards JWT + Roles Admin
    - Agréger sessions par source de trafic
    - _Requirements: 6.7_
  
  - [x] 6.6 Implémenter `GET /tracking/analytics/activity?period=30d`
    - Protéger avec guards JWT + Roles Admin
    - Agréger sessions et pageviews par jour
    - Retourner série temporelle pour graphiques
    - _Requirements: 6.5_
  
  - [x] 6.7 Implémenter `GET /tracking/analytics/top-posts?period=30d`
    - Protéger avec guards JWT + Roles Admin
    - Agréger pageviews sur URLs `/posts/:id`
    - Retourner top 10 posts avec nombre de vues
    - _Requirements: 6.10_

- [x] 7. Checkpoint backend — Vérifier la structure et les tests
  - Vérifier que tous les endpoints répondent correctement
  - Vérifier que les property tests passent
  - Vérifier que les indexes TTL sont bien créés dans MongoDB
  - Demander au user si des questions surviennent

- [x] 8. Frontend — Créer les modèles et interfaces TypeScript
  - [x] 8.1 Créer `src/app/core/models/tracking.models.ts`
    - Définir `TrackingSessionPayload`, `PageviewPayload`, `TrackingEventPayload`
    - Définir types `TrafficSource`, `TrackingEventType`, `DeviceType`
    - _Requirements: 1.1-1.7, 2.1-2.3, 3.1-3.6_
  
  - [x] 8.2 Créer interfaces pour les réponses analytics
    - Définir `OverviewData`, `PageStats`, `GeoData`, `DeviceStats`, `SourceStats`, `ActivityData`, `PostStats`
    - Créer type union `AnalyticsTab` pour les onglets
    - _Requirements: 6.3-6.10_

- [x] 9. Frontend — Implémenter le TrackingService
  - [x] 9.1 Créer `src/app/core/services/tracking.service.ts`
    - Déclarer service singleton avec `providedIn: 'root'`
    - Définir propriétés privées : `visitorId`, `sessionId`, `currentPageEntry`, `pageviewBatch`
    - _Requirements: 1.1, 1.3_
  
  - [x] 9.2 Implémenter `normalizeUrl(url: string): string`
    - Remplacer les segments ObjectId (24 chars hex) par `:id`
    - Retourner l'URL normalisée sans query params
    - _Requirements: 2.3_
  
  - [ ]* 9.3 Property test pour normalizeUrl
    - **Property 1: Normalisation des URLs dynamiques**
    - **Validates: Requirements 2.3**
    - Générer URLs avec ObjectIds injectés aléatoirement
    - Vérifier que l'URL résultante ne contient plus de segments hex-24
  
  - [x] 9.4 Implémenter `classifySource(referrer: string): TrafficSource`
    - Classifier selon les règles du requirement 4.5
    - Retourner `Direct | Organic Search | Social | Referral | Unknown`
    - _Requirements: 1.6, 4.5_
  
  - [ ]* 9.5 Property test pour classifySource
    - **Property 2: Classification de la source de trafic**
    - **Validates: Requirements 1.6, 4.5**
    - Générer referrers aléatoires avec `fc.string()`
    - Vérifier que le résultat est toujours dans l'ensemble des valeurs valides
  
  - [x] 9.6 Implémenter `detectDevice(): DeviceType`
    - Détecter selon largeur d'écran : < 768 → mobile, 768-1024 → tablet, > 1024 → desktop
    - _Requirements: 4.1_
  
  - [ ]* 9.7 Property test pour detectDevice
    - **Property 6: Détection du type d'appareil**
    - **Validates: Requirements 4.1**
    - Générer largeurs aléatoires avec `fc.integer({min: 0, max: 5000})`
    - Vérifier partitionnement exact et exhaustif
  
  - [x] 9.8 Implémenter `getOrCreateVisitorId(): string`
    - Récupérer `visitorId` depuis `localStorage` s'il existe
    - Sinon générer un UUID v4 et le persister dans `localStorage`
    - Gérer le cas `localStorage` inaccessible (mode session-only)
    - _Requirements: 1.1, 1.2, 1.8_
  
  - [x] 9.9 Implémenter `initSession(): void`
    - Générer `sessionId` UUID v4
    - Collecter métadonnées navigateur (browser, os)
    - Détecter type d'appareil via `detectDevice()`
    - Classifier source de trafic via `classifySource(document.referrer)`
    - Envoyer `POST /tracking/session` via `sendBeacon` ou `fetch keepalive`
    - _Requirements: 1.3-1.6_
  
  - [x] 9.10 Implémenter écoute des NavigationEnd du Router
    - S'abonner aux événements `NavigationEnd` du Router Angular
    - Calculer la durée sur la page précédente
    - Enregistrer pageview pour la nouvelle route
    - Batcher les pageviews (flush toutes les 10s ou au changement de route)
    - _Requirements: 2.1, 2.2, 7.2_
  
  - [x] 9.11 Implémenter `trackEvent(type: TrackingEventType, metadata?: Record<string, any>): void`
    - Méthode publique exposée aux feature components
    - Envoyer `POST /tracking/event` via `sendBeacon` ou `fetch keepalive`
    - Gestion silencieuse des erreurs réseau
    - _Requirements: 3.1-3.6, 7.1_
  
  - [x] 9.12 Implémenter `endSession(): void`
    - Calculer durée totale de la session
    - Envoyer `PATCH /tracking/session/:sessionId/end` via `sendBeacon`
    - Appeler sur événements `beforeunload` et `visibilitychange`
    - _Requirements: 1.7, 7.1_

- [x] 10. Frontend — Intégrer le TrackingService dans app.config.ts
  - [x] 10.1 Ajouter TrackingService dans APP_INITIALIZER
    - Appeler `initSession()` au démarrage de l'application
    - Configurer l'écoute des événements Router
    - _Requirements: 1.3, 2.1_

- [x] 11. Frontend — Créer le service AnalyticsService
  - [x] 11.1 Créer `src/app/core/services/analytics.service.ts`
    - Définir méthodes pour appeler les endpoints analytics (GET /tracking/analytics/*)
    - Gérer les filtres de période (7d, 30d, 90d)
    - Retourner des Observables typés
    - _Requirements: 6.1, 6.11_

- [ ] 12. Frontend — Créer le composant AnalyticsComponent
  - [x] 12.1 Créer composant standalone `admin/analytics/analytics.component.ts`
    - Déclarer signals : `period`, `overview`, `loading`, `activeTab`
    - Injecter `AnalyticsService`
    - _Requirements: 6.1, 6.2, 6.11, 6.12_
  
  - [x] 12.2 Implémenter onglet Overview
    - Afficher métriques temps réel (visiteurs actifs, sessions du jour)
    - Afficher taux de conversion visiteur → inscription
    - Afficher statistiques visiteurs uniques vs récurrents
    - Auto-rafraîchir toutes les 60 secondes
    - _Requirements: 6.4, 6.9, 6.13_
  
  - [x] 12.3 Implémenter onglet Pages
    - Afficher top 10 pages les plus consultées avec nombre de vues
    - Afficher top 10 posts les plus consultés
    - _Requirements: 6.6, 6.10_
  
  - [x] 12.4 Implémenter onglet Géographie
    - Intégrer une librairie de heatmap mondiale (ex. `leaflet` + `leaflet.heat`)
    - Afficher la densité des visiteurs par pays sur une carte
    - _Requirements: 6.3_
  
  - [x] 12.5 Implémenter onglet Sources
    - Afficher répartition des sources de trafic (graphique circulaire ou barres)
    - Utiliser une librairie de charts (ex. `chart.js`, `ng2-charts`)
    - _Requirements: 6.7_
  
  - [x] 12.6 Implémenter onglet Devices
    - Afficher répartition mobile/tablet/desktop (graphique circulaire ou barres)
    - _Requirements: 6.8_
  
  - [x] 12.7 Implémenter graphique d'activité
    - Afficher courbe sessions et pageviews par jour (30 derniers jours)
    - Graphique linéaire avec deux séries
    - _Requirements: 6.5_
  
  - [ ] 12.8 Implémenter filtres de période
    - Boutons 7d / 30d / 90d
    - Recharger toutes les données lors du changement de période
    - _Requirements: 6.11_
  
  - [x] 12.9 Ajouter indicateurs de chargement
    - Afficher spinners pendant les requêtes HTTP
    - Ne pas bloquer l'affichage du reste de la page
    - _Requirements: 6.12_

- [x] 13. Frontend — Configurer la route `/admin/analytics`
  - [x] 13.1 Ajouter route lazy-loaded dans app.routes.ts
    - Route `/admin/analytics` pointant vers `AnalyticsComponent`
    - Protéger avec `adminGuard`
    - _Requirements: 6.1, 6.2_

- [x] 14. Intégration — Connecter tracking aux actions clés
  - [x] 14.1 Ajouter tracking dans PostsComponent (création de post)
    - Appeler `trackingService.trackEvent('post_created')` après succès
    - _Requirements: 3.1_
  
  - [x] 14.2 Ajouter tracking dans CommentsComponent (publication commentaire)
    - Appeler `trackingService.trackEvent('comment_posted')` après succès
    - _Requirements: 3.2_
  
  - [x] 14.3 Ajouter tracking dans ReportComponent (signalement post)
    - Appeler `trackingService.trackEvent('post_reported')` après succès
    - _Requirements: 3.3_
  
  - [x] 14.4 Ajouter tracking dans ImageSearchComponent (recherche par image)
    - Appeler `trackingService.trackEvent('image_search_performed')` au lancement de la recherche
    - _Requirements: 3.4_
  
  - [x] 14.5 Ajouter tracking dans AuthService (connexion)
    - Appeler `trackingService.trackEvent('user_login')` après réception JWT
    - _Requirements: 3.5_
  
  - [x] 14.6 Ajouter tracking dans RegisterComponent (inscription)
    - Appeler `trackingService.trackEvent('user_registered')` après réception JWT (étape 3)
    - _Requirements: 3.6_

- [x] 15. Conformité — Mettre à jour la page de confidentialité
  - [x] 15.1 Modifier `src/app/features/privacy/privacy.component.html`
    - Ajouter section expliquant le tracking anonymisé
    - Mentionner IP hashée, pas d'IP en clair, TTL 90 jours
    - Indiquer finalité : amélioration UX et sécurité
    - _Requirements: 8.1-8.4_

- [x] 16. Checkpoint final — Tests et validation complète
  - Vérifier que tous les property tests passent (backend + frontend)
  - Tester un parcours complet : visite anonyme → inscription → navigation → analytics admin
  - Vérifier que les données apparaissent correctement dans MongoDB
  - Vérifier que les indexes TTL sont actifs (vérifier avec `db.collection.getIndexes()`)
  - Vérifier que les endpoints analytics retournent bien 401 sans JWT et 200 avec JWT Admin
  - Vérifier que la page `/admin/analytics` est inaccessible aux non-admins
  - Demander au user si des questions surviennent

---

## Notes

- Les tasks marquées avec `*` sont des property tests optionnels mais fortement recommandés pour garantir la robustesse
- Chaque property test doit tourner avec minimum 100 itérations (`numRuns: 100` dans fast-check)
- Les property tests sont placés immédiatement après l'implémentation de la fonction testée
- Backend d'abord, puis frontend, puis intégration : cet ordre assure des dépendances claires
- Le module `geoip-lite` doit être installé côté backend (`npm install geoip-lite`)
- La librairie `fast-check` doit être installée pour les property tests (`npm install --save-dev fast-check`)
- Les librairies de charts côté frontend sont à choisir selon préférence (chart.js, ng2-charts, etc.)

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3"] },
    { "wave": 3, "tasks": ["4"] },
    { "wave": 4, "tasks": ["5", "6"] },
    { "wave": 5, "tasks": ["7"] },
    { "wave": 6, "tasks": ["8"] },
    { "wave": 7, "tasks": ["9", "11"] },
    { "wave": 8, "tasks": ["10", "12", "13"] },
    { "wave": 9, "tasks": ["14", "15"] },
    { "wave": 10, "tasks": ["16"] }
  ]
}
```

- **Wave 1** — Module NestJS de base
- **Wave 2** — Schemas MongoDB + DTOs (peuvent se faire en parallèle)
- **Wave 3** — Fonctions utilitaires du service (hashIp, resolveGeo, extractIp)
- **Wave 4** — Endpoints collecte + analytics (peuvent se faire en parallèle)
- **Wave 5** — Checkpoint backend : validation complète avant de passer au frontend
- **Wave 6** — Modèles et interfaces Angular
- **Wave 7** — TrackingService + AnalyticsService (peuvent se faire en parallèle)
- **Wave 8** — Intégration APP_INITIALIZER + AnalyticsComponent + Route `/admin/analytics`
- **Wave 9** — Connexion aux actions clés + mise à jour page confidentialité
- **Wave 10** — Checkpoint final end-to-end
