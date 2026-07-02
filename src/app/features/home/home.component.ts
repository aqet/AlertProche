import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PostService } from '../../core/services/post.service';
import { Post, PostType } from '../../core/models/post.model';
import { PostCardComponent } from '../../shared/post-card/post-card.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TrackingService } from '../../core/services/tracking.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PostCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly API = `${environment.apiUrl}/posts`;
  posts = signal<Post[]>([]);
  loading = signal(true);
  error = signal('');

  findSimilar = signal<any>(null);

  filterType = signal<string>('');
  filterLocation = signal('');
  searchQuery = signal('');
  imageSearchFile = signal<File | null>(null);
  imageSearchPreview = signal<string | null>(null);
  searching = signal(false);
  private searchTimeout: any;

  isAuth = computed(() => this.auth.isAuthenticated());

  // Mock data for demo (will be replaced by API)
  private mockPosts: Post[] = [
    {
      _id: '1',
      author_id: 'u1',
      authorPseudo: 'Marie_Cam',
      isAnonymous: false,
      title: 'URGENT – Disparition de Tchinda Noémie, 8 ans – Yaoundé Centre',
      content:
        'Ma fille Noémie a disparu hier soir vers 18h dans le quartier Melen à Yaoundé. Elle portait une robe rose et des sandales blanches. Toute information est la bienvenue. Contactez la famille immédiatement.',
      location: 'Yaoundé, Melen',
      type: 'Disparition',
      image_url: '',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      commentCount: 12,
    },
    {
      _id: '2',
      author_id: 'u2',
      authorPseudo: 'CitoyenDouala',
      isAnonymous: false,
      title:
        "Témoignage : réseau de travail d'enfants démantelé à Douala Bepanda",
      content:
        "J'ai été témoin d'une situation préoccupante dans le quartier Bepanda. Des enfants âgés de 7 à 12 ans travaillaient dans des conditions inhumaines. Les autorités ont été alertées.",
      location: 'Douala, Bepanda',
      type: 'Abus',
      image_url: '',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      commentCount: 27,
    },
    {
      _id: '3',
      author_id: 'u3',
      authorPseudo: 'AssocProtection',
      isAnonymous: false,
      title: "Sensibilisation : reconnaître les signes d'abus sur un enfant",
      content:
        "Il est crucial que chaque citoyen sache identifier les signaux d'alerte. Un enfant en danger peut présenter des signes physiques ou comportementaux. Voici un guide pratique pour agir.",
      location: 'National',
      type: 'Prevention',
      image_url: '',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      commentCount: 45,
    },
    {
      _id: '4',
      author_id: 'u4',
      authorPseudo: 'Anonyme',
      isAnonymous: true,
      title: 'Disparition signalée – Garçon de 11 ans – Bafoussam',
      content:
        'Un enfant répond au prénom de Kevin et aurait disparu depuis vendredi dernier. Dernier lieu connu : école primaire de Bafoussam. Les parents sont désespérés.',
      location: 'Bafoussam',
      type: 'Disparition',
      image_url: '',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      commentCount: 8,
    },
    {
      _id: '5',
      author_id: 'u5',
      authorPseudo: 'JuristeCam',
      isAnonymous: false,
      title: 'Vos droits face aux abus : guide juridique pour les familles',
      content:
        "En tant que citoyen, vous pouvez signaler tout abus à l'encontre d'un mineur auprès du tribunal de grande instance. Voici les démarches à suivre pour une plainte efficace.",
      location: 'National',
      type: 'Prevention',
      image_url: '',
      createdAt: new Date(Date.now() - 345600000).toISOString(),
      commentCount: 19,
    },
    {
      _id: '6',
      author_id: 'u6',
      authorPseudo: 'AlerteNord',
      isAnonymous: false,
      title: 'Alerte enlèvement – Jumelles disparues – Garoua',
      content:
        'Deux fillettes jumelles âgées de 6 ans ont disparu de leur domicile familial à Garoua. Leurs parents lancent un appel à tous les citoyens.',
      location: 'Garoua',
      type: 'Disparition',
      image_url: '',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      commentCount: 34,
    },
  ];

  filteredPosts = computed(() => {
    let result = this.posts();
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
      const similarItems = this.findSimilar();
      const scoreById = new Map<string, number>();
      similarItems.forEach((similar: any) => scoreById.set(similar._id, similar.score ?? 0));

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

  readonly heroSlides = [
    {
      type: 'Disparition',
      icon: 'fa-triangle-exclamation',
      color: 'slide-disparition',
      title: 'Chaque disparition mérite une réponse.',
      subtitle:
        'Publiez un avis de recherche, mobilisez la communauté et retrouvez les personnes disparues.',
      cta: 'Signaler une disparition',
      ctaRoute: '/posts/new',
      ctaIcon: 'fa-triangle-exclamation',
    },
    {
      type: 'Abus',
      icon: 'fa-shield-exclamation',
      color: 'slide-abus',
      title: "Ensemble contre les abus et l'exploitation.",
      subtitle:
        'Témoignez, signalez et protégez les enfants et personnes vulnérables contre toute forme de maltraitance.',
      cta: 'Signaler un abus',
      ctaRoute: '/posts/new',
      ctaIcon: 'fa-shield-exclamation',
    },
    {
      type: "Appel à l'aide",
      icon: 'fa-hand-holding-heart',
      color: 'slide-appel',
      title: 'Une personne a besoin de vous.',
      subtitle:
        'Personne hospitalisée sans famille identifiée, individu en détresse — votre aide peut changer une vie.',
      cta: "Lancer un appel à l'aide",
      ctaRoute: '/posts/new',
      ctaIcon: 'fa-hand-holding-heart',
    },
    {
      type: 'Prévention',
      icon: 'fa-circle-info',
      color: 'slide-prevention',
      title: "Informer, c'est aussi protéger.",
      subtitle:
        'Partagez des guides, des conseils juridiques et des ressources pour sensibiliser la communauté.',
      cta: 'Publier une prévention',
      ctaRoute: '/posts/new',
      ctaIcon: 'fa-circle-info',
    },
  ];

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
  ) {}

  ngOnInit(): void {
    this.startSlider();
    this.postService.getAllPosts().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.loading.set(false);
      },
      error: () => {
        this.posts.set(this.mockPosts);
        this.loading.set(false);
      },
    });
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
    this.findSimilar.set(null);
    this.startSearch();
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

  onImageSearchUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.imageSearchFile.set(null);
      this.imageSearchPreview.set(null);
      this.findSimilar.set(null);
      return;
    }

    this.imageSearchFile.set(file);
    this.tracking.trackEvent('image_search_performed');
    this.searching.set(true);
    const formData = new FormData();
    formData.append('image', file);

    this.http.post(`${this.API}/search-by-image`, formData).subscribe({
      next: (result) => {
        this.findSimilar.set(result);
        this.searching.set(false);
      },
      error: (err) => {
        console.error('Erreur lors de la recherche par image:', err);
        this.findSimilar.set(null);
        this.searching.set(false);
      }
    });

    const reader = new FileReader();
    reader.onload = () => this.imageSearchPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeImageSearch() {
    this.imageSearchFile.set(null);
    this.imageSearchPreview.set(null);
  }

  trackByPost(_: number, post: Post) {
    return post._id;
  }
}
