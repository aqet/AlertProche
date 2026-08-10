import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionCheckService } from '../../../core/services/version-check.service';

@Component({
  selector: 'app-update-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './update-modal.component.html',
  styleUrls:  ['./update-modal.component.css'],
})
export class UpdateModalComponent implements OnInit {
  private versionCheckService = inject(VersionCheckService);

  softDismissed = signal(false);

  status = computed(() => this.versionCheckService.versionStatus());

  showHardModal  = computed(() => this.status()?.needsHardUpdate === true);
  showSoftModal  = computed(() => !this.showHardModal() && this.status()?.needsSoftUpdate === true && !this.softDismissed());

  ngOnInit(): void {}

  /** Ouvre le lien de téléchargement (Play Store ou APK direct) */
  openStore(): void {
    const url = this.status()?.downloadUrl
      || 'https://play.google.com/store/apps/details?id=com.alertproche.app';
    window.open(url, '_system');
  }

  /** Ferme le soft update (l'utilisateur choisit "Plus tard") */
  dismissSoft(): void {
    this.softDismissed.set(true);
  }
}
