# Mode hors-ligne pour AlertProche (passe 2)

Trois commits ajoutent un `OfflineService` centralisé, un bouton bookmark dans `PostCardComponent`, la queue hors-ligne dans `PostFormComponent`, le rechargement automatique des posts au retour connexion dans `HomeComponent`, et le bandeau `NetworkBannerComponent` injecté en tête de layout. Les trois findings bloquants de la passe 1 (double appel API, `isSaved` non réactif, image perdue silencieusement) ont été adressés dans le commit `9495d83`.

Watch for : aucun blocking concern. La synchronisation concurrente en cas de reconnexions rapides multiples est un risque possible mais non bloquant — voir détail.

**Verdict**: APPROVED

---

## High-level view

`OfflineService` maintient trois signaux (`online`, `_savedPosts`, `_pendingPosts`) strictement synchronisés avec `localStorage` à chaque mutation. Le listener `'online'` du constructeur appelle `syncPendingPosts()` directement ; `AppComponent` a supprimé son propre listener dupliqué. `firstValueFrom` sérialise les requêtes de sync post par post, ce qui est préférable à une exécution parallèle.

Le double appel `loadPosts()` qui existait en passe 1 est résolu : l'`effect()` dans le constructeur de `HomeComponent` introduit un flag `_initialized` qui absorbe le premier déclenchement synchrone d'Angular signals, puis `ngOnInit` prend le relais pour le premier chargement. Au retour connexion, seul l'`effect` déclenche `loadPosts()`.

`PostCardComponent` convertit `isSaved` en `computed(() => …)` — la réactivité est désormais explicite et fonctionnera correctement si le composant passe un jour en `OnPush`. Le `stopPropagation()` dans `toggleSave` empêche la navigation vers le post au clic sur le bookmark.

`PostFormComponent` bloque explicitement la soumission hors-ligne quand une image est sélectionnée, avec un message d'erreur clair. Le chemin en ligne est inchangé. `NetworkBannerComponent` affiche le bandeau rouge pendant la déconnexion et le bandeau vert 3 secondes au retour, avec un guard `_initialized` pour éviter le flash vert au premier rendu.

---

<details>
<summary>Issues (1)</summary>

1. **Sync concurrente possible sur reconnexions rapides** — `syncPendingPosts()` n'est pas protégé contre les appels multiples simultanés. Si `window 'online'` se déclenche deux fois en rafale (certains navigateurs le font), deux boucles de sync tournent en parallèle et peuvent tenter de publier et supprimer le même post deux fois. Ajouter un flag `_syncing` pour ignorer un appel si une sync est déjà en cours. Non-bloquant pour le premier déploiement, à corriger avant une charge utilisateur significative.

</details>

---

<details>
<summary>Détails</summary>

### Résolution des findings passe 1

**Double appel API (était blocking/confirmed)** : résolu. Le constructeur de `HomeComponent` introduit `let _initialized = false` ; le premier déclenchement de l'`effect()` pose le flag et retourne sans appeler `loadPosts()`. `ngOnInit` gère le premier chargement et le guard hors-ligne reste en place. Confirmé par lecture du diff `9495d83`.

**`isSaved` non réactif (était warning/likely)** : résolu. Le getter TypeScript est remplacé par `isSaved = computed(() => this.offlineService.isPostSaved(this.post._id))`. Le template est mis à jour en conséquence (`isSaved()` dans les bindings). Confirmé par diff.

**Image perdue silencieusement (était blocking/confirmed)** : résolu. `PostFormComponent.onSubmit()` teste `this.selectedFile()` avant d'entrer dans le chemin hors-ligne et affiche un message d'erreur explicite demandant de supprimer l'image ou d'attendre la reconnexion.

### Sync concurrente possible

`syncPendingPosts()` est `async` sans mécanisme de verrou. Sur certains navigateurs (Chrome mobile notamment), l'événement `'online'` peut se déclencher deux ou trois fois en succession rapide lors d'une reconnexion. Deux invocations simultanées lisent la même liste pending depuis `localStorage`, itèrent sur les mêmes posts, et chaque itération appelle `removePendingPost()` après succès — ce qui modifie `localStorage` pendant que l'autre boucle tourne sur sa snapshot initiale. Résultat probable : double publication du même post.

```typescript
// Correctif minimal
private _syncing = false;

async syncPendingPosts(): Promise<void> {
  if (this._syncing) return;
  this._syncing = true;
  try {
    // ... boucle existante
  } finally {
    this._syncing = false;
  }
}
```

Ce risque est classifié **possible** — reproductible sur certains navigateurs mais pas universel. Non bloquant pour le déploiement initial, à corriger à l'occasion.

### Comportement en ligne inchangé — confirmation

Le chemin de soumission en ligne dans `PostFormComponent` est un early-return hors-ligne suivi du code online existant intact. `HomeComponent.filteredPosts` court-circuite vers les posts sauvegardés uniquement quand `isOffline()` est vrai, sans toucher aux filtres online. Aucune régression détectée.

</details>

---

<details>
<summary>Fichiers examinés</summary>

| Fichier | État |
|---|---|
| `src/app/core/services/offline.service.ts` | Signaux synchronisés localStorage, sync centralisée |
| `src/app/shared/post-card/post-card.component.ts` | `isSaved` converti en `computed`, stopPropagation confirmé |
| `src/app/shared/post-card/post-card.component.html` | Bindings mis à jour vers `isSaved()` |
| `src/app/shared/components/network-banner/network-banner.component.ts` | Bandeau rouge/vert, guard _initialized |
| `src/app/features/home/home.component.ts` | Flag _initialized dans effect, loadPosts extrait, guard offline |
| `src/app/features/post-form/post-form.component.ts` | Guard image offline, message erreur explicite |
| `src/app/app.component.ts` | Listener dupliqué supprimé, NetworkBannerComponent importé |

</details>
