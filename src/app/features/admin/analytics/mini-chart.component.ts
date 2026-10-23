import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MiniChartPoint {
  label: string;
  value: number;
  title?: string;
}

interface PlottedPoint extends MiniChartPoint {
  x: number;
  y: number;
  xPct: number;
  yPct: number;
  showValue: boolean;
  showTick: boolean;
}

/**
 * Courbe SVG responsive, sans dépendance externe.
 * Une seule série : le parent choisit la métrique affichée.
 *
 * Repère unique : le SVG, les points et les étiquettes partagent
 * exactement les mêmes coordonnées, ce qui garantit l'alignement
 * du zéro et des valeurs. Les chiffres sont affichés en permanence,
 * sans avoir besoin de survoler la courbe.
 */
@Component({
  selector: 'app-mini-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mini-chart" *ngIf="points.length; else empty">
      <!-- Axe des ordonnées -->
      <div class="y-axis" [style.height.px]="height">
        <span>{{ format(axisMax) }}</span>
        <span>{{ format(axisMax / 2) }}</span>
        <span>0</span>
      </div>

      <div class="plot">
        <!-- Zone de tracé (hauteur fixe) -->
        <div class="canvas" [style.height.px]="height">
          <!-- Grille horizontale -->
          <span class="grid-line top"></span>
          <span class="grid-line mid"></span>
          <span class="grid-line bottom"></span>

          <svg
            class="curve"
            [attr.viewBox]="'0 0 ' + width + ' ' + height"
            preserveAspectRatio="none"
            role="img">
            <defs>
              <linearGradient [attr.id]="gradId" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.28" />
                <stop offset="100%" [attr.stop-color]="color" stop-opacity="0" />
              </linearGradient>
            </defs>

            <!-- Aire sous la courbe -->
            <path [attr.d]="areaPath" [attr.fill]="'url(#' + gradId + ')'" class="area" />

            <!-- Ligne de la courbe : se dessine progressivement -->
            <path
              [attr.d]="linePath"
              [attr.stroke]="color"
              class="line"
              fill="none"
              [attr.stroke-dasharray]="pathLength"
              [attr.stroke-dashoffset]="drawn ? 0 : pathLength" />
          </svg>

          <!-- Points et valeurs, alignés sur la courbe -->
          <div class="markers">
            <div
              class="marker"
              *ngFor="let p of plotted"
              [style.left.%]="p.xPct"
              [style.top.%]="p.yPct"
              [title]="p.title || (p.label + ' : ' + p.value)">
              <span class="value" *ngIf="p.showValue">{{ format(p.value) }}</span>
              <span class="dot" [style.background]="color"></span>
            </div>
          </div>
        </div>

        <!-- Étiquettes de l'axe des abscisses -->
        <div class="ticks">
          <span
            class="tick"
            *ngFor="let p of plotted"
            [style.left.%]="p.xPct">{{ p.showTick ? p.label : '' }}</span>
        </div>
      </div>
    </div>

    <ng-template #empty>
      <div class="chart-empty">
        <i class="fas fa-chart-line"></i>
        <span>{{ emptyLabel }}</span>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }

    .mini-chart {
      display: flex;
      gap: 10px;
    }

    /* ── Axe Y ─────────────────────────────────────────────── */
    .y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 0.65rem;
      color: var(--color-text-muted);
      min-width: 30px;
      font-variant-numeric: tabular-nums;
    }

    /* ── Zone de tracé ─────────────────────────────────────── */
    .plot {
      position: relative;
      flex: 1;
      min-width: 0;
      /* Marge en haut : place pour la valeur la plus haute. */
      padding-top: 18px;
      /* Marge en bas : place pour les étiquettes de dates. */
      padding-bottom: 24px;
    }

    .canvas {
      position: relative;
      width: 100%;
    }

    .grid-line {
      position: absolute;
      left: 0;
      right: 0;
      border-top: 1px dashed var(--color-border);
      pointer-events: none;
    }

    .grid-line.top { top: 0; }
    .grid-line.mid { top: 50%; }
    .grid-line.bottom { bottom: 0; }

    .curve {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .line {
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
      transition: stroke-dashoffset 2.8s cubic-bezier(0.33, 0, 0.2, 1);
    }

    .area {
      opacity: 0;
      animation: fade-area 2s ease 1.2s forwards;
    }

    @keyframes fade-area {
      to { opacity: 1; }
    }

    /* ── Points et valeurs ─────────────────────────────────── */
    .markers {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .marker {
      position: absolute;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      border: 1.5px solid var(--color-bg-card, #fff);
      flex-shrink: 0;
    }

    /* La valeur est placée AU-DESSUS du point, toujours visible. */
    .value {
      position: absolute;
      bottom: 10px;
      font-size: 0.66rem;
      font-weight: 700;
      color: var(--color-text-secondary);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      pointer-events: none;
    }

    /* ── Étiquettes de dates ───────────────────────────────── */
    .ticks {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 20px;
      pointer-events: none;
    }

    .tick {
      position: absolute;
      bottom: 2px;
      transform: translateX(-50%);
      font-size: 0.62rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .chart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 32px 12px;
      color: var(--color-text-muted);
      font-size: 0.82rem;
      text-align: center;
    }

    .chart-empty i { font-size: 1.6rem; opacity: 0.4; }

    @media (max-width: 480px) {
      .mini-chart { gap: 6px; }
      .y-axis { min-width: 24px; font-size: 0.6rem; }
      .value { font-size: 0.6rem; }
    }
  `],
})
export class MiniChartComponent {
  @Input() points: MiniChartPoint[] = [];
  @Input() color = 'var(--green)';
  @Input() emptyLabel = 'Aucune donnée';
  @Input() height = 180;

  /** Largeur logique du viewBox : l'aspect est étiré horizontalement. */
  readonly width = 1000;

  /** Identifiant unique du dégradé (plusieurs courbes sur une même page). */
  readonly gradId = 'mini-grad-' + Math.random().toString(36).slice(2, 9);

  /** Passe à true après le premier rendu pour déclencher l'animation. */
  drawn = false;

  /** Longueur du tracé, pour l'animation « dessin au trait ». */
  get pathLength(): number {
    return 3000;
  }

  /** Valeur maximale réelle des données. */
  get maxValue(): number {
    return Math.max(0, ...this.points.map((p) => p.value));
  }

  /** Maximum de l'axe : arrondi au-dessus, avec 2 crans pour les valeurs. */
  get axisMax(): number {
    const max = this.maxValue;
    if (max <= 0) return 1;
    if (max <= 4) return max + 1;
    return Math.ceil(max * 1.15);
  }

  /** Points projetés : coordonnées SVG + pourcentages CSS. */
  get plotted(): PlottedPoint[] {
    const n = this.points.length;
    if (!n) return [];

    const step = n > 1 ? this.width / (n - 1) : 0;
    const tickStep = n <= 12 ? 1 : Math.ceil(n / 7);
    // On n'affiche la valeur que si elle ne se chevauche pas trop.
    const valueStep = n <= 24 ? 1 : Math.ceil(n / 16);

    return this.points.map((p, i) => {
      const x = n > 1 ? i * step : this.width / 2;
      const ratio = this.axisMax > 0 ? p.value / this.axisMax : 0;
      const y = this.height - ratio * this.height;

      return {
        ...p,
        x,
        y,
        xPct: this.width > 0 ? (x / this.width) * 100 : 0,
        yPct: this.height > 0 ? (y / this.height) * 100 : 0,
        showValue: i % valueStep === 0 || i === n - 1,
        showTick: i % tickStep === 0 || i === n - 1,
      };
    });
  }

  /**
   * Tracé lissé : courbes de Bézier cubiques passant par chaque point
   * (tangentes de type Catmull-Rom).
   */
  get linePath(): string {
    const pts = this.plotted;
    if (!pts.length) return '';
    if (pts.length === 1) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y}`;
    }

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  /** Aire fermée sous la courbe, pour le dégradé. */
  get areaPath(): string {
    const pts = this.plotted;
    if (!pts.length) return '';
    return `${this.linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${this.height} L ${pts[0].x.toFixed(1)} ${this.height} Z`;
  }

  format(value: number): string {
    const rounded = Math.round(value);
    if (rounded >= 1000) {
      return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(rounded);
    }
    return String(rounded);
  }

  constructor() {
    // Déclenche l'animation du tracé juste après le premier rendu.
    setTimeout(() => (this.drawn = true), 30);
  }
}
