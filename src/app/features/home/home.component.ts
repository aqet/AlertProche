import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PostService } from '../../core/services/post.service';
import { Post, PostType } from '../../core/models/post.model';
import { PostCardComponent } from '../../shared/post-card/post-card.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { TrackingService } from '../../core/services/tracking.service';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { InstallModalComponent } from '../../shared/components/install-modal/install-modal.component';

/** Correspondance renvoyée par la recherche par visage. */
interface ImageSearchItem {
  _id: string;
  title?: string;
  location?: string;
  image_url?: string | null;
  score: number;
}

/** Réponse de `POST /posts/search-by-image`. */
interface ImageSearchResponse {
  matchType: 'face' | 'none';
  reason?: 'no_face' | 'no_match' | 'unavailable';
  faceCount: number;
  durationMs: number;
  results: ImageSearchItem[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PostCardComponent, InstallModalComponent, TranslateModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly API = `${environment.apiUrl}/posts`;
  posts = signal<Post[]>([]);
  loading = signal(true);
  error = signal('');
  appDownloadCount = signal(0);
  appDownloadLoading = signal(false);
  findSimilar = signal<ImageSearchResponse | null>(null);

  filterType = signal<string>('');
  filterLocation = signal('');
  searchQuery = signal('');
  imageSearchFile = signal<File | null>(null);
  imageSearchPreview = signal<string | null>(null);
  imageSearchNotice = signal<string | null>(null);
  searching = signal(false);
  showResolved = signal<boolean>(false);
  /**
   * Tri de la liste :
   * - 'reliability' : les alertes cautionnées par la communauté remontent,
   * - 'recent'      : ordre chronologique pur.
   */
  sortMode = signal<'reliability' | 'recent'>('reliability');
  /** Identifie la recherche d'image en cours (ignore les réponses obsolètes). */
  private imageSearchRequestId = 0;
  private searchTimeout: any;

  isAuth = computed(() => this.auth.isAuthenticated());

  // Mock data for demo (will be replaced by API)
  // private mockPosts: Post[] = [
  //   {
  //     _id: '1',
  //     author_id: 'u1',
  //     authorPseudo: 'Marie_Cam',
  //     isAnonymous: false,
  //     title: 'URGENT – Disparition de Tchinda Noémie, 8 ans – Yaoundé Centre',
  //     content:
  //       'Ma fille Noémie a disparu hier soir vers 18h dans le quartier Melen à Yaoundé. Elle portait une robe rose et des sandales blanches. Toute information est la bienvenue. Contactez la famille immédiatement.',
  //     location: 'Yaoundé, Melen',
  //     type: 'Disparition',
  //     image_url: '',
  //     createdAt: new Date(Date.now() - 3600000).toISOString(),
  //     commentCount: 12,
  //   },
  //   {
  //     _id: '2',
  //     author_id: 'u2',
  //     authorPseudo: 'CitoyenDouala',
  //     isAnonymous: false,
  //     title:
  //       "Témoignage : réseau de travail d'enfants démantelé à Douala Bepanda",
  //     content:
  //       "J'ai été témoin d'une situation préoccupante dans le quartier Bepanda. Des enfants âgés de 7 à 12 ans travaillaient dans des conditions inhumaines. Les autorités ont été alertées.",
  //     location: 'Douala, Bepanda',
  //     type: 'Abus',
  //     image_url: '',
  //     createdAt: new Date(Date.now() - 86400000).toISOString(),
  //     commentCount: 27,
  //   },
  //   {
  //     _id: '3',
  //     author_id: 'u3',
  //     authorPseudo: 'AssocProtection',
  //     isAnonymous: false,
  //     title: "Sensibilisation : reconnaître les signes d'abus sur un enfant",
  //     content:
  //       "Il est crucial que chaque citoyen sache identifier les signaux d'alerte. Un enfant en danger peut présenter des signes physiques ou comportementaux. Voici un guide pratique pour agir.",
  //     location: 'National',
  //     type: 'Prevention',
  //     image_url: '',
  //     createdAt: new Date(Date.now() - 172800000).toISOString(),
  //     commentCount: 45,
  //   },
  //   {
  //     _id: '4',
  //     author_id: 'u4',
  //     authorPseudo: 'Anonyme',
  //     isAnonymous: true,
  //     title: 'Disparition signalée – Garçon de 11 ans – Bafoussam',
  //     content:
  //       'Un enfant répond au prénom de Kevin et aurait disparu depuis vendredi dernier. Dernier lieu connu : école primaire de Bafoussam. Les parents sont désespérés.',
  //     location: 'Bafoussam',
  //     type: 'Disparition',
  //     image_url: '',
  //     createdAt: new Date(Date.now() - 259200000).toISOString(),
  //     commentCount: 8,
  //   },
  //   {
  //     _id: '5',
  //     author_id: 'u5',
  //     authorPseudo: 'JuristeCam',
  //     isAnonymous: false,
  //     title: 'Vos droits face aux abus : guide juridique pour les familles',
  //     content:
  //       "En tant que citoyen, vous pouvez signaler tout abus à l'encontre d'un mineur auprès du tribunal de grande instance. Voici les démarches à suivre pour une plainte efficace.",
  //     location: 'National',
  //     type: 'Prevention',
  //     image_url: '',
  //     createdAt: new Date(Date.now() - 345600000).toISOString(),
  //     commentCount: 19,
  //   },
  //   {
  //     _id: '6',
  //     author_id: 'u6',
  //     authorPseudo: 'AlerteNord',
  //     isAnonymous: false,
  //     title: 'Alerte enlèvement – Jumelles disparues – Garoua',
  //     content:
  //       'Deux fillettes jumelles âgées de 6 ans ont disparu de leur domicile familial à Garoua. Leurs parents lancent un appel à tous les citoyens.',
  //     location: 'Garoua',
  //     type: 'Disparition',
  //     image_url: '',
  //     createdAt: new Date(Date.now() - 7200000).toISOString(),
  //     commentCount: 34,
  //   },
  // ];

  filteredPosts = computed(() => {
    let result = this.posts();
    // Masquer les résolues par défaut
    if (!this.showResolved()) {
      result = result.filter(p => p.isResolved !== true);
    }
    if (this.filterType())
      result = result.filter((p) => p.type === this.filterType());
    if (this.filterLocation())
      result = result.filter((p) =>
        p.location.toLowerCase().includes(this.filterLocation().toLowerCase()),
      );
    if (this.searchQuery())
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
          p.content.toLowerCase().includes(this.searchQuery().toLowerCase()),
      );
    if (this.findSimilar()) {
      const similarItems = this.findSimilar()?.results ?? [];
      const scoreById = new Map<string, number>();
      similarItems.forEach((similar) => scoreById.set(similar._id, similar.score ?? 0));

      result = result
        .filter((p) => scoreById.has(p._id))
        .sort((a, b) => (scoreById.get(b._id) ?? 0) - (scoreById.get(a._id) ?? 0));
    }
    return result;
  });

  urgentPosts = computed(() =>
    this.posts().filter(
      (p) => p.type === 'Disparition' || p.type === "Appel à l'aide",
    ),
  );

  resolvedCount = computed(() => this.posts().filter(p => p.isResolved === true).length);

  stats = computed(() => ({
    total: this.posts().length,
    disparitions: this.posts().filter((p) => p.type === 'Disparition').length,
    abus: this.posts().filter((p) => p.type === 'Abus').length,
    prevention: this.posts().filter((p) => p.type === 'Prevention').length,
    appels: this.posts().filter((p) => p.type === "Appel à l'aide").length,
  }));

  // ── HERO SLIDER ────────────────────────────────────────────────────
  currentSlide = signal(0);
  private slideInterval: any;

  get heroSlides() {
    return [
      {
        type: 'Disparition',
        icon: 'fa-triangle-exclamation',
        color: 'slide-disparition',
        title: this.translate.instant('HOME.SLIDE1_TITLE'),
        subtitle: this.translate.instant('HOME.SLIDE1_SUBTITLE'),
        cta: this.translate.instant('HOME.SLIDE1_CTA'),
        ctaRoute: '/posts/new',
        ctaIcon: 'fa-triangle-exclamation',
      },
      {
        type: 'Abus',
        icon: 'fa-shield-exclamation',
        color: 'slide-abus',
        title: this.translate.instant('HOME.SLIDE2_TITLE'),
        subtitle: this.translate.instant('HOME.SLIDE2_SUBTITLE'),
        cta: this.translate.instant('HOME.SLIDE2_CTA'),
        ctaRoute: '/posts/new',
        ctaIcon: 'fa-shield-exclamation',
      },
      {
        type: "Appel à l'aide",
        icon: 'fa-hand-holding-heart',
        color: 'slide-appel',
        title: this.translate.instant('HOME.SLIDE3_TITLE'),
        subtitle: this.translate.instant('HOME.SLIDE3_SUBTITLE'),
        cta: this.translate.instant('HOME.SLIDE3_CTA'),
        ctaRoute: '/posts/new',
        ctaIcon: 'fa-hand-holding-heart',
      },
      {
        type: 'Prévention',
        icon: 'fa-circle-info',
        color: 'slide-prevention',
        title: this.translate.instant('HOME.SLIDE4_TITLE'),
        subtitle: this.translate.instant('HOME.SLIDE4_SUBTITLE'),
        cta: this.translate.instant('HOME.SLIDE4_CTA'),
        ctaRoute: '/posts/new',
        ctaIcon: 'fa-circle-info',
      },
    ];
  }

  startSlider(): void {
    this.slideInterval = setInterval(() => {
      this.currentSlide.update((i) => (i + 1) % this.heroSlides.length);
    }, 4000);
  }

  stopSlider(): void {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  goToSlide(index: number): void {
    this.stopSlider();
    this.currentSlide.set(index);
    this.startSlider();
  }

  constructor(
    private postService: PostService,
    public auth: AuthService,
    private http: HttpClient,
    private tracking: TrackingService,
    public pwa: PwaInstallService,
    private translate: TranslateService,
  ) {
  }

  ngOnInit(): void {
    this.startSlider();
    this.loadAppDownloadCount();
    // Hors-ligne, le Service Worker sert la dernière version en cache (dataGroups) :
    // on tente donc toujours la requête, le repli se fait dans loadPosts().
    this.loadPosts();
  }

  private loadPosts(): void {
    this.loading.set(true);
    this.postService.getAllPosts({ sort: this.sortMode() }).subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  /** Bascule entre le tri par fiabilité et le tri chronologique. */
  toggleSort(): void {
    this.sortMode.update((m) => (m === 'reliability' ? 'recent' : 'reliability'));
    this.loadPosts();
  }

  ngOnDestroy(): void {
    this.stopSlider();
  }

  setFilter(type: string) {
    this.filterType.set(this.filterType() === type ? '' : type);
    this.startSearch();
  }

  clearFilters() {
    this.filterType.set('');
    this.filterLocation.set('');
    this.searchQuery.set('');
    this.imageSearchFile.set(null);
    this.imageSearchPreview.set(null);
    this.imageSearchNotice.set(null);
    this.imageSearchRequestId++;
    this.findSimilar.set(null);
    this.showResolved.set(false);
    this.startSearch();
  }

  toggleShowResolved(): void {
    this.showResolved.set(!this.showResolved());
  }

  onSearchQueryChange(value: string) {
    this.searchQuery.set(value);
    this.startSearch();
  }

  onLocationChange(value: string) {
    this.filterLocation.set(value);
    this.startSearch();
  }

  startSearch() {
    this.searching.set(true);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => this.searching.set(false), 250);
  }

  loadAppDownloadCount(): void {
    this.http.get<{ count: number }>(`${this.API}/app-download`).subscribe({
      next: (res) => this.appDownloadCount.set(res.count ?? 0),
      error: () => this.appDownloadCount.set(0),
    });
  }

  onAppDownloadClick(): void {
    this.pwa.handleInstallClick();
  }

  closeApkModal(): void {
    this.pwa.closeIosModal();
  }

  async onImageSearchUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.resetImageSearch();
      return;
    }

    // La recherche par visage est réservée aux comptes connectés : on évite
    // un aller-retour réseau inutile et on explique pourquoi.
    if (!this.auth.isAuthenticated()) {
      input.value = '';
      this.imageSearchNotice.set(
        this.translate.instant('HOME.IMAGE_SEARCH_LOGIN_REQUIRED'),
      );
      return;
    }

    this.imageSearchNotice.set(null);
    this.imageSearchFile.set(file);
    this.searching.set(true);
    this.tracking.trackEvent('image_search_performed');

    // Aperçu immédiat : l'utilisateur voit sa photo pendant l'analyse.
    const reader = new FileReader();
    reader.onload = () => this.imageSearchPreview.set(reader.result as string);
    reader.readAsDataURL(file);

    // Numéro de requête : si l'utilisateur choisit une autre photo entre
    // temps, la réponse précédente est ignorée (plus de résultats qui
    // « changent tout seuls »).
    const requestId = ++this.imageSearchRequestId;

    const payload = await this.prepareImage(file);
    if (requestId !== this.imageSearchRequestId) return;

    const formData = new FormData();
    formData.append('image', payload);

    this.http
      .post<ImageSearchResponse>(`${this.API}/search-by-image`, formData)
      .subscribe({
        next: (result) => {
          if (requestId !== this.imageSearchRequestId) return;
          this.findSimilar.set(result);
          this.searching.set(false);
          this.applyImageSearchOutcome(result);
        },
        error: (err) => {
          if (requestId !== this.imageSearchRequestId) return;
          console.error('Erreur lors de la recherche par image:', err);
          this.findSimilar.set(null);
          this.searching.set(false);

          if (err?.status === 401) {
            input.value = '';
            this.imageSearchFile.set(null);
            this.imageSearchPreview.set(null);
            this.imageSearchNotice.set(
              this.translate.instant('HOME.IMAGE_SEARCH_LOGIN_REQUIRED'),
            );
          } else if (err?.status === 429) {
            this.imageSearchNotice.set(
              this.translate.instant('HOME.IMAGE_SEARCH_TOO_MANY'),
            );
          } else {
            this.imageSearchNotice.set(
              this.translate.instant('HOME.IMAGE_SEARCH_ERROR'),
            );
          }
        },
      });
  }

  /**
   * Réduit la photo avant l'envoi. Une photo de téléphone pèse souvent 3–5 Mo :
   * l'envoi et le décodage prennent plusieurs secondes, alors que 1080 px
   * suffisent à la détection de visage.
   */
  private async prepareImage(file: File): Promise<File> {
    try {
      const mod = await import('browser-image-compression' as any).catch(
        () => null,
      );
      const compress = mod?.default ?? mod;
      if (!compress) return file;

      const compressed = await compress(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });
      return new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
      });
    } catch {
      return file;
    }
  }

  /** Explique un résultat vide (pas de visage, pas de correspondance, panne). */
  private applyImageSearchOutcome(result: ImageSearchResponse) {
    if ((result?.results?.length ?? 0) > 0) {
      this.imageSearchNotice.set(null);
      return;
    }

    const key =
      result?.reason === 'no_face'
        ? 'HOME.IMAGE_SEARCH_NO_FACE'
        : result?.reason === 'unavailable'
          ? 'HOME.IMAGE_SEARCH_UNAVAILABLE'
          : 'HOME.IMAGE_SEARCH_NO_MATCH';

    this.imageSearchNotice.set(this.translate.instant(key));
  }

  private resetImageSearch() {
    this.imageSearchRequestId++;
    this.imageSearchFile.set(null);
    this.imageSearchPreview.set(null);
    this.imageSearchNotice.set(null);
    this.findSimilar.set(null);
    this.searching.set(false);
  }

  removeImageSearch() {
    this.resetImageSearch();

    // Réinitialise l'input pour pouvoir re-sélectionner le même fichier.
    const input = document.getElementById('img-input') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  trackByPost(_: number, post: Post) {
    return post._id;
  }
}
