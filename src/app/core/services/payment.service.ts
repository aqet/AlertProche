import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PaymentInitiateResponse,
  DonationInitiateDto,
  SupportInitiateDto,
  PayoutRequestDto,
  Cagnotte,
} from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly API = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  /** Initier un don pour une alerte */
  async initiateAlertDonation(
    alertId: string,
    amount: number,
    phone: string,
    userId?: string,
  ): Promise<PaymentInitiateResponse> {
    const body: DonationInitiateDto = { alertId, amount, phone, userId };
    return firstValueFrom(
      this.http.post<PaymentInitiateResponse>(`${this.API}/donations/initiate`, body),
    );
  }

  /** Initier un don de soutien à la plateforme */
  async initiatePlatformSupport(
    amount: number,
    phone: string,
    userId?: string,
  ): Promise<PaymentInitiateResponse> {
    const body: SupportInitiateDto = { amount, phone, userId };
    return firstValueFrom(
      this.http.post<PaymentInitiateResponse>(`${this.API}/support/initiate`, body),
    );
  }

  /** Demander un retrait (payout) pour une alerte */
  async requestPayout(dto: PayoutRequestDto): Promise<{ message: string; transactionId: string }> {
    return firstValueFrom(
      this.http.post<{ message: string; transactionId: string }>(`${this.API}/payout/request`, dto),
    );
  }

  /** Mes cagnottes (auteur connecté) */
  async getMyCagnottes(): Promise<Cagnotte[]> {
    return firstValueFrom(this.http.get<Cagnotte[]>(`${this.API}/my-cagnottes`));
  }
}
