# Implementation Plan — Multilinguisme i18n (fr / en)

## État actuel

- **@ngx-translate/core** : **NON installé**. `package.json` ne contient aucune référence à `@ngx-translate`.
- **Dossier assets** : le projet utilise `public/` comme racine statique (déclaré dans `angular.json` ligne `"input": "public"`). Les JSON i18n doivent donc aller dans `public/i18n/` et seront servis à `/i18n/fr.json`.
- **Architecture** : tous les composants sont **standalone**. `app.config.ts` utilise `ApplicationConfig` avec `provideRouter`, `provideHttpClient` et `APP_INITIALIZER`. Il n'y a pas de `AppModule`.
- **Langue cible** : français (fr, défaut) + anglais (en), changement à la volée sans rechargement.

---

## Plan d'implémentation

---

- [ ] 1. Installer @ngx-translate/core et @ngx-translate/http-loader
      `@ngx-translate/core` fournit `TranslateModule`, `TranslatePipe` et `TranslateService`. `@ngx-translate/http-loader` fournit `TranslateHttpLoader` qui charge les JSON via `HttpClient`. Choisir les versions compatibles Angular 18 : `@ngx-translate/core@^15` et `@ngx-translate/http-loader@^8`.
      Files: `package.json` (mise à jour automatique par npm)
      Verify: `npm install @ngx-translate/core@15 @ngx-translate/http-loader@8 --save` — aucune erreur de peer deps, les deux packages apparaissent dans `node_modules/`.

---

- [ ] 2. Créer les fichiers de traduction `public/i18n/fr.json` et `public/i18n/en.json`
      Créer le dossier `public/i18n/` (non existant), puis les deux fichiers JSON avec toutes les clés organisées par namespace. La structure complète est définie ci-dessous (section **Fichiers JSON**). Les clés dynamiques (pseudo, nombre, etc.) restent des interpolations `{{ }}` côté Angular — pas de clé i18n pour les valeurs de données.
      Files: `public/i18n/fr.json`, `public/i18n/en.json`
      Verify: `ng build` — les deux fichiers apparaissent dans `dist/alert-proche/browser/i18n/` sans erreur.

---

- [ ] 3. Configurer TranslateModule dans `app.config.ts`
      Ajouter `importProvidersFrom(TranslateModule.forRoot({ ... }))` dans le tableau `providers` de `appConfig`. Utiliser `TranslateHttpLoader` pointant vers `/i18n/` avec l'extension `.json`. Définir `fr` comme langue par défaut et langue de secours. Importer `HttpClient` dans la factory via `inject(HttpClient)`.

      Configuration exacte à appliquer :
      ```typescript
      import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
      import { TranslateHttpLoader } from '@ngx-translate/http-loader';
      import { HttpClient } from '@angular/common/http';
      import { importProvidersFrom, inject } from '@angular/core';

      export function createTranslateLoader(http: HttpClient) {
        return new TranslateHttpLoader(http, '/i18n/', '.json');
      }

      // Dans providers :
      importProvidersFrom(
        TranslateModule.forRoot({
          defaultLanguage: 'fr',
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient],
          },
        })
      )
      ```
      Files: `src/app/app.config.ts`
      Verify: `ng build` — compilation sans erreur.

---

- [ ] 4. Créer `LanguageService` dans `src/app/core/services/language.service.ts`
      Service injectable en `root` qui encapsule la logique de langue. Utilise un `signal<string>` pour la langue courante (réactivité Angular). Persiste le choix dans `localStorage` sous la clé `'lang'`. Détecte la langue du navigateur au démarrage (via `navigator.language`). Expose `setLanguage(lang: string)` qui appelle `TranslateService.use()` et met à jour le signal.

      API publique :
      ```typescript
      currentLang = signal<string>('fr');   // 'fr' | 'en'
      setLanguage(lang: string): void       // change langue + persist localStorage
      getSupportedLangs(): string[]         // ['fr', 'en']
      ```

      Logique d'initialisation (appelée dans le constructeur) :
      1. Lire `localStorage.getItem('lang')`
      2. Si absent, utiliser `navigator.language.startsWith('en') ? 'en' : 'fr'`
      3. Appeler `translateService.use(detectedLang)` et `currentLang.set(detectedLang)`

      Files: `src/app/core/services/language.service.ts`
      Verify: `ng build` — compilation sans erreur.

---

- [ ] 5. Ajouter le sélecteur de langue dans `NavbarComponent`
      **Décision** : le sélecteur est un bouton à deux états (🇫🇷 / 🇬🇧) dans la zone `nav-actions` desktop et dans le menu mobile, cohérent avec le bouton thème existant (`theme-btn`). Utiliser le même style `class="theme-btn lang-btn"` pour la cohérence visuelle.

      Modifications `.ts` :
      - Importer `LanguageService` et `TranslateModule`
      - Ajouter `TranslateModule` dans `imports[]`
      - Injecter `public lang = inject(LanguageService)`

      Modifications `.html` (3 emplacements) :
      1. **Desktop nav-actions** : ajouter avant le bouton thème :
         ```html
         <button class="theme-btn lang-btn" (click)="lang.setLanguage(lang.currentLang() === 'fr' ? 'en' : 'fr')" [title]="lang.currentLang() === 'fr' ? 'Switch to English' : 'Passer en français'">
           {{ lang.currentLang() === 'fr' ? '🇫🇷' : '🇬🇧' }}
         </button>
         ```
      2. **Menu mobile** : ajouter un lien `m-link` en bas du menu mobile (après le toggle thème)
      3. **Bottom nav** : aucune modification (espace limité, le changement de langue reste accessible via le menu hamburger)

      Remplacer tous les textes hardcodés de la navbar par `| translate` avec les clés `NAV.*` (voir section JSON).

      Files: `src/app/shared/navbar/navbar.component.ts`, `src/app/shared/navbar/navbar.component.html`
      Verify: `ng build` — compilation sans erreur. Ouvrir l'app, cliquer 🇫🇷/🇬🇧, vérifier que les libellés de la navbar changent instantanément.

---

- [ ] 6. Traduire `HomeComponent`
      Importer `TranslateModule` dans `imports[]`. Remplacer tous les textes hardcodés du template par `{{ 'HOME.clé' | translate }}` ou `[placeholder]="'HOME.clé' | translate"`. Les textes dynamiques (titres/contenus des posts) **ne sont pas traduits** — ce sont des données utilisateur.

      Textes à traduire (liste non exhaustive, dériver du template) :
      - `HOME.OFFLINE_BANNER`, `HOME.HERO_EYEBROW`, `HOME.HERO_TITLE`, `HOME.HERO_ACCENT`
      - `HOME.HERO_DESC`, `HOME.BTN_PUBLISH`, `HOME.BTN_JOIN`, `HOME.BTN_SEE_ALERTS`
      - `HOME.STAT_DISPARITIONS`, `HOME.STAT_ABUS`, `HOME.STAT_APPELS`, `HOME.STAT_PREVENTION`
      - `HOME.WHY_TITLE`, pillar cards, CTA buttons, filtres, état vide, section app download
      - `HOME.SEARCH_PLACEHOLDER`, `HOME.LOCATION_PLACEHOLDER`
      - `HOME.FILTER_ALL`, `HOME.FILTER_DISPARITIONS`, etc.
      - `HOME.RESULTS_SINGULAR`, `HOME.RESULTS_PLURAL`, `HOME.EMPTY_TITLE`, `HOME.EMPTY_DESC`
      - `HOME.APP_TITLE`, `HOME.APP_DESC`, `HOME.DOWNLOAD_COUNT`

      Files: `src/app/features/home/home.component.ts`, `src/app/features/home/home.component.html`
      Verify: `ng build` — compilation sans erreur. Changer la langue → les textes du hero, filtres et état vide changent.

---

- [ ] 7. Traduire `AuthComponent`
      Importer `TranslateModule` dans `imports[]`. Traduire tous les libellés du formulaire de connexion et inscription.

      Clés `AUTH.*` à couvrir :
      - `AUTH.TAB_LOGIN`, `AUTH.TAB_REGISTER`
      - `AUTH.BRAND_TITLE`, `AUTH.BRAND_SUB`, features list
      - Login : `AUTH.LABEL_EMAIL`, `AUTH.LABEL_PASSWORD`, `AUTH.BTN_LOGIN`, `AUTH.SWITCH_TO_REGISTER`
      - `AUTH.ERR_EMAIL_REQUIRED`, `AUTH.ERR_EMAIL_INVALID`, `AUTH.ERR_PASSWORD_REQUIRED`
      - Register étape 1 : `AUTH.STEP_INFO`, labels, `AUTH.BTN_SEND_CODE`, `AUTH.SWITCH_TO_LOGIN`
      - Register étape 2 : `AUTH.OTP_TITLE`, `AUTH.OTP_DESC`, `AUTH.LABEL_OTP`, `AUTH.BTN_VERIFY`, `AUTH.RESEND`, `AUTH.RESEND_COUNTDOWN`
      - Register étape 3 : `AUTH.EMAIL_VERIFIED`, `AUTH.LABEL_CONFIRM_PASSWORD`, `AUTH.LABEL_LOCATION`, `AUTH.PRIVACY_NOTE`, `AUTH.ACCEPT_TERMS`, `AUTH.BTN_CREATE_ACCOUNT`
      - Étiquettes step : `AUTH.STEP1_LABEL`, `AUTH.STEP2_LABEL`, `AUTH.STEP3_LABEL`
      - `AUTH.SECURE_NOTE`

      Files: `src/app/features/auth/auth.component.ts`, `src/app/features/auth/auth.component.html`
      Verify: `ng build` — compilation sans erreur. Changer langue → labels du formulaire changent.

---

- [ ] 8. Traduire `PostFormComponent`
      Importer `TranslateModule` dans `imports[]`. Traduire les libellés du formulaire de publication.

      Clés `POST.*` à couvrir :
      - `POST.FORM_TITLE`, `POST.FORM_SUBTITLE`
      - `POST.OFFLINE_QUEUED_TITLE`, `POST.OFFLINE_QUEUED_DESC`, `POST.REDIRECT_MSG`
      - `POST.SUCCESS_TITLE`, `POST.NOTIF_SENT`, `POST.NOTIF_FAILED`, `POST.NO_DEVICE`, `POST.FCM_ERROR`
      - `POST.VOICE_LABEL`, `POST.VOICE_HINT`, `POST.VOICE_START_BTN`
      - `POST.VOICE_RECORDING`, `POST.VOICE_MAX`
      - `POST.LABEL_TYPE`, `POST.LABEL_TITLE`, `POST.LABEL_CONTENT`, `POST.LABEL_LOCATION`
      - `POST.LABEL_IMAGE`, `POST.LABEL_ANONYMOUS`, `POST.ANONYMOUS_HINT`
      - `POST.BTN_PUBLISH`, `POST.ERR_TITLE_REQUIRED`, `POST.ERR_CONTENT_MIN`, `POST.ERR_TYPE_REQUIRED`
      - `POST.TYPE_DISPARITION`, `POST.TYPE_ABUS`, `POST.TYPE_APPEL`, `POST.TYPE_PREVENTION`

      Files: `src/app/features/post-form/post-form.component.ts`, `src/app/features/post-form/post-form.component.html`
      Verify: `ng build` — compilation sans erreur.

---

- [ ] 9. Traduire `PostDetailComponent`
      Importer `TranslateModule` dans `imports[]`. Traduire les libellés de la page de détail d'un post.

      Clés `POST.*` complémentaires :
      - `POST.BACK_TO_FEED`, `POST.BTN_SHARE`, `POST.BTN_SHARED`, `POST.BTN_REPORT`, `POST.ALREADY_REPORTED`
      - `POST.BTN_MARK_RESOLVED`, `POST.BTN_REOPEN`
      - `POST.BADGE_ACTIVE_ALERT`, `POST.RESOLVED_BY`
      - `POST.COMMENT_TITLE`, `POST.COMMENT_PLACEHOLDER`, `POST.BTN_COMMENT`, `POST.NO_COMMENTS`
      - `POST.DONATION_SECTION`, `POST.BTN_DONATE`

      Files: `src/app/features/post-detail/post-detail.component.ts`, `src/app/features/post-detail/post-detail.component.html`
      Verify: `ng build` — compilation sans erreur.

---

- [ ] 10. Traduire `DashboardComponent`
      Importer `TranslateModule` dans `imports[]`.

      Clés `DASHBOARD.*` :
      - `DASHBOARD.NAV_POSTS`, `DASHBOARD.NAV_COMMENTS`, `DASHBOARD.NAV_PROFILE`, `DASHBOARD.NAV_SOS`, `DASHBOARD.NAV_CAGNOTTE`
      - `DASHBOARD.METRIC_POSTS`, `DASHBOARD.METRIC_DISPARITIONS`, `DASHBOARD.METRIC_COMMENTS`
      - `DASHBOARD.BTN_NEW_POST`, `DASHBOARD.BTN_MODERATION`
      - `DASHBOARD.SECTION_MY_POSTS`, `DASHBOARD.SECTION_MY_COMMENTS`, `DASHBOARD.SECTION_PROFILE`, `DASHBOARD.SECTION_SOS`, `DASHBOARD.SECTION_CAGNOTTE`
      - `DASHBOARD.EDIT_TITLE`, `DASHBOARD.LABEL_TITLE`, `DASHBOARD.LABEL_DESC`, `DASHBOARD.LABEL_LOCATION`
      - `DASHBOARD.BTN_SAVE`, `DASHBOARD.BTN_CANCEL`, `DASHBOARD.BTN_EDIT`, `DASHBOARD.BTN_DELETE`
      - Clés cagnotte : `DASHBOARD.CAGNOTTE_AVAILABLE`, `DASHBOARD.CAGNOTTE_TOTAL`, `DASHBOARD.BTN_WITHDRAW`, `DASHBOARD.WITHDRAW_TITLE`, `DASHBOARD.WITHDRAW_PHONE_LABEL`, `DASHBOARD.WITHDRAW_MIN`
      - `DASHBOARD.EMPTY_POSTS`, `DASHBOARD.EMPTY_COMMENTS`

      Files: `src/app/features/dashboard/dashboard.component.ts`, `src/app/features/dashboard/dashboard.component.html`
      Verify: `ng build` — compilation sans erreur.

---

- [ ] 11. Traduire `AboutComponent`
      Importer `TranslateModule` dans `imports[]`. Traduire les sections hero, mission, types de cas, fonctionnement, équipe, CTA.

      Clés `ABOUT.*` :
      - `ABOUT.BACK`, `ABOUT.BADGE`, `ABOUT.HERO_TITLE`, `ABOUT.HERO_DESC`
      - `ABOUT.PILLS_CAMEROON`, `ABOUT.PILLS_WEB_ANDROID`, `ABOUT.PILLS_FREE`, `ABOUT.PILLS_ANON`
      - `ABOUT.MISSION_LABEL`, `ABOUT.MISSION_TITLE`
      - Mission body paragraphs : `ABOUT.MISSION_P1`, `ABOUT.MISSION_P2`, `ABOUT.MISSION_P3`, `ABOUT.MISSION_P4`
      - Types de cas : `ABOUT.CASE_DISPARITION_TITLE`, `ABOUT.CASE_DISPARITION_DESC`, (et abus, appel, prevention)
      - `ABOUT.PRIORITY_MAX`, `ABOUT.PRIORITY_HIGH`, `ABOUT.PRIORITY_SOCIAL`, `ABOUT.PRIORITY_INFO`
      - CTA : `ABOUT.BTN_CREATE_ACCOUNT`, `ABOUT.BTN_SEE_ALERTS`, `ABOUT.BTN_DOWNLOAD_APP`

      Files: `src/app/features/about/about.component.ts`, `src/app/features/about/about.component.html`
      Verify: `ng build` — compilation sans erreur.

---

- [ ] 12. Traduire `ReviewsComponent`
      Importer `TranslateModule` dans `imports[]`.

      Clés `REVIEWS.*` :
      - `REVIEWS.BADGE`, `REVIEWS.HERO_TITLE`, `REVIEWS.HERO_DESC`
      - `REVIEWS.TOTAL_REVIEWS`, `REVIEWS.BTN_GIVE_REVIEW`, `REVIEWS.BTN_CANCEL`
      - `REVIEWS.FORM_BADGE`, `REVIEWS.FORM_TITLE`, `REVIEWS.FORM_DESC`
      - `REVIEWS.LABEL_RATING`, `REVIEWS.LABEL_MESSAGE`, `REVIEWS.LABEL_ANON`
      - `REVIEWS.ANON_HINT`, `REVIEWS.BTN_SUBMIT`, `REVIEWS.CHAR_LIMIT`
      - `REVIEWS.SUCCESS_MSG`
      - `REVIEWS.LIST_BADGE`, `REVIEWS.LIST_TITLE`
      - `REVIEWS.EMPTY_TITLE`, `REVIEWS.EMPTY_DESC`, `REVIEWS.BTN_LOGIN_REVIEW`
      - `REVIEWS.BTN_LOAD_MORE`
      - `REVIEWS.CTA_TITLE`, `REVIEWS.CTA_DESC`, `REVIEWS.BTN_CREATE_ACCOUNT`, `REVIEWS.BTN_SEE_ALERTS`, `REVIEWS.BTN_ABOUT`
      - Rating labels : `REVIEWS.RATING_1`, `REVIEWS.RATING_2`, `REVIEWS.RATING_3`, `REVIEWS.RATING_4`, `REVIEWS.RATING_5`

      Files: `src/app/features/reviews/reviews.component.ts`, `src/app/features/reviews/reviews.component.html`
      Verify: `ng build` — compilation sans erreur.

---

- [ ] 13. Traduire `AdminComponent`
      Importer `TranslateModule` dans `imports[]`. Traduire le panneau admin (header, tabs, labels KPI, sections users/posts/payments).

      Clés `ADMIN.*` :
      - `ADMIN.TITLE`, `ADMIN.SUBTITLE`, `ADMIN.BTN_MODERATION`, `ADMIN.BTN_ANALYTICS`
      - `ADMIN.BTN_TEST_NOTIF`, `ADMIN.BTN_TEST_NOTIF_LOADING`, `ADMIN.BTN_REFRESH`
      - `ADMIN.TAB_STATS`, `ADMIN.TAB_USERS`, `ADMIN.TAB_POSTS`, `ADMIN.TAB_VERSIONS`, `ADMIN.TAB_PAYMENTS`
      - KPI : `ADMIN.KPI_USERS`, `ADMIN.KPI_POSTS`, `ADMIN.KPI_COMMENTS`, `ADMIN.KPI_REPORTED`, `ADMIN.KPI_DISABLED`
      - KPI payments : `ADMIN.KPI_DONATIONS`, `ADMIN.KPI_PLATFORM_REVENUE`, `ADMIN.KPI_PENDING_WITHDRAWALS`
      - `ADMIN.NOTIF_RESULT_TITLE`, notif stats labels
      - Section paiements/retraits : `ADMIN.WITHDRAWAL_REQUESTS_TITLE`, `ADMIN.BTN_APPROVE`, `ADMIN.BTN_REJECT`, `ADMIN.NO_PENDING_WITHDRAWALS`

      Files: `src/app/features/admin/admin.component.ts`, `src/app/features/admin/admin.component.html`
      Verify: `ng build` — compilation sans erreur.

---

- [ ] 14. Traduire les composants partagés prioritaires : `PostCardComponent`, `DonationModalComponent`, `AlertStatusBadgeComponent`
      Ces composants sont utilisés dans plusieurs features. Importer `TranslateModule` dans les `imports[]` de chacun.

      `PostCardComponent` — clés `POST.*` / `COMMON.*` :
      - `COMMON.DISABLED_BY_MOD`, `COMMON.ANONYMOUS`, `COMMON.UNKNOWN`
      - `COMMON.COMMENTS_COUNT`

      `DonationModalComponent` — clés `PAYMENT.*` :
      - `PAYMENT.DONATE_TITLE`, `PAYMENT.BTN_CLOSE`
      - `PAYMENT.PRESETS_LABEL`, `PAYMENT.CUSTOM_AMOUNT_PLACEHOLDER`
      - `PAYMENT.PHONE_LABEL`, `PAYMENT.PHONE_PLACEHOLDER`
      - `PAYMENT.RECAP_PREFIX`, `PAYMENT.BTN_DONATE`, `PAYMENT.LOADING`

      `AlertStatusBadgeComponent` — clés `COMMON.*` :
      - `COMMON.STATUS_RESOLVED`, `COMMON.STATUS_OPEN`, `COMMON.RESOLVED_ON`

      Files:
      - `src/app/shared/post-card/post-card.component.ts` + `.html`
      - `src/app/shared/components/donation-modal/donation-modal.component.ts` + `.html`
      - `src/app/shared/components/alert-status-badge/alert-status-badge.component.ts` + `.html`
      Verify: `ng build` — compilation sans erreur.

---

- [ ] 15. Vérification finale end-to-end
      Vérifier que le changement de langue fonctionne à la volée sur toutes les routes, que `localStorage` persiste entre rechargements, et que la détection navigateur fonctionne.
      Files: aucun (vérification manuelle + build)
      Verify: `ng build --configuration production` — build de production sans erreur ni warning critique. `ng serve` — tester manuellement les routes `/`, `/auth`, `/posts/new`, `/dashboard`, `/a-propos`, `/avis`, `/admin` avec toggle 🇫🇷/🇬🇧.

---

## Fichiers JSON — Structure complète

### `public/i18n/fr.json`

```json
{
  "COMMON": {
    "LOADING": "Chargement...",
    "SAVING": "Enregistrement...",
    "CANCEL": "Annuler",
    "SAVE": "Enregistrer",
    "EDIT": "Modifier",
    "DELETE": "Supprimer",
    "CONFIRM": "Confirmer",
    "CLOSE": "Fermer",
    "BACK": "Retour",
    "YES": "Oui",
    "NO": "Non",
    "ANONYMOUS": "Anonyme",
    "UNKNOWN": "Inconnu",
    "DISABLED_BY_MOD": "Désactivé par un modérateur",
    "STATUS_RESOLVED": "Résolu",
    "STATUS_OPEN": "En cours",
    "RESOLVED_ON": "Résolu le",
    "COMMENTS_COUNT": "commentaire(s)",
    "SEARCH_IN_PROGRESS": "Recherche en cours…",
    "REDIRECT_2S": "Redirection dans 2 secondes…"
  },
  "NAV": {
    "HOME": "Accueil",
    "FEED": "Fil d'actualité",
    "HISTORY": "Historique",
    "ABOUT": "À propos",
    "REVIEWS": "Avis",
    "DASHBOARD": "Mon Espace",
    "MODERATION": "Modération",
    "ADMIN": "Admin",
    "ANALYTICS": "Analytics",
    "PUBLISH": "Publier un Cas",
    "LOGIN": "Se connecter",
    "REGISTER": "S'inscrire",
    "LOGOUT": "Se déconnecter",
    "THEME_LIGHT": "Mode clair",
    "THEME_DARK": "Mode sombre",
    "LANG_SWITCH": "Switch to English"
  },
  "HOME": {
    "OFFLINE_BANNER": "Mode hors-ligne — vous consultez vos posts sauvegardés",
    "HERO_EYEBROW": "Plateforme citoyenne de signalement",
    "HERO_TITLE": "Protéger ensemble.",
    "HERO_ACCENT": "Signaler. Alerter. Agir.",
    "HERO_DESC": "AlertProche centralise les signalements d'urgence, de disparitions et d'abus au Cameroun. Chaque citoyen peut faire la différence.",
    "BTN_PUBLISH": "Publier un signalement",
    "BTN_JOIN": "Rejoindre la communauté",
    "BTN_SEE_ALERTS": "Voir les alertes",
    "BTN_DOWNLOAD_APP": "Télécharger",
    "STAT_DISPARITIONS": "Disparitions",
    "STAT_ABUS": "Abus signalés",
    "STAT_APPELS": "Appels à l'aide",
    "STAT_PREVENTION": "Prévention",
    "WHY_TITLE": "Pourquoi AlertProche ?",
    "WHY_TAG": "Pourquoi AlertProche ?",
    "PILLAR_REPORT_TITLE": "Signaler",
    "PILLAR_REPORT_DESC": "Publiez une alerte de disparition, d'abus ou de prévention. Modération automatique incluse.",
    "PILLAR_SEARCH_TITLE": "Rechercher",
    "PILLAR_SEARCH_DESC": "Parcourez le flux d'alertes, filtrez par ville ou par type de cas.",
    "PILLAR_SUPPORT_TITLE": "Soutenir",
    "PILLAR_SUPPORT_DESC": "Commentez, partagez, apportez un soutien moral ou juridique à la communauté.",
    "PILLAR_PROTECT_TITLE": "Protéger",
    "PILLAR_PROTECT_DESC": "Anonymat garanti. Modération contre doxxing et contenus haineux.",
    "BTN_CREATE_ACCOUNT": "Créer un compte gratuit",
    "SEARCH_PLACEHOLDER": "Rechercher par nom, ville, mot-clé…",
    "LOCATION_PLACEHOLDER": "Ville / Région",
    "FILTER_ALL": "Tous",
    "FILTER_DISPARITIONS": "Disparitions",
    "FILTER_ABUS": "Abus",
    "FILTER_APPELS": "Appels",
    "FILTER_PREVENTION": "Prévention",
    "FILTER_PHOTO": "Photo",
    "FILTER_RESOLVED": "Résolues",
    "FILTER_CLEAR": "Effacer",
    "IMAGE_SEARCH_ACTIVE": "Recherche par similarité d'image active",
    "RESULTS_0": "Aucun résultat",
    "RESULTS_PLURAL": "résultats",
    "RESULTS_SINGULAR": "résultat",
    "EMPTY_TITLE": "Aucun résultat",
    "EMPTY_DESC": "Aucune publication ne correspond à vos critères.",
    "BTN_RESET_FILTERS": "Réinitialiser les filtres",
    "APP_TITLE": "Téléchargez l'application AlertProche",
    "APP_DESC": "Recevez les alertes de votre région en temps réel. Disponible sur Android.",
    "DOWNLOADS": "téléchargements"
  },
  "AUTH": {
    "TAB_LOGIN": "Se connecter",
    "TAB_REGISTER": "S'inscrire",
    "BRAND_TITLE": "AlertProche",
    "BRAND_SUB": "Plateforme de signalement & protection",
    "FEAT_ANON": "Anonymat garanti",
    "FEAT_MODERATION": "Modération automatique",
    "FEAT_COMMUNITY": "Communauté citoyenne",
    "FEAT_ALERTS": "Alertes en temps réel",
    "LABEL_EMAIL": "Adresse email",
    "LABEL_PASSWORD": "Mot de passe",
    "LABEL_PSEUDO": "Pseudo unique",
    "LABEL_CONFIRM_PASSWORD": "Confirmer le mot de passe",
    "LABEL_LOCATION": "Localisation",
    "LABEL_OTP": "Code de vérification",
    "LABEL_ACCEPT_TERMS": "J'accepte la politique de confidentialité",
    "PLACEHOLDER_EMAIL": "votre@email.com",
    "PLACEHOLDER_PSEUDO": "VotrePseudo",
    "PLACEHOLDER_CITY": "-- Sélectionnez une ville --",
    "PLACEHOLDER_OTP": "_ _ _ _ _",
    "BTN_LOGIN": "Se connecter",
    "BTN_SEND_CODE": "Envoyer le code",
    "BTN_VERIFY": "Vérifier le code",
    "BTN_CREATE_ACCOUNT": "Créer mon compte",
    "SWITCH_TO_REGISTER": "Pas encore de compte ?",
    "SWITCH_TO_REGISTER_LINK": "S'inscrire gratuitement",
    "SWITCH_TO_LOGIN": "Déjà un compte ?",
    "SWITCH_TO_LOGIN_LINK": "Se connecter",
    "STEP1_LABEL": "Infos",
    "STEP2_LABEL": "Vérif.",
    "STEP3_LABEL": "Mot de passe",
    "STEP_INTRO": "Renseignez vos informations pour créer votre compte.",
    "OTP_TITLE": "Code envoyé sur votre email",
    "OTP_DESC": "Saisissez le code à 5 chiffres reçu. Valable 10 minutes.",
    "EMAIL_VERIFIED": "Email vérifié !",
    "EMAIL_VERIFIED_DESC": "Choisissez un mot de passe pour finaliser votre inscription.",
    "RESEND": "Renvoyer",
    "RESEND_NOT_RECEIVED": "Pas reçu ?",
    "RESEND_COUNTDOWN": "Renvoyer dans {{count}}s",
    "ERR_EMAIL_REQUIRED": "Email requis",
    "ERR_EMAIL_INVALID": "Email invalide",
    "ERR_PASSWORD_REQUIRED": "Mot de passe requis",
    "ERR_PASSWORD_MIN": "6 caractères minimum",
    "ERR_PSEUDO_REQUIRED": "Pseudo requis",
    "ERR_PSEUDO_MIN": "3 caractères minimum",
    "ERR_OTP_PATTERN": "Le code doit contenir 5 chiffres",
    "ERR_PASSWORD_MISMATCH": "Les mots de passe ne correspondent pas",
    "ERR_ACCEPT_TERMS": "Vous devez accepter la charte",
    "PRIVACY_NOTE": "Vos données sont protégées. Publication anonyme possible à tout moment.",
    "PRIVACY_LINK": "Lire la politique",
    "SECURE_NOTE": "Connexion sécurisée SSL"
  },
  "POST": {
    "FORM_TITLE": "Publier un Cas",
    "FORM_SUBTITLE": "Votre témoignage sera relu et modéré automatiquement pour protéger la communauté.",
    "BACK": "Retour",
    "OFFLINE_QUEUED_TITLE": "Post mis en attente",
    "OFFLINE_QUEUED_DESC": "Vous êtes hors-ligne. Votre post sera publié automatiquement lorsque vous vous reconnecterez.",
    "SUCCESS_TITLE": "Publication créée avec succès",
    "NOTIF_SENT": "notification(s) envoyée(s)",
    "NOTIF_FAILED": "échec(s)",
    "NO_DEVICE": "Aucun appareil abonné aux notifications",
    "FCM_ERROR": "Erreur FCM :",
    "VOICE_LABEL": "Remplir par note vocale",
    "VOICE_BADGE_AI": "IA",
    "VOICE_HINT": "Décrivez la situation oralement - le formulaire se remplit automatiquement.",
    "VOICE_START_BTN": "Enregistrer une description vocale",
    "VOICE_RECORDING": "Enregistrement en cours…",
    "VOICE_MAX": "Max 2 min",
    "LABEL_TYPE": "Type de signalement",
    "LABEL_TITLE": "Titre",
    "LABEL_CONTENT": "Description",
    "LABEL_LOCATION": "Localisation",
    "LABEL_IMAGE": "Photo (optionnel)",
    "LABEL_ANONYMOUS": "Publier anonymement",
    "ANONYMOUS_HINT": "Votre pseudo ne sera pas affiché",
    "BTN_PUBLISH": "Publier le signalement",
    "TYPE_DISPARITION": "Disparition",
    "TYPE_ABUS": "Abus",
    "TYPE_APPEL": "Appel à l'aide",
    "TYPE_PREVENTION": "Prévention",
    "ERR_TYPE_REQUIRED": "Type requis",
    "ERR_TITLE_REQUIRED": "Titre requis",
    "ERR_TITLE_MIN": "10 caractères minimum",
    "ERR_CONTENT_MIN": "30 caractères minimum",
    "ERR_LOCATION_REQUIRED": "Localisation requise",
    "BACK_TO_FEED": "Retour au flux",
    "BTN_SHARE": "Partager",
    "BTN_SHARED": "Lien copié !",
    "BTN_REPORT": "Signaler",
    "ALREADY_REPORTED": "Signalé",
    "REPORT_TITLE": "Déjà signalé",
    "BTN_MARK_RESOLVED": "Marquer résolue",
    "BTN_REOPEN": "Réouvrir",
    "BADGE_ACTIVE_ALERT": "Alerte active",
    "RESOLVED_BY": "Résolu par",
    "COMMENT_TITLE": "Commentaires",
    "COMMENT_PLACEHOLDER": "Votre commentaire…",
    "BTN_COMMENT": "Commenter",
    "NO_COMMENTS": "Aucun commentaire pour l'instant.",
    "DONATION_SECTION": "Soutenir cette alerte",
    "BTN_DONATE": "Faire un don",
    "CAGNOTTE_SECTION": "Cagnotte",
    "CAGNOTTE_TOTAL": "Total collecté",
    "CAGNOTTE_AVAILABLE": "Disponible"
  },
  "DASHBOARD": {
    "NAV_POSTS": "Mes Publications",
    "NAV_COMMENTS": "Mes Commentaires",
    "NAV_PROFILE": "Mon Profil",
    "NAV_SOS": "Contacts SOS",
    "NAV_CAGNOTTE": "Mes Cagnottes",
    "METRIC_POSTS": "Publications",
    "METRIC_DISPARITIONS": "Disparitions",
    "METRIC_COMMENTS": "Commentaires",
    "BTN_NEW_POST": "Publier un Cas",
    "BTN_MODERATION": "Espace Modération",
    "SECTION_MY_POSTS": "Mes Publications",
    "SECTION_MY_COMMENTS": "Mes Commentaires",
    "SECTION_PROFILE": "Mon Profil",
    "SECTION_SOS": "Contacts SOS",
    "SECTION_CAGNOTTE": "Mes Cagnottes",
    "EDIT_TITLE": "Modifier la publication",
    "LABEL_TITLE": "Titre",
    "LABEL_DESC": "Description",
    "LABEL_LOCATION": "Localisation",
    "BTN_SAVE": "Enregistrer",
    "BTN_CANCEL": "Annuler",
    "BTN_EDIT": "Modifier",
    "BTN_DELETE": "Supprimer",
    "MARK_RESOLVED": "Marquer comme résolue",
    "REOPEN": "Réouvrir cette alerte",
    "EMPTY_POSTS": "Aucune publication pour l'instant.",
    "EMPTY_COMMENTS": "Aucun commentaire pour l'instant.",
    "LOADING": "Chargement...",
    "PROFILE_TITLE": "Mon Profil",
    "SOS_TITLE": "Contacts SOS",
    "SOS_DESC": "Gérez vos contacts de confiance pour les situations d'urgence.",
    "CAGNOTTE_AVAILABLE": "Montant disponible",
    "CAGNOTTE_TOTAL": "Total collecté",
    "BTN_WITHDRAW": "Retirer",
    "WITHDRAW_TITLE": "Retirer les fonds",
    "WITHDRAW_PHONE_LABEL": "Numéro Mobile Money",
    "WITHDRAW_MIN": "Minimum 100 XAF",
    "WITHDRAW_BTN_CONFIRM": "Confirmer le retrait"
  },
  "PAYMENT": {
    "DONATE_TITLE": "Soutenir cette alerte",
    "BTN_CLOSE": "Fermer",
    "PRESETS_LABEL": "Choisir un montant",
    "CUSTOM_AMOUNT_PLACEHOLDER": "Autre montant (min. 100 XAF)",
    "PHONE_LABEL": "Numéro Mobile Money (MTN / Orange)",
    "PHONE_PLACEHOLDER": "Ex: 6XXXXXXXX",
    "RECAP_PREFIX": "Don de",
    "RECAP_SUFFIX": "XAF",
    "BTN_DONATE": "Confirmer le don",
    "BTN_DONATE_LOADING": "Paiement en cours…",
    "SUCCESS_TITLE": "Don effectué !",
    "SUCCESS_DESC": "Merci pour votre soutien.",
    "ERR_AMOUNT_MIN": "Montant minimum : 100 XAF",
    "ERR_PHONE_REQUIRED": "Numéro requis",
    "WITHDRAW_MODAL_TITLE": "Retrait des fonds",
    "WITHDRAW_AMOUNT_LABEL": "Montant à retirer",
    "WITHDRAW_PHONE_LABEL": "Numéro Mobile Money",
    "WITHDRAW_BTN": "Demander le retrait",
    "WITHDRAW_SUCCESS": "Demande de retrait envoyée.",
    "WITHDRAW_MIN_AMOUNT": "Montant minimum : 100 XAF"
  },
  "ADMIN": {
    "TITLE": "Panneau d'Administration",
    "SUBTITLE": "Connecté en tant que",
    "BTN_MODERATION": "Modération",
    "BTN_ANALYTICS": "Analytics",
    "BTN_TEST_NOTIF": "Tester notifications",
    "BTN_TEST_NOTIF_LOADING": "Test en cours…",
    "BTN_REFRESH": "Actualiser",
    "TAB_STATS": "Statistiques",
    "TAB_USERS": "Utilisateurs",
    "TAB_POSTS": "Publications",
    "TAB_VERSIONS": "Versions App",
    "TAB_PAYMENTS": "Paiements",
    "KPI_USERS": "Utilisateurs inscrits",
    "KPI_USERS_WEEK": "cette semaine",
    "KPI_POSTS": "Publications totales",
    "KPI_COMMENTS": "Commentaires",
    "KPI_COMMENTS_SUB": "Total plateforme",
    "KPI_REPORTED": "Posts signalés",
    "KPI_REPORTED_SUB": "En attente de modération",
    "KPI_DISABLED": "Posts désactivés",
    "KPI_DISABLED_SUB": "Par les modérateurs",
    "KPI_DONATIONS": "Dons pour alertes",
    "KPI_DONATIONS_SUB": "Total collecté via cagnottes",
    "KPI_PLATFORM_REVENUE": "Revenus plateforme",
    "KPI_PENDING_WITHDRAWALS": "Retraits en attente",
    "NOTIF_RESULT_TITLE": "Résultat du test de notification push",
    "NOTIF_NO_DEVICE": "Aucun appareil enregistré avec un token FCM en base.",
    "NOTIF_SENT": "notification(s) envoyée(s) avec succès sur",
    "NOTIF_DEVICE": "appareil(s)",
    "NOTIF_FAILED": "envoi(s) échoué(s) (tokens invalides supprimés automatiquement)",
    "NOTIF_FCM_ERROR": "Erreur FCM :",
    "LOADING_STATS": "Chargement des statistiques...",
    "WITHDRAWAL_REQUESTS_TITLE": "Demandes de retrait en attente",
    "NO_PENDING_WITHDRAWALS": "Aucune demande de retrait en attente.",
    "BTN_APPROVE": "Approuver",
    "BTN_REJECT": "Rejeter",
    "PAYOUT_AMOUNT_LABEL": "Montant",
    "PAYOUT_PHONE_LABEL": "Numéro",
    "PAYOUT_USER_LABEL": "Utilisateur",
    "PAYOUT_STATUS_PENDING": "En attente",
    "PAYOUT_STATUS_APPROVED": "Approuvé",
    "PAYOUT_STATUS_REJECTED": "Rejeté"
  },
  "ABOUT": {
    "BACK": "Retour",
    "BADGE": "À propos",
    "HERO_TITLE": "AlertProche",
    "HERO_SUBTITLE": "Protéger les personnes vulnérables, c'est l'affaire de tous.",
    "HERO_DESC": "Plateforme citoyenne, sécurisée et indépendante, dédiée à la protection des mineurs et des personnes vulnérables au Cameroun. Gratuite, accessible à tous, disponible sur web et Android.",
    "PILL_CAMEROON": "Cameroun",
    "PILL_WEB_ANDROID": "Web + Android",
    "PILL_FREE": "100% gratuit",
    "PILL_ANON": "Anonymat garanti",
    "MISSION_LABEL": "Notre mission",
    "MISSION_TITLE": "Pourquoi AlertProche existe ?",
    "MISSION_P1": "Face à la recrudescence préoccupante des cas d'abus, d'enlèvements et de disparitions de mineurs au Cameroun, AlertProche est né d'un constat simple : l'information circule trop lentement, et la communauté manque d'un espace structuré pour agir ensemble.",
    "MISSION_P2": "Les familles de disparus n'avaient aucun endroit centralisé pour lancer une alerte. Les témoins d'abus n'osaient pas parler par peur des représailles. AlertProche répond à chacune de ces situations.",
    "MISSION_P3": "Notre objectif : libérer la parole, centraliser les alertes légitimes et structurer l'entraide communautaire - protégée contre le doxxing, la diffamation et le lynchage médiatique.",
    "MISSION_P4": "La plateforme est ouverte à tous les cas de personnes vulnérables : enfants disparus, adultes en détresse, victimes d'abus ou d'exploitation, personnes hospitalisées dont la famille est introuvable.",
    "CASES_LABEL": "Types de signalements",
    "CASES_TITLE": "Quels cas peut-on signaler ?",
    "CASES_SUB": "AlertProche accepte 4 catégories de signalements, chacune avec son niveau d'urgence.",
    "CASE_DISPARITION_TITLE": "Disparition",
    "CASE_DISPARITION_DESC": "Avis de recherche pour un enfant ou un adulte disparu. Signalement avec photo, description physique, dernière localisation connue et circonstances de la disparition.",
    "CASE_ABUS_TITLE": "Abus",
    "CASE_ABUS_DESC": "Témoignage ou signalement d'abus physique, sexuel ou psychologique sur un mineur ou une personne vulnérable. Modéré avec soin pour protéger la vie privée.",
    "CASE_APPEL_TITLE": "Appel à l'aide",
    "CASE_APPEL_DESC": "Personne hospitalisée sans famille identifiée, individu en situation précaire ou en détresse nécessitant une aide urgente. La communauté peut se mobiliser.",
    "CASE_PREVENTION_TITLE": "Prévention",
    "CASE_PREVENTION_DESC": "Partage d'informations préventives : zones à risque, personnes suspectes signalées, conseils de sécurité pour les enfants. Éduquer pour mieux protéger.",
    "PRIORITY_MAX": "Priorité maximale",
    "PRIORITY_HIGH": "Haute priorité",
    "PRIORITY_SOCIAL": "Urgence sociale",
    "PRIORITY_INFO": "Information",
    "BTN_CREATE_ACCOUNT": "Créer un compte gratuit",
    "BTN_SEE_ALERTS": "Voir les alertes",
    "BTN_DOWNLOAD_APP": "Télécharger l'application"
  },
  "REVIEWS": {
    "BADGE": "Avis de la communauté",
    "HERO_TITLE": "Ce que la communauté pense d'AlertProche",
    "HERO_DESC": "Vos retours nous aident à améliorer la plateforme. Partagez votre expérience, faites des suggestions et notez nos services.",
    "TOTAL_REVIEWS": "avis",
    "BTN_GIVE_REVIEW": "Donner mon avis",
    "BTN_CANCEL": "Annuler",
    "FORM_BADGE": "Votre avis",
    "FORM_TITLE": "Partagez votre expérience",
    "FORM_DESC": "Votre retour nous aide à améliorer AlertProche.",
    "LABEL_RATING": "Votre note",
    "LABEL_MESSAGE": "Votre message",
    "LABEL_ANON": "Publier anonymement",
    "ANON_HINT": "Votre pseudo ne sera pas affiché",
    "PLACEHOLDER_MESSAGE": "Décrivez votre expérience sur la plateforme, faites des suggestions…",
    "BTN_SUBMIT": "Envoyer mon avis",
    "BTN_LOADING": "Envoi en cours…",
    "SUCCESS_MSG": "Merci pour votre avis ! Il a bien été enregistré.",
    "LIST_BADGE": "Témoignages",
    "LIST_TITLE": "Tous les avis",
    "EMPTY_TITLE": "Aucun avis pour l'instant",
    "EMPTY_DESC": "Soyez le premier à partager votre expérience sur la plateforme.",
    "BTN_LOGIN_REVIEW": "Se connecter pour laisser un avis",
    "BTN_LOAD_MORE": "Voir plus d'avis",
    "CTA_TITLE": "Envie d'aller plus loin ?",
    "CTA_DESC": "Rejoignez la communauté AlertProche et contribuez à la protection des personnes vulnérables au Cameroun.",
    "BTN_CREATE_ACCOUNT": "Créer un compte gratuit",
    "BTN_SEE_ALERTS": "Voir les alertes",
    "BTN_ABOUT": "En savoir plus",
    "RATING_1": "Très décevant",
    "RATING_2": "Décevant",
    "RATING_3": "Correct",
    "RATING_4": "Bien",
    "RATING_5": "Excellent !",
    "ARIA_STAR": "Donner {{count}} étoile(s)"
  },
  "CAGNOTTE": {
    "SECTION_TITLE": "Cagnotte",
    "COLLECTED": "Collecté",
    "AVAILABLE": "Disponible",
    "DONORS_COUNT": "donateur(s)",
    "BTN_DONATE": "Soutenir",
    "BTN_WITHDRAW": "Retirer",
    "EMPTY": "Aucune cagnotte active.",
    "WITHDRAW_MODAL_TITLE": "Demander un retrait",
    "WITHDRAW_INFO": "Le retrait sera traité par un administrateur.",
    "WITHDRAW_AMOUNT_LABEL": "Montant souhaité",
    "WITHDRAW_PHONE_LABEL": "Numéro Mobile Money (MTN / Orange)",
    "WITHDRAW_BTN": "Envoyer la demande",
    "WITHDRAW_MIN": "Minimum 100 XAF"
  }
}
```

### `public/i18n/en.json`

```json
{
  "COMMON": {
    "LOADING": "Loading...",
    "SAVING": "Saving...",
    "CANCEL": "Cancel",
    "SAVE": "Save",
    "EDIT": "Edit",
    "DELETE": "Delete",
    "CONFIRM": "Confirm",
    "CLOSE": "Close",
    "BACK": "Back",
    "YES": "Yes",
    "NO": "No",
    "ANONYMOUS": "Anonymous",
    "UNKNOWN": "Unknown",
    "DISABLED_BY_MOD": "Disabled by a moderator",
    "STATUS_RESOLVED": "Resolved",
    "STATUS_OPEN": "Active",
    "RESOLVED_ON": "Resolved on",
    "COMMENTS_COUNT": "comment(s)",
    "SEARCH_IN_PROGRESS": "Searching…",
    "REDIRECT_2S": "Redirecting in 2 seconds…"
  },
  "NAV": {
    "HOME": "Home",
    "FEED": "News Feed",
    "HISTORY": "History",
    "ABOUT": "About",
    "REVIEWS": "Reviews",
    "DASHBOARD": "My Space",
    "MODERATION": "Moderation",
    "ADMIN": "Admin",
    "ANALYTICS": "Analytics",
    "PUBLISH": "Publish a Case",
    "LOGIN": "Sign In",
    "REGISTER": "Sign Up",
    "LOGOUT": "Sign Out",
    "THEME_LIGHT": "Light mode",
    "THEME_DARK": "Dark mode",
    "LANG_SWITCH": "Passer en français"
  },
  "HOME": {
    "OFFLINE_BANNER": "Offline mode — viewing saved posts",
    "HERO_EYEBROW": "Citizen reporting platform",
    "HERO_TITLE": "Protecting together.",
    "HERO_ACCENT": "Report. Alert. Act.",
    "HERO_DESC": "AlertProche centralises emergency reports, disappearances and abuse in Cameroon. Every citizen can make a difference.",
    "BTN_PUBLISH": "Publish a report",
    "BTN_JOIN": "Join the community",
    "BTN_SEE_ALERTS": "View alerts",
    "BTN_DOWNLOAD_APP": "Download",
    "STAT_DISPARITIONS": "Disappearances",
    "STAT_ABUS": "Reported abuses",
    "STAT_APPELS": "Calls for help",
    "STAT_PREVENTION": "Prevention",
    "WHY_TITLE": "Why AlertProche?",
    "WHY_TAG": "Why AlertProche?",
    "PILLAR_REPORT_TITLE": "Report",
    "PILLAR_REPORT_DESC": "Publish a disappearance, abuse or prevention alert. Automatic moderation included.",
    "PILLAR_SEARCH_TITLE": "Search",
    "PILLAR_SEARCH_DESC": "Browse the alert feed, filter by city or case type.",
    "PILLAR_SUPPORT_TITLE": "Support",
    "PILLAR_SUPPORT_DESC": "Comment, share, provide moral or legal support to the community.",
    "PILLAR_PROTECT_TITLE": "Protect",
    "PILLAR_PROTECT_DESC": "Guaranteed anonymity. Moderation against doxxing and hate content.",
    "BTN_CREATE_ACCOUNT": "Create a free account",
    "SEARCH_PLACEHOLDER": "Search by name, city, keyword…",
    "LOCATION_PLACEHOLDER": "City / Region",
    "FILTER_ALL": "All",
    "FILTER_DISPARITIONS": "Disappearances",
    "FILTER_ABUS": "Abuse",
    "FILTER_APPELS": "Calls for help",
    "FILTER_PREVENTION": "Prevention",
    "FILTER_PHOTO": "Photo",
    "FILTER_RESOLVED": "Resolved",
    "FILTER_CLEAR": "Clear",
    "IMAGE_SEARCH_ACTIVE": "Image similarity search active",
    "RESULTS_0": "No results",
    "RESULTS_PLURAL": "results",
    "RESULTS_SINGULAR": "result",
    "EMPTY_TITLE": "No results",
    "EMPTY_DESC": "No posts match your criteria.",
    "BTN_RESET_FILTERS": "Reset filters",
    "APP_TITLE": "Download the AlertProche app",
    "APP_DESC": "Receive real-time alerts from your area. Available on Android.",
    "DOWNLOADS": "downloads"
  },
  "AUTH": {
    "TAB_LOGIN": "Sign In",
    "TAB_REGISTER": "Sign Up",
    "BRAND_TITLE": "AlertProche",
    "BRAND_SUB": "Reporting & protection platform",
    "FEAT_ANON": "Guaranteed anonymity",
    "FEAT_MODERATION": "Automatic moderation",
    "FEAT_COMMUNITY": "Citizen community",
    "FEAT_ALERTS": "Real-time alerts",
    "LABEL_EMAIL": "Email address",
    "LABEL_PASSWORD": "Password",
    "LABEL_PSEUDO": "Unique username",
    "LABEL_CONFIRM_PASSWORD": "Confirm password",
    "LABEL_LOCATION": "Location",
    "LABEL_OTP": "Verification code",
    "LABEL_ACCEPT_TERMS": "I accept the privacy policy",
    "PLACEHOLDER_EMAIL": "your@email.com",
    "PLACEHOLDER_PSEUDO": "YourUsername",
    "PLACEHOLDER_CITY": "-- Select a city --",
    "PLACEHOLDER_OTP": "_ _ _ _ _",
    "BTN_LOGIN": "Sign In",
    "BTN_SEND_CODE": "Send code",
    "BTN_VERIFY": "Verify code",
    "BTN_CREATE_ACCOUNT": "Create my account",
    "SWITCH_TO_REGISTER": "No account yet?",
    "SWITCH_TO_REGISTER_LINK": "Sign up for free",
    "SWITCH_TO_LOGIN": "Already have an account?",
    "SWITCH_TO_LOGIN_LINK": "Sign in",
    "STEP1_LABEL": "Info",
    "STEP2_LABEL": "Verify",
    "STEP3_LABEL": "Password",
    "STEP_INTRO": "Enter your information to create your account.",
    "OTP_TITLE": "Code sent to your email",
    "OTP_DESC": "Enter the 5-digit code received. Valid for 10 minutes.",
    "EMAIL_VERIFIED": "Email verified!",
    "EMAIL_VERIFIED_DESC": "Choose a password to complete your registration.",
    "RESEND": "Resend",
    "RESEND_NOT_RECEIVED": "Didn't receive it?",
    "RESEND_COUNTDOWN": "Resend in {{count}}s",
    "ERR_EMAIL_REQUIRED": "Email required",
    "ERR_EMAIL_INVALID": "Invalid email",
    "ERR_PASSWORD_REQUIRED": "Password required",
    "ERR_PASSWORD_MIN": "At least 6 characters",
    "ERR_PSEUDO_REQUIRED": "Username required",
    "ERR_PSEUDO_MIN": "At least 3 characters",
    "ERR_OTP_PATTERN": "Code must be 5 digits",
    "ERR_PASSWORD_MISMATCH": "Passwords do not match",
    "ERR_ACCEPT_TERMS": "You must accept the terms",
    "PRIVACY_NOTE": "Your data is protected. Anonymous publishing available at any time.",
    "PRIVACY_LINK": "Read the policy",
    "SECURE_NOTE": "Secured SSL connection"
  },
  "POST": {
    "FORM_TITLE": "Publish a Case",
    "FORM_SUBTITLE": "Your report will be reviewed and automatically moderated to protect the community.",
    "BACK": "Back",
    "OFFLINE_QUEUED_TITLE": "Post queued",
    "OFFLINE_QUEUED_DESC": "You are offline. Your post will be published automatically when you reconnect.",
    "SUCCESS_TITLE": "Post created successfully",
    "NOTIF_SENT": "notification(s) sent",
    "NOTIF_FAILED": "failure(s)",
    "NO_DEVICE": "No device subscribed to notifications",
    "FCM_ERROR": "FCM error:",
    "VOICE_LABEL": "Fill with voice note",
    "VOICE_BADGE_AI": "AI",
    "VOICE_HINT": "Describe the situation verbally — the form fills automatically.",
    "VOICE_START_BTN": "Record a voice description",
    "VOICE_RECORDING": "Recording…",
    "VOICE_MAX": "Max 2 min",
    "LABEL_TYPE": "Report type",
    "LABEL_TITLE": "Title",
    "LABEL_CONTENT": "Description",
    "LABEL_LOCATION": "Location",
    "LABEL_IMAGE": "Photo (optional)",
    "LABEL_ANONYMOUS": "Publish anonymously",
    "ANONYMOUS_HINT": "Your username will not be shown",
    "BTN_PUBLISH": "Publish report",
    "TYPE_DISPARITION": "Disappearance",
    "TYPE_ABUS": "Abuse",
    "TYPE_APPEL": "Call for help",
    "TYPE_PREVENTION": "Prevention",
    "ERR_TYPE_REQUIRED": "Type required",
    "ERR_TITLE_REQUIRED": "Title required",
    "ERR_TITLE_MIN": "At least 10 characters",
    "ERR_CONTENT_MIN": "At least 30 characters",
    "ERR_LOCATION_REQUIRED": "Location required",
    "BACK_TO_FEED": "Back to feed",
    "BTN_SHARE": "Share",
    "BTN_SHARED": "Link copied!",
    "BTN_REPORT": "Report",
    "ALREADY_REPORTED": "Reported",
    "REPORT_TITLE": "Already reported",
    "BTN_MARK_RESOLVED": "Mark as resolved",
    "BTN_REOPEN": "Reopen",
    "BADGE_ACTIVE_ALERT": "Active alert",
    "RESOLVED_BY": "Resolved by",
    "COMMENT_TITLE": "Comments",
    "COMMENT_PLACEHOLDER": "Your comment…",
    "BTN_COMMENT": "Comment",
    "NO_COMMENTS": "No comments yet.",
    "DONATION_SECTION": "Support this alert",
    "BTN_DONATE": "Donate",
    "CAGNOTTE_SECTION": "Fundraiser",
    "CAGNOTTE_TOTAL": "Total raised",
    "CAGNOTTE_AVAILABLE": "Available"
  },
  "DASHBOARD": {
    "NAV_POSTS": "My Posts",
    "NAV_COMMENTS": "My Comments",
    "NAV_PROFILE": "My Profile",
    "NAV_SOS": "SOS Contacts",
    "NAV_CAGNOTTE": "My Fundraisers",
    "METRIC_POSTS": "Posts",
    "METRIC_DISPARITIONS": "Disappearances",
    "METRIC_COMMENTS": "Comments",
    "BTN_NEW_POST": "Publish a Case",
    "BTN_MODERATION": "Moderation Space",
    "SECTION_MY_POSTS": "My Posts",
    "SECTION_MY_COMMENTS": "My Comments",
    "SECTION_PROFILE": "My Profile",
    "SECTION_SOS": "SOS Contacts",
    "SECTION_CAGNOTTE": "My Fundraisers",
    "EDIT_TITLE": "Edit post",
    "LABEL_TITLE": "Title",
    "LABEL_DESC": "Description",
    "LABEL_LOCATION": "Location",
    "BTN_SAVE": "Save",
    "BTN_CANCEL": "Cancel",
    "BTN_EDIT": "Edit",
    "BTN_DELETE": "Delete",
    "MARK_RESOLVED": "Mark as resolved",
    "REOPEN": "Reopen alert",
    "EMPTY_POSTS": "No posts yet.",
    "EMPTY_COMMENTS": "No comments yet.",
    "LOADING": "Loading...",
    "PROFILE_TITLE": "My Profile",
    "SOS_TITLE": "SOS Contacts",
    "SOS_DESC": "Manage your trusted contacts for emergency situations.",
    "CAGNOTTE_AVAILABLE": "Available amount",
    "CAGNOTTE_TOTAL": "Total raised",
    "BTN_WITHDRAW": "Withdraw",
    "WITHDRAW_TITLE": "Withdraw funds",
    "WITHDRAW_PHONE_LABEL": "Mobile Money number",
    "WITHDRAW_MIN": "Minimum 100 XAF",
    "WITHDRAW_BTN_CONFIRM": "Confirm withdrawal"
  },
  "PAYMENT": {
    "DONATE_TITLE": "Support this alert",
    "BTN_CLOSE": "Close",
    "PRESETS_LABEL": "Choose an amount",
    "CUSTOM_AMOUNT_PLACEHOLDER": "Other amount (min. 100 XAF)",
    "PHONE_LABEL": "Mobile Money number (MTN / Orange)",
    "PHONE_PLACEHOLDER": "Ex: 6XXXXXXXX",
    "RECAP_PREFIX": "Donation of",
    "RECAP_SUFFIX": "XAF",
    "BTN_DONATE": "Confirm donation",
    "BTN_DONATE_LOADING": "Processing payment…",
    "SUCCESS_TITLE": "Donation made!",
    "SUCCESS_DESC": "Thank you for your support.",
    "ERR_AMOUNT_MIN": "Minimum amount: 100 XAF",
    "ERR_PHONE_REQUIRED": "Phone number required",
    "WITHDRAW_MODAL_TITLE": "Withdrawal request",
    "WITHDRAW_AMOUNT_LABEL": "Amount to withdraw",
    "WITHDRAW_PHONE_LABEL": "Mobile Money number",
    "WITHDRAW_BTN": "Request withdrawal",
    "WITHDRAW_SUCCESS": "Withdrawal request sent.",
    "WITHDRAW_MIN_AMOUNT": "Minimum amount: 100 XAF"
  },
  "ADMIN": {
    "TITLE": "Administration Panel",
    "SUBTITLE": "Signed in as",
    "BTN_MODERATION": "Moderation",
    "BTN_ANALYTICS": "Analytics",
    "BTN_TEST_NOTIF": "Test notifications",
    "BTN_TEST_NOTIF_LOADING": "Testing…",
    "BTN_REFRESH": "Refresh",
    "TAB_STATS": "Statistics",
    "TAB_USERS": "Users",
    "TAB_POSTS": "Posts",
    "TAB_VERSIONS": "App Versions",
    "TAB_PAYMENTS": "Payments",
    "KPI_USERS": "Registered users",
    "KPI_USERS_WEEK": "this week",
    "KPI_POSTS": "Total posts",
    "KPI_COMMENTS": "Comments",
    "KPI_COMMENTS_SUB": "Platform total",
    "KPI_REPORTED": "Reported posts",
    "KPI_REPORTED_SUB": "Pending moderation",
    "KPI_DISABLED": "Disabled posts",
    "KPI_DISABLED_SUB": "By moderators",
    "KPI_DONATIONS": "Alert donations",
    "KPI_DONATIONS_SUB": "Total collected via fundraisers",
    "KPI_PLATFORM_REVENUE": "Platform revenue",
    "KPI_PENDING_WITHDRAWALS": "Pending withdrawals",
    "NOTIF_RESULT_TITLE": "Push notification test result",
    "NOTIF_NO_DEVICE": "No device registered with an FCM token.",
    "NOTIF_SENT": "notification(s) sent successfully on",
    "NOTIF_DEVICE": "device(s)",
    "NOTIF_FAILED": "send failure(s) (invalid tokens removed automatically)",
    "NOTIF_FCM_ERROR": "FCM error:",
    "LOADING_STATS": "Loading statistics...",
    "WITHDRAWAL_REQUESTS_TITLE": "Pending withdrawal requests",
    "NO_PENDING_WITHDRAWALS": "No pending withdrawal requests.",
    "BTN_APPROVE": "Approve",
    "BTN_REJECT": "Reject",
    "PAYOUT_AMOUNT_LABEL": "Amount",
    "PAYOUT_PHONE_LABEL": "Phone",
    "PAYOUT_USER_LABEL": "User",
    "PAYOUT_STATUS_PENDING": "Pending",
    "PAYOUT_STATUS_APPROVED": "Approved",
    "PAYOUT_STATUS_REJECTED": "Rejected"
  },
  "ABOUT": {
    "BACK": "Back",
    "BADGE": "About",
    "HERO_TITLE": "AlertProche",
    "HERO_SUBTITLE": "Protecting vulnerable people is everyone's responsibility.",
    "HERO_DESC": "An independent, secure citizen platform dedicated to protecting minors and vulnerable people in Cameroon. Free, accessible to all, available on web and Android.",
    "PILL_CAMEROON": "Cameroon",
    "PILL_WEB_ANDROID": "Web + Android",
    "PILL_FREE": "100% free",
    "PILL_ANON": "Guaranteed anonymity",
    "MISSION_LABEL": "Our mission",
    "MISSION_TITLE": "Why does AlertProche exist?",
    "MISSION_P1": "Faced with the worrying rise in cases of abuse, kidnappings and disappearances of minors in Cameroon, AlertProche was born from a simple observation: information circulates too slowly, and the community lacks a structured space to act together.",
    "MISSION_P2": "Families of missing persons had no centralised place to raise an alert. Witnesses to abuse were afraid to speak out for fear of reprisals. AlertProche addresses each of these situations.",
    "MISSION_P3": "Our goal: to free speech, centralise legitimate alerts and structure community mutual aid — protected against doxxing, defamation and media lynching.",
    "MISSION_P4": "The platform is open to all cases of vulnerable people: missing children, adults in distress, victims of abuse or exploitation, hospitalised persons whose family cannot be found.",
    "CASES_LABEL": "Report types",
    "CASES_TITLE": "What cases can be reported?",
    "CASES_SUB": "AlertProche accepts 4 categories of reports, each with its own urgency level.",
    "CASE_DISPARITION_TITLE": "Disappearance",
    "CASE_DISPARITION_DESC": "Search notice for a missing child or adult. Report with photo, physical description, last known location and circumstances of disappearance.",
    "CASE_ABUS_TITLE": "Abuse",
    "CASE_ABUS_DESC": "Testimony or report of physical, sexual or psychological abuse of a minor or vulnerable person. Carefully moderated to protect privacy.",
    "CASE_APPEL_TITLE": "Call for help",
    "CASE_APPEL_DESC": "Hospitalised person without identified family, individual in precarious or distress situation requiring urgent help. The community can mobilise.",
    "CASE_PREVENTION_TITLE": "Prevention",
    "CASE_PREVENTION_DESC": "Sharing preventive information: at-risk areas, reported suspicious persons, safety tips for children. Educate to better protect.",
    "PRIORITY_MAX": "Maximum priority",
    "PRIORITY_HIGH": "High priority",
    "PRIORITY_SOCIAL": "Social emergency",
    "PRIORITY_INFO": "Information",
    "BTN_CREATE_ACCOUNT": "Create a free account",
    "BTN_SEE_ALERTS": "View alerts",
    "BTN_DOWNLOAD_APP": "Download the app"
  },
  "REVIEWS": {
    "BADGE": "Community reviews",
    "HERO_TITLE": "What the community thinks of AlertProche",
    "HERO_DESC": "Your feedback helps us improve the platform. Share your experience, make suggestions and rate our services.",
    "TOTAL_REVIEWS": "reviews",
    "BTN_GIVE_REVIEW": "Give my review",
    "BTN_CANCEL": "Cancel",
    "FORM_BADGE": "Your review",
    "FORM_TITLE": "Share your experience",
    "FORM_DESC": "Your feedback helps us improve AlertProche.",
    "LABEL_RATING": "Your rating",
    "LABEL_MESSAGE": "Your message",
    "LABEL_ANON": "Post anonymously",
    "ANON_HINT": "Your username will not be shown",
    "PLACEHOLDER_MESSAGE": "Describe your experience on the platform, make suggestions…",
    "BTN_SUBMIT": "Send my review",
    "BTN_LOADING": "Sending…",
    "SUCCESS_MSG": "Thank you for your review! It has been saved.",
    "LIST_BADGE": "Testimonials",
    "LIST_TITLE": "All reviews",
    "EMPTY_TITLE": "No reviews yet",
    "EMPTY_DESC": "Be the first to share your experience on the platform.",
    "BTN_LOGIN_REVIEW": "Sign in to leave a review",
    "BTN_LOAD_MORE": "Load more reviews",
    "CTA_TITLE": "Want to go further?",
    "CTA_DESC": "Join the AlertProche community and contribute to the protection of vulnerable people in Cameroon.",
    "BTN_CREATE_ACCOUNT": "Create a free account",
    "BTN_SEE_ALERTS": "View alerts",
    "BTN_ABOUT": "Learn more",
    "RATING_1": "Very disappointing",
    "RATING_2": "Disappointing",
    "RATING_3": "Decent",
    "RATING_4": "Good",
    "RATING_5": "Excellent!",
    "ARIA_STAR": "Give {{count}} star(s)"
  },
  "CAGNOTTE": {
    "SECTION_TITLE": "Fundraiser",
    "COLLECTED": "Collected",
    "AVAILABLE": "Available",
    "DONORS_COUNT": "donor(s)",
    "BTN_DONATE": "Support",
    "BTN_WITHDRAW": "Withdraw",
    "EMPTY": "No active fundraiser.",
    "WITHDRAW_MODAL_TITLE": "Request a withdrawal",
    "WITHDRAW_INFO": "The withdrawal will be processed by an administrator.",
    "WITHDRAW_AMOUNT_LABEL": "Desired amount",
    "WITHDRAW_PHONE_LABEL": "Mobile Money number (MTN / Orange)",
    "WITHDRAW_BTN": "Send request",
    "WITHDRAW_MIN": "Minimum 100 XAF"
  }
}
```

---

## Décisions d'architecture prises

1. **@ngx-translate/core v15 + http-loader v8** : versions les plus récentes compatibles Angular 18. Le i18n natif Angular est explicitement exclu (pas de `ng extract-i18n`, pas de `localize`).

2. **Dossier `public/i18n/`** (pas `src/assets/i18n/`) : le projet sert ses assets statiques depuis `public/` (angular.json `"input": "public"`). Le loader pointe vers `/i18n/` (racine web), ce qui correspond à `public/i18n/` sur le disque.

3. **`LanguageService` avec Signal** : cohérent avec l'architecture signals déjà utilisée dans tout le projet (AuthService, ThemeService, etc.). Évite le recours à des Observable là où ce n'est pas nécessaire.

4. **Sélecteur de langue : bouton toggle emoji drapeaux** : choix pragmatique — utilise le même `theme-btn` existant pour cohérence stylistique immédiate, sans introduire de nouveaux composants UI. Les emojis drapeaux sont universellement reconnus et ne nécessitent pas de CSS supplémentaire.

5. **`importProvidersFrom(TranslateModule.forRoot(...))` dans `app.config.ts`** : pattern correct pour les apps standalone Angular 18, équivalent au `forRoot()` dans un `AppModule`.

6. **Composants standalone : import individuel de `TranslateModule`** : chaque composant déclare `TranslateModule` dans son tableau `imports[]`. C'est la contrainte des composants standalone — il n'y a pas de module partagé qui propagerait l'import automatiquement.

7. **Textes de données non traduits** : titres/contenus des posts, pseudos, localisations — ce sont des données utilisateur stockées en base, pas des libellés UI. Seuls les libellés hardcodés du template sont traduits.
