import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineService } from '../../../core/services/offline.service';

@Component({
  selector: 'app-network-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="net-banner net-offline" *ngIf="!offlineService.online()">
      <i class="fas fa-wifi-slash"></i> Vous êtes hors-ligne
    </div>
    <div class="net-banner net-reconnected" *ngIf="showReconnected()">
      <i class="fas fa-wifi"></i> Connexion rétablie
    </div>
  `,
  styles: [`
    .net-banner {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      text-align: center; padding: 8px 16px;
      font-size: 0.82rem; font-weight: 600;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .net-offline { background: #dc2626; color: #fff; }
    .net-reconnected { background: #16a34a; color: #fff; }
  `],
})
export class NetworkBannerComponent {
  protected offlineService = inject(OfflineService);
  showReconnected = signal(false);

  private _initialized = false;

  constructor() {
    effect(() => {
      const online = this.offlineService.online();
      if (!this._initialized) {
        this._initialized = true;
        return;
      }
      if (online) {
        this.showReconnected.set(true);
        setTimeout(() => this.showReconnected.set(false), 3000);
      }
    });
  }
}
