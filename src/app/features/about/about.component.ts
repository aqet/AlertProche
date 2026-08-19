import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {
  isAuth = computed(() => this.auth.isAuthenticated());
  showApkModal = signal(false);

  constructor(public auth: AuthService) {}

  openApkModal(event: Event): void {
    event.preventDefault();
    this.showApkModal.set(true);
  }

  closeApkModal(): void {
    this.showApkModal.set(false);
  }
}
