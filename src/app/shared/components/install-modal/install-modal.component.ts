import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaInstallService } from '../../../core/services/pwa-install.service';

@Component({
  selector: 'app-install-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './install-modal.component.html',
  styleUrls: ['./install-modal.component.css'],
})
export class InstallModalComponent {
  constructor(public pwa: PwaInstallService) {}
}
