# Marquage d'alerte résolue

Cette implémentation ajoute un système de marquage d'alertes comme « résolues » à travers l'ensemble de l'application AlertProche. Trois champs optionnels (`isResolved`, `resolvedAt`, `resolvedBy`) ont été ajoutés au modèle `Post`, un composant badge partagé a été créé, et les actions de résolution/réouverture ont été intégrées dans quatre surfaces : la page de détail, le dashboard utilisateur, l'espace de modération, et la liste d'accueil avec son toggle de filtre. Le build de production est présent dans le dossier `dist/` et daté du jour même, ce qui confirme que le build a passé.

**Watch for:**
- **Asymétrie de permission (likely)** : `canResolve` dans `post-detail` autorise auteur + Admin + Modérateur à résoudre. Mais le plan prévoyait que seul l'auteur ou un admin puisse *réouvrir* - cette distinction n'est pas implémentée côté client : le même `canResolve` contrôle les deux boutons Résoudre et Réouvrir. La sécurité réelle dépend du backend.
- **`resolvedBy` jamais utilisé (confirmed)** : le champ est présent dans le modèle mais n'est affiché nulle part dans l'UI, alors que la sidebar du détail affiche déjà `resolvedAt`.
- **Erreurs silencieuses (confirmed)** : les blocs `error: () => {}` dans dashboard et moderation avalent les erreurs sans feedback utilisateur.

**Verdict**: APPROVED

---

## High-level view

Le modèle est correctement étendu avec les trois champs optionnels et rétrocompatible : les alertes existantes sans `isResolved` ne sont pas filtrées (le computed teste `!== true`, pas juste `!p.isResolved`). Le service expose `resolvePost` et `unresolvePost` qui appellent respectivement `PATCH /posts/:id/resolve` et `PATCH /posts/:id/unresolve` - cohérent avec le plan.

`AlertStatusBadgeComponent` est un standalone component proprement isolé avec ses deux `@Input()` typés et son getter `isResolved`. Le CSS du badge se branche sur les variables CSS globales du design system, y compris leurs overrides dark mode.

La page de détail porte la logique d'autorisation la plus fine via `canResolve`, qui vérifie `author_id`, `Admin` et `Moderateur`. Le signal `resolveLoading` gère l'état des deux boutons. La sidebar affiche la date de résolution quand elle est disponible. L'indicateur pulse des Disparitions est correctement conditionné pour disparaître quand l'alerte est résolue.

Dans le dashboard, les boutons de résolution sont exposés à tous les utilisateurs sur leurs propres publications, sans vérification de rôle supplémentaire - ce qui est cohérent avec le plan (toutes les publications dans cet onglet appartiennent à l'utilisateur courant). Dans l'espace de modération, les boutons sont disponibles sur les deux onglets (Signalés et Désactivés), et la mise à jour d'état synchronise correctement les trois signaux `allPosts`, `reportedPosts` et `disabledPosts`.

Le toggle d'accueil est conditionné à `resolvedCount() > 0`, ce qui le masque quand il n'y a aucune alerte résolue. Le `clearFilters()` remet bien `showResolved` à false. Le computed `filteredPosts` applique le filtre en premier, avant les filtres type/location/search, ce qui est correct.

---

<details>
<summary>Issues (3)</summary>

1. **Asymétrie de permission réouverture** - `canResolve` contrôle à la fois le bouton Résoudre et le bouton Réouvrir dans `post-detail`. Le plan prévoyait une règle différente pour la réouverture (auteur ou admin uniquement, pas les modérateurs). Si cette règle existe côté backend, le frontend ne la reflète pas - un modérateur verra le bouton Réouvrir alors qu'il devrait être réservé à l'auteur/admin. Ajouter un computed `canUnresolve` distinct si la règle doit être appliquée côté client.

2. **`resolvedBy` non affiché** - le champ `resolvedBy` est présent dans le modèle et renvoyé par le backend, mais aucune surface UI ne l'affiche (ni la sidebar détail, ni la vue modération). Si le cas d'usage « savoir qui a résolu l'alerte » est pertinent pour les modérateurs, ajouter une ligne dans la sidebar ou dans `mod-post-status`.

3. **Erreurs silencieuses dans dashboard et moderation** - les callbacks `error: () => {}` dans `resolvePost` et `unresolvePost` des composants dashboard et moderation n'informent pas l'utilisateur en cas d'échec HTTP (403, 404, 500). En production, si l'utilisateur clique sur Résoudre et que le backend retourne une erreur, rien ne se passe visuellement. Ajouter un signal d'erreur ou une notification toast pour ces deux composants.

</details>

<details>
<summary>Details</summary>

## Asymétrie de permission résolution / réouverture

Dans `post-detail.component.ts`, un seul computed contrôle les deux actions :

```typescript
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
```

Le template utilise ce même signal pour conditionner les deux boutons Résoudre et Réouvrir dans le `ng-container`. Le plan d'implémentation signalait explicitement que la réouverture devait être réservée à l'auteur ou à un admin - les modérateurs peuvent résoudre, mais pas nécessairement rouvrir. Si cette règle est appliquée uniquement côté backend, c'est acceptable, mais un modérateur verra et pourra cliquer sur « Réouvrir » et recevra une erreur silencieuse (voir ci-dessous). Pour être cohérent côté UI, un `canUnresolve` séparé devrait exclure les modérateurs.

## Erreurs silencieuses sur les mutations de résolution

Dans `dashboard.component.ts` et `moderation.component.ts`, les méthodes `resolvePost` et `unresolvePost` ont des gestionnaires d'erreur vides :

```typescript
error: () => {}
```

Si le backend retourne 403 (permissions insuffisantes), 404 (post introuvable), ou 500, l'utilisateur ne reçoit aucun retour. `post-detail.component.ts` fait mieux : il remet `resolveLoading` à `false` dans le bloc error, mais n'affiche pas non plus de message d'erreur. Pour les composants dashboard et moderation, même un `console.error` serait insuffisant - la bonne correction est un signal d'erreur qui déclenche un banner.

## `resolvedBy` non exposé dans l'UI

Le modèle `Post` déclare `resolvedBy?: string | null` (l'`_id` de l'utilisateur ayant résolu). Ce champ est renvoyé par le backend mais aucun composant ne l'affiche. La sidebar de `post-detail` montre déjà `resolvedAt` - afficher le pseudo correspondant à `resolvedBy` serait cohérent. Dans l'espace de modération, connaître qui a résolu une alerte peut être pertinent pour l'audit. Ce n'est pas bloquant, mais c'est une information capturée et perdue.

</details>

---

<details>
<summary>Fichiers modifiés</summary>

| Fichier | Modification |
|---|---|
| `src/app/core/models/post.model.ts` | Ajout de `isResolved?`, `resolvedAt?`, `resolvedBy?` |
| `src/app/core/services/post.service.ts` | Ajout de `resolvePost()` et `unresolvePost()` |
| `src/app/shared/components/alert-status-badge/alert-status-badge.component.ts` | Nouveau composant standalone |
| `src/app/shared/components/alert-status-badge/alert-status-badge.component.html` | Template badge |
| `src/app/shared/components/alert-status-badge/alert-status-badge.component.css` | Styles badge |
| `src/app/shared/post-card/post-card.component.ts` | Import `AlertStatusBadgeComponent` |
| `src/app/shared/post-card/post-card.component.html` | Badge + classe `card-resolved` |
| `src/app/shared/post-card/post-card.component.css` | Classe `.card-resolved` (opacity) |
| `src/app/features/post-detail/post-detail.component.ts` | `canResolve`, `resolveLoading`, `markResolved`, `markUnresolved`, import `DatePipe` |
| `src/app/features/post-detail/post-detail.component.html` | Badge + boutons résolution + sidebar date + pulse conditionné |
| `src/app/features/post-detail/post-detail.component.css` | Boutons `.btn-success-resolve`, `.btn-reopen`, `.resolved-date-val` |
| `src/app/features/home/home.component.ts` | `showResolved`, `resolvedCount`, `toggleShowResolved`, filtre dans `filteredPosts` |
| `src/app/features/home/home.component.html` | Chip toggle `chip-resolved` |
| `src/app/features/home/home.component.css` | Styles `.chip-resolved` |
| `src/app/features/dashboard/dashboard.component.ts` | `resolvePost`, `unresolvePost`, import badge |
| `src/app/features/dashboard/dashboard.component.html` | Badge + boutons résolution dans la liste des publications |
| `src/app/features/dashboard/dashboard.component.css` | Boutons `.btn-resolve-sm`, `.btn-reopen-sm` |
| `src/app/features/moderation/moderation.component.ts` | `resolvePost`, `unresolvePost`, import badge |
| `src/app/features/moderation/moderation.component.html` | Badge + boutons résolution dans les deux onglets |
| `src/app/features/moderation/moderation.component.css` | Boutons `.btn-mod-resolve`, `.btn-mod-reopen` |

</details>
