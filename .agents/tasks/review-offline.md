# Mode hors-ligne pour AlertProche

L'implémentation ajoute un `OfflineService` centralisé qui surveille les événements `online`/`offline` du navigateur, met des posts en file d'attente dans `localStorage` lors de la création hors-ligne, et les synchronise automatiquement au retour connexion. La lecture hors-ligne repose sur une liste de posts sauvegardés manuellement par l'utilisateur via un bouton bookmark dans `PostCardComponent`. Le bandeau `NetworkBannerComponent` est injecté en tête du layout global dans `AppComponent`. La synchronisation des pending posts est entièrement gérée dans le constructeur de `OfflineService` — `AppComponent` ne duplique pas le listener.

Watch for : **double appel API au chargement** (confirmed) — `HomeComponent` appelle `loadPosts()` deux fois au démarrage quand l'utilisateur est en ligne ; l'`effect()` du constructeur s'exécute immédiatement, puis `ngOnInit` rappelle `loadPosts()`. L'`isSaved` getter dans `PostCardComponent` n'est pas un signal computed, ce qui le rend **non réactif** dans un contexte de change detection OnPush (likely — voir détail).

**Verdict**: NEEDS_CHANGES

---

## High-level view

`OfflineService` est bien structuré : les signaux `online`, `_pendingPosts` et `_savedPosts` restent synchronisés avec `localStorage` à chaque mutation, et `syncPendingPosts()` utilise `firstValueFrom` correctement avec un catch silencieux pour permettre les tentatives futures. La propagation du clic dans `PostCardComponent` est stoppée (`event.stopPropagation()`) pour éviter la navigation. L'icône bookmark change visuellement via `[class.saved]="isSaved"`.

`HomeComponent` présente un double déclenchement de `loadPosts()` au chargement online : l'`effect()` enregistré dans le constructeur s'exécute une première fois à l'initialisation (comportement documenté d'Angular signals), puis `ngOnInit` rappelle `loadPosts()` explicitement. En mode hors-ligne, la logique est correcte grâce au guard `if (!this.offlineService.online()) return` dans `ngOnInit`, mais la `filteredPosts` computed retourne déjà les posts sauvegardés directement — le `this.posts.set(this.offlineService.getSavedPosts())` dans `ngOnInit` est donc redondant.

`PostFormComponent` queue correctement le post hors-ligne et redirige vers l'accueil. Le chemin online est inchangé. L'image n'est pas incluse dans le post en attente (`PendingPost` ne contient pas de `image_url`), ce qui est une limitation à documenter.

`NetworkBannerComponent` affiche bien le bandeau rouge hors-ligne et le bandeau vert 3 secondes au retour. La logique d'initialisation (`_initialized`) évite le flash vert au premier rendu.

---

<details>
<summary>Issues (3)</summary>

1. **Double appel API au chargement** — L'`effect()` dans le constructeur de `HomeComponent` s'exécute immédiatement (signal lu : `online() === true`), ce qui appelle `loadPosts()`. Puis `ngOnInit` appelle `loadPosts()` une deuxième fois. Résultat : deux requêtes `GET /posts` en rafale au chargement. Supprimer l'appel explicite `this.loadPosts()` dans `ngOnInit` (le guard hors-ligne reste) ou conditionner l'`effect` pour ne déclencher qu'aux transitions online→offline→online.

2. **`isSaved` getter non réactif sans OnPush** — `isSaved` est un getter TypeScript ordinaire qui appelle `this.offlineService.isPostSaved()`, lequel lit `_savedPosts()` (signal). Dans une `ChangeDetectionStrategy` par défaut, cela fonctionne parce que le composant est revérifié à chaque cycle. Mais si `PostCardComponent` passe un jour en `OnPush`, le getter ne déclenchera plus de mise à jour visuelle après un save/unsave. Convertir en `computed(() => this.offlineService.isPostSaved(this.post._id))` rend la réactivité explicite et robuste.

3. **Image perdue silencieusement lors d'un post hors-ligne** — `PendingPost` ne contient pas de champ image. Si un utilisateur attache une image et soumet hors-ligne, l'image est ignorée sans avertissement. Au minimum, afficher un message expliquant que l'image sera perdue. Idéalement, inclure `imageDataUrl` dans `PendingPost` (base64) si la taille reste raisonnable, ou bloquer l'envoi hors-ligne quand une image est attachée.

</details>

---

<details>
<summary>Détails</summary>

### Double déclenchement de loadPosts au chargement online

Un `effect()` Angular s'exécute une première fois lors de son enregistrement (dans le constructeur), pas seulement lors des transitions. Comme `offlineService.online()` est `true` à ce moment, `loadPosts()` est immédiatement appelé. Ensuite `ngOnInit` s'exécute et, puisque `this.offlineService.online()` est toujours `true`, appelle `loadPosts()` une deuxième fois. Cela génère deux requêtes HTTP simultanées vers `GET /posts` à chaque chargement de la page d'accueil online — confirmed par la lecture du code.

```typescript
// constructeur — effect() déclenche immédiatement
effect(() => {
  if (this.offlineService.online()) {
    this.loadPosts(); // ← appel n°1, à l'init
  }
});

// ngOnInit — called juste après
ngOnInit(): void {
  if (!this.offlineService.online()) { ... return; }
  this.loadPosts(); // ← appel n°2
}
```

La correction la plus simple est de retirer l'appel `loadPosts()` du `ngOnInit` (en conservant le guard hors-ligne pour le `return` early) et de laisser l'`effect` gérer à la fois l'init et les reconnexions. Ou introduire un flag `_initialized` dans le même esprit que `NetworkBannerComponent`.

### `isSaved` réactivité et future fragilité

`isPostSaved` lit `_savedPosts()`, donc la lecture du signal est bien captée lors du premier rendu. En `ChangeDetectionStrategy.Default` actuelle, chaque clic sur le bookmark (`toggleSave`) modifie le signal et provoque un cycle de détection global qui re-évalue le getter. Ça fonctionne. La fragilité apparaît si le composant passe en `OnPush` : sans être dans une computed ou un `toSignal`, le getter ne créera pas de dépendance réactive et l'icône ne se mettra pas à jour. Utiliser un `computed` lève cette ambiguïté.

### Image perdue silencieusement lors d'un post hors-ligne

Dans `PostFormComponent.onSubmit()`, le chemin hors-ligne extrait uniquement `title`, `content`, `location`, `type`, `isAnonymous`. Si `this.selectedFile()` est non-nul au moment de la soumission, l'image est abandonnée sans notification à l'utilisateur. `syncPendingPosts()` appelle `postService.createPost(...)` sans passer de fichier, donc le post synchro arrivera sans image même si l'utilisateur en avait choisi une.

### Comportement online inchangé

Le chemin de soumission en ligne dans `PostFormComponent` et la logique de filtrage de `HomeComponent` (`filteredPosts`) ne sont pas affectés par les modifications hors-ligne — confirmed. Le guard hors-ligne dans `onSubmit()` est un early-return, et la computed `filteredPosts` ne court-circuite les filtres qu'en mode offline.

### syncPendingPosts et concurrence

`syncPendingPosts()` itère avec `for...of` + `await firstValueFrom`, ce qui sérialise les requêtes. C'est intentionnel et préférable à une exécution parallèle qui pourrait inonder le serveur. Le catch silencieux par post laisse les posts échoués dans la queue pour la prochaine reconnexion — comportement correct.

</details>

---

<details>
<summary>Fichiers examinés</summary>

| Fichier | Modification |
|---|---|
| `src/app/core/services/offline.service.ts` | Nouveau service : signaux online, savedPosts, pendingPosts, sync |
| `src/app/shared/post-card/post-card.component.ts` | Ajout toggleSave, isSaved getter, injection OfflineService |
| `src/app/shared/post-card/post-card.component.html` | Bouton bookmark avec stopPropagation et class.saved |
| `src/app/shared/components/network-banner/network-banner.component.ts` | Nouveau composant : bandeau rouge/vert |
| `src/app/features/home/home.component.ts` | isOffline computed, effect reconnexion, guard ngOnInit hors-ligne |
| `src/app/features/post-form/post-form.component.ts` | Guard hors-ligne dans onSubmit, queuePost, offlineQueued signal |
| `src/app/app.component.ts` | Import et insertion de NetworkBannerComponent dans le template |

</details>
