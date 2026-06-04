import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReviewService } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service';
import { Review, ReviewStats } from '../../core/models/review.model';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css'],
})
export class ReviewsComponent implements OnInit {
  // ── Auth ──────────────────────────────────────────────────────────
  isAuth = computed(() => this.auth.isAuthenticated());
  currentUser = computed(() => this.auth.currentUser());

  // ── Stats ─────────────────────────────────────────────────────────
  stats = signal<ReviewStats | null>(null);
  statsLoading = signal(true);

  // ── Reviews list ──────────────────────────────────────────────────
  reviews = signal<Review[]>([]);
  total = signal(0);
  page = signal(1);
  limit = 9;
  listLoading = signal(true);

  // ── Formulaire ────────────────────────────────────────────────────
  formRating = signal(0);
  hoverRating = signal(0);
  formMessage = '';
  formAnonymous = false;
  formLoading = signal(false);
  formSuccess = signal(false);
  formError = signal('');
  showForm = signal(false);

  // ── Computed helpers ──────────────────────────────────────────────
  totalPages = computed(() => Math.ceil(this.total() / this.limit));
  hasMore = computed(() => this.page() < this.totalPages());
  starArray = [1, 2, 3, 4, 5] as const;

  constructor(
    private reviewService: ReviewService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadReviews();
  }

  loadStats(): void {
    this.statsLoading.set(true);
    this.reviewService.getStats().subscribe({
      next: (s) => { this.stats.set(s); this.statsLoading.set(false); },
      error: () => this.statsLoading.set(false),
    });
  }

  loadReviews(append = false): void {
    this.listLoading.set(true);
    this.reviewService.getReviews(this.page(), this.limit).subscribe({
      next: (res) => {
        this.reviews.set(append ? [...this.reviews(), ...res.reviews] : res.reviews);
        this.total.set(res.total);
        this.listLoading.set(false);
      },
      error: () => this.listLoading.set(false),
    });
  }

  loadMore(): void {
    this.page.update(p => p + 1);
    this.loadReviews(true);
  }

  // ── Étoiles ───────────────────────────────────────────────────────
  setRating(n: number): void { this.formRating.set(n); }
  setHover(n: number): void  { this.hoverRating.set(n); }
  clearHover(): void         { this.hoverRating.set(0); }

  activeStars(): number { return this.hoverRating() || this.formRating(); }

  ratingLabel(): string {
    const labels: Record<number, string> = {
      1: 'Très insatisfait',
      2: 'Insatisfait',
      3: 'Correct',
      4: 'Satisfait',
      5: 'Excellent !',
    };
    return labels[this.activeStars()] ?? 'Sélectionnez une note';
  }

  // ── Soumission ────────────────────────────────────────────────────
  toggleForm(): void {
    this.showForm.update(v => !v);
    this.resetForm();
  }

  submitReview(): void {
    this.formError.set('');
    if (this.formRating() === 0) {
      this.formError.set('Veuillez sélectionner une note.');
      return;
    }
    if (this.formMessage.trim().length < 10) {
      this.formError.set('Votre message doit contenir au moins 10 caractères.');
      return;
    }

    this.formLoading.set(true);
    this.reviewService.createReview({
      rating: this.formRating(),
      message: this.formMessage.trim(),
      isAnonymous: this.formAnonymous,
    }).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.formSuccess.set(true);
        this.resetForm();
        // Recharger depuis la page 1
        this.page.set(1);
        this.loadStats();
        this.loadReviews();
        // Masquer le formulaire après 2 secondes
        setTimeout(() => { this.formSuccess.set(false); this.showForm.set(false); }, 3000);
      },
      error: () => {
        this.formLoading.set(false);
        this.formError.set('Une erreur est survenue. Veuillez réessayer.');
      },
    });
  }

  private resetForm(): void {
    this.formRating.set(0);
    this.hoverRating.set(0);
    this.formMessage = '';
    this.formAnonymous = false;
    this.formError.set('');
  }

  // ── Utilitaires ───────────────────────────────────────────────────
  displayName(review: Review): string {
    if (review.isAnonymous) return 'Anonyme';
    return review.pseudo ?? 'Utilisateur';
  }

  initials(review: Review): string {
    const name = this.displayName(review);
    return name === 'Anonyme' ? '?' : name.charAt(0).toUpperCase();
  }

  ratingPercent(star: number): number {
    const s = this.stats();
    if (!s || s.total === 0) return 0;
    return Math.round((s.distribution[star as 1|2|3|4|5] / s.total) * 100);
  }

  /** Vérifie si une étoile est pleine par rapport à la moyenne */
  isStarFilled(star: number): boolean {
    const s = this.stats();
    if (!s) return false;
    return star <= Math.round(s.average);
  }

  /** Vérifie si une étoile est à moitié */
  isStarHalf(star: number): boolean {
    const s = this.stats();
    if (!s) return false;
    const rounded = Math.round(s.average);
    return star > rounded && star <= s.average + 0.5;
  }

  /** Retourne la valeur de distribution pour une étoile donnée */
  distCount(star: number): number {
    const s = this.stats();
    if (!s) return 0;
    return s.distribution[star as 1|2|3|4|5];
  }

  filledStars(rating: number): number[] {
    return Array.from({ length: rating }, (_, i) => i + 1);
  }

  emptyStars(rating: number): number[] {
    return Array.from({ length: 5 - rating }, (_, i) => i + 1);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }
}
