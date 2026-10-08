# AlertProche — Revue des 8 corrections

Huit corrections ont été appliquées au projet AlertProche : ajout des endpoints backend `resolve`/`unresolve`, passage du minimum de paiement de 15 à 100 XAF, affichage de `resolvedBy` dans le détail d'une alerte, visibilité des erreurs HTTP dans le dashboard et la modération, suppression du double binding `ngModel`, validation `max` dynamique sur le formulaire de retrait, et alignement de la validation dans `executePlatformPayout`. Toutes les corrections critiques (Fix 1) sont en place et le backend compile proprement.

**Watch for :** Une occurrence résiduelle de `min="1"` dans le template inline de `platform-support-modal` — la validation logique est correcte (≥ 100), mais le hint natif du navigateur autorise encore 1 XAF (confirmed).

**Verdict**: CHANGES_REQUESTED

---

## High-level view

**Fix 1 — endpoints resolve/unresolve :** Le schéma Mongoose, le service et le contrôleur sont tous trois correctement mis à jour. Les routes `PATCH :id/resolve` et `PATCH :id/unresolve` sont déclarées **avant** `PATCH :id` dans le contrôleur — l'ordre est essentiel pour éviter que NestJS capture `resolve` comme paramètre `:id`. Les permissions sont symétriques entre les deux opérations. `enrichPost` propage les trois nouveaux champs.

**Fix 2 — minimum 100 XAF :** Les deux occurrences dans `payment.controller.ts` sont mises à jour, ainsi que les getters `isValid`, les méthodes `submit()`, et les placeholders dans les deux modals. L'attribut HTML natif `min="1"` dans le template inline de `platform-support-modal` n'a pas été mis à jour — le placeholder indique 100 XAF mais le browser autorisera des valeurs inférieures via sa validation native.

**Fix 5 — erreurs HTTP visibles :** Le dashboard réutilise `editError`, un signal déjà affiché dans le template. L'erreur de resolve/unresolve s'affichera dans le même banner que les erreurs d'édition de post — légère ambiguïté contextuelle mais pas un bug bloquant.

---

<details>
<summary>Issues (1)</summary>

1. **Attribut HTML `min="1"` résiduel dans platform-support-modal** — dans le template inline de `platform-support-modal.component.ts`, l'input du montant libre conserve `min="1"` au lieu de `min="100"`. La validation logique (`isValid` et `submit()`) est correcte à ≥ 100, mais le hint natif du navigateur indique qu'une valeur à partir de 1 XAF est valide, incohérent avec le placeholder. Corriger `min="1"` en `min="100"` dans le template inline.

</details>

<details>
<summary>Détails</summary>

### Fix 1 — Schéma, service, contrôleur resolve/unresolve

Le schéma `post.schema.ts` reçoit les trois props avec décorateurs `@Prop` corrects : `isResolved: boolean` (default `false`), `resolvedAt: Date` (default `null`), `resolvedBy: string` (default `null`). L'index `isResolved: 1` est ajouté en fin de fichier.

Dans `posts.service.ts`, les méthodes `resolvePost` et `unresolvePost` appliquent une logique de permission symétrique : les deux rejettent un non-Admin/Moderateur qui tenterait de modifier une alerte anonyme, et les deux exigent que l'auteur corresponde pour les posts non-anonymes. `enrichPost` propage les trois champs avec fallback sur `false`/`null`.

Dans `posts.controller.ts`, `@Patch(':id/resolve')` et `@Patch(':id/unresolve')` sont déclarés lignes 167-178, avant `@Patch(':id')` ligne 179. Sans cet ordre, NestJS résoudrait `resolve` et `unresolve` comme des valeurs du paramètre `:id` et retournerait 404 sur la route générique. L'ordre est correct.

`post.service.ts` côté frontend appelle `PATCH ${API}/${id}/resolve` et `PATCH ${API}/${id}/unresolve` — URLs conformes.

### Fix 2 — Attribut min résiduel dans platform-support-modal

Le placeholder (`min. 100 XAF`), le guard `*ngIf="effectiveAmount >= 100"`, le getter `isValid` et `submit()` sont tous corrects à 100 XAF. L'attribut HTML natif `min="1"` sur l'`<input type="number">` n'a pas été mis à jour. Quand le browser valide le formulaire nativement (sans passer par Angular), il accepte 1 XAF. Concrètement, Angular intercepte la soumission avant le browser dans ce cas, donc l'impact est limité aux navigateurs qui affichent le hint de validation natif au survol du champ.

</details>

---

<details>
<summary>Fichiers modifiés</summary>

| Fichier | Ce qui a changé |
|---|---|
| `alertproche-api/src/schemas/post.schema.ts` | Ajout champs `isResolved`, `resolvedAt`, `resolvedBy` + index |
| `alertproche-api/src/posts/posts.service.ts` | Ajout méthodes `resolvePost`, `unresolvePost` + propagation dans `enrichPost` |
| `alertproche-api/src/posts/posts.controller.ts` | Ajout routes `PATCH :id/resolve` et `PATCH :id/unresolve` avant `PATCH :id` |
| `alertproche-api/src/payments/payment.controller.ts` | Minimum 15 → 100 dans `initiateDonation` et `initiateSupport` |
| `src/app/features/admin/admin.component.html` | Suppression `[(ngModel)]="userSearch"` ; input montant plateforme `min="1"` → `min="100"` |
| `src/app/features/admin/admin.component.ts` | `executePlatformPayout` : seuil `< 1` → `< 100` |
| `src/app/features/dashboard/dashboard.component.ts` | `selectCagnotte` : `Validators.max` dynamique ; erreurs visibles sur resolve/unresolve |
| `src/app/features/dashboard/dashboard.component.html` | Corrections mineures de commentaires |
| `src/app/features/moderation/moderation.component.ts` | Signaux `actionError`/`actionSuccess` ; blocs `error: () => {}` remplis |
| `src/app/features/moderation/moderation.component.html` | Banners de feedback ajoutés |
| `src/app/features/post-detail/post-detail.component.html` | Span `Résolu par` ajouté conditionnellement |
| `src/app/shared/components/donation-modal/donation-modal.component.ts` | `isValid` et `submit()` : 15 → 100 |
| `src/app/shared/components/donation-modal/donation-modal.component.html` | Placeholder `min. 15` → `min. 100` |
| `src/app/shared/components/platform-support-modal/platform-support-modal.component.ts` | Placeholder, recap guard, `isValid`, `submit()` : 15 → 100 ; `min="1"` non corrigé |

Diff complet : `git diff HEAD~1` dans chaque dépôt.

</details>
