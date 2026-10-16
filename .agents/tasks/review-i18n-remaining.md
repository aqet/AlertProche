# Traduction i18n Angular 18 — AlertProche

La migration translate les templates HTML hardcodés des composants home, auth, post-form, moderation, feed, feed-detail, sos-response, payment-callback, privacy, chatbot et platform-support-modal vers `@ngx-translate`. Les fichiers `fr.json` et `en.json` ont été étendus de concert, et `TranslateModule` a été ajouté aux déclarations standalone de chaque composant concerné.

**Watch for:** Le composant `create-feed-post` — utilisé dans le feed — contient encore plusieurs chaînes visibles hardcodées en français et n'a pas reçu `TranslateModule` dans ses imports. Deux `title` attributes en français subsistent aussi dans `feed.component.html`. Dans `post-form`, le tableau `postTypeDescriptions` reste hardcodé en français dans le TypeScript. Le `PwaInstallService` retourne des labels en français quelle que soit la langue active.

**Verdict**: NEEDS_CHANGES

---

## High-level view

La parité fr.json ↔ en.json est parfaite : 678 clés de chaque côté, aucun écart. Les valeurs identiques entre les deux fichiers se limitent à des noms propres, termes techniques ou constantes numériques — aucune valeur FR non traduite ne s'est glissée dans EN. Le build de production compile sans erreur ni warning Angular.

`TranslateModule` est importé dans tous les composants listés dans le scope de la PR, à l'exception de `create-feed-post`. Ce composant est rendu dans le feed (composant dans le scope), hérite du contexte translate via le template parent, mais le pipe `| translate` ne fonctionne pas sans l'import dans le composant lui-même — et son template utilise encore des chaînes françaises hardcodées.

Deux chaînes françaises hardcodées en attributs `title` dans `feed.component.html` sont des cas limites : elles sont visibles dans des tooltips natifs, donc perceptibles à l'utilisateur. Elles n'ont pas été rattrapées par la passe i18n.

Dans `post-form`, les labels des types de post dans le template (`<span>{{ t }}</span>`) sont les valeurs métier anglais/français de la base de données (`Disparition`, `Abus`, etc.) et ne doivent pas nécessairement être traduits via ngx-translate — c'est une décision produit. En revanche, `postTypeDescriptions`, un objet Record en dur dans le TypeScript, contient des descriptions contextuelles en français qui s'affichent dans le template mais ne passeront jamais par le pipe translate. C'est un oubli confirmé.

Le `PwaInstallService` retourne des libellés hardcodés en français (`'Installer l\'app'`, `'App installée'`) indépendamment de la langue sélectionnée. Ce service n'est pas un composant standalone avec `TranslateModule`, mais il est injecté directement dans `home.component.html` via `pwa.buttonLabel`. C'est une fuite de texte visible non couverte par la PR.

---

<details>
<summary>Issues (5)</summary>

1. **create-feed-post : TranslateModule manquant + chaînes hardcodées** — Le composant n'a pas `TranslateModule` dans ses `imports`. Son template contient `placeholder="Partagez quelque chose avec la communauté..."`, `alt="Aperçu"`, `title="Retirer"`, `title="Ajouter photo ou vidéo"`, `title="Ajouter localisation"`, `placeholder="Ville, pays..."`, le label bouton `'Publication...'` et `'Publier'` (inline dans le template). Ajouter `TranslateModule`, créer les clés correspondantes dans les deux JSON, remplacer par des pipes `| translate`.

2. **feed.component.html : deux title hardcodés** — `title="Supprimer"` sur le bouton de suppression et `title="Retour en haut"` sur le bouton scroll-top ne passent pas par le pipe translate. Remplacer par `[title]="'FEED.BTN_DELETE_TITLE' | translate"` etc. et ajouter les clés dans les deux JSON.

3. **post-form.component.ts : postTypeDescriptions hardcodé en français** — L'objet `postTypeDescriptions` est initialisé avec des chaînes françaises dans le TypeScript et injecté dans le template via `{{ postTypeDescriptions[form.get('type')?.value] }}`. Ces descriptions contextuelles ne sont jamais traduites. Migrer vers `translate.instant()` ou un computed basé sur `TranslateService`.

4. **feed.component.html : alt hardcodé (mineure)** — `alt="Média en plein écran"` dans la lightbox est en français. Utiliser `[attr.alt]="'FEED.LIGHTBOX_MEDIA_ALT' | translate"` (cohérent avec ce que fait `feed-detail.component.html` pour le même cas, qui utilise déjà `[attr.alt]`).

5. **PwaInstallService : buttonLabel hardcodé en français** — `buttonLabel` retourne `'Installer l\'app'` / `'App installée'` quelle que soit la langue. Ce libellé est affiché directement dans `home.component.html` (`{{ pwa.buttonLabel }}`). Le service doit injecter `TranslateService` et utiliser `translate.instant()`, ou le template doit gérer la traduction à l'extérieur du service.

</details>

---

<details>
<summary>Détails</summary>

### create-feed-post : composant non migré dans le scope implicite

`create-feed-post` est un enfant direct du `feed` component (inclus via `<app-create-feed-post>`) — il fait visuellement partie du feed et ses textes sont perceptibles par l'utilisateur. Son template contient au moins sept chaînes hardcodées :

- `placeholder="Partagez quelque chose avec la communauté..."` (textarea principal)
- `alt="Aperçu"` (image preview)
- `title="Retirer"` (bouton suppression preview)
- `title="Ajouter photo ou vidéo"` (bouton upload)
- `title="Ajouter localisation"` (bouton location toggle)
- `placeholder="Ville, pays..."` (input localisation)
- Le ternaire `{{ loading() ? 'Publication...' : 'Publier' }}` dans le bouton submit

Son fichier TypeScript ne déclare pas `TranslateModule` dans `imports: [CommonModule, FormsModule]`. Sans cet import, même l'ajout du pipe `| translate` provoquerait une erreur de compilation. Le composant est hors du scope explicitement listé dans la PR mais est fonctionnellement lié aux composants migrés.

### post-form : postTypeDescriptions non traduit

```typescript
postTypeDescriptions: Record<string, string> = {
  Disparition: 'Personne disparue - enfant, adulte, personne âgée',
  Abus: 'Maltraitance, exploitation, violence sur mineur ou personne vulnérable',
  Prevention: 'Sensibilisation, guide, information utile à la communauté',
  "Appel à l'aide": "Personne à l'hôpital sans famille identifiée, personne en détresse, famille introuvable",
};
```

Ces descriptions s'affichent dans une `div.type-hint` sous la sélection du type. Aucune clé correspondante n'existe dans les JSON. L'approche la plus propre est un `computed()` qui appelle `translate.instant()` en réponse au signal de langue, ou de migrer les clés dans les JSON et de les résoudre dans le template via `| translate`.

### PwaInstallService : libellé non traduit affiché dans home

Le service retourne hardcodé :
```typescript
get buttonLabel(): string {
  switch (this.platform) {
    case 'ios':     return 'Installer l\'app';
    case 'android': return 'Installer l\'app';
    case 'already-installed': return 'App installée';
    default:        return 'Installer l\'app';
  }
}
```

`home.component.html` utilise `{{ pwa.buttonLabel }}` directement. Ce libellé n'est pas dans les JSON i18n. C'est une surface visible sur la page d'accueil.

### Couverture des composants explicitement listés

Tous les composants du scope — home, auth, post-form, moderation, feed, feed-detail, sos-response, payment-callback, privacy, chatbot, platform-support-modal — ont `TranslateModule` importé et leurs templates utilisent la syntaxe `{{ 'KEY' | translate }}`, `[placeholder]="'KEY' | translate"`, et `[attr.xxx]="'KEY' | translate"` de manière cohérente. La syntaxe `translate="KEY"` (directive attribut) n'est pas utilisée, ce qui est cohérent puisque tous les composants utilisent la forme pipe — les deux formes sont valides mais le mélange des deux dans un même projet peut créer des incohérences de déclenchement de changement détection ; l'uniformité actuelle est saine.

### Parité et qualité des fichiers JSON

Les 678 clés sont présentes dans les deux fichiers. Les 25 clés à valeur identique entre FR et EN sont toutes légitimes (noms propres, unités monétaires, termes techniques). Aucune valeur française n'a été copiée telle quelle dans EN. La structure des clés est hiérarchique par feature (`AUTH`, `POST`, `HOME`, `MOD`, etc.) et cohérente avec leur utilisation dans les templates.

### Syntaxe Angular

Aucune erreur de syntaxe détectée sur les composants migrés. `[placeholder]="'KEY' | translate"` est correct. `[attr.alt]="'KEY' | translate"` dans `feed-detail` est correct. `[title]="'KEY' | translate"` n'est pas utilisé là où il le devrait (feed.component.html). Le paramétrage de la directive `translate` avec interpolation (ex: `{{ 'AUTH.RESEND_COUNTDOWN' | translate : { count: resendCountdown() } }}`) est syntaxiquement valide.

</details>

---

<details>
<summary>Fichiers examinés</summary>

| Fichier | Statut |
|---|---|
| `public/i18n/fr.json` | 678 clés, parité parfaite |
| `public/i18n/en.json` | 678 clés, parité parfaite |
| `features/home/home.component.html` | Migré — `pwa.buttonLabel` non traduit |
| `features/home/home.component.ts` | TranslateModule ✓ |
| `features/auth/auth.component.html` | Migré ✓ |
| `features/auth/auth.component.ts` | TranslateModule ✓ |
| `features/post-form/post-form.component.html` | Migré — `postTypeDescriptions` hardcodé en TS |
| `features/post-form/post-form.component.ts` | TranslateModule ✓ — postTypeDescriptions hardcodé |
| `features/moderation/moderation.component.html` | Migré ✓ |
| `features/moderation/moderation.component.ts` | TranslateModule ✓ |
| `features/feed/feed.component.html` | Migré — 2 title hardcodés, 1 alt hardcodé |
| `features/feed/feed.component.ts` | TranslateModule ✓ |
| `features/feed/feed-detail/feed-detail.component.html` | Migré ✓ |
| `features/feed/feed-detail/feed-detail.component.ts` | TranslateModule ✓ |
| `features/feed/create-feed-post/create-feed-post.component.html` | Non migré — 7+ chaînes hardcodées |
| `features/feed/create-feed-post/create-feed-post.component.ts` | TranslateModule **manquant** |
| `features/sos-response/sos-response.component.html` | Migré ✓ |
| `features/sos-response/sos-response.component.ts` | TranslateModule ✓ |
| `features/payment-callback/payment-callback.component.html` | Migré ✓ |
| `features/payment-callback/payment-callback.component.ts` | TranslateModule ✓ |
| `features/privacy/privacy.component.html` | Migré ✓ |
| `features/privacy/privacy.component.ts` | TranslateModule ✓ |
| `shared/components/chatbot/chatbot.component.html` | Migré ✓ |
| `shared/components/chatbot/chatbot.component.ts` | TranslateModule ✓, suggestions via computed() ✓ |
| `shared/components/platform-support-modal/platform-support-modal.component.ts` | TranslateModule ✓ |
| `core/services/pwa-install.service.ts` | buttonLabel hardcodé en français |

Build Angular production : **succès, 0 erreur**

</details>
