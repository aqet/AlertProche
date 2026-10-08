import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';

const PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000];

@Component({
  selector: 'app-donation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-modal.component.html',
  styleUrls: ['./donation-modal.component.css'],
})
export class DonationModalComponent {
  @Input() alertId!: string;
  @Input() alertTitle = 'cette alerte';
  @Output() closed = new EventEmitter<void>();

  readonly presets = PRESET_AMOUNTS;

  selectedAmount = signal<number | null>(null);
  customAmount   = signal<string>('');
  phone          = signal<string>('');
  loading        = signal(false);
  error          = signal('');

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
// ici
  get isValid(): boolean {
    const phoneDigits = this.phone().replace(/\D/g, '');
    return this.effectiveAmount >= 15 && phoneDigits.length >= 8;
  }

  close(): void {
    this.closed.emit();
  }
// ici
  async submit(): Promise<void> {
    if (this.effectiveAmount < 15) {
      this.error.set('Le montant minimum est 15 XAF.');
      return;
    }
    const phoneDigits = this.phone().replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      this.error.set('Veuillez entrer un numéro Mobile Money valide.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      const user = this.auth.currentUser();
      const result = await this.payment.initiateAlertDonation(
        this.alertId,
        this.effectiveAmount,
        this.phone(),
        user?._id,
      );
      window.open(result.paymentLink, '_blank');
      this.close();
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      this.loading.set(false);
    }
  }
}
