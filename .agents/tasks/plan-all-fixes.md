# Plan d'implémentation — Corrections AlertProche

**Généré après lecture complète des fichiers sources.**
**Ordre de dépendance : les fixes backend (Fix 1) doivent être commités avant les tests frontend.**

---

## Fix 1 — BLOQUANT : endpoints resolve/unresolve manquants dans le backend

### 1a. Ajouter les champs `isResolved` au schéma Mongoose

**Fichier :** `alertproche-api/src/schemas/post.schema.ts`

Après la ligne :
```typescript
  @Prop({ type: Number, default: 0 })
  withdrawnAmount: number;
```

Ajouter :
```typescript
  @Prop({ default: false })
  isResolved: boolean;

  @Prop({ type: Date, default: null })
  resolvedAt: Date;

  @Prop({ type: String, default: null })
  resolvedBy: string;
```

Puis ajouter un index à la fin du fichier, avant le dernier bloc d'indices :
```typescript
PostSchema.index({ isResolved: 1 });
```

**Vérification :** Le backend compile sans erreur — `cd alertproche-api && npm run build`.

---

### 1b. Ajouter les méthodes `resolvePost` et `unresolvePost` dans le service

**Fichier :** `alertproche-api/src/posts/posts.service.ts`

Ajouter **avant** la méthode `private async enrichPost(...)` (ligne ~262) :

```typescript
  async resolvePost(id: string, user: any) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Publication introuvable.');
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Publication introuvable.');

    const isAdminOrMod = ['Admin', 'Moderateur'].includes(user.role);
    // Les posts anonymes : seuls Admin/Moderateur peuvent résoudre
    if (post.isAnonymous === true && !isAdminOrMod) {
      throw new ForbiddenException('Seul un administrateur ou modérateur peut résoudre une alerte anonyme.');
    }
    // Pour les posts non-anonymes : l'auteur OU Admin/Moderateur
    if (post.isAnonymous !== true && !isAdminOrMod && post.author_id.toString() !== user._id.toString()) {
      throw new ForbiddenException('Vous ne pouvez résoudre que vos propres publications.');
    }

    const updated = await this.postModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: user.pseudo ?? user._id.toString(),
        },
      },
      { new: true },
    ).lean();

    return this.enrichPost(updated!);
  }

  async unresolvePost(id: string, user: any) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Publication introuvable.');
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Publication introuvable.');

    const isAdminOrMod = ['Admin', 'Moderateur'].includes(user.role);
    if (post.isAnonymous === true && !isAdminOrMod) {
      throw new ForbiddenException('Seul un administrateur ou modérateur peut réouvrir une alerte anonyme.');
    }
    if (post.isAnonymous !== true && !isAdminOrMod && post.author_id.toString() !== user._id.toString()) {
      throw new ForbiddenException('Vous ne pouvez réouvrir que vos propres publications.');
    }

    const updated = await this.postModel.findByIdAndUpdate(
      id,
      { $set: { isResolved: false, resolvedAt: null, resolvedBy: null } },
      { new: true },
    ).lean();

    return this.enrichPost(updated!);
  }
```

**Remarque sur `enrichPost` :** La méthode actuelle ne retourne pas `isResolved`, `resolvedAt`, `resolvedBy`. Il faut les ajouter dans l'objet retourné à la fin de `enrichPost` :

Localiser dans `enrichPost` le bloc `return { _id: ..., ... commentCount, }` et ajouter :
```typescript
      isResolved: post.isResolved ?? false,
      resolvedAt: post.resolvedAt ?? null,
      resolvedBy: post.resolvedBy ?? null,
```

**Vérification :** `cd alertproche-api && npm run build` — pas d'erreur TypeScript.

---

### 1c. Ajouter les routes `PATCH :id/resolve` et `PATCH :id/unresolve` dans le contrôleur

**Fichier :** `alertproche-api/src/posts/posts.controller.ts`

Ajouter **avant** le handler `@Patch(':id')` existant (pour éviter que `:id` capture "resolve") — en pratique NestJS résout les routes dans l'ordre déclaré, donc placer ces deux handlers **avant** `@Patch(':id')` :

```typescript
  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard)
  resolvePost(@Param('id') id: string, @Request() req: any) {
    return this.postsService.resolvePost(id, req.user);
  }

  @Patch(':id/unresolve')
  @UseGuards(JwtAuthGuard)
  unresolvePost(@Param('id') id: string, @Request() req: any) {
    return this.postsService.unresolvePost(id, req.user);
  }
```

Placer ces deux méthodes **immédiatement avant** :
```typescript
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(...)
```

**Vérification :** `cd alertproche-api && npm run build` — compilation propre. Tester manuellement via curl ou Postman : `PATCH /posts/<id>/resolve` avec un token JWT valide doit retourner le post avec `isResolved: true`.

---

## Fix 2 — Minimum de paiement : 15 XAF → 100 XAF

### 2a. Backend : `payment.controller.ts`

**Fichier :** `alertproche-api/src/payments/payment.controller.ts`

Il y a **deux** occurrences de `parsedAmount < 15` à modifier :

**Occurrence 1** (méthode `initiateDonation`, ligne ~77) :
```typescript
// AVANT
if (!Number.isFinite(parsedAmount) || parsedAmount < 15) {
  throw new BadRequestException('Le montant doit être un nombre positif (minimum 15 XAF).');
}
// APRÈS
if (!Number.isFinite(parsedAmount) || parsedAmount < 100) {
  throw new BadRequestException('Le montant doit être un nombre positif (minimum 100 XAF).');
}
```

**Occurrence 2** (méthode `initiateSupport`, ligne ~116) :
```typescript
// AVANT
if (!Number.isFinite(parsedAmount) || parsedAmount < 15) {
  throw new BadRequestException('Le montant doit être un nombre positif (minimum 15 XAF).');
}
// APRÈS
if (!Number.isFinite(parsedAmount) || parsedAmount < 100) {
  throw new BadRequestException('Le montant doit être un nombre positif (minimum 100 XAF).');
}
```

Note : la méthode `requestPayout` a `parsedAmount < 1` — c'est intentionnel (le retrait peut être > 100 XAF mais le backend doit seulement vérifier que le montant est positif et ≤ solde disponible). **Ne pas toucher à cette valeur.**

**Vérification :** `cd alertproche-api && npm run build`.

---

### 2b. Frontend donation-modal : `donation-modal.component.ts`

**Fichier :** `AlertProche/src/app/shared/components/donation-modal/donation-modal.component.ts`

Changer la constante `PRESET_AMOUNTS` (déjà correcte avec 100 comme plus petit preset) — ne pas toucher.

Modifier `isValid` getter :
```typescript
// AVANT
return this.effectiveAmount >= 15 && phoneDigits.length >= 8;
// APRÈS
return this.effectiveAmount >= 100 && phoneDigits.length >= 8;
```

Modifier `submit()` :
```typescript
// AVANT
if (this.effectiveAmount < 15) {
  this.error.set('Le montant minimum est 15 XAF.');
  return;
}
// APRÈS
if (this.effectiveAmount < 100) {
  this.error.set('Le montant minimum est 100 XAF.');
  return;
}
```

---

### 2c. Frontend donation-modal : `donation-modal.component.html`

**Fichier :** `AlertProche/src/app/shared/components/donation-modal/donation-modal.component.html`

Modifier le `placeholder` du champ montant libre :
```html
<!-- AVANT -->
placeholder="Autre montant (min. 15 XAF)"
<!-- APRÈS -->
placeholder="Autre montant (min. 100 XAF)"
```

La ligne `*ngIf="effectiveAmount >= 100"` dans le récap est **déjà correcte** dans le HTML — ne pas toucher.

---

### 2d. Frontend platform-support-modal : `platform-support-modal.component.ts`

**Fichier :** `AlertProche/src/app/shared/components/platform-support-modal/platform-support-modal.component.ts`

Le template est inline dans le `.ts`. Modifier :

**Dans le template inline :**
```html
<!-- AVANT -->
placeholder="Autre montant (min. 15 XAF)"
<!-- APRÈS -->
placeholder="Autre montant (min. 100 XAF)"
```

```html
<!-- AVANT (dans *ngIf du récap) -->
<div class="donation-recap" *ngIf="effectiveAmount >= 1">
<!-- APRÈS -->
<div class="donation-recap" *ngIf="effectiveAmount >= 100">
```

**Dans le code TypeScript du même fichier :**
```typescript
// isValid getter — AVANT
return this.effectiveAmount >= 15 && phoneDigits.length >= 8;
// APRÈS
return this.effectiveAmount >= 100 && phoneDigits.length >= 8;
```

```typescript
// submit() — AVANT
if (this.effectiveAmount < 15) { this.error.set('Montant minimum : 15 XAF.'); return; }
// APRÈS
if (this.effectiveAmount < 100) { this.error.set('Montant minimum : 100 XAF.'); return; }
```

**Vérification (Fix 2 complet) :** `cd AlertProche && ng build --configuration=production` — compilation sans erreur Angular.

---

## Fix 3 — Asymétrie Modérateur : `canResolve` couvre déjà unresolve

**Analyse :** En lisant `post-detail.component.ts`, le computed `canResolve` est utilisé comme garde pour **les deux** boutons (résoudre ET réouvrir) dans le template HTML. Le HTML affiche l'un ou l'autre selon `post()!.isResolved` dans le même `*ngIf="canResolve()"`. La logique est donc symétrique — Admin/Moderateur peuvent faire les deux.

**Aucune modification nécessaire** pour le Fix 3 dans `post-detail.component.ts`. Le code est déjà correct.

Vérifier de même dans `dashboard.component.ts` : la méthode `canMarkResolved` est utilisée pour contrôler l'affichage des boutons résoudre/réouvrir. Elle retourne `true` pour Admin/Moderateur dans tous les cas. **Pas de modification nécessaire ici non plus.**

---

## Fix 4 — Afficher `resolvedBy` dans l'UI post-detail

**Fichier :** `AlertProche/src/app/features/post-detail/post-detail.component.html`

Après la ligne :
```html
<app-alert-status-badge [post]="post()!" [showDate]="true"></app-alert-status-badge>
```

Ajouter :
```html
<span class="resolved-by-label" *ngIf="post()!.isResolved && post()!.resolvedBy">
  <i class="fas fa-user-check"></i> Résolu par {{ post()!.resolvedBy }}
</span>
```

Ce span s'affiche uniquement quand `isResolved === true` ET `resolvedBy` est renseigné.

**Vérification :** `cd AlertProche && ng build --configuration=production`.

---

## Fix 5 — Erreurs HTTP silencieuses dans dashboard et moderation

### 5a. `dashboard.component.ts`

**Fichier :** `AlertProche/src/app/features/dashboard/dashboard.component.ts`

Les méthodes `resolvePost` et `unresolvePost` ont des blocs `error: () => {}` vides. Les remplacer :

```typescript
// resolvePost — AVANT
  resolvePost(post: Post): void {
    this.postService.resolvePost(post._id).subscribe({
      next: (updated) => {
        this.myPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
      },
      error: () => {}
    });
  }

// APRÈS
  resolvePost(post: Post): void {
    this.postService.resolvePost(post._id).subscribe({
      next: (updated) => {
        this.myPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
      },
      error: (err) => {
        this.editError.set(err?.error?.message || 'Erreur lors de la résolution de la publication.');
        setTimeout(() => this.editError.set(''), 5000);
      }
    });
  }
```

```typescript
// unresolvePost — AVANT
  unresolvePost(post: Post): void {
    this.postService.unresolvePost(post._id).subscribe({
      next: (updated) => {
        this.myPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
      },
      error: () => {}
    });
  }

// APRÈS
  unresolvePost(post: Post): void {
    this.postService.unresolvePost(post._id).subscribe({
      next: (updated) => {
        this.myPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
      },
      error: (err) => {
        this.editError.set(err?.error?.message || 'Erreur lors de la réouverture de la publication.');
        setTimeout(() => this.editError.set(''), 5000);
      }
    });
  }
```

Note : `editError` est un `signal<string>('')` déjà déclaré dans le composant et affiché dans le template. Il est réutilisé ici plutôt que d'ajouter un nouveau signal pour éviter de modifier le template.

---

### 5b. `moderation.component.ts`

**Fichier :** `AlertProche/src/app/features/moderation/moderation.component.ts`

Le composant n'a pas de signal d'erreur dédié. En ajouter un et l'afficher dans le template.

**Dans la classe**, après `loading = signal(true);` ajouter :
```typescript
  actionError = signal('');
  actionSuccess = signal('');
```

**Dans `resolvePost()`** :
```typescript
// AVANT
  resolvePost(post: Post): void {
    this.postService.resolvePost(post._id).subscribe({
      next: (updated) => { /* ... */ },
      error: () => {}
    });
  }

// APRÈS
  resolvePost(post: Post): void {
    this.postService.resolvePost(post._id).subscribe({
      next: (updated) => {
        this.allPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
        this.reportedPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
        this.disabledPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
        this.actionSuccess.set('Alerte marquée résolue.');
        setTimeout(() => this.actionSuccess.set(''), 3000);
      },
      error: (err) => {
        this.actionError.set(err?.error?.message || 'Erreur lors de la résolution.');
        setTimeout(() => this.actionError.set(''), 5000);
      }
    });
  }
```

**Dans `unresolvePost()`** :
```typescript
// AVANT
  unresolvePost(post: Post): void {
    this.postService.unresolvePost(post._id).subscribe({
      next: (updated) => { /* ... */ },
      error: () => {}
    });
  }

// APRÈS
  unresolvePost(post: Post): void {
    this.postService.unresolvePost(post._id).subscribe({
      next: (updated) => {
        this.allPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
        this.reportedPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
        this.disabledPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
        this.actionSuccess.set('Alerte réouverte.');
        setTimeout(() => this.actionSuccess.set(''), 3000);
      },
      error: (err) => {
        this.actionError.set(err?.error?.message || 'Erreur lors de la réouverture.');
        setTimeout(() => this.actionError.set(''), 5000);
      }
    });
  }
```

**Dans `moderation.component.html`**, ajouter les banners de feedback **en haut de la page** (après le sélecteur d'onglets, avant la liste des posts) :
```html
<div class="alert-banner success animate-fade-in" *ngIf="actionSuccess()">
  <i class="fas fa-circle-check"></i> {{ actionSuccess() }}
</div>
<div class="alert-banner error animate-fade-in" *ngIf="actionError()">
  <i class="fas fa-circle-exclamation"></i> {{ actionError() }}
</div>
```

**Vérification :** `cd AlertProche && ng build --configuration=production`.

---

## Fix 6 — Double binding `ngModel` dans admin.component.html

**Fichier :** `AlertProche/src/app/features/admin/admin.component.html`

Localiser le champ de recherche utilisateurs (ligne ~330 d'après l'audit, confirmé à la lecture) :

```html
<!-- AVANT -->
<input type="text" class="form-control search-input"
  placeholder="Rechercher par pseudo ou email..."
  [(ngModel)]="userSearch"
  [ngModel]="userSearch()"
  (ngModelChange)="userSearch.set($event); onSearchChange()">

<!-- APRÈS -->
<input type="text" class="form-control search-input"
  placeholder="Rechercher par pseudo ou email..."
  [ngModel]="userSearch()"
  (ngModelChange)="userSearch.set($event); onSearchChange()">
```

Supprimer uniquement `[(ngModel)]="userSearch"`, garder `[ngModel]="userSearch()"` et `(ngModelChange)`.

**Vérification :** `cd AlertProche && ng build --configuration=production` — Angular ne doit plus logger d'avertissement sur le double binding.

---

## Fix 7 — Validateur `max` manquant dans `payoutForm`

**Fichier :** `AlertProche/src/app/features/dashboard/dashboard.component.ts`

Modifier la méthode `selectCagnotte()` :

```typescript
// AVANT
  selectCagnotte(c: Cagnotte): void {
    this.selectedCagnotte.set(c);
    this.payoutForm.patchValue({ amount: '' });
    this.payoutSuccess.set('');
    this.payoutError.set('');
  }

// APRÈS
  selectCagnotte(c: Cagnotte): void {
    this.selectedCagnotte.set(c);
    this.payoutForm.patchValue({ amount: '' });
    this.payoutSuccess.set('');
    this.payoutError.set('');
    // Mettre à jour le validateur max dynamiquement avec le solde disponible
    this.payoutForm.get('amount')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(c.availableAmount),
    ]);
    this.payoutForm.get('amount')?.updateValueAndValidity();
  }
```

`Validators` est déjà importé dans le fichier.

**Vérification :** `cd AlertProche && ng build --configuration=production`.

---

## Fix 8 — Incohérence validation `executePlatformPayout`

**Fichier :** `AlertProche/src/app/features/admin/admin.component.ts`

Modifier `executePlatformPayout()` :

```typescript
// AVANT
  async executePlatformPayout(): Promise<void> {
    if (!this.platformPayoutAmount || this.platformPayoutAmount < 1) {
      alert('Montant invalide (minimum 1 XAF).');
      return;
    }

// APRÈS
  async executePlatformPayout(): Promise<void> {
    if (!this.platformPayoutAmount || this.platformPayoutAmount < 100) {
      alert('Montant invalide (minimum 100 XAF).');
      return;
    }
```

**Vérification :** `cd AlertProche && ng build --configuration=production`.

---

## Ordre d'exécution résumé

| # | Fichier(s) modifié(s) | Nature | Commande de vérification |
|---|---|---|---|
| 1a | `alertproche-api/src/schemas/post.schema.ts` | Ajout champs `isResolved`, `resolvedAt`, `resolvedBy` | `cd alertproche-api && npm run build` |
| 1b | `alertproche-api/src/posts/posts.service.ts` | Ajout méthodes + champs dans `enrichPost` | `cd alertproche-api && npm run build` |
| 1c | `alertproche-api/src/posts/posts.controller.ts` | Ajout routes PATCH resolve/unresolve | `cd alertproche-api && npm run build` |
| 2a | `alertproche-api/src/payments/payment.controller.ts` | 15 → 100 dans 2 méthodes | `cd alertproche-api && npm run build` |
| 2b | `AlertProche/src/app/shared/components/donation-modal/donation-modal.component.ts` | 15 → 100 | `cd AlertProche && ng build` |
| 2c | `AlertProche/src/app/shared/components/donation-modal/donation-modal.component.html` | Placeholder 15 → 100 | idem |
| 2d | `AlertProche/src/app/shared/components/platform-support-modal/platform-support-modal.component.ts` | 15 → 100 (template inline + TS) | idem |
| 3 | — | Aucune modification nécessaire | — |
| 4 | `AlertProche/src/app/features/post-detail/post-detail.component.html` | Afficher `resolvedBy` | `cd AlertProche && ng build` |
| 5a | `AlertProche/src/app/features/dashboard/dashboard.component.ts` | Erreurs visibles sur resolve/unresolve | idem |
| 5b | `AlertProche/src/app/features/moderation/moderation.component.ts` + `.html` | Signaux + banners d'erreur | idem |
| 6 | `AlertProche/src/app/features/admin/admin.component.html` | Supprimer `[(ngModel)]="userSearch"` | idem |
| 7 | `AlertProche/src/app/features/dashboard/dashboard.component.ts` | `Validators.max()` dynamique | idem |
| 8 | `AlertProche/src/app/features/admin/admin.component.ts` | `< 1` → `< 100` dans `executePlatformPayout` | idem |

---

## Notes importantes

- **Fix 1 est bloquant** : sans les endpoints backend, tous les appels `resolvePost`/`unresolvePost` du frontend retournent 404. Appliquer Fix 1 en premier.
- **Fix 3 n'est pas nécessaire** : après lecture du code, `canResolve` et le HTML de `post-detail` gèrent déjà les deux boutons (résoudre/réouvrir) avec le même computed.
- **enrichPost côté backend** : ne retourne actuellement pas `isResolved`, `resolvedAt`, `resolvedBy`. Sans le patch de `enrichPost` dans Fix 1b, le frontend recevrait `undefined` pour ces champs même après l'ajout au schéma.
- **`resolvedBy`** est stocké comme `string` (pseudo de l'utilisateur) car c'est ce qui est affiché dans l'UI. L'`ObjectId` de l'utilisateur n'est pas nécessaire pour l'affichage.
- **Minimum paiement** : le backend `requestPayout` garde `parsedAmount < 1` intentionnellement — le montant du retrait est libre (pas un minimum de 100 XAF). Seuls les dons ont un minimum de 100 XAF.
