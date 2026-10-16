# i18n infrastructure wired but templates not migrated

ngx-translate has been installed, the `TranslateModule` is configured in `app.config.ts`, translation JSON files exist in `public/i18n/`, a `LanguageService` with signal, browser detection and localStorage persistence has been created, and the navbar is fully translated with a working FR/EN switcher. The build passes clean. However every feature component template (`home`, `auth`, `post-form`, `post-detail`, `dashboard`, `admin`, `about`, `donation-modal`) still renders hardcoded French strings — `TranslateModule` was added to each component's TypeScript `imports` array, but the HTML templates were never updated to use the `| translate` pipe. The translation JSON files are also comprehensive and well-structured. The infrastructure is ready; the wiring to templates is missing entirely for all components except the navbar.

**Watch for:**
- **confirmed** — Zero `| translate` usage in any feature template. Switching the language in the UI currently changes only the navbar; all page content stays in French.
- **confirmed** — `POST_FORM` namespace referenced in the review criteria does not exist in either JSON file; the form keys live under `POST`.
- **possible** — `TranslateHttpLoader` path is `/i18n/` (absolute), relying on Angular's `public/` folder being served at root. This works in development but needs verification in production behind a non-root base-href.

**Verdict**: CHANGES_REQUESTED

---

## High-level view

The translation infrastructure is correctly configured end-to-end: `TranslateModule.forRoot` is wired in `app.config.ts` with an `HttpLoader` pointing to `/i18n/`, the files are in `public/i18n/` (which Angular serves at the root), and the build succeeds. The JSON catalogues are thorough — 10 namespaces, symmetric FR/EN content, covering every screen area.

`LanguageService` is solid: signal-based reactive state, browser language detection, localStorage persistence, and `document.documentElement.lang` update on every switch.

The navbar is the only component where the migration landed in both the TypeScript and the HTML. Every other priority component (`home`, `auth`, `post-form`, `post-detail`, `dashboard`, `admin`, `about`, `donation-modal`) had `TranslateModule` added to its imports array but its template was left completely untouched — all text is still hardcoded French strings. The 80% coverage requirement fails for every component except the navbar.

The `POST_FORM` namespace expected by the review criteria does not exist; post-form keys are under `POST`, which is a naming inconsistency to note but not a blocker since the template is not yet wired anyway.

---

<details>
<summary>Issues (4)</summary>

1. **Templates not migrated** — All feature and shared component templates (`home`, `auth`, `post-form`, `post-detail`, `dashboard`, `admin`, `about`, `donation-modal`, `post-card`, `alert-status-badge`, `reviews`) contain hardcoded French text with zero `| translate` pipe calls. Each template must be updated to replace hardcoded strings with `{{ 'NAMESPACE.KEY' | translate }}` bindings. This is the central blocking item.

2. **POST_FORM namespace absent** — The review spec references `POST_FORM` as a required namespace. It does not exist in either JSON file; post-form keys live under `POST`. Either rename the namespace to `POST_FORM` and update the JSON accordingly, or document that `POST` covers both post-form and post-detail concerns.

3. **Absolute HttpLoader path with non-root base-href** — `TranslateHttpLoader(http, '/i18n/', '.json')` uses an absolute URL path. If the app is ever deployed under a sub-path (e.g. `/app/`) the loader will 404. Use a relative path or `APP_BASE_HREF`-aware path to be safe.

4. **Language switcher tooltip hardcoded** — In `navbar.component.html`, the `[title]` on the language switcher button uses a hardcoded ternary `'Switch to English' : 'Passer en français'` instead of `'NAV.LANG_SWITCH' | translate`. These strings do exist in the JSON as `NAV.LANG_SWITCH`, so the binding should use the pipe for consistency.

</details>

---

<details>
<summary>Details</summary>

### TranslateModule is fully configured but only the navbar consumed it

`app.config.ts` registers `TranslateModule.forRoot` with `defaultLanguage: 'fr'` and a `TranslateHttpLoader` factory. The loader target `/i18n/` resolves correctly at runtime because Angular 18's `public/` directory is copied verbatim to the dist root — `public/i18n/fr.json` becomes `/i18n/fr.json`. The build log confirms all lazy chunks compiled without errors or warnings.

Every feature component listed in the build result has `TranslateModule` in its `imports` array. The problem is that this only makes the `translate` pipe *available* to the template — it doesn't rewrite the template. A search across all feature and shared HTML files finds zero occurrences of `| translate` outside of `navbar.component.html`. The navbar received both TypeScript and HTML treatment; all other components received only the TypeScript change.

Concretely, `dashboard.component.html` still contains hardcoded labels like `"Publications"`, `"Disparitions"`, `"Mes Publications"`, `"Publier un Cas"` despite `DASHBOARD.*` keys existing in both JSON files for every one of these strings. The same pattern holds in `home`, `auth`, `post-form`, `post-detail`, `admin`, `about`, and the shared modal components.

### POST_FORM namespace gap

Both JSON files contain 11 namespaces (`COMMON`, `NAV`, `HOME`, `AUTH`, `POST`, `DASHBOARD`, `PAYMENT`, `ADMIN`, `ABOUT`, `REVIEWS`, `CAGNOTTE`). Keys are symmetric across FR and EN. The `POST_FORM` namespace referenced in the review spec does not exist; the keys that would belong to it (`LABEL_TYPE`, `BTN_PUBLISH`, `ERR_*`, etc.) are present under `POST`. This is a naming gap relative to the spec — either rename `POST` to `POST_FORM`/`POST_DETAIL` and split accordingly, or accept that `POST` covers both concerns.

### Language switcher tooltip bypass

The desktop language button in `navbar.component.html` sets its `[title]` via a hardcoded ternary:
```html
[title]="lang.currentLang() === 'fr' ? 'Switch to English' : 'Passer en français'"
```
`NAV.LANG_SWITCH` is already defined in both JSON files and renders the correct string per language. The `[title]` attribute bypasses the translation system and will always show its hardcoded value regardless of language — a minor inconsistency but confirmed against the template.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `src/app/app.config.ts` | Added `TranslateModule.forRoot` with `HttpLoader` and `defaultLanguage: 'fr'` |
| `public/i18n/fr.json` | New — full French translation catalogue, 10+ namespaces |
| `public/i18n/en.json` | New — full English translation catalogue, symmetric with FR |
| `src/app/core/services/language.service.ts` | New — signal-based language service with browser detection and localStorage |
| `src/app/shared/navbar/navbar.component.ts` | Added `TranslateModule` import and `LanguageService` injection |
| `src/app/shared/navbar/navbar.component.html` | All nav text migrated to `| translate`; lang switcher added |
| `src/app/features/auth/auth.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/features/home/home.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/features/dashboard/dashboard.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/features/admin/admin.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/features/about/about.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/features/post-form/post-form.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/features/post-detail/post-detail.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/features/reviews/reviews.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/shared/post-card/post-card.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/shared/components/donation-modal/donation-modal.component.ts` | Added `TranslateModule` import (template not migrated) |
| `src/app/shared/components/alert-status-badge/alert-status-badge.component.ts` | Added `TranslateModule` import (template not migrated) |

Full diff: `git diff main` from project root.

</details>
