import { Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

@Component({
  selector: 'app-platform-support-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="donation-presets">
      <button
        *ngFor="let amount of presets"
        type="button"
        class="preset-btn"
        [class.preset-active]="selectedAmount() === amount"
        (click)="selectPreset(amount)">
        {{ amount | number }} XAF
      </button>
    </div>

    <div class="donation-custom">
      <input
        type="number"
        class="form-control"
        [placeholder]="'PAYMENT.CUSTOM_AMOUNT_PLACEHOLDER' | translate"
        [value]="customAmount()"
        (input)="onCustomInput($any($event.target).value)"
        min="100">
    </div>

    <div class="donation-phone">
      <label style="font-size:0.78rem;font-weight:600;color:var(--text-sub);display:flex;align-items:center;gap:5px;">
        <i class="fas fa-mobile-alt"></i> {{ 'PAYMENT.PHONE_LABEL' | translate }}
      </label>
      <input
        type="tel"
        class="form-control"
        [placeholder]="'PAYMENT.PHONE_PLACEHOLDER' | translate"
        [value]="phone()"
        (input)="phone.set($any($event.target).value)">
    </div>

    <div class="donation-recap" *ngIf="effectiveAmount >= 100">
      <i class="fas fa-circle-check"></i>
      <span>{{ 'PAYMENT.RECAP_PREFIX' | translate }} <strong>{{ effectiveAmount | number }} {{ 'PAYMENT.RECAP_SUFFIX' | translate }}</strong></span>
    </div>

    <div class="donation-error" *ngIf="error()">
      <i class="fas fa-circle-exclamation"></i> {{ error() }}
    </div>

    <button
      class="btn btn-primary donation-submit"
      [disabled]="!isValid || loading()"
      (click)="submit()">
      <span class="spinner" *ngIf="loading()"></span>
      <ng-container *ngIf="!loading()">
        <i class="fas fa-credit-card"></i> {{ 'PAYMENT.BTN_DONATE' | translate }}
      </ng-container>
    </button>

    <p class="donation-hint">
      <i class="fas fa-lock"></i>
      {{ 'PAYMENT.SECURE_HINT' | translate }}
    </p>
  `,
  styles: [`
    :host { display: contents; }

    .donation-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      width: 100%;
    }
    .preset-btn {
      padding: 9px 16px;
      background: var(--bg-hover);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-sub);
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 90px;
    }
    .preset-btn:hover { border-color: var(--green-border); color: var(--green); }
    .preset-btn.preset-active {
      background: var(--green-dim);
      border-color: var(--green);
      color: var(--green);
      font-weight: 700;
    }
    .donation-custom { width: 100%; }
    .donation-custom .form-control { text-align: center; font-size: 1rem; font-weight: 600; }
    .donation-recap {
      display: flex; align-items: center; gap: 8px; padding: 10px 16px;
      background: var(--green-dim); border: 1px solid var(--green-border);
      border-radius: var(--radius-md); font-size: 0.85rem; color: var(--green);
      width: 100%; justify-content: center;
    }
    .donation-error {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      background: var(--urgent-dim); border: 1px solid rgba(239,68,68,0.3);
      border-radius: var(--radius-md); font-size: 0.82rem; color: var(--urgent);
      width: 100%; justify-content: center;
    }
    .donation-submit { width: 100%; min-height: 48px; justify-content: center; font-size: 0.95rem; }
    .donation-hint { font-size: 0.75rem; color: var(--text-muted); margin: 0; text-align: center; }
    .donation-hint i { color: var(--green); margin-right: 4px; }
  `]
})
export class PlatformSupportModalComponent {
  @Output() closed = new EventEmitter<void>();

  readonly presets = PRESET_AMOUNTS;
  selectedAmount = signal<number | null>(null);
  customAmount   = signal<string>('');
  phone          = signal<string>('');
  loading        = signal(false);
  error          = signal('');

  private translate = inject(TranslateService);

  constructor(
    private payment: PaymentService,
    private auth: AuthService,
  ) {}

  selectPreset(amount: number): void {
    this.selectedAmount.set(amount);
    this.customAmount.set('');
    this.error.set('');
  }

  onCustomInput(value: string): void {
    this.customAmount.set(value);
    this.selectedAmount.set(null);
    this.error.set('');
  }

  get effectiveAmount(): number {
    const custom = parseInt(this.customAmount(), 10);
    return this.selectedAmount() ?? (isNaN(custom) ? 0 : custom);
  }

  get isValid(): boolean {
    const phoneDigits = this.phone().replace(/\D/g, '');
    return this.effectiveAmount >= 100 && phoneDigits.length >= 8;
  }

  async submit(): Promise<void> {
    if (this.effectiveAmount < 100) {
      this.error.set(this.translate.instant('PAYMENT.ERR_AMOUNT_MIN'));
      return;
    }
    const phoneDigits = this.phone().replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      this.error.set(this.translate.instant('PAYMENT.ERR_PHONE_INVALID'));
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      const user = this.auth.currentUser();
      const result = await this.payment.initiatePlatformSupport(this.effectiveAmount, this.phone(), user?._id);
      window.open(result.paymentLink, '_blank');
      this.closed.emit();
    } catch (err: any) {
      this.error.set(err?.error?.message ?? this.translate.instant('COMMON.ERR_GENERIC'));
    } finally {
      this.loading.set(false);
    }
  }
}
