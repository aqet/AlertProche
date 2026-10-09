import {
  Component, signal, inject, computed, ViewChild, ElementRef,
  AfterViewChecked, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChatService, ChatAction } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';

export interface ChatMessage {
  role:      'user' | 'assistant';
  text:      string;
  action?:   ChatAction;
  timestamp: Date;
}

// threadId persisté dans sessionStorage pour survivre aux rechargements
const THREAD_KEY = 'ap_chat_thread';

function getOrCreateThreadId(): string {
  let id = sessionStorage.getItem(THREAD_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(THREAD_KEY, id);
  }
  return id;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './chatbot.component.html',
  styleUrls:   ['./chatbot.component.css'],
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesRef!: ElementRef<HTMLDivElement>;

  private chatSvc  = inject(ChatService);
  private auth     = inject(AuthService);
  private router   = inject(Router);
  private translate = inject(TranslateService);
  private lang      = inject(LanguageService);

  isOpen        = signal(false);
  loading       = signal(false);
  historyLoading = signal(false);
  messages      = signal<ChatMessage[]>([]);
  inputText     = '';

  readonly threadId = getOrCreateThreadId();

  isAuth = computed(() => this.auth.isAuthenticated());

  // Suggestions are language-aware: re-evaluated when currentLang signal changes
  readonly suggestions = computed(() => {
    // Read the signal to create a dependency for re-computation on language change
    this.lang.currentLang();
    return [
      this.translate.instant('CHATBOT.SUGGESTION_1'),
      this.translate.instant('CHATBOT.SUGGESTION_2'),
      this.translate.instant('CHATBOT.SUGGESTION_3'),
      this.translate.instant('CHATBOT.SUGGESTION_4'),
    ];
  });

  private shouldScroll = false;

  ngOnInit(): void {
    // Charger l'historique depuis la BD si l'utilisateur est connecté
    if (this.isAuth()) {
      this.historyLoading.set(true);
      this.chatSvc.getHistory(this.threadId).subscribe({
        next: (res) => {
          if (res.messages.length > 0) {
            this.messages.set(
              res.messages.map(m => ({
                role:      m.role,
                text:      m.text,
                timestamp: new Date(m.timestamp),
              }))
            );
            this.shouldScroll = true;
          }
          this.historyLoading.set(false);
        },
        error: () => this.historyLoading.set(false),
      });
    }
    // Visiteur non connecté : pas de chargement, pas de stockage
  }

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  onSend(): void {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;
    this.sendMessage(text);
    this.inputText = '';
  }

  sendMessage(text: string): void {
    if (!text.trim() || this.loading()) return;

    this.messages.update(msgs => [
      ...msgs,
      { role: 'user', text, timestamp: new Date() },
    ]);
    this.inputText = '';
    this.loading.set(true);
    this.shouldScroll = true;

    // Connecté → endpoint persisté / Visiteur → endpoint éphémère
    const request$ = this.isAuth()
      ? this.chatSvc.sendMessage(text, this.threadId)
      : this.chatSvc.sendGuestMessage(text, this.threadId);

    request$.subscribe({
      next: (res) => {
        this.messages.update(msgs => [
          ...msgs,
          { role: 'assistant', text: res.text, action: res.action, timestamp: new Date() },
        ]);
        this.loading.set(false);
        this.shouldScroll = true;

        if (res.action?.type === 'direct_redirect') {
          setTimeout(() => {
            this.router.navigate([res.action!.route]);
            this.isOpen.set(false);
          }, 800);
        }
      },
      error: () => {
        this.messages.update(msgs => [
          ...msgs,
          {
            role:      'assistant',
            text:      this.translate.instant('CHATBOT.ERR_UNAVAILABLE'),
            timestamp: new Date(),
          },
        ]);
        this.loading.set(false);
        this.shouldScroll = true;
      },
    });
  }

  navigate(route: string): void {
    this.router.navigate([route]);
    this.isOpen.set(false);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }
}
