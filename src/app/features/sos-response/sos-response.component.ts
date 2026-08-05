import {
  Component, OnInit, OnDestroy, signal, inject, computed,
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SosService, SosStatus } from '../../core/services/sos.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sos-response',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, DatePipe],
  templateUrl: './sos-response.component.html',
  styleUrls: ['./sos-response.component.css'],
})
export class SosResponseComponent implements OnInit, OnDestroy {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private sosService  = inject(SosService);
  private authService = inject(AuthService);
  private sanitizer   = inject(DomSanitizer);

  sosId   = signal<string>('');
  sos     = signal<SosStatus | null>(null);
  loading = signal(true);
  error   = signal('');

  // Actions contact B
  hasConfirmed  = signal(false);
  confirming    = signal(false);
  resolving     = signal(false);
  actionSuccess = signal('');
  actionError   = signal('');

  /** URL de la carte sécurisée (SafeResourceUrl pour iframe) */
  safeMapUrl = computed<SafeResourceUrl | null>(() => {
    const s = this.sos();
    if (!s) return null;
    const url = `https://maps.google.com/maps?q=${s.latitude},${s.longitude}&z=16&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  private pollingInterval: any = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sosId') || '';
    this.sosId.set(id);
    this.loadStatus();
    // Polling toutes les 5s pour voir les mises à jour de position et statut
    this.pollingInterval = setInterval(() => this.loadStatus(), 5_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.pollingInterval);
  }

  private loadStatus(): void {
    const id = this.sosId();
    if (!id) return;

    this.sosService.getSosStatus(id).subscribe({
      next: (status) => {
        this.sos.set(status);
        this.loading.set(false);
        // Si l'utilisateur avait déjà confirmé, on le détecte
        const me = this.authService.currentUser();
        if (me && status.respondingContacts.some(c => c._id === me._id)) {
          this.hasConfirmed.set(true);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Impossible de charger cette alerte.');
        this.loading.set(false);
        clearInterval(this.pollingInterval);
      },
    });
  }

  /** Contact B clique "J'arrive" */
  onConfirmResponse(): void {
    const id = this.sosId();
    this.confirming.set(true);
    this.actionError.set('');

    this.sosService.confirmResponse(id).subscribe({
      next: () => {
        this.hasConfirmed.set(true);
        this.confirming.set(false);
        this.actionSuccess.set('Votre réponse a été enregistrée. L\'émetteur sait que vous arrivez.');
        this.loadStatus(); // rafraîchit immédiatement
      },
      error: (err) => {
        this.confirming.set(false);
        this.actionError.set(err?.error?.message || 'Erreur lors de la confirmation.');
      },
    });
  }

  /** Contact B (ou émetteur) clique "Marquer comme résolu" */
  onResolve(): void {
    const id = this.sosId();
    this.resolving.set(true);
    this.actionError.set('');

    this.sosService.resolve(id, 'Incident résolu par un contact de confiance').subscribe({
      next: () => {
        this.resolving.set(false);
        this.actionSuccess.set('Alerte marquée comme résolue.');
        this.loadStatus();
      },
      error: (err) => {
        this.resolving.set(false);
        this.actionError.set(err?.error?.message || 'Erreur lors de la résolution.');
      },
    });
  }

  /** Ouvrir la navigation GPS vers la position de l'émetteur */
  openNavigation(): void {
    const s = this.sos();
    if (!s) return;
    const url = `https://maps.google.com/?q=${s.latitude},${s.longitude}`;
    window.open(url, '_blank');
  }

  /** Formater la durée depuis le déclenchement */
  getElapsed(): string {
    const s = this.sos();
    if (!s) return '';
    const diff = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 1000);
    if (diff < 60)   return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    return `${Math.floor(diff / 3600)} h ${Math.floor((diff % 3600) / 60)} min`;
  }

  getThreatLabel(level?: string): string {
    const map: Record<string, string> = {
      LOW: 'Faible', MEDIUM: 'Modéré', HIGH: 'Élevé', CRITICAL: 'Critique',
    };
    return map[level || 'MEDIUM'] || 'Modéré';
  }

  getThreatClass(level?: string): string {
    const map: Record<string, string> = {
      LOW: 'threat-low', MEDIUM: 'threat-medium', HIGH: 'threat-high', CRITICAL: 'threat-critical',
    };
    return map[level || 'MEDIUM'] || 'threat-medium';
  }

  get isResolved(): boolean {
    return this.sos()?.status !== 'ACTIVE';
  }
}
