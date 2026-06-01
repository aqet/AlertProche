import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User, AuthResponse, LoginDto, RegisterDto } from '../models/user.model';
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

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, dto).pipe(
      tap(res => this.saveSession(res))
    );
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/register`, dto).pipe(
      tap(res => this.saveSession(res))
    );
  }

  updatePseudo(pseudo: string): Observable<User> {
    return this.http.patch<User>(`${this.API}/profile/pseudo`, { pseudo }).pipe(
      tap(user => {
        this.currentUser.set(user);
        // Mettre à jour la session stockée
        const session = localStorage.getItem(SESSION_KEY);
        if (session) {
          const parsed = JSON.parse(session);
          parsed.user = user;
          localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        }
      })
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API}/profile`);
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
