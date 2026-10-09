import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Post } from '../../../core/models/post.model';

@Component({
  selector: 'app-alert-status-badge',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './alert-status-badge.component.html',
  styleUrls: ['./alert-status-badge.component.css']
})
export class AlertStatusBadgeComponent {
  @Input() post!: Post;
  @Input() showDate: boolean = false;

  get isResolved(): boolean {
    return this.post?.isResolved === true;
  }

  getResolvedDate(): string {
    if (!this.post?.resolvedAt) return '';
    return new Date(this.post.resolvedAt).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }
}
