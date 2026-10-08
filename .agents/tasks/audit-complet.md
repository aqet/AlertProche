# Audit Complet AlertProche — Rapport d'état du projet

**Date :** Analyse statique complète (lecture de code sans exécution)  
**Périmètre :** Frontend Angular 18 (`AlertProche/`) + Backend NestJS (`alertproche-api/`)

---

## Résumé Exécutif

Le projet AlertProche est globalement bien structuré. Le système de paiement Mobile Money via digiKUNTZ est majoritairement opérationnel (côté admin, ça fonctionne déjà). Cependant, plusieurs problèmes critiques subsistent :

1. **Bug bloquant majeur** : Les endpoints `PATCH /posts/:id/resolve` et `PATCH /posts/:id/unresolve` n'existent pas dans le backend (`posts.controller.ts` et `posts.service.ts`) bien que le frontend les appelle partout.
2. **Bug moyen** : Le formulaire de retrait côté propriétaire de cagnotte (`payoutForm`) ne valide pas le montant maximum avec `Validators.max()`, ce qui signifie que la validation frontend est incomplète (seul le backend protège réellement).
3. **Incohérence** : Dans `admin.component.html`, le champ de recherche utilisateur utilise à la fois `[(ngModel)]="userSearch"` et `[ngModel]="userSearch()"` sur le même input, ce qui est contradictoire.
4. **Sécurité acceptable** : Tous les endpoints sensibles sont protégés par `JwtAuthGuard` et/ou `RolesGuard`.

---

## Section 1 — Fonctionnalités existantes et leur état

### Backend NestJS (`alertproche-api/`)

| Fonctionnalité | Endpoint | Statut |
|---|---|---|
| Créer un post | `POST /posts` | ✅ Fonctionnel |
| Lister les posts | `GET /posts` | ✅ Fonctionnel |
| Détail d'un post | `GET /posts/:id` | ✅ Fonctionnel |
| Mes posts | `GET /posts/my-posts` | ✅ Fonctionnel |
| Modifier un post | `PATCH /posts/:id` | ✅ Fonctionnel |
| Désactiver/activer post | `PATCH /posts/:id/toggle-active` | ✅ Fonctionnel |
| Signaler un post | `POST /posts/:id/report` | ✅ Fonctionnel |
| Effacer un signalement | `DELETE /posts/:id/report` | ✅ Fonctionnel |
| Supprimer un post | `DELETE /posts/:id` | ✅ Fonctionnel |
| **Marquer post résolu** | `PATCH /posts/:id/resolve` | ❌ **MANQUANT** |
| **Réouvrir un post** | `PATCH /posts/:id/unresolve` | ❌ **MANQUANT** |
| Initier un don | `POST /payments/donations/initiate` | ✅ Fonctionnel |
| Initier un soutien plateforme | `POST /payments/support/initiate` | ✅ Fonctionnel |
| Demander un retrait (user) | `POST /payments/payout/request` | ✅ Fonctionnel |
| Mes cagnottes | `GET /payments/my-cagnottes` | ✅ Fonctionnel |
| Mes transactions | `GET /payments/my-transactions` | ✅ Fonctionnel |
| Webhook digiKUNTZ | `POST /payments/webhook` | ✅ Fonctionnel |
| Admin — lister transactions | `GET /admin/payments/transactions` | ✅ Fonctionnel |
| Admin — demandes retrait | `GET /admin/payments/payout-requests` | ✅ Fonctionnel |
| Admin — approuver retrait | `POST /admin/payments/payout/approve/:id` | ✅ Fonctionnel |
| Admin — marquer succès | `POST /admin/payments/mark-success/:id` | ✅ Fonctionnel |
| Admin — retrait vers plateforme | `POST /admin/payments/payout-to-platform` | ✅ Fonctionnel |
| Contacts SOS | Ensemble des routes `/sos/*` | ✅ (non audité en détail) |
| Gestion utilisateurs admin | `GET/PATCH/DELETE /admin/users/*` | ✅ Fonctionnel |
| Authentification JWT | `/auth/*` | ✅ Fonctionnel |

### Frontend Angular (`AlertProche/`)

| Composant | Fonctionnalité | Statut |
|---|---|---|
| `DashboardComponent` | Publications, commentaires, profil, SOS, cagnottes | ✅ Complet |
| `AdminComponent` | Stats, users, posts, versions, paiements | ✅ Complet |
| `PaymentCallbackComponent` | Page de retour après paiement digiKUNTZ | ✅ Implémenté |
| `PaymentService` | Tous les appels API paiements | ✅ Complet |
| `AlertStatusBadgeComponent` | Badge "résolu" | ✅ Complet côté frontend |

---

## Section 2 — État du système de paiement

### Flux complet : initiation → callback → webhook

**Initiation d'un don :**
1. Frontend → `POST /payments/donations/initiate` avec `{ alertId, amount, phone, userId? }`
2. Backend appelle `digikuntz.createTransaction()` → obtient `paymentLink` + `transactionRef`
3. Backend crée la transaction en DB (status `PENDING`)
4. Frontend reçoit `{ paymentLink, transactionRef, transactionId }` et redirige l'utilisateur vers `paymentLink`

**Callback (retour utilisateur) :**
- digiKUNTZ redirige vers `APP_BASE_URL/payments/callback` (route Angular `/payments/callback`)
- `PaymentCallbackComponent` lit les query params `?status=...&ref=...` et affiche le statut
- ⚠️ Ce composant est **purement visuel** — il ne fait aucun appel API pour confirmer le statut. La vraie mise à jour se fait par webhook.

**Webhook :**
- digiKUNTZ appelle `POST /payments/webhook` avec le résultat final
- Backend met à jour le statut de la transaction et incrémente `raisedAmount` sur le post en cas de succès

**Flux de retrait (propriétaire de cagnotte) :**
1. Utilisateur ouvre la modale "Retirer" dans son dashboard
2. Frontend → `POST /payments/payout/request` avec `{ alertId, amount, accountBankCode, accountNumber, receiverName }`
3. Backend vérifie l'auteur du post, vérifie le solde disponible (`raisedAmount - withdrawnAmount`), crée une transaction `PAYOUT_PENDING`
4. L'admin voit la demande dans son panneau "Demandes de retrait en attente"
5. Admin clique "Approuver" → `POST /admin/payments/payout/approve/:transactionId`
6. Backend appelle `digikuntz.createPayout()` → exécute le virement réel
7. Si succès : status → `PAYOUT_SUCCESS`, `withdrawnAmount` du post est incrémenté

**Cohérence des endpoints :**
- ✅ Tous les appels frontend correspondent aux routes backend existantes
- ✅ Le module `PaymentsModule` déclare bien les deux contrôleurs (`PaymentController` + `AdminPaymentController`)
- ✅ `PaymentsModule` est importé dans `app.module.ts`
- ✅ La variable d'environnement `APP_BASE_URL` est dans `.env` → `https://alertproche.com`
- ⚠️ La callback URL envoyée à digiKUNTZ est `https://alertproche.com/payments/callback` (frontend), pas un endpoint backend — c'est cohérent avec l'architecture choisie (webhook séparé), mais nécessite que le webhook soit bien appelé par digiKUNTZ indépendamment du callback.

---

## Section 3 — Sécurité

### Points positifs

- ✅ **`POST /payments/payout/request`** est protégé par `JwtAuthGuard`. La vérification d'autorité (`authorIdStr !== userId`) est faite en backend. **Le montant n'est jamais pris tel quel** : le backend relit `raisedAmount` et `withdrawnAmount` depuis la DB et recalcule `availableAmount`.
- ✅ **Tous les endpoints admin** (`/admin/payments/*`) sont doublement protégés : `JwtAuthGuard` + `RolesGuard` + `@Roles('Admin')`.
- ✅ **Validation des entrées** dans `POST /payments/payout/request` :
  - `alertId`, `accountBankCode`, `accountNumber`, `receiverName` : présence vérifiée
  - `accountBankCode` : whitelist `['MTN', 'ORANGEMONEY']`
  - `accountNumber` : regex `/^237[0-9]{9}$/`
  - `parsedAmount` : `Number()` + `isFinite()` + valeur minimale
- ✅ **`POST /payments/webhook`** est public (obligatoire pour digiKUNTZ), mais ne modifie que des champs internes via une transaction existante.
- ✅ **`POST /payments/donations/initiate`** est public (don anonyme possible), mais valide `alertId` (existence en DB), montant minimum, format téléphone.

### Points de vigilance

| Problème | Fichier | Détail |
|---|---|---|
| Webhook sans signature HMAC | `payment.controller.ts` ligne ~270 | Le webhook est public et ne vérifie pas de signature secrète digiKUNTZ. N'importe qui connaissant l'URL pourrait déclencher une fausse mise à jour. |
| `.env` avec credentials en clair dans le repo | `alertproche-api/.env` | Le fichier `.env` contient `DIGIKUNTZ_SECRET_KEY`, `PLATFORM_ACCOUNT_NUMBER`, etc. Vérifier qu'il est dans `.gitignore`. |
| Doublon `JwtAuthGuard` | `alertproche-api/src/auth/jwt-auth.guard.ts` ET `alertproche-api/src/auth/guards/jwt-auth.guard.ts` | Deux fichiers définissent la même classe. Le contrôleur de paiements importe depuis `../auth/jwt-auth.guard` (le bon). Pas de bug immédiat, mais source de confusion. |

---

## Section 4 — Bugs potentiels

### BUG CRITIQUE — Endpoints `resolve`/`unresolve` manquants dans le backend

**Cause :** `posts.controller.ts` et `posts.service.ts` ne définissent aucune route `PATCH /posts/:id/resolve` ni `PATCH /posts/:id/unresolve`.

**Fichiers concernés :**
- Backend : `alertproche-api/src/posts/posts.controller.ts` (aucun handler `resolve`)
- Backend : `alertproche-api/src/posts/posts.service.ts` (aucune méthode `resolvePost`)
- Frontend appelle ces routes depuis : `AlertProche/src/app/core/services/post.service.ts` (lignes 184–190), `dashboard.component.ts`, `post-detail.component.ts`, `moderation.component.ts`
- Le modèle Post frontend (`post.model.ts`) déclare `isResolved?: boolean` mais le schema Mongoose (`post.schema.ts`) **ne contient pas ce champ**.

**Correction recommandée :**
1. Ajouter `isResolved: boolean` (default `false`), `resolvedAt: Date?`, `resolvedBy: ObjectId?` dans `post.schema.ts`
2. Ajouter les méthodes `resolvePost(id, user)` et `unresolvePost(id, user)` dans `posts.service.ts` avec contrôle de droits
3. Ajouter les routes `@Patch(':id/resolve')` et `@Patch(':id/unresolve')` dans `posts.controller.ts` protégées par `JwtAuthGuard`

---

### BUG MOYEN — Validation `max` manquante dans `payoutForm` (frontend)

**Cause :** Dans `dashboard.component.ts`, le `payoutForm` est déclaré avec `Validators.min(1)` mais sans `Validators.max(availableAmount)`. La vérification `if (Number(val.amount) > c.availableAmount)` est faite manuellement dans `submitPayout()`, mais l'attribut `[max]="c.availableAmount"` dans le HTML ne se synchronise pas automatiquement avec un validateur Reactive Form.

**Fichier :** `AlertProche/src/app/features/dashboard/dashboard.component.ts` (ligne ~219), `.html` (ligne payout form)

**Conséquence :** L'affichage de l'erreur `*ngIf="hasError(payoutForm, 'amount', 'max')"` dans le template ne s'activera jamais car le validateur `Validators.max()` n'est pas dans le form group. Ce n'est pas un bug bloquant (la vérification manuelle dans `submitPayout()` fonctionne, et le backend vérifie aussi), mais l'UX feedback n'est pas optimal.

**Correction recommandée :** À la sélection d'une cagnotte dans `selectCagnotte()`, mettre à jour le contrôle `amount` :
```typescript
this.payoutForm.get('amount')?.setValidators([
  Validators.required,
  Validators.min(1),
  Validators.max(c.availableAmount)
]);
this.payoutForm.get('amount')?.updateValueAndValidity();
```

---

### BUG MOYEN — Double binding `ngModel` / `ngModel()` sur le champ de recherche admin

**Cause :** Dans `admin.component.html`, le champ de recherche utilisateur a deux directives ngModel conflictuelles :
```html
[(ngModel)]="userSearch"
[ngModel]="userSearch()"
```
`userSearch` est un `signal<string>`, donc `[(ngModel)]="userSearch"` tente de lier directement sur le signal (objet), pas sur sa valeur. Cela peut provoquer des comportements inattendus selon la version d'Angular.

**Fichier :** `AlertProche/src/app/features/admin/admin.component.html` (lignes ~331–332)

**Correction recommandée :** Supprimer `[(ngModel)]="userSearch"` et garder uniquement :
```html
[ngModel]="userSearch()"
(ngModelChange)="userSearch.set($event); onSearchChange()"
```

---

### BUG MINEUR — `payoutToPlatform` : validation frontend insuffisante

**Cause :** Dans `admin.component.html`, le champ de saisie du montant de retrait plateforme a `min="100"` en HTML mais `executePlatformPayout()` vérifie `< 1`. Il y a une incohérence entre la contrainte HTML (min 100) et la validation JS (min 1).

**Fichier :** `AlertProche/src/app/features/admin/admin.component.html` (ligne `min="100"`), `admin.component.ts` méthode `executePlatformPayout()`

**Correction recommandée :** Aligner les deux à `>= 100` ou corriger le message d'erreur.

---

### RISQUE MINEUR — Page `payment-callback` purement visuelle

**Cause :** `PaymentCallbackComponent` lit uniquement les query params de l'URL et n'interroge pas l'API backend pour confirmer le statut réel de la transaction.

**Conséquence :** Si digiKUNTZ redirige avec `?status=success` mais que le webhook n'a pas encore été reçu, l'utilisateur voit "succès" mais `raisedAmount` n'a pas encore été mis à jour. C'est une UX problem, pas un problème de données (le webhook corrige de toute façon).

**Fichier :** `AlertProche/src/app/features/payment-callback/payment-callback.component.ts`

---

## Section 5 — Incohérences frontend / backend

| Incohérence | Impact | Fichiers |
|---|---|---|
| `isResolved` existe côté frontend (modèle + composants) mais pas dans le schema Mongoose | **Critique** — les appels `resolvePost` et `unresolvePost` retournent 404 | `post.model.ts` vs `post.schema.ts` |
| La callback URL envoyée à digiKUNTZ est `${APP_BASE_URL}/payments/callback` (URL frontend) mais le webhook digiKUNTZ devrait pointer vers un endpoint backend | Aucun impact si digiKUNTZ fait un appel séparé au webhook backend. Si digiKUNTZ utilise la callbackUrl comme webhook → aucune mise à jour DB | `.env` `APP_BASE_URL=https://alertproche.com` → callback est frontend |
| `admin.component.ts` : `selectedUserTransactions` initialisé à `null`, testé avec `!== null` → le panneau s'ouvre avec `[]` après chargement | Mineur — comportement attendu | `admin.component.html` ligne ~381 |
| `PayoutRequestDto.accountBankCode` est typé `'MTN' | 'ORANGEMONEY'` côté frontend mais le backend accepte aussi cette valeur. Cohérent ✅ | Aucun | — |

---

## Section 6 — Ce qui manque ou est incomplet

### 1. Endpoints `resolve`/`unresolve` (critique)

**Ce qui manque :**
- Dans `post.schema.ts` : champs `isResolved`, `resolvedAt`, `resolvedBy`
- Dans `posts.service.ts` : méthodes `resolvePost(id, user)` et `unresolvePost(id, user)`
- Dans `posts.controller.ts` : routes `PATCH :id/resolve` et `PATCH :id/unresolve`

**État actuel :** Toute tentative de marquer une alerte résolue retourne une erreur 404. Le badge `AlertStatusBadgeComponent` s'affiche toujours "non résolu" car le champ n'existe pas en DB.

---

### 2. Sécurité webhook digiKUNTZ (important)

**Ce qui manque :** Vérification de signature HMAC sur `POST /payments/webhook`.

**État actuel :** Le webhook est totalement public. Si digiKUNTZ fournit un header de signature (par ex. `x-webhook-signature`), il faudrait la vérifier avant tout traitement.

**Recommandation :**
```typescript
// Dans handleWebhook()
const sig = req.headers['x-digikuntz-signature'];
if (sig && !verifyHmac(sig, payload, process.env.DIGIKUNTZ_WEBHOOK_SECRET)) {
  return { received: false };
}
```

---

### 3. Historique admin par candidat (partiel)

**État actuel :** L'admin peut voir les transactions d'un utilisateur spécifique via `viewUserTransactions(userId)` → `GET /admin/payments/transactions?userId=...`. Cette fonctionnalité existe et fonctionne.

**Ce qui manque éventuellement :** Une vue dédiée qui liste toutes les alertes d'un utilisateur avec leurs soldes (`raisedAmount`, `availableAmount`). Actuellement, on ne voit que les transactions, pas les soldes par post.

---

### 4. Le champ `isResolved` dans le post n'a pas de `findAll` filter

**Ce qui manque :** Quand `isResolved` sera ajouté au schema, le `findAll` dans `posts.service.ts` n'a pas encore de filtre `isResolved=false` par défaut. Le frontend (`home.component.ts`) filtre côté client (`result.filter(p => p.isResolved !== true)`), ce qui est acceptable pour de petits volumes mais inefficace à grande échelle.

---

## Tableau récapitulatif des corrections prioritaires

| Priorité | Problème | Fichiers à modifier |
|---|---|---|
| 🔴 P1 | Ajouter `isResolved` au schema Mongoose + endpoints `/resolve` et `/unresolve` | `post.schema.ts`, `posts.service.ts`, `posts.controller.ts` |
| 🟡 P2 | Corriger le double binding ngModel dans `admin.component.html` | `admin.component.html` (ligne ~331) |
| 🟡 P2 | Ajouter `Validators.max()` dynamique dans `selectCagnotte()` | `dashboard.component.ts` |
| 🟡 P2 | Ajouter vérification de signature HMAC sur le webhook | `payment.controller.ts` + `.env` |
| 🟢 P3 | Aligner la validation min 1 vs min 100 dans `executePlatformPayout` | `admin.component.ts` + `admin.component.html` |
| 🟢 P3 | Supprimer le doublon `jwt-auth.guard.ts` dans le dossier `/guards/` | `alertproche-api/src/auth/guards/` |
| 🟢 P3 | Enrichir `PaymentCallbackComponent` avec un appel API de vérification du statut | `payment-callback.component.ts` |
