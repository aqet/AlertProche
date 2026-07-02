import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  TrackingSessionPayload, PageviewPayload, TrackingEventPayload,
  TrafficSource, DeviceType, TrackingEventType
} from '../models/tracking.models';

const VISITOR_KEY = 'ap_visitor_id';
const API = `${environment.apiUrl}/tracking`;

@Injectable({ providedIn: 'root' })
export class TrackingService {
  private sessionId = crypto.randomUUID();
  private visitorId = this.getOrCreateVisitorId();
  private sessionStart = 0; // initialisé dans init()
  private pageEntry = Date.now();
  private currentUrl = '';
  private batch: PageviewPayload[] = [];
  private batchTimer: any;

  private router = inject(Router);
  private auth = inject(AuthService);

  // Appelé une seule fois au démarrage de l'app (voir app.config.ts)
  init(): void {
    this.sessionStart = Date.now();
    this.sendSession();
    this.listenRoutes();
    this.startBatchTimer();
    window.addEventListener('beforeunload', () => this.endSession());
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.endSession();
    });
  }

  // Méthode publique : appeler depuis les composants pour tracker une action
  trackEvent(type: TrackingEventType, metadata?: Record<string, any>): void {
    const payload: TrackingEventPayload = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      userId: this.auth.currentUser()?._id,
      type,
      metadata,
      timestamp: new Date().toISOString(),
    };
    this.beacon(`${API}/event`, payload);
  }

  // --- Privé ---

  getOrCreateVisitorId(): string {
    try {
      const existing = localStorage.getItem(VISITOR_KEY);
      if (existing) return existing;
      const id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
      return id;
    } catch {
      // localStorage inaccessible (mode privé) → session-only
      return crypto.randomUUID();
    }
  }

  detectDevice(): DeviceType {
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w <= 1024) return 'tablet';
    return 'desktop';
  }

  // Classifie la source de trafic à partir du referrer
  classifySource(referrer: string): TrafficSource {
    if (!referrer) return 'Direct';
    if (/google|bing|duckduckgo|yahoo/i.test(referrer)) return 'Organic Search';
    if (/facebook|twitter|instagram|linkedin|tiktok|whatsapp/i.test(referrer)) return 'Social';
    if (referrer.includes(window.location.hostname)) return 'Direct'; // navigation interne
    return 'Referral';
  }

  // Remplace les segments ObjectId MongoDB (24 hex) par :id pour normaliser les URLs
  // On garde l'URL telle quelle pour permettre d'identifier les vraies pages
  normalizeUrl(url: string): string {
    return url.split('?')[0]; // On enlève juste les query params
  }

  private sendSession(): void {
    const isNew = !localStorage.getItem(VISITOR_KEY + '_seen');
    if (isNew) localStorage.setItem(VISITOR_KEY + '_seen', '1');

    const ua = navigator.userAgent;
    const payload: TrackingSessionPayload = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      userId: this.auth.currentUser()?._id,
      device: this.detectDevice(),
      browser: this.getBrowser(ua),
      os: this.getOS(ua),
      entryPage: this.normalizeUrl(window.location.pathname),
      trafficSource: this.classifySource(document.referrer),
      isNewVisitor: isNew,
      startedAt: new Date().toISOString(),
    };
    this.beacon(`${API}/session`, payload);
  }

  private listenRoutes(): void {
    this.currentUrl = this.normalizeUrl(window.location.pathname);
    this.pageEntry = Date.now();

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      // Enregistrer la durée sur la page précédente
      const pv: PageviewPayload = {
        sessionId: this.sessionId,
        visitorId: this.visitorId,
        userId: this.auth.currentUser()?._id,
        type: 'pageview',  // requis par le DTO backend
        url: this.currentUrl,
        duration: Date.now() - this.pageEntry,
        timestamp: new Date().toISOString(),
      };
      this.batch.push(pv);

      // Nouvelle page
      this.currentUrl = this.normalizeUrl(e.urlAfterRedirects);
      this.pageEntry = Date.now();
    });
  }

  private startBatchTimer(): void {
    // Flush le batch toutes les 10 secondes
    this.batchTimer = setInterval(() => this.flushBatch(), 10_000);
  }

  private flushBatch(): void {
    if (!this.batch.length) return;
    const toSend = [...this.batch];
    this.batch = [];
    toSend.forEach(pv => this.beacon(`${API}/pageview`, pv));
  }

  private endSession(): void {
    this.flushBatch();
    clearInterval(this.batchTimer);
    const payload = {
      exitPage: this.currentUrl,
      duration: Date.now() - this.sessionStart,
    };
    // sendBeacon garantit l'envoi même quand la page se ferme
    navigator.sendBeacon(`${API}/session/${this.sessionId}/end`, JSON.stringify(payload));
  }

  // Envoi fire-and-forget : sendBeacon si dispo, sinon fetch keepalive
  private beacon(url: string, data: object): void {
    try {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      if (!navigator.sendBeacon(url, blob)) {
        fetch(url, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
      }
    } catch { /* silencieux */ }
  }

  // Extraction basique du navigateur depuis le user-agent
  private getBrowser(ua: string): string {
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Other';
  }

  private getOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Other';
  }
}
