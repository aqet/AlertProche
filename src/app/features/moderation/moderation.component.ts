import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { Post } from '../../core/models/post.model';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

type ModTab = 'reported' | 'disabled';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule, RouterLink, MediaUrlPipe],
  templateUrl: './moderation.component.html',
  styleUrls: ['./moderation.component.css']
})
export class ModerationComponent implements OnInit {
  activeTab = signal<ModTab>('reported');

  reportedPosts = signal<Post[]>([]);
  disabledPosts = signal<Post[]>([]);
  allPosts = signal<Post[]>([]);

  loading = signal(true);

  user = computed(() => this.auth.currentUser());
  isAdmin = computed(() => this.user()?.role === 'Admin');

  reportedCount = computed(() => this.reportedPosts().length);
  disabledCount = computed(() => this.disabledPosts().length);

  constructor(
    private postService: PostService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    // Charger les posts signalés depuis le backend
    this.postService.getReportedPosts().subscribe({
      next: (posts) => {
        this.reportedPosts.set(posts);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });

    // Charger tous les posts pour trouver les désactivés
    this.postService.getAllPosts().subscribe({
      next: (posts) => {
        this.allPosts.set(posts);
        this.disabledPosts.set(posts.filter(p => p.isActive === false));
      },
      error: () => {}
    });
  }

  setTab(tab: ModTab) { this.activeTab.set(tab); }

  toggleActive(post: Post): void {
    this.postService.togglePostActive(post._id).subscribe({
      next: (updated) => {
        // Mettre à jour toutes les listes
        this.allPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
        this.disabledPosts.set(this.allPosts().filter(p => p.isActive === false));
        this.reportedPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
      },
      error: () => {}
    });
  }

  clearReport(post: Post): void {
    this.postService.clearReport(post._id).subscribe({
      next: () => {
        // Retirer de la liste des signalés
        this.reportedPosts.update(arr => arr.filter(p => p._id !== post._id));
      },
      error: () => {}
    });
  }

  deletePost(post: Post): void {
    this.postService.deletePost(post._id).subscribe({
      next: () => {
        this.allPosts.update(arr => arr.filter(p => p._id !== post._id));
        this.reportedPosts.update(arr => arr.filter(p => p._id !== post._id));
        this.disabledPosts.update(arr => arr.filter(p => p._id !== post._id));
      },
      error: () => {}
    });
  }

  isPostReported(post: Post): boolean {
    return !!(post as any).isReported;
  }

  getBadgeClass(type: string): string {
    const map: Record<string, string> = {
      'Disparition': 'badge-disparition', 'Abus': 'badge-abus', 'Prevention': 'badge-prevention'
    };
    return map[type] || '';
  }

  getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 2592000) return `Il y a ${Math.floor(diff / 86400)} j`;
    return date.toLocaleDateString('fr-FR');
  }

  trackByPost(_: number, p: Post) { return p._id; }
}
