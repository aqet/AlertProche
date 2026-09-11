import {
  Component, OnInit, signal, inject, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FeedService, FeedPost } from '../../../core/services/feed.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-feed-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed-detail.component.html',
  styleUrls:   ['./feed-detail.component.css'],
})
export class FeedDetailComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private feedSvc  = inject(FeedService);
  private auth     = inject(AuthService);

  post           = signal<FeedPost | null>(null);
  loading        = signal(true);
  error          = signal('');
  comments       = signal<any[]>([]);
  commentsLoading = signal(false);
  commentText    = signal('');
  commentLoading = signal(false);
  liked          = signal(false);
  lightboxUrl    = signal<string | null>(null);
  lightboxType   = signal<'image' | 'video'>('image');
  lightboxIndex  = signal(0);

  isAuth       = computed(() => this.auth.isAuthenticated());
  currentUser  = computed(() => this.auth.currentUser());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/feed']); return; }

    this.feedSvc.getPostById(id).subscribe({
      next: (post) => {
        this.post.set(post);
        this.loading.set(false);
        // Vérifier si l'utilisateur a liké ce post
        const uid = this.currentUser()?._id;
        if (uid) {
          this.liked.set(post.likedBy?.includes(uid) ?? false);
        }
        // Charger les commentaires
        this.loadComments(id);
      },
      error: () => {
        this.error.set('Publication introuvable.');
        this.loading.set(false);
      },
    });
  }

  loadComments(postId: string): void {
    this.commentsLoading.set(true);
    this.feedSvc.getComments(postId).subscribe({
      next:  (c) => { this.comments.set(c); this.commentsLoading.set(false); },
      error: () => this.commentsLoading.set(false),
    });
  }

  toggleLike(): void {
    const p = this.post();
    if (!p || !this.isAuth()) return;
    const wasLiked = this.liked();
    this.liked.set(!wasLiked);
    this.post.update(post => post
      ? { ...post, likesCount: wasLiked ? post.likesCount - 1 : post.likesCount + 1 }
      : post
    );
    this.feedSvc.toggleLike(p._id).subscribe({
      error: () => {
        this.liked.set(wasLiked);
        this.post.update(post => post
          ? { ...post, likesCount: wasLiked ? post.likesCount + 1 : post.likesCount - 1 }
          : post
        );
      },
    });
  }

  submitComment(): void {
    const text = this.commentText().trim();
    const p    = this.post();
    if (!text || !p || this.commentLoading()) return;

    this.commentLoading.set(true);
    this.feedSvc.addComment(p._id, text).subscribe({
      next: (comment) => {
        this.comments.update(c => [...c, comment]);
        this.post.update(post => post ? { ...post, commentsCount: post.commentsCount + 1 } : post);
        this.commentText.set('');
        this.commentLoading.set(false);
      },
      error: () => this.commentLoading.set(false),
    });
  }

  sharePost(): void {
    const p = this.post();
    if (!p) return;
    const apiBase   = environment.apiUrl.replace(/\/api$/, '');
    const shareUrl  = `${apiBase}/share/feed/${p._id}`;
    const frontendUrl = `${window.location.origin}/feed/${p._id}`;

    if (navigator.share) {
      navigator.share({
        title: `${p.author.pseudo} sur AlertProche`,
        text:  p.content?.slice(0, 100) || '',
        url:   shareUrl,
      }).catch(() => navigator.clipboard.writeText(frontendUrl).catch(() => {}));
    } else {
      navigator.clipboard.writeText(frontendUrl).catch(() => {});
    }
    this.feedSvc.incrementShares(p._id).subscribe({ error: () => {} });
    this.post.update(post => post ? { ...post, sharesCount: (post.sharesCount ?? 0) + 1 } : post);
  }

  openLightbox(url: string, type: 'image' | 'video', index = 0): void {
    this.lightboxUrl.set(url);
    this.lightboxType.set(type);
    this.lightboxIndex.set(index);
  }

  closeLightbox(): void { this.lightboxUrl.set(null); }

  getMediaType(post: FeedPost, index: number): 'image' | 'video' {
    const types = post.mediaFileTypes;
    if (types && types[index]) return types[index] as 'image' | 'video';
    return post.mediaType === 'video' ? 'video' : 'image';
  }

  getTimeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)      return 'À l\'instant';
    if (diff < 3600)    return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400)   return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 2592000) return `Il y a ${Math.floor(diff / 86400)} j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/feed']);
    }
  }
}
