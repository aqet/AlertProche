import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  DirectMessageService,
  ConversationSummary,
} from '../../core/services/direct-message.service';
import { TimeAgoService } from '../../core/services/time-ago.service';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
})
export class MessagesComponent implements OnInit {
  private dm = inject(DirectMessageService);
  private router = inject(Router);
  private timeAgo = inject(TimeAgoService);

  conversations = signal<ConversationSummary[]>([]);
  loading = signal(true);

  totalUnread = 0;

  ngOnInit(): void {
    this.dm.getConversations().subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        this.totalUnread = convs.reduce((sum, c) => sum + c.unreadCount, 0);
        this.loading.set(false);
        // Rafraîchit aussi le badge navbar
        this.dm.fetchUnreadTotal().subscribe({
          next: (r) => this.dm.unreadTotal.set(r.count ?? 0),
          error: () => {},
        });
      },
      error: () => this.loading.set(false),
    });
  }

  openConversation(conversationId: string): void {
    this.router.navigate(['/messages', conversationId]);
  }

  getTimeAgo(dateStr: string): string {
    return this.timeAgo.format(dateStr);
  }

  initials(pseudo: string): string {
    return (pseudo || '?').charAt(0).toUpperCase();
  }
}
