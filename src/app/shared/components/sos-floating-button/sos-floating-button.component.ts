import {
  Component, OnInit, OnDestroy, signal, computed, inject, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';
import { SosService } from '../../../core/services/sos.service';
import { AuthService } from '../../../core/services/auth.service';

type SosState =
  | 'idle'          // Bouton au repos
  | 'holding'       // Appui en cours (0→3s)
  | 'confirming'    // Décompte 5s avant envoi
  | 'active'        // SOS en cours
  | 'cancelled';    // Annulé

const HOLD_DURATION   = 3000;  // 3 secondes d'appui
const CANCEL_DURATION = 5000;  // 5 secondes de décompte avant envoi

@Component({
  selector: 'app-sos-floating-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sos-floating-button.component.html',
  styleUrls:   ['./sos-floating-button.component.css'],
})
export class SosFloatingButtonComponent implements OnInit, OnDestroy {
  private sosService = inject(SosService);
  private authService = inject(AuthService);
  private zone       = inject(NgZone);

  // ── État ────────────────────────────────────────────────────────────────
  state            = signal<SosState>('idle');
  holdProgress     = signal(0);
  cancelCountdown  = signal(5);
  activeSosId      = signal<string | null>(null);
  respondingCount  = signal(0);
  errorMsg         = signal('');

  // N'afficher le bouton que si l'utilisateur est connecté
  isAuthenticated  = computed(() => this.authService.isAuthenticated());

  private holdStart   = 0;
  private holdTimer:  any = null;
  private holdRaf:    number = 0;
  private cancelRaf:  number = 0;
  private locationInterval: any = null;
  private batteryInterval:  any = null;
  private pollingInterval:  any = null;  // Polling respondingCount
  private lastPosition: { lat: number; lng: number } | null = null;

  readonly RADIUS = 26;
  readonly CIRCUMFERENCE = 2 * Math.PI * this.RADIUS; // ≈ 163.36

  strokeDashoffset = computed(() => {
    const pct = this.holdProgress() / 100;
    return this.CIRCUMFERENCE * (1 - pct);
  });

  ngOnInit(): void {
    this.cacheLastPosition();
    // Restaurer un SOS actif si l'app redémarre en cours d'alerte
    if (this.authService.isAuthenticated()) {
      this.sosService.getActiveSos().subscribe({
        next: (sos) => {
          if (sos && sos._id) {
            this.activeSosId.set(sos._id);
            this.state.set('active');
            this.respondingCount.set(sos.respondingContacts?.length ?? 0);
            this.startLocationUpdates(sos._id);
            this.startBatteryMonitor(sos._id);
            this.startPolling(sos._id);
          }
        },
        error: () => { /* Pas de SOS actif, OK */ },
      });
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // ── APPUI ENFONCÉ ───────────────────────────────────────────────────────
  onPointerDown(e: Event): void {
    e.preventDefault();
    if (this.state() !== 'idle') return;

    this.state.set('holding');
    this.holdStart = Date.now();
    this.animateHold();
    this.holdTimer = setTimeout(() => this.onHoldComplete(), HOLD_DURATION);
  }

  // ── RELÂCHÉ AVANT 3s ────────────────────────────────────────────────────
  onPointerUp(): void {
    if (this.state() !== 'holding') return;
    clearTimeout(this.holdTimer);
    cancelAnimationFrame(this.holdRaf);
    this.state.set('idle');
    this.holdProgress.set(0);
  }

  // ── 3 SECONDES ATTEINTES ────────────────────────────────────────────────
  private onHoldComplete(): void {
    cancelAnimationFrame(this.holdRaf);
    this.holdProgress.set(100);
    this.state.set('confirming');
    this.cancelCountdown.set(5);
    this.runCancelCountdown();
  }

  // ── ANNULER (pendant les 5 secondes) ────────────────────────────────────
  onCancelConfirm(): void {
    if (this.state() !== 'confirming') return;
    cancelAnimationFrame(this.cancelRaf);
    this.state.set('idle');
    this.holdProgress.set(0);
    this.cancelCountdown.set(5);
  }

  // ── CLÔTURER UN SOS ACTIF "Je suis en sécurité" ─────────────────────────
  onCloseSos(): void {
    const id = this.activeSosId();
    if (!id) return;

    this.sosService.resolve(id, 'Je suis en sécurité').subscribe({
      next: () => this.resetToIdle(),
      error: () => this.errorMsg.set('Erreur lors de la clôture.'),
    });
  }

  // ── ENVOI EFFECTIF DU SOS ───────────────────────────────────────────────
  private async triggerSos(): Promise<void> {
    this.state.set('active');
    this.errorMsg.set('');

    // Vérifier connectivité
    try {
      const { connected } = await Network.getStatus();
      if (!connected) {
        this.fallbackSms();
        return;
      }
    } catch { /* Web/desktop : continuer */ }

    // Obtenir position GPS
    let lat = this.lastPosition?.lat ?? 0;
    let lng = this.lastPosition?.lng ?? 0;

    try {
      const pos = await Geolocation.getCurrentPosition({ timeout: 2000, enableHighAccuracy: true });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      this.lastPosition = { lat, lng };
    } catch { /* Utilise la position en cache */ }

    this.sosService.trigger({ latitude: lat, longitude: lng }).subscribe({
      next: (sos) => {
        this.zone.run(() => {
          this.activeSosId.set(sos._id);
          this.respondingCount.set(sos.respondingContacts?.length ?? 0);
          this.startLocationUpdates(sos._id);
          this.startBatteryMonitor(sos._id);
          this.startPolling(sos._id);
        });
      },
      error: () => {
        this.zone.run(() => {
          this.errorMsg.set('Erreur lors du déclenchement SOS. Vérifiez votre connexion.');
        });
      },
    });
  }

  // ── MISE À JOUR GPS TOUTES LES 10 SECONDES ──────────────────────────────
  private startLocationUpdates(sosId: string): void {
    this.locationInterval = setInterval(async () => {
      try {
        const pos = await Geolocation.getCurrentPosition({ timeout: 3000, enableHighAccuracy: true });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.lastPosition = { lat, lng };
        this.sosService.updateLocation(sosId, lat, lng).subscribe();
      } catch { /* Utilise la position en cache */ }
    }, 10_000);
  }

  // ── POLLING RESPONDING COUNT TOUTES LES 5 SECONDES ─────────────────────
  private startPolling(sosId: string): void {
    this.pollingInterval = setInterval(() => {
      this.sosService.getSosStatus(sosId).subscribe({
        next: (status) => {
          this.zone.run(() => {
            this.respondingCount.set(status.respondingCount);
            // Si le SOS a été clôturé par un tiers (contact B), on remet l'état idle
            if (status.status !== 'ACTIVE') {
              this.resetToIdle();
            }
          });
        },
        error: () => { /* silence — ne pas interrompre le SOS si erreur réseau */ },
      });
    }, 5_000);
  }

  // ── SURVEILLANCE BATTERIE TOUTES LES 30 SECONDES ────────────────────────
  private startBatteryMonitor(sosId: string): void {    this.batteryInterval = setInterval(async () => {
      try {
        const info = await Device.getBatteryInfo();
        if (info.batteryLevel !== undefined && info.batteryLevel < 0.10) {
          this.sosService.lowBattery(sosId).subscribe();
          clearInterval(this.batteryInterval);
        }
      } catch { /* ignore sur web */ }
    }, 30_000);
  }

  // ── FALLBACK SMS SI HORS LIGNE ───────────────────────────────────────────
  private fallbackSms(): void {
    const lat = this.lastPosition?.lat ?? 0;
    const lng = this.lastPosition?.lng ?? 0;
    const msg = encodeURIComponent(
      `🆘 SOS AlertProche ! J'ai besoin d'aide. Dernière position connue : https://maps.google.com/?q=${lat},${lng}`,
    );
    window.open(`sms:?body=${msg}`, '_system');
    this.resetToIdle();
  }

  // ── CACHE POSITION AU CHARGEMENT ────────────────────────────────────────
  private async cacheLastPosition(): Promise<void> {
    try {
      const pos = await Geolocation.getCurrentPosition({ timeout: 5000 });
      this.lastPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { /* pas de GPS disponible */ }
  }

  // ── ANIMATIONS ───────────────────────────────────────────────────────────
  private animateHold(): void {
    const tick = () => {
      const elapsed = Date.now() - this.holdStart;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      this.zone.run(() => this.holdProgress.set(pct));
      if (pct < 100) this.holdRaf = requestAnimationFrame(tick);
    };
    this.holdRaf = requestAnimationFrame(tick);
  }

  private runCancelCountdown(): void {
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((CANCEL_DURATION - elapsed) / 1000));
      this.zone.run(() => this.cancelCountdown.set(remaining));
      if (remaining > 0) {
        this.cancelRaf = requestAnimationFrame(tick);
      } else {
        this.zone.run(() => this.triggerSos());
      }
    };
    this.cancelRaf = requestAnimationFrame(tick);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────
  private clearTimers(): void {
    clearTimeout(this.holdTimer);
    cancelAnimationFrame(this.holdRaf);
    cancelAnimationFrame(this.cancelRaf);
    clearInterval(this.locationInterval);
    clearInterval(this.batteryInterval);
    clearInterval(this.pollingInterval);
  }

  private resetToIdle(): void {
    this.clearTimers();
    this.state.set('idle');
    this.holdProgress.set(0);
    this.cancelCountdown.set(5);
    this.activeSosId.set(null);
    this.respondingCount.set(0);
    this.errorMsg.set('');
  }
}
