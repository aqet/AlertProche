import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SosService, SosHistory, SosHistoryItem } from '../../core/services/sos.service';

type HistoryTab = 'emitted' | 'responded' | 'received';

@Component({
  selector: 'app-sos-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sos-history.component.html',
  styleUrls:  ['./sos-history.component.css'],
})
export class SosHistoryComponent implements OnInit {
  private sosService = inject(SosService);

  history      = signal<SosHistory | null>(null);
  loading      = signal(true);
  activeTab    = signal<HistoryTab>('emitted');

  currentList = computed<SosHistoryItem[]>(() => {
    const h = this.history();
    if (!h) return [];
    return h[this.activeTab()] || [];
  });

  ngOnInit(): void {
    this.sosService.getHistory().subscribe({
      next:  (h) => { this.history.set(h); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  setTab(tab: HistoryTab): void { this.activeTab.set(tab); }

  getStatusLabel(s: string): string {
    return { ACTIVE: 'En cours', RESOLVED: 'Résolu', CANCELLED: 'Annulé' }[s] ?? s;
  }

  getStatusClass(s: string): string {
    return {
      ACTIVE:    'status-active-badge',
      RESOLVED:  'status-resolved-badge',
      CANCELLED: 'status-cancelled-badge',
    }[s] ?? '';
  }

  getThreatLabel(l?: string): string {
    return { LOW: 'Faible', MEDIUM: 'Modéré', HIGH: 'Élevé', CRITICAL: 'Critique' }[l ?? 'MEDIUM'] ?? 'Modéré';
  }

  getThreatClass(l?: string): string {
    return {
      LOW: 'threat-low', MEDIUM: 'threat-medium',
      HIGH: 'threat-high', CRITICAL: 'threat-critical',
    }[l ?? 'MEDIUM'] ?? 'threat-medium';
  }

  getRoleLabel(role: string): string {
    return { emitted: '🆘 Émis par moi', responded: '🏃 Intervenu', received: '🔔 Reçu' }[role] ?? role;
  }

  getDuration(createdAt: string, resolvedAt?: string): string {
    const diff = Math.floor(
      ((resolvedAt ? new Date(resolvedAt) : new Date()).getTime() - new Date(createdAt).getTime()) / 1000,
    );
    if (diff < 60)   return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    return `${Math.floor(diff / 3600)} h ${Math.floor((diff % 3600) / 60)} min`;
  }

  getMapsUrl(lat: number, lng: number): string {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }
}
