import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminStats, AdminUser, AdminPost } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

type AdminTab = 'stats' | 'users' | 'posts';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MediaUrlPipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  activeTab = signal<AdminTab>('stats');

  // Stats
  stats = signal<AdminStats | null>(null);
  statsLoading = signal(true);

  // Users
  users = signal<AdminUser[]>([]);
  usersTotal = signal(0);
  usersPage = signal(1);
  usersPages = signal(1);
  usersLoading = signal(false);
  userSearch = signal('');
  searchTimeout: any;

  // Posts
  posts = signal<AdminPost[]>([]);
  postsTotal = signal(0);
  postsPage = signal(1);
  postsPages = signal(1);
  postsLoading = signal(false);
  postsFilter = signal('');

  // Actions
  confirmDeleteUserId = signal<string | null>(null);
  confirmDeletePostId = signal<string | null>(null);
  roleChangeUserId = signal<string | null>(null);
  roleChangeValue = signal('');
  actionLoading = signal(false);
  actionSuccess = signal('');
  actionError = signal('');

  currentUser = computed(() => this.auth.currentUser());

  readonly ROLES = ['Standard', 'Moderateur', 'Admin'];
  readonly POST_FILTERS = [
    { value: '', label: 'Tous les posts' },
    { value: 'reported', label: 'Signalés' },
    { value: 'disabled', label: 'Désactivés' },
  ];

  constructor(private adminService: AdminService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    this.clearAction();
    if (tab === 'users' && this.users().length === 0) this.loadUsers();
    if (tab === 'posts' && this.posts().length === 0) this.loadPosts();
  }

  // ── STATS ──────────────────────────────────────────────────────────────
  loadStats(): void {
    this.statsLoading.set(true);
    this.adminService.getStats().subscribe({
      next: (s) => { this.stats.set(s); this.statsLoading.set(false); },
      error: () => { this.statsLoading.set(false); }
    });
  }

  // ── USERS ──────────────────────────────────────────────────────────────
  loadUsers(page = 1): void {
    this.usersLoading.set(true);
    this.usersPage.set(page);
    this.adminService.getUsers(page, 15, this.userSearch() || undefined).subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.usersTotal.set(res.total);
        this.usersPages.set(res.pages);
        this.usersLoading.set(false);
      },
      error: () => { this.usersLoading.set(false); }
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadUsers(1), 400);
  }

  startRoleChange(user: AdminUser): void {
    this.roleChangeUserId.set(user._id);
    this.roleChangeValue.set(user.role);
    this.clearAction();
  }

  cancelRoleChange(): void {
    this.roleChangeUserId.set(null);
    this.roleChangeValue.set('');
  }

  saveRoleChange(userId: string): void {
    const newRole = this.roleChangeValue();
    if (!newRole) return;
    this.actionLoading.set(true);
    this.adminService.updateUserRole(userId, newRole).subscribe({
      next: (updated) => {
        this.users.update(arr => arr.map(u => u._id === userId ? { ...u, role: updated.role } : u));
        this.roleChangeUserId.set(null);
        this.actionLoading.set(false);
        this.showSuccess('Rôle mis à jour avec succès.');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showError(err?.error?.message || 'Erreur lors de la mise à jour du rôle.');
      }
    });
  }

  confirmDeleteUser(id: string): void {
    this.confirmDeleteUserId.set(id);
    this.clearAction();
  }

  cancelDeleteUser(): void { this.confirmDeleteUserId.set(null); }

  deleteUser(id: string): void {
    this.actionLoading.set(true);
    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.users.update(arr => arr.filter(u => u._id !== id));
        this.usersTotal.update(n => n - 1);
        this.confirmDeleteUserId.set(null);
        this.actionLoading.set(false);
        this.showSuccess('Compte supprimé. Les publications ont été anonymisées.');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showError(err?.error?.message || 'Erreur lors de la suppression.');
      }
    });
  }

  // ── POSTS ──────────────────────────────────────────────────────────────
  loadPosts(page = 1): void {
    this.postsLoading.set(true);
    this.postsPage.set(page);
    this.adminService.getPosts(page, 15, this.postsFilter() || undefined).subscribe({
      next: (res) => {
        this.posts.set(res.posts);
        this.postsTotal.set(res.total);
        this.postsPages.set(res.pages);
        this.postsLoading.set(false);
      },
      error: () => { this.postsLoading.set(false); }
    });
  }

  onPostsFilterChange(): void {
    this.loadPosts(1);
  }

  confirmDeletePost(id: string): void {
    this.confirmDeletePostId.set(id);
    this.clearAction();
  }

  cancelDeletePost(): void { this.confirmDeletePostId.set(null); }

  deletePost(id: string): void {
    this.actionLoading.set(true);
    this.adminService.deletePost(id).subscribe({
      next: () => {
        this.posts.update(arr => arr.filter(p => p._id !== id));
        this.postsTotal.update(n => n - 1);
        this.confirmDeletePostId.set(null);
        this.actionLoading.set(false);
        this.showSuccess('Publication supprimée définitivement.');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showError(err?.error?.message || 'Erreur lors de la suppression.');
      }
    });
  }

  // ── HELPERS ────────────────────────────────────────────────────────────
  private showSuccess(msg: string): void {
    this.actionSuccess.set(msg);
    this.actionError.set('');
    setTimeout(() => this.actionSuccess.set(''), 4000);
  }

  private showError(msg: string): void {
    this.actionError.set(msg);
    this.actionSuccess.set('');
    setTimeout(() => this.actionError.set(''), 5000);
  }

  private clearAction(): void {
    this.actionSuccess.set('');
    this.actionError.set('');
  }

  getTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 2592000) return `Il y a ${Math.floor(diff / 86400)} j`;
    return date.toLocaleDateString('fr-FR');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = { Standard: 'role-standard', Moderateur: 'role-mod', Admin: 'role-admin' };
    return map[role] || '';
  }

  getBadgeClass(type: string): string {
    const map: Record<string, string> = { Disparition: 'badge-disparition', Abus: 'badge-abus', Prevention: 'badge-prevention' };
    return map[type] || '';
  }

  pagesArray(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  getMaxActivity(): number {
    const days = this.stats()?.activityByDay || [];
    return days.length > 0 ? Math.max(...days.map(d => d.count)) : 1;
  }

  formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  trackById(_: number, item: any) { return item._id; }
}
