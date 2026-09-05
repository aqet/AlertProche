import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { InstallModalComponent } from '../../shared/components/install-modal/install-modal.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink, InstallModalComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {
  isAuth = computed(() => this.auth.isAuthenticated());

  constructor(
    public auth: AuthService,
    public pwa: PwaInstallService,
  ) {}

  openInstallModal(event: Event): void {
    event.preventDefault();
    this.pwa.handleInstallClick();
  }
}
