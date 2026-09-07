import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermissionService } from '../../../core/services/permission.service';

@Component({
  selector: 'app-permission-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="perm-banner" *ngIf="perm.showBanner()" role="alert">
      <div class="perm-banner-inner">

        <!-- Icône selon contexte -->
        <div class="perm-banner-icon">
          <i class="fas"
            [class.fa-bell-slash]="perm.notificationStatus() === 'denied'"
            [class.fa-location-slash]="perm.notificationStatus() !== 'denied' && perm.geolocationStatus() === 'denied'"
            [class.fa-mobile-screen-button]="perm.notificationStatus() === 'needs-pwa'"
            [class.fa-shield-exclamation]="perm.notificationStatus() === 'default' || perm.geolocationStatus() === 'default'">
          </i>
        </div>

        <!-- Message -->
        <p class="perm-banner-msg">{{ perm.bannerMessage }}</p>

        <!-- Actions -->
        <div class="perm-banner-actions">

          <!-- Bouton "Activer" si on peut demander -->
          <button
            *ngIf="perm.canRequestFromBanner"
            class="perm-btn perm-btn-primary"
            (click)="perm.requestAllPermissions()"
            [disabled]="perm.isRequesting()">
            <span class="spinner perm-spinner" *ngIf="perm.isRequesting()"></span>
            <i class="fas fa-check" *ngIf="!perm.isRequesting()"></i>
            {{ perm.isRequesting() ? 'Activation...' : 'Activer' }}
          </button>

          <!-- Bouton "Fermer" si refus ou iOS guide -->
          <button
            class="perm-btn perm-btn-dismiss"
            (click)="perm.showBanner.set(false)"
            title="Masquer">
            <i class="fas fa-xmark"></i>
          </button>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .perm-banner {
      margin-top: 60px;
      position: sticky;
      top: 0;
      z-index: 900;
      background: var(--warning-dim, rgba(255,152,0,0.12));
      border-bottom: 1px solid var(--warning-border, rgba(255,152,0,0.3));
      padding: 0;
    }

    .perm-banner-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .perm-banner-icon {
      flex-shrink: 0;
      width: 32px; height: 32px;
      border-radius: 50%;
      background: var(--warning, #ff9800);
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      font-size: 0.8rem;
    }

    .perm-banner-msg {
      flex: 1;
      min-width: 200px;
      font-size: 0.82rem;
      color: var(--text, #fff);
      margin: 0;
      line-height: 1.5;
    }

    .perm-banner-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }

    .perm-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
      white-space: nowrap;
    }

    .perm-btn:disabled { opacity: 0.6; cursor: wait; }

    .perm-btn-primary {
      padding: 8px 14px;
      background: var(--warning, #ff9800);
      color: #fff;
    }

    .perm-btn-primary:hover:not(:disabled) { opacity: 0.85; }

    .perm-btn-dismiss {
      padding: 8px 10px;
      background: transparent;
      color: var(--text-muted, #888);
      border: 1px solid var(--border, rgba(255,255,255,0.15));
    }

    .perm-btn-dismiss:hover { background: var(--bg-input, rgba(255,255,255,0.08)); }

    .perm-spinner {
      width: 12px; height: 12px;
      border-width: 2px;
      flex-shrink: 0;
    }

    @media (max-width: 480px) {
      .perm-banner-inner { gap: 8px; padding: 8px 12px; }
      .perm-banner-msg   { font-size: 0.78rem; }
    }
  `],
})
export class PermissionBannerComponent {
  perm = inject(PermissionService);
}
