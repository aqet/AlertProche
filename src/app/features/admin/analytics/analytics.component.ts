import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { AnalyticsService } from '../../../core/services/analytics.service';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { MiniChartComponent, MiniChartPoint } from './mini-chart.component';
import {
  AnalyticsPeriod,
  AnalyticsTab,
  AudienceResponse,
  MissionResponse,
} from '../../../core/models/tracking.models';

type AudienceMetric = 'visitors' | 'sessions' | 'pageviews';
type AlertMetric = 'published' | 'resolved';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, MiniChartComponent, MediaUrlPipe],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private analytics = inject(AnalyticsService);
  private translate = inject(TranslateService);

  period = signal<AnalyticsPeriod>('30d');
  tab = signal<AnalyticsTab>('audience');
  loading = signal(false);
  error = signal<string | null>(null);

  audience = signal<AudienceResponse | null>(null);
  mission = signal<MissionResponse | null>(null);

  metric = signal<AudienceMetric>('visitors');
  alertMetric = signal<AlertMetric>('published');
  private refresh?: ReturnType<typeof setInterval>;

  readonly periods: { value: AnalyticsPeriod; label: string }[] = [
    { value: '7d', label: 'ANALYTICS.PERIOD_7D' },
    { value: '30d', label: 'ANALYTICS.PERIOD_30D' },
    { value: '90d', label: 'ANALYTICS.PERIOD_90D' },
    { value: '12m', label: 'ANALYTICS.PERIOD_12M' },
    { value: 'all', label: 'ANALYTICS.PERIOD_ALL' },
  ];

  // ── Graphiques ────────────────────────────────────────────────

  audienceChartPoints = computed<MiniChartPoint[]>(() => {
    const data = this.audience();
    if (!data) return [];
    const metric = this.metric();
    return data.series.map((point) => ({
      label: this.chartLabel(point.date, data.granularity),
      value: point[metric],
      title: `${this.chartLabel(point.date, data.granularity)} - ${this.formatNumber(point[metric])}`,
    }));
  });

  missionChartPoints = computed<MiniChartPoint[]>(() => {
    const data = this.mission();
    if (!data) return [];
    const metric = this.alertMetric();
    return data.series.map((point) => ({
      label: this.chartLabel(point.date, 'month'),
      value: point[metric],
      title: `${this.chartLabel(point.date, 'month')} - ${this.formatNumber(point[metric])}`,
    }));
  });

  pagesMain = computed(() =>
    (this.audience()?.pages ?? []).filter((p) => !this.isTechnical(p.url)),
  );

  pagesTechnical = computed(() =>
    (this.audience()?.pages ?? []).filter((p) => this.isTechnical(p.url)),
  );

  ngOnInit(): void {
    this.load();
    this.refresh = setInterval(() => this.load(false), 60_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refresh);
  }

  setPeriod(period: AnalyticsPeriod): void {
    if (period === this.period()) return;
    this.period.set(period);
    this.load();
  }

  setTab(tab: AnalyticsTab): void {
    this.tab.set(tab);
  }

  private load(showBar = true): void {
    if (showBar) this.loading.set(true);
    const period = this.period();

    forkJoin({
      audience: this.analytics.getAudience(period),
      mission: this.analytics.getMission(period),
    }).subscribe({
      next: ({ audience, mission }) => {
        this.audience.set(audience);
        this.mission.set(mission);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err?.status === 401 || err?.status === 403
            ? 'ANALYTICS.ERROR_ACCESS'
            : 'ANALYTICS.ERROR_LOAD',
        );
        this.loading.set(false);
      },
    });
  }

  // ── Formatage ─────────────────────────────────────────────────

  get lang(): string {
    return this.translate.currentLang || 'fr';
  }

  delta(current: number, previous: number | null | undefined): number | null {
    if (previous === null || previous === undefined || previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
  }

  formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat(this.lang).format(value ?? 0);
  }

  formatDuration(ms: number | null | undefined): string {
    if (!ms || ms < 1000) return '-';
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (!minutes) return `${seconds} s`;
    return `${minutes} min ${String(seconds).padStart(2, '0')} s`;
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString(this.lang, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  }

  chartLabel(date: string, granularity: 'day' | 'month'): string {
    const [year, month, day] = date.split('-').map(Number);
    try {
      if (granularity === 'month') {
        return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(this.lang, {
          month: 'short',
          year: '2-digit',
          timeZone: 'UTC',
        });
      }
      return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(this.lang, {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'UTC',
      });
    } catch {
      return date;
    }
  }

  prettyUrl(url: string): string {
    if (!url) return '-';
    if (url === '/') return 'Accueil';
    if (/^\/posts\/[a-f0-9]{24}$/i.test(url)) return '/posts/:id';
    return url;
  }

  isTechnical(url: string): boolean {
    return /^\/(admin|auth|dashboard|messages|sos|posts\/new)/.test(url || '');
  }

  deviceLabel(device: string): string {
    const key = `ANALYTICS.DEVICE_${(device || 'other').toUpperCase()}`;
    const translated = this.translate.instant(key);
    return translated === key ? device : translated;
  }

  sourceLabel(source: string): string {
    const map: Record<string, string> = {
      Direct: 'ANALYTICS.SOURCE_DIRECT',
      'Organic Search': 'ANALYTICS.SOURCE_SEARCH',
      Social: 'ANALYTICS.SOURCE_SOCIAL',
      Referral: 'ANALYTICS.SOURCE_REFERRAL',
      Unknown: 'ANALYTICS.SOURCE_UNKNOWN',
    };
    const key = map[source];
    return key ? this.translate.instant(key) : source;
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      Disparition: 'POST.TYPE_DISPARITION',
      Abus: 'POST.TYPE_ABUS',
      Prevention: 'POST.TYPE_PREVENTION',
      "Appel à l'aide": 'POST.TYPE_APPEL',
    };
    const key = map[type];
    return key ? this.translate.instant(key) : type;
  }

  percent(part: number, total: number): number {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  barPct(part: number, total: number): number {
    return Math.min(100, this.percent(part, total));
  }

  get emptyLabel(): string {
    return this.translate.instant('ANALYTICS.EMPTY_NO_DATA');
  }

  get noResultsLabel(): string {
    return this.translate.instant('ANALYTICS.EMPTY_PERIOD');
  }
}
