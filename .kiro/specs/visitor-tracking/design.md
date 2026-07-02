# Design Document — Visitor Tracking

## Overview

Le module de tracking est composé de trois parties :

1. **Frontend (Angular 18)** : Un `TrackingService` singleton qui collecte les events, les batchise et les envoie à l'API de manière fire-and-forget via `sendBeacon` / `fetch keepalive`.
2. **Backend (NestJS 11)** : Un module `TrackingModule` exposant des endpoints de collecte (publics, pas de JWT) et des endpoints de restitution analytics (JWT + rôle Admin).
3. **Page analytics** : Un composant Angular standalone lazy-loadé sur `/admin/analytics`, protégé par `adminGuard`.

Le principe central est la **non-interférence** : le tracking ne bloque jamais la navigation, le backend répond 202 immédiatement et persiste en arrière-plan.

---

## Architecture

```mermaid
graph TD
  subgraph Frontend Angular 18
    Router[Angular Router] -->|NavigationEnd| TS[TrackingService]
    Components[Feature Components] -->|trackEvent()| TS
    TS -->|sendBeacon / fetch keepalive| API
    TS -->|localStorage| VID[visitorId persisté]
    AP[AnalyticsPage /admin/analytics] -->|HTTP GET| AAPI[Analytics endpoints]
  end

  subgraph Backend NestJS 11
    API[POST /tracking/session] --> TC[TrackingController]
    APIW[POST /tracking/pageview] --> TC
    APIE[POST /tracking/event] --> TC
    AAPI[GET /tracking/analytics/*] --> TC
    TC --> TSvc[TrackingService]
    TSvc -->|geoip-lite| GEO[GeoData]
    TSvc -->|crypto.createHash SHA-256| HASH[IP Hash 16 chars]
    TSvc -->|insertOne fire-and-forget| MDB[(MongoDB)]
  end

  MDB -->|tracking_sessions TTL 90j| S[(Collection sessions)]
  MDB -->|tracking_events TTL 90j| E[(Collection events)]
```

---

## Components and Interfaces

### Backend — TrackingModule

**Structure :**
```
src/tracking/
  tracking.module.ts
  tracking.controller.ts
  tracking.service.ts
  dto/
    create-session.dto.ts
    create-event.dto.ts
  schemas/
    tracking-session.schema.ts
    tracking-event.schema.ts
```

**Endpoints de collecte** (pas de JWT) :
- `POST /tracking/session` — Créer/mettre à jour une session
- `POST /tracking/pageview` — Enregistrer un pageview
- `POST /tracking/event` — Enregistrer un TrackingEvent
- `PATCH /tracking/session/:sessionId/end` — Clore une session (envoyé via sendBeacon)

**Endpoints analytics** (JWT + Roles Admin) :
- `GET /tracking/analytics/overview?period=30d` — Métriques globales
- `GET /tracking/analytics/pages?period=30d` — Top pages
- `GET /tracking/analytics/geo?period=30d` — Répartition géo
- `GET /tracking/analytics/devices?period=30d` — Répartition devices
- `GET /tracking/analytics/sources?period=30d` — Sources de trafic
- `GET /tracking/analytics/activity?period=30d` — Courbe sessions/pageviews par jour
- `GET /tracking/analytics/top-posts?period=30d` — Top posts consultés

### Frontend — TrackingService

Service singleton (`providedIn: 'root'`) intégré dans `app.config.ts` via `APP_INITIALIZER`.

Responsabilités :
- Générer/récupérer `visitorId` (localStorage)
- Générer `sessionId` (UUID v4 in-memory)
- Écouter les `NavigationEnd` du Router Angular
- Calculer la durée passée sur chaque page
- Batcher les pageviews (flush toutes les 10s ou sur changement de route)
- Exposer `trackEvent(type, metadata?)` pour les feature components

### Frontend — AnalyticsComponent

Composant standalone lazy-loadé sur `/admin/analytics`.

Signals utilisés :
- `period = signal<'7d' | '30d' | '90d'>('30d')`
- `overview = signal<OverviewData | null>(null)`
- `loading = signal(false)`
- `activeTab = signal<AnalyticsTab>('overview')`

Onglets : Overview | Pages | Géographie | Sources | Devices

---

## Data Models

### Schema `tracking_sessions`

```typescript
@Schema({ timestamps: true })
export class TrackingSession {
  @Prop({ required: true }) sessionId: string;       // UUID v4
  @Prop({ required: true }) visitorId: string;       // UUID v4
  @Prop() userId?: Types.ObjectId;                   // Ref User (optionnel)
  @Prop({ required: true }) ipHash: string;          // SHA-256 tronqué 16 chars
  @Prop() country: string;
  @Prop() city: string;
  @Prop() device: 'mobile' | 'tablet' | 'desktop';
  @Prop() browser: string;
  @Prop() os: string;
  @Prop() entryPage: string;                         // URL normalisée
  @Prop() exitPage?: string;
  @Prop() trafficSource: string;                     // Direct | Organic Search | Social | Referral | Unknown
  @Prop({ default: false }) isNewVisitor: boolean;   // true si premier visitorId
  @Prop() duration?: number;                         // ms
  @Prop({ required: true }) startedAt: Date;
  @Prop() endedAt?: Date;
  // TTL index sur createdAt (90 jours) ajouté dans le schema factory
}
```

### Schema `tracking_events`

```typescript
@Schema({ timestamps: true })
export class TrackingEvent {
  @Prop({ required: true }) sessionId: string;
  @Prop({ required: true }) visitorId: string;
  @Prop() userId?: Types.ObjectId;
  @Prop({ required: true }) type: string;
  // 'pageview' | 'post_created' | 'comment_posted' | 'post_reported'
  // | 'image_search_performed' | 'user_login' | 'user_registered'
  @Prop() url?: string;                              // pour pageview, URL normalisée
  @Prop() duration?: number;                         // ms (pour pageview)
  @Prop() metadata?: Record<string, any>;            // données additionnelles légères
  @Prop({ required: true }) timestamp: Date;
  // TTL index sur createdAt (90 jours)
}
```

### DTOs Backend

```typescript
// create-session.dto.ts
export class CreateSessionDto {
  @IsUUID(4) sessionId: string;
  @IsUUID(4) visitorId: string;
  @IsString() @IsOptional() userId?: string;
  @IsIn(['mobile', 'tablet', 'desktop']) device: string;
  @IsString() browser: string;
  @IsString() os: string;
  @IsString() entryPage: string;
  @IsString() trafficSource: string;
  @IsBoolean() isNewVisitor: boolean;
  @IsDateString() startedAt: string;
}

// create-event.dto.ts
export class CreateEventDto {
  @IsUUID(4) sessionId: string;
  @IsUUID(4) visitorId: string;
  @IsString() @IsOptional() userId?: string;
  @IsString() type: string;
  @IsString() @IsOptional() url?: string;
  @IsNumber() @IsOptional() duration?: number;
  @IsObject() @IsOptional() metadata?: Record<string, any>;
  @IsDateString() timestamp: string;
}
```

### Interfaces Angular

```typescript
// tracking.models.ts
export interface TrackingSessionPayload {
  sessionId: string;
  visitorId: string;
  userId?: string;
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  entryPage: string;
  trafficSource: TrafficSource;
  isNewVisitor: boolean;
  startedAt: string; // ISO
}

export interface PageviewPayload {
  sessionId: string;
  visitorId: string;
  userId?: string;
  url: string;
  duration: number;
  timestamp: string;
}

export interface TrackingEventPayload {
  sessionId: string;
  visitorId: string;
  userId?: string;
  type: TrackingEventType;
  metadata?: Record<string, any>;
  timestamp: string;
}

export type TrafficSource = 'Direct' | 'Organic Search' | 'Social' | 'Referral' | 'Unknown';
export type TrackingEventType =
  | 'post_created' | 'comment_posted' | 'post_reported'
  | 'image_search_performed' | 'user_login' | 'user_registered';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Normalisation des URLs dynamiques

*For any* URL contenant des segments qui ressemblent à des ObjectId MongoDB (24 caractères hexadécimaux), la fonction de normalisation doit remplacer ces segments par `:id` et ne modifier aucun autre segment.

**Validates: Requirements 2.3**

### Property 2: Classification de la source de trafic

*For any* valeur de `document.referrer`, la fonction de classification doit retourner exactement l'une des valeurs `Direct | Organic Search | Social | Referral | Unknown`, et la classification est déterministe (même input → même output).

**Validates: Requirements 1.6, 4.5**

### Property 3: Hash IP — format invariant

*For any* adresse IP valide (IPv4 ou IPv6), la fonction de hashage doit produire un string de exactement 16 caractères hexadécimaux minuscules, et deux IPs différentes peuvent produire le même hash mais la même IP produit toujours le même hash.

**Validates: Requirements 4.3, 5.3**

### Property 4: Validation UUID v4

*For any* string, la fonction de validation UUID doit accepter uniquement les strings conformes au format UUID v4 (`xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`) et rejeter tout le reste.

**Validates: Requirements 5.7**

### Property 5: Calcul de durée — invariante positive

*For any* paire de timestamps (entrée, sortie) où sortie >= entrée, la durée calculée en millisecondes doit être un entier >= 0.

**Validates: Requirements 2.2**

### Property 6: Détection du type d'appareil

*For any* largeur d'écran en pixels, la fonction de détection doit retourner exactement `mobile` si < 768, `tablet` si entre 768 et 1024 inclus, `desktop` sinon — sans chevauchement entre les catégories.

**Validates: Requirements 4.1**

### Property 7: Invariante PII — documents persistés

*For any* document inséré dans `tracking_sessions` ou `tracking_events`, le document ne doit contenir aucun champ `ip`, `email`, ni aucun string correspondant au format d'une adresse IPv4 complète.

**Validates: Requirements 4.3, 5.3, 5.4**

---

## Error Handling

**Frontend (Tracking_Service) :**
- Toutes les erreurs réseau sont silencieuses — `try/catch` autour de `sendBeacon`/`fetch`, jamais de propagation vers l'utilisateur.
- `localStorage` inaccessible : `try/catch` → mode session-only, `visitorId` en mémoire uniquement pour la session.
- Pas de retry : fire-and-forget, si le beacon échoue il est abandonné.

**Backend (Analytics_API) :**
- `geoip-lite` retourne `null` pour IPs privées ou inconnues → fallback `country: 'Unknown', city: 'Unknown'`.
- `sessionId` invalide (non UUID v4) → HTTP 400 (validation automatique via `class-validator`).
- Erreur MongoDB sur `insertOne` → logguée en console, jamais exposée au client (le 202 est déjà envoyé).
- En-tête `X-Forwarded-For` absent → utiliser `req.ip` directement.

**Implémentation du 202 non-bloquant :**
```typescript
// Pattern dans tracking.controller.ts
@Post('session')
@HttpCode(202)
async createSession(@Body() dto: CreateSessionDto, @Req() req: Request) {
  // Réponse immédiate, persistance en arrière-plan
  this.trackingService.persistSession(dto, req).catch(() => {/* silent */});
  return;
}
```

---

## Testing Strategy

### Approche duale

- **Tests unitaires** : cas concrets, edge cases, mocks des dépendances externes.
- **Tests property-based** : propriétés universelles sur les fonctions pures (normalisation URL, hash IP, classification source, détection device, validation UUID, calcul durée).

La librairie PBT retenue est **[fast-check](https://fast-check.dev/)** (npm), disponible pour TypeScript/Node.js, bien maintenue et sans dépendances lourdes.

### Configuration property tests

```typescript
// Chaque test property-based tourne avec fc.assert(fc.property(...), { numRuns: 100 })
// Tag format: Feature: visitor-tracking, Property N: <titre>
```

### Tests unitaires — Backend

- `TrackingService.hashIp()` : vérifier format 16 chars pour des IPs connues.
- `TrackingService.resolveGeo()` : mocker `geoip-lite`, tester le fallback Unknown.
- `TrackingService.extractSourceFromForwardedFor()` : tester avec/sans header.
- `TrackingController` : vérifier retour 202 immédiat et non-attente de la persistance.

### Tests unitaires — Frontend

- `TrackingService.normalizeUrl()` : URLs avec/sans ObjectId, URLs imbriquées.
- `TrackingService.detectDevice()` : largeurs limites (767, 768, 1024, 1025).
- `TrackingService.classifySource()` : chaque catégorie de source + cas vide.
- `TrackingService.getOrCreateVisitorId()` : premier appel crée, second réutilise.

### Tests property-based

Chaque property du design document a un test dédié :

| Property | Générateur fast-check | Assertion |
|----------|----------------------|-----------|
| P1 Normalisation URL | `fc.webUrl()` + injection d'ObjectId | URL résultante ne contient pas de hex-24 |
| P2 Classification source | `fc.string()` (referrers arbitraires) | Résultat ∈ \{Direct, Organic Search, Social, Referral, Unknown\} |
| P3 Hash IP | `fc.ipV4()` + `fc.ipV6()` | Longueur = 16, chars hexadécimaux |
| P4 Validation UUID | `fc.string()` + `fc.uuid()` | UUIDs v4 acceptés, reste rejeté |
| P5 Durée positive | `fc.tuple(fc.date(), fc.date())` | Durée = max(0, t2-t1) |
| P6 Détection device | `fc.integer({ min: 0, max: 5000 })` | Partitionnement exact et exhaustif |
| P7 Invariante PII | Objets de session générés | Pas de champ `ip`, pas d'IPv4 en clair |

### Tests d'intégration (examples)

- Endpoint `POST /tracking/session` avec `sessionId` non-UUID → 400
- Endpoint `POST /tracking/session` sans JWT → 202 (pas d'auth requise)
- Endpoint `GET /tracking/analytics/overview` sans JWT → 401
- Endpoint `GET /tracking/analytics/overview` avec JWT Admin → 200
- Suppression d'un utilisateur → `userId` dans `tracking_sessions` mis à `null`
