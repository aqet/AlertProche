import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  VersionAdminService,
  AppVersionConfig,
  NotifyResult,
} from '../../../core/services/version-admin.service';

@Component({
  selector: 'app-version-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './version-management.component.html',
  styleUrls: ['./version-management.component.css'],
})
export class VersionManagementComponent implements OnInit {
  // ── État ─────────────────────────────────────────────────────────────────
  currentConfig  = signal<AppVersionConfig | null>(null);
  configLoading  = signal(true);

  // Formulaire version
  versionForm!: FormGroup;
  versionSaving  = signal(false);
  versionSuccess = signal('');
  versionError   = signal('');

  // Formulaire notification
  notifForm!: FormGroup;
  notifSending   = signal(false);
  notifResult    = signal<NotifyResult | null>(null);
  notifError     = signal('');

  constructor(
    private fb: FormBuilder,
    private versionAdminService: VersionAdminService,
  ) {}

  ngOnInit(): void {
    this.versionForm = this.fb.group({
      latestVersion:      ['', [Validators.required, Validators.pattern(/^\d+\.\d+\.\d+$/)]],
      minSupportedVersion:['', [Validators.required, Validators.pattern(/^\d+\.\d+\.\d+$/)]],
      downloadUrl:        [''],
      releaseNotes:       [''],
    });

    this.notifForm = this.fb.group({
      customMessage: [''],
      targetVersion: ['', [Validators.pattern(/^\d+\.\d+\.\d+$|^$/)]],
    });

    this.loadConfig();
  }

  // ── Charger la config actuelle ────────────────────────────────────────────
  loadConfig(): void {
    this.configLoading.set(true);
    this.versionAdminService.getConfig().subscribe({
      next: (config) => {
        this.currentConfig.set(config);
        if (config) {
          this.versionForm.patchValue({
            latestVersion:       config.latestVersion,
            minSupportedVersion: config.minSupportedVersion,
            downloadUrl:         config.downloadUrl || '',
            releaseNotes:        config.releaseNotes || '',
          });
        }
        this.configLoading.set(false);
      },
      error: () => { this.configLoading.set(false); },
    });
  }

  // ── Enregistrer la version ────────────────────────────────────────────────
  saveVersion(): void {
    if (this.versionForm.invalid) { this.versionForm.markAllAsTouched(); return; }
    this.versionSaving.set(true);
    this.versionSuccess.set('');
    this.versionError.set('');

    const val = this.versionForm.value;
    this.versionAdminService.setAppVersion({
      latestVersion:       val.latestVersion.trim(),
      minSupportedVersion: val.minSupportedVersion.trim(),
      downloadUrl:         val.downloadUrl?.trim() || undefined,
      releaseNotes:        val.releaseNotes?.trim() || undefined,
    }).subscribe({
      next: (config) => {
        this.currentConfig.set(config);
        this.versionSaving.set(false);
        this.versionSuccess.set(`Version enregistrée : latest ${config.latestVersion} / min ${config.minSupportedVersion}`);
        setTimeout(() => this.versionSuccess.set(''), 5000);
      },
      error: (err) => {
        this.versionSaving.set(false);
        this.versionError.set(err?.error?.message || 'Erreur lors de l\'enregistrement.');
      },
    });
  }

  // ── Envoyer la notification ───────────────────────────────────────────────
  sendNotification(): void {
    if (this.notifForm.invalid) { this.notifForm.markAllAsTouched(); return; }
    this.notifSending.set(true);
    this.notifResult.set(null);
    this.notifError.set('');

    const val = this.notifForm.value;
    this.versionAdminService.sendManualNotification({
      customMessage: val.customMessage?.trim() || undefined,
      targetVersion: val.targetVersion?.trim() || undefined,
    }).subscribe({
      next: (result) => {
        this.notifResult.set(result);
        this.notifSending.set(false);
        this.notifForm.get('customMessage')?.reset('');
      },
      error: (err) => {
        this.notifSending.set(false);
        this.notifError.set(err?.error?.message || 'Erreur lors de l\'envoi.');
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  hasError(form: FormGroup, field: string, error?: string): boolean {
    const ctrl = form.get(field);
    if (!ctrl || !ctrl.touched) return false;
    return error ? ctrl.hasError(error) : ctrl.invalid;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
