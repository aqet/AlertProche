import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PostService } from '../../core/services/post.service';
import { CommentService } from '../../core/services/comment.service';
import { AuthService } from '../../core/services/auth.service';
import { Post } from '../../core/models/post.model';
import { Comment } from '../../core/models/comment.model';

type DashTab = 'posts' | 'comments' | 'profile';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  activeTab = signal<DashTab>('posts');
  myPosts = signal<Post[]>([]);
  myComments = signal<Comment[]>([]);
  loadingPosts = signal(true);
  loadingComments = signal(true);

  editingPost = signal<Post | null>(null);
  deletingPostId = signal<string | null>(null);
  deletingCommentId = signal<string | null>(null);

  profileForm: FormGroup;
  profileLoading = signal(false);
  profileSuccess = signal('');
  profileError = signal('');

  postEditForm: FormGroup;
  editLoading = signal(false);
  editError = signal('');

  user = computed(() => this.auth.currentUser());

  canModerate = computed(() => {
    const u = this.user();
    return u?.role === 'Admin' || u?.role === 'Moderateur';
  });

  stats = computed(() => ({
    posts: this.myPosts().length,
    disparitions: this.myPosts().filter(p => p.type === 'Disparition').length,
    comments: this.myComments().length,
  }));

  constructor(
    private postService: PostService,
    private commentService: CommentService,
    public auth: AuthService,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      pseudo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]]
    });

    this.postEditForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(150)]],
      content: ['', [Validators.required, Validators.minLength(30)]],
      location: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const u = this.user();
    if (u) {
      this.profileForm.patchValue({ pseudo: u.pseudo });
    }

    this.postService.getMyPosts().subscribe({
      next: (posts) => { this.myPosts.set(posts); this.loadingPosts.set(false); },
      error: () => { this.loadingPosts.set(false); }
    });

    this.commentService.getMyComments().subscribe({
      next: (comments) => { this.myComments.set(comments); this.loadingComments.set(false); },
      error: () => { this.loadingComments.set(false); }
    });
  }

  setTab(tab: DashTab) {
    this.activeTab.set(tab);
    this.editingPost.set(null);
  }

  // --- Post CRUD ---
  startEditPost(post: Post) {
    this.editingPost.set(post);
    this.postEditForm.patchValue({
      title: post.title,
      content: post.content,
      location: post.location
    });
    this.editError.set('');
  }

  cancelEdit() {
    this.editingPost.set(null);
    this.editError.set('');
  }

  saveEdit() {
    if (this.postEditForm.invalid) { this.postEditForm.markAllAsTouched(); return; }
    const post = this.editingPost();
    if (!post) return;
    this.editLoading.set(true);
    this.postService.updatePost(post._id, this.postEditForm.value).subscribe({
      next: (updated) => {
        this.myPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
        this.editingPost.set(null);
        this.editLoading.set(false);
      },
      error: (err) => {
        this.editError.set(err?.error?.message || 'Erreur lors de la mise à jour.');
        this.editLoading.set(false);
      }
    });
  }

  togglePostActive(post: Post) {
    this.postService.togglePostActive(post._id).subscribe({
      next: (updated) => {
        this.myPosts.update(arr => arr.map(p => p._id === updated._id ? updated : p));
      },
      error: () => {}
    });
  }

  confirmDeletePost(id: string) {
    this.deletingPostId.set(id);
  }

  cancelDeletePost() {
    this.deletingPostId.set(null);
  }

  deletePost(id: string) {
    this.postService.deletePost(id).subscribe({
      next: () => {
        this.myPosts.update(arr => arr.filter(p => p._id !== id));
        this.deletingPostId.set(null);
      },
      error: () => { this.deletingPostId.set(null); }
    });
  }

  // --- Comment CRUD ---
  confirmDeleteComment(id: string) {
    this.deletingCommentId.set(id);
  }

  cancelDeleteComment() {
    this.deletingCommentId.set(null);
  }

  deleteComment(id: string) {
    this.commentService.deleteComment(id).subscribe({
      next: () => {
        this.myComments.update(arr => arr.filter(c => c._id !== id));
        this.deletingCommentId.set(null);
      },
      error: () => { this.deletingCommentId.set(null); }
    });
  }

  // --- Profile ---
  saveProfile() {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.profileLoading.set(true);
    this.profileError.set('');
    this.profileSuccess.set('');
    this.auth.updatePseudo(this.profileForm.value.pseudo).subscribe({
      next: () => {
        this.profileLoading.set(false);
        this.profileSuccess.set('Profil mis à jour avec succès.');
        setTimeout(() => this.profileSuccess.set(''), 3000);
      },
      error: (err) => {
        this.profileLoading.set(false);
        this.profileError.set(err?.error?.message || 'Erreur lors de la mise à jour.');
      }
    });
  }

  getBadgeClass(type: string): string {
    const map: Record<string, string> = { 'Disparition': 'badge-disparition', 'Abus': 'badge-abus', 'Prevention': 'badge-prevention' };
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

  hasError(form: FormGroup, field: string, error?: string): boolean {
    const ctrl = form.get(field);
    if (!ctrl || !ctrl.touched) return false;
    return error ? ctrl.hasError(error) : ctrl.invalid;
  }

  trackByPost(_: number, p: Post) { return p._id; }
  trackByComment(_: number, c: Comment) { return c._id; }
}
