import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type AuthMode = 'login' | 'register';
type RegisterStep = 'info' | 'otp' | 'password';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  mode = signal<AuthMode>('login');
  registerStep = signal<RegisterStep>('info');

  loading = signal(false);
  error = signal('');
  success = signal('');
  showPassword = signal(false);

  // Stockage inter-étapes
  private verifyToken = '';
  private pendingEmail = '';
  private pendingPseudo = '';

  // Compteur renvoi OTP
  resendCountdown = signal(0);
  private resendTimer: any;

  loginForm: FormGroup;
  infoForm: FormGroup;    // Étape 1 : email + pseudo
  otpForm: FormGroup;     // Étape 2 : code OTP
  passwordForm: FormGroup; // Étape 3 : mot de passe

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.infoForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      pseudo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]]
    });

    this.otpForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]]
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    const p = g.get('password')?.value;
    const c = g.get('confirmPassword')?.value;
    return p === c ? null : { passwordMismatch: true };
  }

  switchMode(m: AuthMode) {
    this.mode.set(m);
    this.registerStep.set('info');
    this.error.set('');
    this.success.set('');
    this.verifyToken = '';
  }

  togglePassword() { this.showPassword.update(v => !v); }

  // ── LOGIN ──────────────────────────────────────────────────────────
  onLogin() {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');
    this.auth.login(this.loginForm.value).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/']); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Email ou mot de passe incorrect.');
      }
    });
  }

  // ── ÉTAPE 1 : Envoyer OTP ─────────────────────────────────────────
  onSendOtp() {
    if (this.infoForm.invalid) { this.infoForm.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');
    const { email, pseudo } = this.infoForm.value;

    this.auth.sendOtp(email, pseudo).subscribe({
      next: () => {
        this.pendingEmail = email;
        this.pendingPseudo = pseudo;
        this.loading.set(false);
        this.registerStep.set('otp');
        this.startResendCountdown();
        this.success.set(`Code envoyé à ${email}`);
        setTimeout(() => this.success.set(''), 4000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Erreur lors de l\'envoi du code.');
      }
    });
  }

  // ── ÉTAPE 2 : Vérifier OTP ────────────────────────────────────────
  onVerifyOtp() {
    if (this.otpForm.invalid) { this.otpForm.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');

    this.auth.verifyOtp(this.pendingEmail, this.otpForm.value.code).subscribe({
      next: (res) => {
        this.verifyToken = res.token;
        this.loading.set(false);
        this.registerStep.set('password');
        this.success.set('Email vérifié ! Choisissez maintenant votre mot de passe.');
        setTimeout(() => this.success.set(''), 4000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Code incorrect ou expiré.');
      }
    });
  }

  // Renvoyer l'OTP
  onResendOtp() {
    if (this.resendCountdown() > 0) return;
    this.otpForm.reset();
    this.error.set('');
    this.loading.set(true);
    this.auth.sendOtp(this.pendingEmail, this.pendingPseudo).subscribe({
      next: () => {
        this.loading.set(false);
        this.startResendCountdown();
        this.success.set('Nouveau code envoyé.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: () => { this.loading.set(false); }
    });
  }

  private startResendCountdown() {
    clearInterval(this.resendTimer);
    this.resendCountdown.set(60);
    this.resendTimer = setInterval(() => {
      this.resendCountdown.update(n => {
        if (n <= 1) { clearInterval(this.resendTimer); return 0; }
        return n - 1;
      });
    }, 1000);
  }

  // ── ÉTAPE 3 : Finaliser l'inscription ─────────────────────────────
  onRegister() {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');

    this.auth.register(this.pendingPseudo, this.passwordForm.value.password, this.verifyToken).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/']); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Erreur lors de la création du compte.');
      }
    });
  }

  hasError(form: FormGroup, field: string, error?: string): boolean {
    const ctrl = form.get(field);
    if (!ctrl || !ctrl.touched) return false;
    return error ? ctrl.hasError(error) : ctrl.invalid;
  }

  get stepLabel(): string {
    const labels: Record<RegisterStep, string> = {
      info: 'Étape 1 / 3 — Informations',
      otp: 'Étape 2 / 3 — Vérification email',
      password: 'Étape 3 / 3 — Mot de passe'
    };
    return labels[this.registerStep()];
  }
}
