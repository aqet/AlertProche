import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminService, AdminStats, AdminUser, AdminPost } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { VersionManagementComponent } from './version-management/version-management.component';
import { HttpClient } from '@angular/common/http';
import { TimeAgoService } from '../../core/services/time-ago.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

type AdminTab = 'stats' | 'users' | 'posts' | 'versions' | 'payments';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, VersionManagementComponent, TranslateModule],
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

  // Payments
  paymentStats = signal<{ donations: number; support: number; pendingPayout: number } | null>(null);
  payoutRequests = signal<any[]>([]);
  allTransactions = signal<any[]>([]);
  paymentsLoading = signal(false);
  approveLoading = signal<string | null>(null);
  txFilterType = '';
  txFilterStatus = '';
  showPlatformPayoutForm = signal(false);
  platformPayoutLoading = signal(false);
  platformPayoutAmount: number | null = null;
  selectedUserTransactions = signal<any[] | null>(null);
  userTxLoading = signal(false);

  // Actions
  confirmDeleteUserId = signal<string | null>(null);
  confirmDeletePostId = signal<string | null>(null);
  roleChangeUserId = signal<string | null>(null);
  roleChangeValue = signal('');
  actionLoading = signal(false);
  actionSuccess = signal('');
  actionError = signal('');

  // Test notification push
  notifTestLoading = signal(false);
  notifTestResult = signal<{ sent: number; failed: number; totalTokens: number; error: string | null } | null>(null);

  currentUser = computed(() => this.auth.currentUser());

  readonly ROLES = ['Standard', 'Moderateur', 'Admin'];

  get POST_FILTERS() {
    return [
      { value: '', label: this.translate.instant('ADMIN.FILTER_ALL') },
      { value: 'reported', label: this.translate.instant('ADMIN.FILTER_REPORTED') },
      { value: 'disabled', label: this.translate.instant('ADMIN.FILTER_DISABLED') },
    ];
  }

  constructor(
    private adminService: AdminService,
    public auth: AuthService,
    private http: HttpClient,
    private translate: TranslateService,
    private timeAgo: TimeAgoService,
  ) {}

  private get API() { return `${environment.apiUrl}`; }

  ngOnInit(): void {
    this.loadStats();
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    this.clearAction();
    if (tab === 'payments') this.loadPaymentStats();
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
        this.showSuccess(this.translate.instant('ADMIN.MSG_ROLE_UPDATED'));
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showError(err?.error?.message || this.translate.instant('ADMIN.ERR_ROLE_UPDATE'));
      }
    });
  }

  /**
   * Badge de confiance d'un compte, avec la même règle que l'API :
   * le staff non sanctionné est traité comme « Référence » (plancher 70).
   */
  trustBadge(user: AdminUser): 'none' | 'new' | 'confirmed' | 'reference' {
    const isStaff = user.role === 'Admin' || user.role === 'Moderateur';
    const score = isStaff && (user.strikes ?? 0) === 0
      ? Math.max(user.credibility ?? 0, 70)
      : user.credibility ?? 0;
    if (score >= 70) return 'reference';
    if (score >= 30) return 'confirmed';
    return 'none';
  }

  trustKey(user: AdminUser): string {
    return `TRUST.BADGE_${this.trustBadge(user).toUpperCase()}`;
  }

  /** Nomme un membre « compte de confiance » (+30 de crédibilité, plafonné à 100). */
  makeTrusted(user: AdminUser): void {
    this.actionLoading.set(true);
    this.adminService.adjustCredibility(user._id, 30).subscribe({
      next: (res) => {
        this.users.update(arr => arr.map(u =>
          u._id === user._id ? { ...u, credibility: res.credibility, strikes: res.strikes } : u
        ));
        this.actionLoading.set(false);
        this.showSuccess(this.translate.instant('ADMIN.MSG_TRUSTED'));
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showError(err?.error?.message || this.translate.instant('ADMIN.ERR_TRUST_UPDATE'));
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
        this.showSuccess(this.translate.instant('ADMIN.MSG_USER_DELETED'));
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showError(err?.error?.message || this.translate.instant('ADMIN.ERR_DELETE'));
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
        this.showSuccess(this.translate.instant('ADMIN.MSG_POST_DELETED'));
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showError(err?.error?.message || this.translate.instant('ADMIN.ERR_DELETE'));
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
    return this.timeAgo.format(dateStr);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return this.timeAgo.formatDate(dateStr);
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

  // ── TEST NOTIFICATION PUSH ────────────────────────────────────────────
  testPushNotification(): void {
    this.notifTestLoading.set(true);
    this.notifTestResult.set(null);
    this.adminService.testPushNotification().subscribe({
      next: (result) => {
        this.notifTestResult.set(result);
        this.notifTestLoading.set(false);
      },
      error: (err) => {
        this.notifTestResult.set({ sent: 0, failed: 0, totalTokens: 0, error: err?.error?.message || this.translate.instant('COMMON.ERR_CONNECTION') });
        this.notifTestLoading.set(false);
      }
    });
  }

  // ── PAIEMENTS ─────────────────────────────────────────────────────────
  async loadPaymentStats(): Promise<void> {
    this.paymentsLoading.set(true);
    try {
      const params: Record<string, string> = {};
      if (this.txFilterType)   params['type']   = this.txFilterType;
      if (this.txFilterStatus) params['status'] = this.txFilterStatus;

      const [donations, support, payouts, allTx] = await Promise.all([
        firstValueFrom(this.http.get<any[]>(`${this.API}/admin/payments/transactions?type=DONATION_ALERT&status=SUCCESS`)).catch(() => []),
        firstValueFrom(this.http.get<any[]>(`${this.API}/admin/payments/transactions?type=PLATFORM_SUPPORT&status=SUCCESS`)).catch(() => []),
        firstValueFrom(this.http.get<any[]>(`${this.API}/admin/payments/payout-requests`)).catch(() => []),
        firstValueFrom(this.http.get<any[]>(`${this.API}/admin/payments/transactions`, { params })).catch(() => []),
      ]);
      const sum = (arr: any[]) => arr.reduce((acc, t) => acc + (t.amount ?? 0), 0);
      this.paymentStats.set({
        donations: sum(donations),
        support: sum(support),
        pendingPayout: sum(payouts.filter((t: any) => t.status === 'PAYOUT_PENDING')),
      });
      this.payoutRequests.set(payouts.filter((t: any) => t.status === 'PAYOUT_PENDING'));
      this.allTransactions.set(allTx);
    } catch { /* ignore */ } finally {
      this.paymentsLoading.set(false);
    }
  }

  async approvePayout(transactionId: string): Promise<void> {
    this.approveLoading.set(transactionId);
    try {
      await firstValueFrom(
        this.http.post(`${this.API}/admin/payments/payout/approve/${transactionId}`, {})
      );
      this.payoutRequests.update(list => list.filter((t: any) => t._id !== transactionId));
      this.allTransactions.update(list => list.map((t: any) =>
        t._id === transactionId ? { ...t, status: 'PAYOUT_SUCCESS' } : t
      ));
    } catch (err: any) {
      alert(err?.error?.message ?? this.translate.instant('ADMIN.ERR_APPROVE'));
    } finally {
      this.approveLoading.set(null);
    }
  }

  async markTransactionSuccess(transactionId: string): Promise<void> {
    this.approveLoading.set(transactionId);
    try {
      await firstValueFrom(
        this.http.post(`${this.API}/admin/payments/mark-success/${transactionId}`, {})
      );
      this.allTransactions.update(list => list.map((t: any) =>
        t._id === transactionId ? { ...t, status: 'SUCCESS' } : t
      ));
      // Recharger les stats pour refléter la mise à jour
      await this.loadPaymentStats();
    } catch (err: any) {
      alert(err?.error?.message ?? this.translate.instant('ADMIN.ERR_FETCH'));
    } finally {
      this.approveLoading.set(null);
    }
  }

  async executePlatformPayout(): Promise<void> {
    if (!this.platformPayoutAmount || this.platformPayoutAmount < 100) {
      alert(this.translate.instant('ADMIN.ERR_AMOUNT_MIN'));
      return;
    }
    this.platformPayoutLoading.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${this.API}/admin/payments/payout-to-platform`, {
          amount: this.platformPayoutAmount,
          narration: this.translate.instant('ADMIN.PAYOUT_NARRATION'),
        })
      );
      this.showPlatformPayoutForm.set(false);
      this.platformPayoutAmount = null;
      await this.loadPaymentStats();
      this.showSuccess(this.translate.instant('ADMIN.MSG_PAYOUT_SUCCESS'));
    } catch (err: any) {
      alert(err?.error?.message ?? this.translate.instant('ADMIN.ERR_PAYOUT'));
    } finally {
      this.platformPayoutLoading.set(false);
    }
  }

  async viewUserTransactions(userId: string): Promise<void> {
    this.userTxLoading.set(true);
    this.selectedUserTransactions.set([]);
    try {
      const tx = await firstValueFrom(
        this.http.get<any[]>(`${this.API}/admin/payments/transactions`, { params: { userId } })
      );
      this.selectedUserTransactions.set(tx);
    } catch {
      this.selectedUserTransactions.set([]);
    } finally {
      this.userTxLoading.set(false);
    }
  }
}
