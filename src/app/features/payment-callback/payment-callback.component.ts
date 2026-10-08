import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

type CallbackStatus = 'loading' | 'success' | 'failed' | 'pending';

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './payment-callback.component.html',
  styleUrls: ['./payment-callback.component.css'],
})
export class PaymentCallbackComponent implements OnInit {
  status = signal<CallbackStatus>('loading');
  ref    = signal<string | null>(null);

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const rawStatus = (params['status'] ?? '').toLowerCase();
    const ref = params['ref'] ?? params['transactionRef'] ?? null;

    this.ref.set(ref);

    // Résoudre le statut depuis les query params digiKUNTZ
    if (rawStatus === 'success' || rawStatus === 'completed') {
      this.status.set('success');
    } else if (rawStatus === 'failed' || rawStatus === 'cancelled') {
      this.status.set('failed');
    } else if (rawStatus === 'pending' || rawStatus === '') {
      // Pas de status → paiement en cours de traitement
      this.status.set('pending');
    } else {
      this.status.set('pending');
    }
  }
}
