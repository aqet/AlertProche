import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PostService } from '../../core/services/post.service';
import { Post, PostType } from '../../core/models/post.model';
import { PostCardComponent } from '../../shared/post-card/post-card.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PostCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  posts = signal<Post[]>([]);
  loading = signal(true);
  error = signal('');

  filterType = signal<string>('');
  filterLocation = signal('');
  searchQuery = signal('');

  isAuth = computed(() => this.auth.isAuthenticated());

  // Mock data for demo (will be replaced by API)
  private mockPosts: Post[] = [
    {
      _id: '1', author_id: 'u1', authorPseudo: 'Marie_Cam', isAnonymous: false,
      title: 'URGENT – Disparition de Tchinda Noémie, 8 ans – Yaoundé Centre',
      content: 'Ma fille Noémie a disparu hier soir vers 18h dans le quartier Melen à Yaoundé. Elle portait une robe rose et des sandales blanches. Toute information est la bienvenue. Contactez la famille immédiatement.',
      location: 'Yaoundé, Melen', type: 'Disparition', image_url: '',
      createdAt: new Date(Date.now() - 3600000).toISOString(), commentCount: 12
    },
    {
      _id: '2', author_id: 'u2', authorPseudo: 'CitoyenDouala', isAnonymous: false,
      title: 'Témoignage : réseau de travail d\'enfants démantelé à Douala Bepanda',
      content: 'J\'ai été témoin d\'une situation préoccupante dans le quartier Bepanda. Des enfants âgés de 7 à 12 ans travaillaient dans des conditions inhumaines. Les autorités ont été alertées.',
      location: 'Douala, Bepanda', type: 'Abus', image_url: '',
      createdAt: new Date(Date.now() - 86400000).toISOString(), commentCount: 27
    },
    {
      _id: '3', author_id: 'u3', authorPseudo: 'AssocProtection', isAnonymous: false,
      title: 'Sensibilisation : reconnaître les signes d\'abus sur un enfant',
      content: 'Il est crucial que chaque citoyen sache identifier les signaux d\'alerte. Un enfant en danger peut présenter des signes physiques ou comportementaux. Voici un guide pratique pour agir.',
      location: 'National', type: 'Prevention', image_url: '',
      createdAt: new Date(Date.now() - 172800000).toISOString(), commentCount: 45
    },
    {
      _id: '4', author_id: 'u4', authorPseudo: 'Anonyme', isAnonymous: true,
      title: 'Disparition signalée – Garçon de 11 ans – Bafoussam',
      content: 'Un enfant répond au prénom de Kevin et aurait disparu depuis vendredi dernier. Dernier lieu connu : école primaire de Bafoussam. Les parents sont désespérés.',
      location: 'Bafoussam', type: 'Disparition', image_url: '',
      createdAt: new Date(Date.now() - 259200000).toISOString(), commentCount: 8
    },
    {
      _id: '5', author_id: 'u5', authorPseudo: 'JuristeCam', isAnonymous: false,
      title: 'Vos droits face aux abus : guide juridique pour les familles',
      content: 'En tant que citoyen, vous pouvez signaler tout abus à l\'encontre d\'un mineur auprès du tribunal de grande instance. Voici les démarches à suivre pour une plainte efficace.',
      location: 'National', type: 'Prevention', image_url: '',
      createdAt: new Date(Date.now() - 345600000).toISOString(), commentCount: 19
    },
    {
      _id: '6', author_id: 'u6', authorPseudo: 'AlerteNord', isAnonymous: false,
      title: 'Alerte enlèvement – Jumelles disparues – Garoua',
      content: 'Deux fillettes jumelles âgées de 6 ans ont disparu de leur domicile familial à Garoua. Leurs parents lancent un appel à tous les citoyens.',
      location: 'Garoua', type: 'Disparition', image_url: '',
      createdAt: new Date(Date.now() - 7200000).toISOString(), commentCount: 34
    }
  ];

  filteredPosts = computed(() => {
    let result = this.posts();
    if (this.filterType()) result = result.filter(p => p.type === this.filterType());
    if (this.filterLocation()) result = result.filter(p => p.location.toLowerCase().includes(this.filterLocation().toLowerCase()));
    if (this.searchQuery()) result = result.filter(p =>
      p.title.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
      p.content.toLowerCase().includes(this.searchQuery().toLowerCase())
    );
    return result;
  });

  urgentPosts = computed(() => this.posts().filter(p => p.type === 'Disparition'));

  stats = computed(() => ({
    total: this.posts().length,
    disparitions: this.posts().filter(p => p.type === 'Disparition').length,
    abus: this.posts().filter(p => p.type === 'Abus').length,
    prevention: this.posts().filter(p => p.type === 'Prevention').length
  }));

  constructor(private postService: PostService, public auth: AuthService) {}

  ngOnInit(): void {
    // Try API, fallback to mock data
    this.postService.getAllPosts().subscribe({
      next: (posts) => { this.posts.set(posts); this.loading.set(false); },
      error: () => {
        this.posts.set(this.mockPosts);
        this.loading.set(false);
      }
    });
  }

  setFilter(type: string) {
    this.filterType.set(this.filterType() === type ? '' : type);
  }

  clearFilters() {
    this.filterType.set('');
    this.filterLocation.set('');
    this.searchQuery.set('');
  }

  trackByPost(_: number, post: Post) { return post._id; }
}
