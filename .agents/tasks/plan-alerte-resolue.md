# Plan d'implémentation - Marquage « Alerte Résolue »

## Contexte et décisions d'architecture

**Backend** : vrai backend REST (NestJS présumé) sur `environment.apiUrl`. Toutes les mutations passent par HTTP (`post.service.ts`). Pas de mock/json-server utilisé en production.

**Pattern composants** : standalone components avec `@Component({ standalone: true, imports: [...] })`. Aucun NgModule. Lazy-loading via `loadComponent` dans `app.routes.ts`.

**State management** : Angular Signals. Tous les signals locaux sont dans le composant. Pas de store global.

**Décision - nouveau champ statut** : On étend le modèle `Post` avec `isResolved: boolean`, `resolvedAt: string | null` et `resolvedBy: string | null` (id utilisateur). On n'utilise pas un enum `status` pour ne pas casser les guards existants qui vérifient `isActive`. Les deux champs coexistent indépendamment.

**Décision - nouveau endpoint** : `PATCH /posts/:id/resolve` et `PATCH /posts/:id/unresolve`. La séparation des endpoints rend l'autorisation backend plus lisible (l'auteur ou un modérateur peut PATCH `/resolve`, seul l'auteur ou un admin peut PATCH `/unresolve`).

**Décision - AlertStatusBadgeComponent** : composant standalone partagé dans `src/app/shared/components/alert-status-badge/`. Il reçoit `@Input() post: Post` et s'affiche en badge coloré. Réutilisé dans `post-card`, `post-detail`, `dashboard`, `moderation`.

**Décision - filtre « Afficher les résolues »** : toggle dans `home.component` uniquement. Par défaut les alertes résolues sont masquées (comportement le plus pertinent - la liste d'accueil doit afficher les cas actifs en priorité). Le toggle est un `signal<boolean>(false)`.

---

## Fichiers impliqués

| Fichier | Action |
|---|---|
| `src/app/core/models/post.model.ts` | Modifier - ajouter 3 champs au modèle |
| `src/app/core/services/post.service.ts` | Modifier - ajouter 2 méthodes HTTP |
| `src/app/shared/components/alert-status-badge/alert-status-badge.component.ts` | Créer |
| `src/app/shared/components/alert-status-badge/alert-status-badge.component.html` | Créer |
| `src/app/shared/components/alert-status-badge/alert-status-badge.component.css` | Créer |
| `src/app/shared/post-card/post-card.component.ts` | Modifier - importer le badge |
| `src/app/shared/post-card/post-card.component.html` | Modifier - afficher le badge |
| `src/app/shared/post-card/post-card.component.css` | Modifier - style badge résolu sur la card |
| `src/app/features/post-detail/post-detail.component.ts` | Modifier - logique résolution/réouverture |
| `src/app/features/post-detail/post-detail.component.html` | Modifier - bouton + badge |
| `src/app/features/post-detail/post-detail.component.css` | Modifier - styles resolve |
| `src/app/features/home/home.component.ts` | Modifier - toggle filtre résolues |
| `src/app/features/home/home.component.html` | Modifier - afficher le toggle |
| `src/app/features/home/home.component.css` | Modifier - style du toggle |
| `src/app/features/dashboard/dashboard.component.ts` | Modifier - action résoudre/réouvrir dans "Mes Publications" |
| `src/app/features/dashboard/dashboard.component.html` | Modifier - bouton + badge dans la liste |
| `src/app/features/moderation/moderation.component.ts` | Modifier - action résoudre dans les deux onglets |
| `src/app/features/moderation/moderation.component.html` | Modifier - bouton + badge dans les listes |

---

## Plan pas à pas

---

- [ ] 1. Étendre le modèle `Post` avec les champs de résolution.

  Ajouter à l'interface `Post` dans `post.model.ts` les trois champs optionnels ci-dessous. Tous sont optionnels (`?`) pour rester rétrocompatibles avec les données existantes qui n'ont pas ces champs.

  ```typescript
  // Dans l'interface Post, après isActive?:
  isResolved?: boolean;         // true = alerte marquée résolue
  resolvedAt?: string | null;   // ISO date string de résolution
  resolvedBy?: string | null;   // _id de l'utilisateur qui a résolu
  ```

  **Fichiers** : `src/app/core/models/post.model.ts`

  **Vérification** : `cd "c:\code\New folder (3) - Copy\AlertProche" && npx ng build --configuration development 2>&1 | Select-String -Pattern "error TS"` - aucune erreur TypeScript.

---

- [ ] 2. Ajouter les méthodes `resolvePost` et `unresolvePost` au service.

  Dans `post.service.ts`, ajouter deux méthodes HTTP après `deletePost`. Ces méthodes appellent respectivement `PATCH /posts/:id/resolve` et `PATCH /posts/:id/unresolve`. Elles retournent `Observable<Post>` (le backend renvoie le post mis à jour avec les nouveaux champs).

  ```typescript
  resolvePost(id: string): Observable<Post> {
    return this.http.patch<Post>(`${this.API}/${id}/resolve`, {});
  }

  unresolvePost(id: string): Observable<Post> {
    return this.http.patch<Post>(`${this.API}/${id}/unresolve`, {});
  }
  ```

  **Fichiers** : `src/app/core/services/post.service.ts`

  **Vérification** : `npx ng build --configuration development 2>&1 | Select-String -Pattern "error TS"` - aucune erreur.

---

- [ ] 3. Créer le composant standalone `AlertStatusBadgeComponent`.

  Créer le dossier et les trois fichiers `alert-status-badge.component.{ts,html,css}` dans `src/app/shared/components/alert-status-badge/`.

  **alert-status-badge.component.ts** :
  ```typescript
  import { Component, Input } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { Post } from '../../../core/models/post.model';

  @Component({
    selector: 'app-alert-status-badge',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './alert-status-badge.component.html',
    styleUrls: ['./alert-status-badge.component.css']
  })
  export class AlertStatusBadgeComponent {
    @Input() post!: Post;
    @Input() showDate: boolean = false; // affiche la date de résolution si true

    get isResolved(): boolean {
      return this.post?.isResolved === true;
    }

    getResolvedDate(): string {
      if (!this.post?.resolvedAt) return '';
      return new Date(this.post.resolvedAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
    }
  }
  ```

  **alert-status-badge.component.html** :
  ```html
  <span class="status-badge" [class.status-resolved]="isResolved" [class.status-active]="!isResolved">
    <i class="fas" [class.fa-circle-check]="isResolved" [class.fa-circle-dot]="!isResolved"></i>
    {{ isResolved ? 'Résolue' : 'En cours' }}
    <span *ngIf="showDate && isResolved && post.resolvedAt" class="resolved-date">
      - {{ getResolvedDate() }}
    </span>
  </span>
  ```

  **alert-status-badge.component.css** (utiliser les CSS variables de `styles.css`) :
  ```css
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border: 1.5px solid transparent;
    white-space: nowrap;
  }

  /* En cours - orange, cohérent avec badge-abus existant */
  .status-active {
    background: #FFF3E0;
    color: #E65100;
    border-color: #FFE0B2;
  }

  /* Résolue - vert, cohérent avec le vert principal du design system */
  .status-resolved {
    background: var(--green-pale);
    color: var(--green-dark);
    border-color: var(--green-border);
  }

  .resolved-date {
    font-weight: 500;
    text-transform: none;
    font-size: 0.65rem;
    letter-spacing: 0;
  }
  ```

  **Fichiers créés** :
  - `src/app/shared/components/alert-status-badge/alert-status-badge.component.ts`
  - `src/app/shared/components/alert-status-badge/alert-status-badge.component.html`
  - `src/app/shared/components/alert-status-badge/alert-status-badge.component.css`

  **Vérification** : `npx ng build --configuration development 2>&1 | Select-String -Pattern "error TS"` - aucune erreur.

---

- [ ] 4. Intégrer le badge dans `PostCardComponent`.

  **post-card.component.ts** : ajouter `AlertStatusBadgeComponent` au tableau `imports`.

  **post-card.component.html** : dans `.card-foot`, après `.card-meta-row`, ajouter le badge juste avant le badge de commentaires :
  ```html
  <!-- Badge statut alerte (résolu / en cours) -->
  <app-alert-status-badge [post]="post"></app-alert-status-badge>
  ```

  **post-card.component.css** : ajouter un style pour griser visuellement les cartes résolues (sans les masquer - le filtre est géré par le composant parent) :
  ```css
  /* Carte résolue : légèrement atténuée */
  .post-card.card-resolved {
    opacity: 0.82;
  }
  .post-card.card-resolved:hover {
    opacity: 1;
  }
  ```

  Appliquer la classe sur `<article>` dans le HTML :
  ```html
  <article class="post-card" [class.card-resolved]="post.isResolved" [routerLink]="['/posts', post._id]">
  ```

  **Fichiers** :
  - `src/app/shared/post-card/post-card.component.ts`
  - `src/app/shared/post-card/post-card.component.html`
  - `src/app/shared/post-card/post-card.component.css`

  **Vérification** : `npx ng build --configuration development 2>&1 | Select-String -Pattern "error TS"` - aucune erreur.

---

- [ ] 5. Ajouter le badge et les boutons dans `PostDetailComponent`.

  **post-detail.component.ts** :

  1. Importer `AlertStatusBadgeComponent` et l'ajouter au tableau `imports`.
  2. Injecter `PostService` (déjà présent).
  3. Ajouter les signals et méthodes de résolution :
     ```typescript
     resolveLoading = signal(false);

     canResolve = computed(() => {
       const user = this.currentUser();
       const p = this.post();
       if (!user || !p) return false;
       return (
         user._id === p.author_id ||
         user.role === 'Admin' ||
         user.role === 'Moderateur'
       );
     });

     markResolved(): void {
       const p = this.post();
       if (!p) return;
       this.resolveLoading.set(true);
       this.postService.resolvePost(p._id).subscribe({
         next: (updated) => {
           this.post.set(updated);
           this.resolveLoading.set(false);
         },
         error: () => this.resolveLoading.set(false),
       });
     }

     markUnresolved(): void {
       const p = this.post();
       if (!p) return;
       this.resolveLoading.set(true);
       this.postService.unresolvePost(p._id).subscribe({
         next: (updated) => {
           this.post.set(updated);
           this.resolveLoading.set(false);
         },
         error: () => this.resolveLoading.set(false),
       });
     }
     ```

  **post-detail.component.html** : ajouter dans `.detail-meta` (après le badge type existant), **et** dans la sidebar (dans la `.info-list` après "Publié") :

  Dans `.detail-meta` (après `<span class="badge" [ngClass]="getBadgeClass()">`) :
  ```html
  <!-- Badge statut résolution -->
  <app-alert-status-badge [post]="post()!" [showDate]="true"></app-alert-status-badge>
  ```

  Dans la sidebar `.info-list` (après la ligne "Auteur") :
  ```html
  <div class="info-row" *ngIf="post()!.isResolved && post()!.resolvedAt">
    <span class="info-key">Résolue le</span>
    <span class="info-val resolved-date-val">{{ post()!.resolvedAt | date:'dd/MM/yyyy' }}</span>
  </div>
  ```

  Boutons de résolution - ajouter dans `.topbar-actions` (après le bouton "Signaler") :
  ```html
  <!-- Bouton résolution - visible uniquement si l'utilisateur peut résoudre -->
  <ng-container *ngIf="canResolve()">
    <!-- Marquer comme résolue -->
    <button *ngIf="!post()!.isResolved"
      class="btn btn-success-resolve btn-sm"
      (click)="markResolved()"
      [disabled]="resolveLoading()">
      <span class="spinner" *ngIf="resolveLoading()"></span>
      <span *ngIf="!resolveLoading()">
        <i class="fas fa-circle-check"></i> Marquer résolue
      </span>
    </button>
    <!-- Réouvrir -->
    <button *ngIf="post()!.isResolved"
      class="btn btn-reopen btn-sm"
      (click)="markUnresolved()"
      [disabled]="resolveLoading()">
      <span class="spinner" *ngIf="resolveLoading()"></span>
      <span *ngIf="!resolveLoading()">
        <i class="fas fa-rotate-left"></i> Réouvrir
      </span>
    </button>
  </ng-container>
  ```

  **post-detail.component.css** : ajouter les classes des nouveaux boutons et la couleur de la date résolue :
  ```css
  /* Bouton "Marquer résolue" */
  .btn-success-resolve {
    background: var(--green-dim);
    color: var(--green-dark);
    border: 1.5px solid var(--green-border);
  }
  .btn-success-resolve:hover {
    background: var(--green-pale);
    border-color: var(--green);
  }

  /* Bouton "Réouvrir" */
  .btn-reopen {
    background: rgba(245,124,0,0.08);
    color: #E65100;
    border: 1.5px solid rgba(245,124,0,0.30);
  }
  .btn-reopen:hover {
    background: rgba(245,124,0,0.15);
  }

  /* Date résolue dans la sidebar */
  .resolved-date-val {
    color: var(--green);
    font-weight: 600;
  }
  ```

  Ajouter `DatePipe` aux imports Angular de `post-detail.component.ts` pour le pipe `date` utilisé dans le HTML :
  ```typescript
  import { DatePipe } from '@angular/common';
  // Dans imports: [..., DatePipe]
  ```

  **Fichiers** :
  - `src/app/features/post-detail/post-detail.component.ts`
  - `src/app/features/post-detail/post-detail.component.html`
  - `src/app/features/post-detail/post-detail.component.css`

  **Vérification** : `npx ng build --configuration development 2>&1 | Select-String -Pattern "error TS"` - aucune erreur.

---

- [ ] 6. Ajouter le toggle filtre « Afficher les résolues » dans `HomeComponent`.

  **home.component.ts** :
  1. Ajouter `showResolved = signal<boolean>(false);` avec les autres signals de filtre.
  2. Modifier `filteredPosts` computed pour exclure les résolues par défaut :
     ```typescript
     // Ajouter CE FILTRE EN PREMIER dans filteredPosts computed, avant les filtres type/location/search :
     if (!this.showResolved()) {
       result = result.filter(p => !p.isResolved);
     }
     ```
  3. Modifier `clearFilters()` pour reset le toggle : `this.showResolved.set(false);`
  4. Ajouter un computed `resolvedCount` :
     ```typescript
     resolvedCount = computed(() => this.posts().filter(p => p.isResolved).length);
     ```

  **home.component.html** : dans la section `.filter-chips`, ajouter un chip toggle après les chips existants et avant le chip "Effacer" :
  ```html
  <!-- Toggle afficher/masquer les résolues -->
  <button class="chip chip-resolved" [class.chip-active]="showResolved()"
    (click)="showResolved.update(v => !v)" *ngIf="resolvedCount() > 0">
    <i class="fas fa-circle-check"></i>
    Résolues
    <span class="chip-count">{{ resolvedCount() }}</span>
  </button>
  ```

  **home.component.css** : ajouter le style du chip résolu (cohérent avec les autres chips) :
  ```css
  .chip-resolved {
    color: var(--green-dark);
    border-color: var(--green-border);
  }
  .chip-resolved.chip-active {
    background: var(--green-pale);
    color: var(--green-dark);
    border-color: var(--green);
  }
  ```

  **Fichiers** :
  - `src/app/features/home/home.component.ts`
  - `src/app/features/home/home.component.html`
  - `src/app/features/home/home.component.css`

  **Vérification** : `npx ng build --configuration development 2>&1 | Select-String -Pattern "error TS"` - aucune erreur. Vérifier manuellement que le toggle apparaît uniquement s'il y a au moins une alerte résolue.

---

- [ ] 7. Ajouter le badge et les boutons dans `DashboardComponent` (onglet "Mes Publications").

  **dashboard.component.ts** :
  1. Importer `AlertStatusBadgeComponent` dans le tableau `imports`.
  2. Ajouter les méthodes :
     ```typescript
     resolvePost(post: Post): void {
       this.postService.resolvePost(post._id).subscribe({
         next: (updated) => {
           this.myPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
         },
         error: () => {}
       });
     }

     unresolvePost(post: Post): void {
       this.postService.unresolvePost(post._id).subscribe({
         next: (updated) => {
           this.myPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
         },
         error: () => {}
       });
     }
     ```

  **dashboard.component.html** : Dans le bloc de rendu de chaque publication (onglet `posts`, div `.post-row-meta`), ajouter :
  1. Le badge de statut juste après `.post-row-meta` :
     ```html
     <app-alert-status-badge [post]="post"></app-alert-status-badge>
     ```
  2. Dans `.post-row-actions`, après le bouton d'édition (bouton `fa-pen`), ajouter les boutons résolution (réservés à l'auteur - dans le dashboard, toutes les publications appartiennent à l'utilisateur courant, donc le bouton est toujours affiché) :
     ```html
     <!-- Marquer résolue / Réouvrir -->
     <button class="btn btn-sm btn-resolve-sm" *ngIf="!post.isResolved"
       (click)="resolvePost(post)"
       title="Marquer comme résolue">
       <i class="fas fa-circle-check"></i>
     </button>
     <button class="btn btn-sm btn-reopen-sm" *ngIf="post.isResolved"
       (click)="unresolvePost(post)"
       title="Réouvrir cette alerte">
       <i class="fas fa-rotate-left"></i>
     </button>
     ```

  **dashboard.component.css** (si le fichier n'a pas déjà ces classes) : ajouter :
  ```css
  .btn-resolve-sm {
    color: var(--green-dark);
    border-color: var(--green-border);
    background: var(--green-dim);
  }
  .btn-resolve-sm:hover { background: var(--green-pale); }

  .btn-reopen-sm {
    color: #E65100;
    border-color: rgba(245,124,0,0.30);
    background: rgba(245,124,0,0.08);
  }
  .btn-reopen-sm:hover { background: rgba(245,124,0,0.15); }
  ```

  **Fichiers** :
  - `src/app/features/dashboard/dashboard.component.ts`
  - `src/app/features/dashboard/dashboard.component.html`
  - `src/app/features/dashboard/dashboard.component.css`

  **Vérification** : `npx ng build --configuration development 2>&1 | Select-String -Pattern "error TS"` - aucune erreur.

---

- [ ] 8. Ajouter le badge et les boutons dans `ModerationComponent`.

  Les modérateurs et admins doivent pouvoir résoudre depuis l'espace modération - à la fois dans l'onglet "Signalés" et dans l'onglet "Désactivés".

  **moderation.component.ts** :
  1. Importer `AlertStatusBadgeComponent` dans `imports`.
  2. Ajouter les méthodes de résolution :
     ```typescript
     resolvePost(post: Post): void {
       this.postService.resolvePost(post._id).subscribe({
         next: (updated) => {
           this.allPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
           this.reportedPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
           this.disabledPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
         },
         error: () => {}
       });
     }

     unresolvePost(post: Post): void {
       this.postService.unresolvePost(post._id).subscribe({
         next: (updated) => {
           this.allPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
           this.reportedPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
           this.disabledPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
         },
         error: () => {}
       });
     }
     ```

  **moderation.component.html** : Dans chaque `.mod-post-card` (il y en a deux : onglet signalés et onglet désactivés), ajouter :
  1. Le badge statut dans `.mod-post-status`, après les chips existants :
     ```html
     <app-alert-status-badge [post]="post" [showDate]="true"></app-alert-status-badge>
     ```
  2. Dans `.mod-actions-right`, après le bouton "Désactiver/Réactiver", ajouter :
     ```html
     <button class="btn btn-sm btn-mod-resolve" *ngIf="!post.isResolved"
       (click)="resolvePost(post)" title="Marquer comme résolue">
       <i class="fas fa-circle-check"></i> Résoudre
     </button>
     <button class="btn btn-sm btn-mod-reopen" *ngIf="post.isResolved"
       (click)="unresolvePost(post)" title="Réouvrir l'alerte">
       <i class="fas fa-rotate-left"></i> Réouvrir
     </button>
     ```

  **moderation.component.css** : ajouter (en cohérence avec `.btn-mod-enable`, `.btn-mod-disable` déjà présents) :
  ```css
  .btn-mod-resolve {
    background: var(--green-dim);
    color: var(--green-dark);
    border: 1px solid var(--green-border);
  }
  .btn-mod-resolve:hover { background: var(--green-pale); }

  .btn-mod-reopen {
    background: rgba(245,124,0,0.08);
    color: #E65100;
    border: 1px solid rgba(245,124,0,0.28);
  }
  .btn-mod-reopen:hover { background: rgba(245,124,0,0.15); }
  ```

  **Fichiers** :
  - `src/app/features/moderation/moderation.component.ts`
  - `src/app/features/moderation/moderation.component.html`
  - `src/app/features/moderation/moderation.component.css`

  **Vérification** : `npx ng build --configuration development 2>&1 | Select-String -Pattern "error TS"` - aucune erreur.

---

- [ ] 9. Build final et vérification de non-régression.

  Lancer le build de production pour s'assurer qu'aucune régression n'a été introduite :
  ```
  cd "c:\code\New folder (3) - Copy\AlertProche" && npx ng build --configuration production 2>&1
  ```

  Vérifier :
  - Zéro erreur TypeScript (`error TS`)
  - Aucun avertissement de template Angular non résolu
  - Bundle size n'a pas explosé (le badge est un composant léger, pas de dépendance externe)

  **Fichiers** : aucun fichier supplémentaire créé à cette étape.

  **Vérification** : La commande ci-dessus se termine sans erreur.

---

## Précautions pour ne pas casser l'existant

1. **`isResolved` est toujours optionnel** (`?`) dans l'interface `Post`. Tous les `*ngIf` et computed qui lisent `post.isResolved` utilisent `=== true` ou le nullish coalescing pour éviter que `undefined` soit traité comme `true`.

2. **Le filtre home masque les résolues par défaut** : `filteredPosts` filtre `p.isResolved !== true` quand `showResolved()` est `false`. Les alertes sans le champ (anciennes données) ne sont pas filtrées (car `undefined !== true`).

3. **Aucune modification de `togglePostActive`** : le champ `isActive` continue de fonctionner indépendamment. Une alerte peut être résolue ET active, ou désactivée ET non résolue. Les deux flags sont orthogonaux.

4. **Aucune modification des guards de route** (`authGuard`, `moderatorGuard`, `adminGuard`) : la vérification de permission pour résoudre est faite dans les composants via `computed()`.

5. **`DatePipe` requis dans `post-detail`** : ne pas oublier de l'ajouter au tableau `imports` du composant (standalone - pas d'import dans un module).

6. **Pas de modification de `app.routes.ts`** : aucune nouvelle route n'est nécessaire pour cette fonctionnalité.

7. **Régression `pulse-indicator`** : le `pulse-indicator` dans `post-detail.component.html` affiche "Alerte active" pour les Disparitions. Il faut conditionner son affichage pour qu'il disparaisse quand l'alerte est résolue :
   ```html
   <div class="pulse-indicator" *ngIf="post()!.type === 'Disparition' && !post()!.isResolved">
   ```
   Cette modification est incluse dans l'étape 5.
