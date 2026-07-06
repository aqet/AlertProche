import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType, LegendPosition } from '@swimlane/ngx-charts';
import { AnalyticsService } from '../../../core/services/analytics.service';
import {
  AnalyticsPeriod, AnalyticsTab, AnalyticsOverview,
  PageStat, GeoStat, DeviceStat, SourceStat, ActivityPoint
} from '../../../core/models/tracking.models';
import { curveMonotoneX, curveCardinal } from 'd3-shape';
type ChartSerie = 'sessions' | 'pageviews' | 'both';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private analytics = inject(AnalyticsService);
  private el = inject(ElementRef);

  curveMonotoneX=curveMonotoneX
  period = signal<AnalyticsPeriod>('30d');
  activeTab = signal<AnalyticsTab>('overview');
  loading = signal(false);
  chartSerie = signal<ChartSerie>('both');

  overview = signal<AnalyticsOverview | null>(null);
  pages = signal<PageStat[]>([]);
  topPosts = signal<PageStat[]>([]);
  geo = signal<GeoStat[]>([]);
  devices = signal<DeviceStat[]>([]);
  sources = signal<SourceStat[]>([]);
  activity = signal<ActivityPoint[]>([]);

  // Dimensions calculées dynamiquement selon la largeur réelle du conteneur
  lineView = signal<[number, number]>([700, 280]);
  barView  = signal<[number, number]>([700, 320]);
  pieView  = signal<[number, number]>([340, 280]);

  private refreshInterval: ReturnType<typeof setInterval> | undefined;
  private resizeObserver: ResizeObserver | undefined;

  readonly LegendPosition = LegendPosition;

  // ── Données formatées pour ngx-charts ──────────────────────────

  lineChartData = computed(() => {
    const data  = this.activity();
    const serie = this.chartSerie();
    const result: any[] = [];
    if (serie !== 'pageviews') {
      result.push({ name: 'Sessions',   series: data.map(d => ({ name: d.date.slice(5), value: d.sessions  })) });
    }
    if (serie !== 'sessions') {
      result.push({ name: 'Pages vues', series: data.map(d => ({ name: d.date.slice(5), value: d.pageviews })) });
    }
    return result; 
  });

  pagesChartData  = computed(() => this.pages().map(p    => ({ name: p.url,    value: p.views })));
  postsChartData  = computed(() => this.topPosts().map(p  => ({ name: p.url,    value: p.views })));
  devicesChartData = computed(() => this.devices().map(d  => ({ name: d.device, value: d.count })));
  sourcesChartData = computed(() => this.sources().map(s  => ({ name: s.source, value: s.count })));

  lineColors: Color = {
    name: 'activity', selectable: true, group: ScaleType.Ordinal,
    domain: ['#e53935', '#1976d2']
  };
  deviceColors: Color = {
    name: 'devices',  selectable: true, group: ScaleType.Ordinal,
    domain: ['#e53935', '#1976d2', '#43a047']
  };
  sourceColors: Color = {
    name: 'sources',  selectable: true, group: ScaleType.Ordinal,
    domain: ['#e53935', '#1976d2', '#fb8c00', '#8e24aa', '#00897b']
  };

  // Ticks X adaptatifs — moins de labels sur petit écran pour éviter l'entassement
  xTicks = signal<string[]>([]);

  ngOnInit(): void {
    this.loadAll();
    this.refreshInterval = setInterval(() => {
      if (this.activeTab() === 'overview') this.loadOverview();
    }, 60_000);
  }

  ngAfterViewInit(): void {
    // Observe le conteneur pour adapter les graphiques à sa largeur réelle
    this.resizeObserver = new ResizeObserver(() => this.updateSizes());
    this.resizeObserver.observe(this.el.nativeElement);
    this.updateSizes();
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshInterval);
    this.resizeObserver?.disconnect();
  }

  private updateSizes(): void {
    const w = this.el.nativeElement.clientWidth;
    if (!w) return;

    // padding .container (16–24px × 2) + padding .chart-card (14–20px × 2)
    const pad  = w < 420 ? 32 + 28 : w < 650 ? 32 + 40 : 48 + 40;
    const gap  = 20;
    const full = Math.max(180, w - pad);
    const isMobile = w < 700;
    const isTiny = w < 420;
    const half = isMobile ? full : Math.max(220, Math.floor((full - gap) / 2));

    const lineH = isTiny ? 160 : isMobile ? 200 : 280;
    const barH  = Math.max(140, Math.min(400, this.pages().length * 30 + 40));
    const pieH  = isTiny ? 180 : isMobile ? 220 : 280;

    this.lineView.set([full, lineH]);
    this.barView.set([full, barH]);
    this.pieView.set([half, pieH]);

    this.computeXTicks(full);
  }

  // Sélectionne un sous-ensemble de dates pour l'axe X selon la largeur
  private computeXTicks(width: number): void {
    const data = this.activity();
    if (!data.length) return;
    // Espace minimal entre deux labels : ~55px
    const maxTicks = Math.max(2, Math.floor(width / 55));
    const step = Math.ceil(data.length / maxTicks);
    const ticks = data
      .filter((_, i) => i % step === 0)
      .map(d => d.date.slice(5));
    this.xTicks.set(ticks);
  }

  setPeriod(p: AnalyticsPeriod): void {
    this.period.set(p);
    this.loadAll();
  }

  setTab(tab: AnalyticsTab): void {
    this.activeTab.set(tab);
    // Re-calculer après que le DOM change d'onglet
    setTimeout(() => this.updateSizes(), 50);
  }

  private loadAll(): void {
    const p = this.period();
    this.loading.set(true);
    this.loadOverview();
    this.analytics.getPages(p).subscribe({
      next: v => { this.pages.set(v); this.updateSizes(); }, error: () => {}
    });
    this.analytics.getTopPosts(p).subscribe({ next: v => this.topPosts.set(v), error: () => {} });
    this.analytics.getGeo(p).subscribe({ next: v => this.geo.set(v), error: () => {} });
    this.analytics.getDevices(p).subscribe({ next: v => this.devices.set(v), error: () => {} });
    this.analytics.getSources(p).subscribe({ next: v => this.sources.set(v), error: () => {} });
    this.analytics.getActivity(p).subscribe({
      next: v => {
        this.activity.set(v);
        this.loading.set(false);
        // Recalculer les ticks X après réception des données
        this.computeXTicks(this.lineView()[0]);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadOverview(): void {
    this.analytics.getOverview(this.period()).subscribe({
      next: v => this.overview.set(v), error: () => {}
    });
  }
}
