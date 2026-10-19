import { Component, Input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Post } from '../../core/models/post.model';
import { MediaUrlPipe } from '../pipes/media-url.pipe';
import { AlertStatusBadgeComponent } from '../components/alert-status-badge/alert-status-badge.component';
import { OfflineService } from '../../core/services/offline.service';
import { TimeAgoService } from '../../core/services/time-ago.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MediaUrlPipe, AlertStatusBadgeComponent, TranslateModule],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.css']
})
export class PostCardComponent {
  @Input() post!: Post;

  private offlineService = inject(OfflineService);
  private timeAgo = inject(TimeAgoService);

  isSaved = computed(() => this.offlineService.isPostSaved(this.post._id));

  toggleSave(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isSaved()) {
      this.offlineService.removeSavedPost(this.post._id);
    } else {
      this.offlineService.savePostOffline(this.post);
    }
  }

  getBadgeClass(): string {
    const map: Record<string, string> = {
      'Disparition': 'badge-disparition',
      'Abus': 'badge-abus',
      'Prevention': 'badge-prevention',
      'Appel à l\'aide': 'badge-appel'
    };
    return map[this.post.type] || '';
  }

  getBadgeIcon(): string {
    const map: Record<string, string> = {
      'Disparition': 'fa-triangle-exclamation',
      'Abus': 'fa-shield-exclamation',
      'Prevention': 'fa-circle-info',
      'Appel à l\'aide': 'fa-hand-holding-heart'
    };
    return map[this.post.type] || 'fa-circle';
  }

  getTimeAgo(dateStr: string): string {
    return this.timeAgo.format(dateStr);
  }
}
