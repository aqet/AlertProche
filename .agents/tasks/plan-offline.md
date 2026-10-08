# Implementation Plan — Mode Hors-Ligne AlertProche

## Contexte exploré

- Angular 18.2 standalone components, signals, `*ngIf` / `@if` both acceptable (codebase uses `*ngIf`)
- PostService.createPost() returns `Observable<Post>` — wrap with `firstValueFrom()` from rxjs (already imported in post.service.ts)
- PostCardComponent : no inject() yet, uses CommonModule, RouterLink
- HomeComponent : `posts = signal<Post[]>()`, `filteredPosts = computed(...)`, constructor injection pattern
- AppComponent : inline template, inject() pattern, no ngOnInit yet
- NavbarComponent : template file (navbar.component.html), bottom-nav has a "Publier" link (`/posts/new`) — good badge injection point
- PermissionBannerComponent is the pattern to follow for NetworkBannerComponent (standalone, inject service, template + styles inline)
- Shared components live under `src/app/shared/components/<name>/`
- CSS variables used: `--color-bg-secondary`, `--color-border`, `--color-accent`, `--color-text-primary`, `--bg-card`, `--border`, etc.
- No test framework configured (ng test uses Karma/Jasmine but no test files present) — verification is build-only

---

- [ ] 1. Créer `OfflineService` avec interface `PendingPost`, signaux reactifs et logique localStorage.

  Créer le fichier `src/app/core/services/offline.service.ts` avec :
  - Interface exportée `PendingPost` : `{ tempId: string; title: string; content: string; location: string; type: PostType; isAnonymous?: boolean; createdAt: string }`
  - `private _pendingPosts = signal<PendingPost[]>(this.getPendingPosts())` — signal interne pour la réactivité
  - `online = signal(navigator.onLine)` — mis à jour via window events `'online'`/`'offline'` enregistrés dans le constructeur avec `window.addEventListener`
  - `pendingCount = computed(() => this._pendingPosts().length)`
  - `savePostOffline(post: Post): void` — lit `localStorage.getItem('offline_saved_posts')`, parse, pousse si `_id` absent, stringify et ré-écrit
  - `getSavedPosts(): Post[]` — parse `'offline_saved_posts'` ou retourne `[]`
  - `removeSavedPost(postId: string): void` — filtre et ré-écrit
  - `isPostSaved(postId: string): boolean` — vérifie dans `getSavedPosts()`
  - `queuePost(postData: Omit<PendingPost, 'tempId'>): void` — génère `tempId = 'offline_' + Date.now()`, pousse dans `'offline_pending_posts'`, met à jour `_pendingPosts`
  - `getPendingPosts(): PendingPost[]` — parse `'offline_pending_posts'` ou retourne `[]`
  - `removePendingPost(tempId: string): void` — filtre, ré-écrit, met à jour `_pendingPosts`
  - `syncPendingPosts(): Promise<void>` — utilise `firstValueFrom()` (import depuis rxjs) + inject `PostService` via `inject(PostService)`. Pour chaque post en attente, appelle `PostService.createPost({ title, content, location, type, isAnonymous })` (sans image), et si succès appelle `removePendingPost(tempId)`. Catch silencieux par post.
  - ATTENTION : import circulaire possible entre `OfflineService` et `PostService`. Résoudre en utilisant `inject(PostService)` dans la méthode `syncPendingPosts()` en lazy (stocker dans une variable locale) OU injecter dans le constructeur — vérifier au build que pas de cycle.

  **Files:** `src/app/core/services/offline.service.ts`

  **Verify:** `cd "c:\code\New folder (3) - Copy\AlertProche" ; npx ng build --configuration development 2>&1 | Select-Object -Last 20` — compilation sans erreur.

---

- [ ] 2. Modifier `PostCardComponent` pour le bouton bookmark hors-ligne.

  Modifier `src/app/shared/post-card/post-card.component.ts` :
  - Ajouter `import { inject } from '@angular/core'`
  - Ajouter `private offlineService = inject(OfflineService)` (import depuis `../../core/services/offline.service`)
  - Ajouter getter `get isSaved(): boolean { return this.offlineService.isPostSaved(this.post._id); }`
  - Ajouter méthode `toggleSave(event: MouseEvent): void { event.stopPropagation(); if (this.isSaved) { this.offlineService.removeSavedPost(this.post._id); } else { this.offlineService.savePostOffline(this.post); } }`

  Modifier `src/app/shared/post-card/post-card.component.html` :
  - Dans `.card-foot`, après `<app-alert-status-badge>`, ajouter :
    ```html
    <button class="save-offline-btn" (click)="toggleSave($event)"
            [attr.aria-label]="isSaved ? 'Retirer des sauvegardes' : 'Sauvegarder hors-ligne'">
      <i class="fas fa-bookmark" [class.saved]="isSaved"></i>
    </button>
    ```
  - Le `[routerLink]` sur `<article>` fait déjà propagation — `stopPropagation()` est essentiel pour éviter la navigation au clic bookmark.

  Modifier `src/app/shared/post-card/post-card.component.css` :
  - Ajouter en fin de fichier :
    ```css
    .save-offline-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      color: var(--color-text-muted, #9ca3af);
      font-size: 1rem;
      transition: color 0.2s ease;
      border-radius: 4px;
    }
    .save-offline-btn:hover { color: var(--color-accent); }
    .save-offline-btn .fa-bookmark.saved { color: var(--color-accent); }
    ```

  **Files:** `src/app/shared/post-card/post-card.component.ts`, `post-card.component.html`, `post-card.component.css`

  **Verify:** `cd "c:\code\New folder (3) - Copy\AlertProche" ; npx ng build --configuration development 2>&1 | Select-Object -Last 20` — compilation sans erreur.

---

- [ ] 3. Modifier `HomeComponent` pour le mode hors-ligne (bandeau + filteredPosts offline-aware).

  Modifier `src/app/features/home/home.component.ts` :
  - Ajouter `import { OfflineService } from '../../core/services/offline.service'`
  - Injecter dans le constructeur : `private offlineService: OfflineService` (ou via `inject()` — préférer le pattern constructeur déjà présent dans ce composant)
  - Ajouter `isOffline = computed(() => !this.offlineService.online())`
  - Modifier `ngOnInit` : entourer l'appel API avec `if (!this.offlineService.online()) { this.posts.set(this.offlineService.getSavedPosts()); this.loading.set(false); return; }` avant l'appel `postService.getAllPosts()`
  - Modifier le `computed filteredPosts` : au début du bloc, ajouter `if (this.isOffline()) { return this.offlineService.getSavedPosts(); }` avant le filtrage existant — ainsi toute la logique de filtre s'applique uniquement si online.

  Modifier `src/app/features/home/home.component.html` :
  - Juste après `<div class="home-wrap">` (première ligne du template), ajouter :
    ```html
    <div class="offline-banner" *ngIf="isOffline()">
      <i class="fas fa-wifi-slash"></i>
      Mode hors-ligne — vous consultez vos posts sauvegardés
    </div>
    ```
  - Ajouter le style dans `home.component.css` OU inline dans le composant. Puisque le composant utilise un styleUrls externe, ajouter dans `home.component.css` :
    ```css
    .offline-banner {
      background: #fef3c7;
      color: #92400e;
      text-align: center;
      padding: 10px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    ```

  **Files:** `src/app/features/home/home.component.ts`, `home.component.html`, `home.component.css`

  **Verify:** `cd "c:\code\New folder (3) - Copy\AlertProche" ; npx ng build --configuration development 2>&1 | Select-Object -Last 20` — compilation sans erreur.

---

- [ ] 4. Modifier `PostFormComponent` pour la queue hors-ligne dans `onSubmit()`.

  Modifier `src/app/features/post-form/post-form.component.ts` :
  - Ajouter `import { OfflineService } from '../../core/services/offline.service'`
  - Injecter dans le constructeur : `private offlineService: OfflineService` (suivre le pattern constructeur existant — `fb`, `postService`, `router`, `tracking`, `audioRecorder`)
  - Dans `onSubmit()`, juste après le guard `if (this.form.invalid)`, ajouter le bloc offline AVANT `this.loading.set(true)` :
    ```typescript
    if (!this.offlineService.online()) {
      const v = this.form.value;
      this.offlineService.queuePost({
        title: v.title,
        content: v.content,
        location: v.location,
        type: v.type,
        isAnonymous: v.isAnonymous ?? false,
        createdAt: new Date().toISOString(),
      });
      this.success.set(true);
      this.error.set('');
      // Message informatif — réutiliser le signal success existant
      // Le template post-form affiche déjà un bloc success, ajouter un message spécifique
      setTimeout(() => this.router.navigate(['/']), 2500);
      return;
    }
    ```
  - Ne rien changer d'autre dans la méthode.
  - NOTE : le template post-form.component.html affiche déjà un bloc `success` — vérifier que ce bloc est visible (lire le template). Si le message success est générique, il suffit. Sinon ajouter un signal `offlineQueued = signal(false)` et un message dédié dans le template.

  Avant de coder l'item 4 : lire `src/app/features/post-form/post-form.component.html` pour voir le rendu du bloc success et adapter si nécessaire (ajouter signal `offlineQueued` si le message "Post mis en attente" doit être distinct du message "Post publié").

  **Files:** `src/app/features/post-form/post-form.component.ts`

  **Verify:** `cd "c:\code\New folder (3) - Copy\AlertProche" ; npx ng build --configuration development 2>&1 | Select-Object -Last 20` — compilation sans erreur.

---

- [ ] 5. Créer `NetworkBannerComponent` (standalone).

  Créer `src/app/shared/components/network-banner/network-banner.component.ts` :
  - Pattern : copier la structure de `PermissionBannerComponent` (standalone, inject, template + styles inline)
  - Imports : `CommonModule` (pour `*ngIf`), `inject`, `signal`, `effect` depuis `@angular/core`
  - Inject `OfflineService`
  - `showReconnected = signal(false)` — passe à `true` pendant 3s au retour connexion
  - Dans le constructeur, utiliser `effect(() => { const online = this.offlineService.online(); if (online) { this.showReconnected.set(true); setTimeout(() => this.showReconnected.set(false), 3000); } })` — NOTE : l'effet se déclenche aussi au démarrage si déjà en ligne, donc ajouter une garde `private _firstRun = true` pour ignorer le premier appel de l'effect.
  - Template inline :
    ```html
    <div class="net-banner net-offline" *ngIf="!offlineService.online()">
      <i class="fas fa-wifi-slash"></i> Vous êtes hors-ligne
    </div>
    <div class="net-banner net-reconnected" *ngIf="showReconnected()">
      <i class="fas fa-wifi"></i> Connexion rétablie
    </div>
    ```
  - Styles inline :
    ```css
    .net-banner {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      text-align: center; padding: 8px 16px;
      font-size: 0.82rem; font-weight: 600;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .net-offline { background: #dc2626; color: #fff; }
    .net-reconnected { background: #16a34a; color: #fff; }
    ```
  - Exposer `offlineService` comme `protected` pour que le template y accède directement.

  **Files:** `src/app/shared/components/network-banner/network-banner.component.ts`

  **Verify:** `cd "c:\code\New folder (3) - Copy\AlertProche" ; npx ng build --configuration development 2>&1 | Select-Object -Last 20` — compilation sans erreur.

---

- [ ] 6. Intégrer `NetworkBannerComponent` dans `AppComponent` + sync auto au retour connexion.

  Modifier `src/app/app.component.ts` :
  - Ajouter imports : `NetworkBannerComponent` depuis `'./shared/components/network-banner/network-banner.component'`, `OfflineService` depuis `'./core/services/offline.service'`
  - Ajouter `NetworkBannerComponent` dans le tableau `imports` du décorateur
  - Ajouter `private offlineService = inject(OfflineService)` dans la classe
  - Dans `ngOnInit()`, ajouter APRÈS les appels existants :
    ```typescript
    window.addEventListener('online', () => {
      this.offlineService.syncPendingPosts();
    });
    ```
  - Dans le template inline, ajouter `<app-network-banner></app-network-banner>` juste après `<app-navbar></app-navbar>` (première ligne du template).

  **Files:** `src/app/app.component.ts`

  **Verify:** `cd "c:\code\New folder (3) - Copy\AlertProche" ; npx ng build --configuration development 2>&1 | Select-Object -Last 20` — compilation sans erreur.

---

- [ ] 7. Ajouter le badge "posts en attente" dans `NavbarComponent`.

  Modifier `src/app/shared/navbar/navbar.component.ts` :
  - Ajouter `import { OfflineService } from '../../core/services/offline.service'`
  - Injecter dans le constructeur : `public offlineService: OfflineService` (pattern constructeur existant)

  Modifier `src/app/shared/navbar/navbar.component.html` :
  - Sur le lien desktop `<a routerLink="/posts/new" class="btn-publish">`, ajouter après l'icône `<i class="fas fa-plus"></i>` :
    ```html
    <span class="pending-badge" *ngIf="offlineService.pendingCount() > 0">
      {{ offlineService.pendingCount() }}
    </span>
    ```
  - Sur le lien mobile dans `.mobile-menu` `<a routerLink="/posts/new" ... class="m-link">`, ajouter le même badge.
  - Sur le bouton bottom-nav `.bn-publish`, ajouter aussi le badge.

  Modifier `src/app/shared/navbar/navbar.component.css` :
  - Ajouter en fin de fichier :
    ```css
    .pending-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #dc2626;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      border-radius: 999px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      margin-left: 4px;
      vertical-align: middle;
    }
    ```

  **Files:** `src/app/shared/navbar/navbar.component.ts`, `navbar.component.html`, `navbar.component.css`

  **Verify:** `cd "c:\code\New folder (3) - Copy\AlertProche" ; npx ng build --configuration development 2>&1 | Select-Object -Last 20` — compilation sans erreur.

---

- [ ] 8. Build final de validation + commit.

  Lancer le build complet de développement pour confirmer zéro erreur :
  ```
  cd "c:\code\New folder (3) - Copy\AlertProche"
  npx ng build --configuration development 2>&1 | Select-Object -Last 30
  ```
  Si des erreurs apparaissent, les corriger (types manquants, imports circulaires, propriétés introuvables) avant de committer.

  Commit :
  ```
  cd "c:\code\New folder (3) - Copy\AlertProche"
  git add -A
  git commit -m "feat(offline): save posts for offline reading, queue posts when offline, network status banner"
  ```

  **Files:** aucun nouveau fichier, vérification globale.

  **Verify:** `git log --oneline -1` — le commit apparaît avec le message attendu.

---

## Notes pour l'implémenteur

### Import circulaire OfflineService ↔ PostService
`OfflineService.syncPendingPosts()` a besoin de `PostService.createPost()`. `PostService` n'a pas besoin de `OfflineService`. Il n'y a donc pas de cycle. Injecter normalement via le constructeur ou `inject()`.

### Lecture préalable obligatoire à l'item 4
Avant de coder l'item 4, lire `post-form.component.html` pour localiser le bloc de rendu success/error. Si le bloc success dit "Post publié avec succès", ajouter un signal `offlineQueued = signal(false)` dans le composant, le passer à `true` dans le chemin offline, et ajouter un `*ngIf="offlineQueued()"` dans le template avec le message "Post mis en attente".

### Angular 18 : `*ngIf` vs `@if`
Le projet utilise `*ngIf` dans tous les templates existants et importe `CommonModule`. Continuer avec `*ngIf` pour cohérence. Ne pas mélanger les deux syntaxes dans un même composant.

### OfflineService : effet de bord au premier `effect()`
Dans `NetworkBannerComponent`, l'`effect()` sur `offlineService.online()` se déclenche immédiatement. Utiliser un flag `private _initialized = false` : à la première exécution, setter `_initialized = true` et retourner sans afficher le bandeau vert. À partir du second déclenchement (vrai changement), appliquer la logique `showReconnected`.
