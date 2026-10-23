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
const REFERRER_KEY = 'ap_landing_referrer';
const API = `${environment.apiUrl}/tracking`;

const BOT_UA = /bot|crawl|spider|slurp|headless|phantom|selenium|puppeteer|playwright|lighthouse|pingdom|uptime|monitor/i;

@Injectable({ providedIn: 'root' })
export class TrackingService {
  private sessionId = crypto.randomUUID();
  private visitorId = this.getOrCreateVisitorId();
  private sessionStart = 0;
  private pageElapsed = 0;          // temps cumulé sur la page courante
  private pageVisibleSince = 0;     // début du segment visible en cours
  private currentUrl = '';
  private batch: PageviewPayload[] = [];
  private batchTimer: any;
  private ended = false;

  private router = inject(Router);
  private auth = inject(AuthService);

  // Appelé une seule fois au démarrage de l'app (voir app.config.ts)
  init(): void {
    this.sessionStart = Date.now();
    this.currentUrl = this.normalizeUrl(window.location.pathname);
    this.pageVisibleSince = Date.now();

    this.sendSession();
    this.listenRoutes();
    this.startBatchTimer();

    // On termine la session uniquement quand la page est réellement quittée.
    // Un simple changement d'onglet ne doit pas clôturer la visite.
    window.addEventListener('pagehide', () => this.endSession());
    window.addEventListener('beforeunload', () => this.endSession());
    document.addEventListener('visibilitychange', () => this.onVisibilityChange());
  }

  // Méthode publique : appeler depuis les composants pour tracker une action
  trackEvent(type: TrackingEventType, metadata?: Record<string, any>): void {
    const payload: TrackingEventPayload = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      userId: this.auth.currentUser()?._id,
      type,
      metadata,
      isBot: this.isBot(),
      isStaff: this.isStaff(),
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

  /**
   * Appareil déduit du user-agent (et non de la largeur de la fenêtre :
   * un ordinateur avec une fenêtre étroite n'est pas une tablette).
   */
  detectDevice(): DeviceType {
    const ua = navigator.userAgent;
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
    if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return 'tablet';
    if (/Mobi|iPhone|iPod|Android|IEMobile|Opera Mini/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  private isBot(): boolean {
    if (typeof navigator !== 'undefined' && (navigator as any).webdriver) return true;
    return BOT_UA.test(navigator.userAgent || '');
  }

  private isStaff(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'Admin' || role === 'Moderateur';
  }

  /**
   * Classifie la source à partir de l'URL d'arrivée (UTM) puis du referrer.
   * Le referrer d'arrivée est mémorisé pour toute la session : sans cela,
   * toute navigation interne le remplace par une valeur vide.
   */
  classifySource(referrer: string): TrafficSource {
    let utm = '';
    try {
      const params = new URLSearchParams(window.location.search);
      utm = `${params.get('utm_source') || ''} ${params.get('utm_medium') || ''}`.toLowerCase();
    } catch { /* ignore */ }

    if (utm.trim()) {
      if (/facebook|instagram|twitter|linkedin|tiktok|whatsapp|telegram|social/.test(utm)) return 'Social';
      if (/google|bing|search|organic|seo/.test(utm)) return 'Organic Search';
      return 'Referral';
    }

    if (!referrer) return 'Direct';
    if (/^https?:\/\/([^/]+)/i.test(referrer)) {
      try {
        const host = new URL(referrer).hostname.replace(/^www\./, '');
        if (host === window.location.hostname.replace(/^www\./, '')) return 'Direct';
      } catch { /* ignore */ }
    }
    if (/google|bing|duckduckgo|yahoo|yandex|ecosia|qwant/i.test(referrer)) return 'Organic Search';
    if (/facebook|twitter|x\.com|instagram|linkedin|tiktok|whatsapp|telegram/i.test(referrer)) return 'Social';
    return 'Referral';
  }

  /** Retire les paramètres de requête pour regrouper une page. */
  normalizeUrl(url: string): string {
    return (url || '').split('?')[0].split('#')[0];
  }

  private landingReferrer(): string {
    try {
      const stored = sessionStorage.getItem(REFERRER_KEY);
      if (stored !== null) return stored;
      const ref = document.referrer || '';
      sessionStorage.setItem(REFERRER_KEY, ref);
      return ref;
    } catch {
      return document.referrer || '';
    }
  }

  private sendSession(): void {
    const isNew = !localStorage.getItem(VISITOR_KEY + '_seen');
    if (isNew) localStorage.setItem(VISITOR_KEY + '_seen', '1');

    const ua = navigator.userAgent;
    const referrer = this.landingReferrer();

    const payload: TrackingSessionPayload = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      userId: this.auth.currentUser()?._id,
      device: this.detectDevice(),
      browser: this.getBrowser(ua),
      os: this.getOS(ua),
      entryPage: this.normalizeUrl(window.location.pathname),
      trafficSource: this.classifySource(referrer),
      isNewVisitor: isNew,
      isBot: this.isBot(),
      isStaff: this.isStaff(),
      startedAt: new Date().toISOString(),
    };
    this.beacon(`${API}/session`, payload);
  }

  private listenRoutes(): void {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      // Enregistrer la page que l'on quitte
      this.queuePageview();

      this.currentUrl = this.normalizeUrl(e.urlAfterRedirects);
      this.pageElapsed = 0;
      this.pageVisibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
    });
  }

  /** Ajoute la page courante au lot, avec sa durée réelle (hors onglet caché). */
  private queuePageview(): void {
    if (!this.currentUrl) return;

    const visibleFor = this.pageVisibleSince ? Date.now() - this.pageVisibleSince : 0;
    const duration = this.pageElapsed + visibleFor;

    this.batch.push({
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      userId: this.auth.currentUser()?._id,
      type: 'pageview',
      url: this.currentUrl,
      duration,
      isBot: this.isBot(),
      isStaff: this.isStaff(),
      timestamp: new Date().toISOString(),
    });

    this.pageElapsed = 0;
    this.pageVisibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
  }

  private onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      // On met en pause le chrono et on envoie ce qui est déjà en attente.
      if (this.pageVisibleSince) {
        this.pageElapsed += Date.now() - this.pageVisibleSince;
        this.pageVisibleSince = 0;
      }
      this.flushBatch();
    } else if (!this.ended) {
      this.pageVisibleSince = Date.now();
    }
  }

  private startBatchTimer(): void {
    clearInterval(this.batchTimer);
    this.batchTimer = setInterval(() => this.flushBatch(), 10_000);
  }

  private flushBatch(): void {
    if (!this.batch.length) return;
    const toSend = [...this.batch];
    this.batch = [];
    toSend.forEach(pv => this.beacon(`${API}/pageview`, pv));
  }

  private endSession(): void {
    if (this.ended) return;
    this.ended = true;

    // La dernière page visitée n'était jamais comptée : on l'ajoute ici.
    this.queuePageview();
    this.flushBatch();
    clearInterval(this.batchTimer);

    const payload = {
      exitPage: this.currentUrl,
      duration: Date.now() - this.sessionStart,
    };
    navigator.sendBeacon(`${API}/session/${this.sessionId}/end`, JSON.stringify(payload));
  }

  // Envoi fire-and-forget : sendBeacon si dispo, sinon fetch keepalive
  private beacon(url: string, data: object): void {
    try {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      if (!navigator.sendBeacon(url, blob)) {
        fetch(url, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {});
      }
    } catch { /* silencieux */ }
  }

  // Extraction basique du navigateur depuis le user-agent
  private getBrowser(ua: string): string {
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Other';
  }

  private getOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Other';
  }
}
