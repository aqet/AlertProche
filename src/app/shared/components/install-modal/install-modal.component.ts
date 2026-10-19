import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PwaInstallService } from '../../../core/services/pwa-install.service';

@Component({
  selector: 'app-install-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './install-modal.component.html',
  styleUrls: ['./install-modal.component.css'],
})
export class InstallModalComponent {
  constructor(public pwa: PwaInstallService) {}
}
