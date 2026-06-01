import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PostService } from '../../core/services/post.service';
import { CommentService } from '../../core/services/comment.service';
import { AuthService } from '../../core/services/auth.service';
import { Post } from '../../core/models/post.model';
import { Comment } from '../../core/models/comment.model';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MediaUrlPipe],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.css']
})
export class PostDetailComponent implements OnInit {
  post = signal<Post | null>(null);
  comments = signal<Comment[]>([]);
  loading = signal(true);
  commentsLoading = signal(true);
  error = signal('');
  commentError = signal('');
  commentSuccess = signal(false);
  submittingComment = signal(false);
  imageModalOpen = signal(false);

  shareSuccess = signal(false);
  reportModalOpen = signal(false);
  reportReason = signal('');
  reportSubmitted = signal(false);
  reportLoading = signal(false);
  isAlreadyReported = signal(false);

  commentForm: FormGroup;
  isAuth = computed(() => this.auth.isAuthenticated());
  currentUser = computed(() => this.auth.currentUser());

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    private commentService: CommentService,
    public auth: AuthService,
    private fb: FormBuilder
  ) {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(10)]],
      isAnonymous: [false]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;

    this.postService.getPostById(id).subscribe({
      next: (p) => {
        this.post.set(p);
        this.loading.set(false);
        // isReported vient directement du backend dans le champ du post
        this.isAlreadyReported.set(!!(p as any).isReported);
      },
      error: () => {
        this.error.set('Publication introuvable.');
        this.loading.set(false);
      }
    });

    this.commentService.getCommentsByPost(id).subscribe({
      next: (c) => { this.comments.set(c); this.commentsLoading.set(false); },
      error: () => { this.commentsLoading.set(false); }
    });
  }

  openImageModal(): void { this.imageModalOpen.set(true); }

  getBadgeClass(): string {
    const map: Record<string, string> = {
      'Disparition': 'badge-disparition',
      'Abus': 'badge-abus',
      'Prevention': 'badge-prevention',
      'Appel à l\'aide': 'badge-appel'
    };
    return map[this.post()?.type || ''] || '';
  }

  getBadgeIcon(): string {
    const map: Record<string, string> = {
      'Disparition': 'fa-triangle-exclamation',
      'Abus': 'fa-shield-exclamation',
      'Prevention': 'fa-circle-info',
      'Appel à l\'aide': 'fa-hand-holding-heart'
    };
    return map[this.post()?.type || ''] || 'fa-circle';
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

  submitComment(): void {
    if (this.commentForm.invalid) { this.commentForm.markAllAsTouched(); return; }
    this.submittingComment.set(true);
    this.commentError.set('');
    const postId = this.post()?._id || '';

    this.commentService.createComment(postId, this.commentForm.value).subscribe({
      next: (c) => {
        this.comments.update(arr => [...arr, c]);
        this.post.update(p => p ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p);
        this.commentForm.reset({ content: '', isAnonymous: false });
        this.submittingComment.set(false);
        this.commentSuccess.set(true);
        setTimeout(() => this.commentSuccess.set(false), 3000);
      },
      error: (err) => {
        this.submittingComment.set(false);
        this.commentError.set(err?.error?.message || 'Erreur lors de la publication du commentaire.');
      }
    });
  }

  deleteComment(id: string): void {
    this.commentService.deleteComment(id).subscribe({
      next: () => {
        this.comments.update(arr => arr.filter(c => c._id !== id));
        this.post.update(p => p ? { ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) } : p);
      },
      error: () => {}
    });
  }

  canDeleteComment(comment: Comment): boolean {
    const user = this.currentUser();
    return !!user && (user._id === comment.author_id || user.role === 'Admin' || user.role === 'Moderateur');
  }

  sharePost(): void {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: this.post()?.title || 'AlertProche', url })
        .catch(() => this.copyToClipboard(url));
    } else {
      this.copyToClipboard(url);
    }
  }

  private copyToClipboard(url: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.shareSuccess.set(true);
        setTimeout(() => this.shareSuccess.set(false), 3000);
      }).catch(() => this.legacyCopy(url));
    } else {
      this.legacyCopy(url);
    }
  }

  private legacyCopy(url: string): void {
    const el = document.createElement('textarea');
    el.value = url;
    el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(el);
    el.focus(); el.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(el);
    this.shareSuccess.set(true);
    setTimeout(() => this.shareSuccess.set(false), 3000);
  }

  openReportModal(): void {
    if (!this.isAuth()) { this.router.navigate(['/auth']); return; }
    this.reportModalOpen.set(true);
    this.reportReason.set('');
    this.reportSubmitted.set(false);
  }

  closeReportModal(): void { this.reportModalOpen.set(false); }

  submitReport(): void {
    if (!this.reportReason()) return;
    this.reportLoading.set(true);
    const id = this.post()?._id || '';
    // Passer la raison au backend
    this.postService.reportPost(id, this.reportReason()).subscribe({
      next: () => {
        this.reportLoading.set(false);
        this.reportSubmitted.set(true);
        this.isAlreadyReported.set(true);
        setTimeout(() => this.reportModalOpen.set(false), 2000);
      },
      error: () => { this.reportLoading.set(false); }
    });
  }

  trackByComment(_: number, c: Comment): string { return c._id; }
}
