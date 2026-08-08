import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PostService } from '../../core/services/post.service';
import { CommentService } from '../../core/services/comment.service';
import { AuthService } from '../../core/services/auth.service';
import { SosService, TrustedContact, PendingInvitation, UserSearchResult, WhoTrustedMe } from '../../core/services/sos.service';
import { Post } from '../../core/models/post.model';
import { Comment } from '../../core/models/comment.model';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';

type DashTab = 'posts' | 'comments' | 'profile' | 'sos';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule],
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

  // ── SOS / Contacts de confiance ────────────────────────────────────────
  trustedContacts    = signal<TrustedContact[]>([]);
  pendingInvitations = signal<PendingInvitation[]>([]);
  whoTrustedMe       = signal<WhoTrustedMe[]>([]);
  loadingContacts    = signal(false);
  contactSuccess     = signal('');
  contactError       = signal('');

  // Recherche utilisateur
  searchQuery        = signal('');
  searchResults      = signal<UserSearchResult[]>([]);
  searchLoading      = signal(false);
  private searchSubject = new Subject<string>();

  // Suppression contact
  removingContactId  = signal<string | null>(null);
  // Se retirer de la liste de quelqu'un
  leavingOwnerId     = signal<string | null>(null);

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

  acceptedContactsCount = computed(() =>
    this.trustedContacts().filter(c => c.status === 'ACCEPTED').length
  );

  camerounCities = [
    'National',
    'abong mbang',
    'aiyomojok',
    'akom ii',
    'akono',
    'akonolinga',
    'ambam',
    'ayos',
    'baba i',
    'bafang',
    'bafanji',
    'bafia',
    'bafou',
    'bafoussam',
    'bafut',
    'baham',
    'balikumbat',
    'bambalang',
    'bamenda',
    'bamendjou',
    'bamessi',
    'bamessing',
    'bamukumbit',
    'bamumkumbit',
    'bangangté',
    'bangolan',
    'barnaké',
    'batcha',
    'batouri',
    'bertoua',
    'bibémi',
    'biwong',
    'bogo',
    'bokito',
    'buea',
    'bélabo',
    'diang',
    'douala',
    'dschang',
    'edéa',
    'eséka',
    'figuil',
    'foumban',
    'foumbot',
    'garoua',
    'garoua boulaï',
    'guider',
    'kaelé',
    'kalfou',
    'kekem',
    'kontcha',
    'kousséri',
    'kribi',
    'kumba',
    'kumbo',
    'lagdo',
    'limbe',
    'loum',
    'maga',
    'mamfe',
    'manjo',
    'maroua',
    'mbalmayo',
    'mbandjok',
    'mbanga',
    'mbouda',
    'melong',
    'messaména',
    'meïganga',
    'mfou',
    'mokolo',
    'monatélé',
    'mora',
    'nanga eboko',
    'ndom',
    'ngaoundal',
    'ngaoundéré',
    'ngok mapoubi',
    'ngou',
    'ngoulemakong',
    'nguti',
    'nkongsamba',
    'nkoteng',
    'obala',
    'olamzé',
    'pitoa',
    'sangmélima',
    'tefam',
    'tibati',
    'tiko',
    'touboro',
    'widekum',
    'wum',
    'yagoua',
    'yaoundé',
    'yokadouma',
    'yoko',
    'ébolowa',
  ];

  constructor(
    private postService: PostService,
    private commentService: CommentService,
    public auth: AuthService,
    private sosService: SosService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.profileForm = this.fb.group({
      pseudo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      location: ['']
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

    // Lire le queryParam ?tab=sos depuis la notification push
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'sos') {
        this.activeTab.set('sos');
      }
    });

    this.postService.getMyPosts().subscribe({
      next: (posts) => { this.myPosts.set(posts); this.loadingPosts.set(false); },
      error: () => { this.loadingPosts.set(false); }
    });

    this.commentService.getMyComments().subscribe({
      next: (comments) => { this.myComments.set(comments); this.loadingComments.set(false); },
      error: () => { this.loadingComments.set(false); }
    });

    // Charger les contacts de confiance et invitations au démarrage
    this.loadContacts();

    // Recherche avec debounce 400ms
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.trim().length < 2) { this.searchResults.set([]); return of([]); }
        this.searchLoading.set(true);
        return this.sosService.searchUsers(q);
      }),
    ).subscribe({
      next: (results) => { this.searchResults.set(results); this.searchLoading.set(false); },
      error: () => { this.searchLoading.set(false); },
    });
  }

  setTab(tab: DashTab) {
    this.activeTab.set(tab);
    this.editingPost.set(null);
    if (tab === 'sos') this.loadContacts();
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
    this.auth.updateAccount(this.profileForm.value.pseudo, this.profileForm.value.location).subscribe({
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

  // ── CONTACTS DE CONFIANCE ──────────────────────────────────────────────

  loadContacts(): void {
    this.loadingContacts.set(true);
    this.sosService.getMyContacts().subscribe({
      next: (c) => { this.trustedContacts.set(c); this.loadingContacts.set(false); },
      error: () => { this.loadingContacts.set(false); },
    });
    this.sosService.getPendingInvitations().subscribe({
      next: (inv) => this.pendingInvitations.set(inv),
      error: () => {},
    });
    this.sosService.getWhoTrustedMe().subscribe({
      next: (list) => this.whoTrustedMe.set(list),
      error: () => {},
    });
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  addContact(userId: string, pseudo: string): void {
    this.contactError.set('');
    this.contactSuccess.set('');
    this.sosService.addContact(userId).subscribe({
      next: () => {
        this.contactSuccess.set(`Invitation envoyée à ${pseudo}.`);
        this.searchResults.set([]);
        this.searchQuery.set('');
        this.loadContacts();
        setTimeout(() => this.contactSuccess.set(''), 4000);
      },
      error: (err) => {
        this.contactError.set(err?.error?.message || 'Erreur lors de l\'invitation.');
        setTimeout(() => this.contactError.set(''), 4000);
      },
    });
  }

  respondInvitation(inviterId: string, action: 'accept' | 'reject'): void {
    this.sosService.respondToInvitation(inviterId, action).subscribe({
      next: () => {
        this.contactSuccess.set(action === 'accept' ? 'Invitation acceptée.' : 'Invitation refusée.');
        this.loadContacts();
        setTimeout(() => this.contactSuccess.set(''), 3000);
      },
      error: (err) => this.contactError.set(err?.error?.message || 'Erreur.'),
    });
  }

  confirmRemoveContact(contactId: string): void {
    this.removingContactId.set(contactId);
  }

  cancelRemoveContact(): void {
    this.removingContactId.set(null);
  }

  removeContact(contactId: string): void {
    this.sosService.removeContact(contactId).subscribe({
      next: () => {
        this.trustedContacts.update(list => list.filter(c => c.userId !== contactId));
        this.removingContactId.set(null);
        this.contactSuccess.set('Contact retiré.');
        setTimeout(() => this.contactSuccess.set(''), 3000);
      },
      error: (err) => this.contactError.set(err?.error?.message || 'Erreur.'),
    });
  }

  isAlreadyContact(userId: string): boolean {
    return this.trustedContacts().some(c => c.userId === userId);
  }

  getContactStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'ACCEPTED': 'Actif',
      'PENDING':  'En attente',
      'REJECTED': 'Refusé',
    };
    return map[status] || status;
  }

  // ── SE RETIRER DE LA LISTE D'UN AUTRE UTILISATEUR ──────────────────────

  confirmLeave(ownerId: string): void {
    this.leavingOwnerId.set(ownerId);
  }

  cancelLeave(): void {
    this.leavingOwnerId.set(null);
  }

  leaveTrustedList(ownerId: string): void {
    this.sosService.leaveTrustedList(ownerId).subscribe({
      next: (res) => {
        this.whoTrustedMe.update(list => list.filter(u => u.userId !== ownerId));
        this.leavingOwnerId.set(null);
        this.contactSuccess.set(res.message);
        setTimeout(() => this.contactSuccess.set(''), 4000);
      },
      error: (err) => {
        this.leavingOwnerId.set(null);
        this.contactError.set(err?.error?.message || 'Erreur lors de la suppression.');
        setTimeout(() => this.contactError.set(''), 4000);
      },
    });
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
