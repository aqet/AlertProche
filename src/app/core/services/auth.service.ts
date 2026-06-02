import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User, AuthResponse, LoginDto } from '../models/user.model';
import { environment } from '../../../environments/environment';

const SESSION_KEY = 'ap_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;

  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor(private http: HttpClient, private router: Router) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const { user } = JSON.parse(session);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      }
    } catch { /* ignore */ }
  }

  // ── ÉTAPE 1 : Envoyer OTP ────────────────────────────────────────
  sendOtp(email: string, pseudo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API}/otp/send`, { email, pseudo });
  }

  // ── ÉTAPE 2 : Vérifier OTP ───────────────────────────────────────
  verifyOtp(email: string, code: string): Observable<{ verified: boolean; token: string }> {
    return this.http.post<{ verified: boolean; token: string }>(`${this.API}/otp/verify`, { email, code });
  }

  // ── ÉTAPE 3 : Finaliser inscription ──────────────────────────────
  register(pseudo: string, password: string, verifyToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API}/register`,
      { pseudo, password },
      { headers: { 'x-verify-token': verifyToken } }
    ).pipe(tap(res => this.saveSession(res)));
  }

  // ── LOGIN ─────────────────────────────────────────────────────────
  login(dto: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, dto).pipe(
      tap(res => this.saveSession(res))
    );
  }

  updatePseudo(pseudo: string): Observable<User> {
    return this.http.patch<User>(`${this.API}/profile/pseudo`, { pseudo }).pipe(
      tap(user => {
        this.currentUser.set(user);
        const session = localStorage.getItem(SESSION_KEY);
        if (session) {
          const parsed = JSON.parse(session);
          parsed.user = user;
          localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session).token : null;
    } catch { return null; }
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: res.access_token, user: res.user }));
    this.currentUser.set(res.user);
    this.isAuthenticated.set(true);
  }
}
