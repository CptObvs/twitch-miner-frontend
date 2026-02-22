import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnChanges,
  signal,
  viewChild,
} from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../api/config';

const MAX_LINES = 500;
const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_ATTEMPTS = 5;

@Component({
  selector: 'app-log-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-gray-800 bg-gray-950 overflow-hidden">
      <!-- Header -->
      <div
        class="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900/50"
      >
        <div class="flex items-center gap-2">
          <span
            [class]="
              'h-2 w-2 rounded-full ' +
              (connected() ? 'bg-green-400 shadow-sm shadow-green-400/50' : 'bg-gray-600')
            "
          ></span>
          <span class="text-xs font-medium text-gray-400">Logs</span>
        </div>
        @if (!connected() && reconnectAttempt() > 0) {
          <span class="text-xs text-yellow-600"
            >Reconnecting… ({{ reconnectAttempt() }}/{{ maxAttempts }})</span
          >
        }
      </div>

      <!-- Log Output -->
      <div
        #scrollContainer
        class="h-48 overflow-y-auto font-mono text-xs leading-relaxed p-3 space-y-0.5"
        (scroll)="onScroll()"
      >
        @if (lines().length === 0 && !connected()) {
          <span class="text-gray-600 italic">Waiting for logs…</span>
        }
        @for (line of lines(); track $index) {
          <div class="text-gray-300 whitespace-pre-wrap break-all">{{ line }}</div>
        }
      </div>
    </div>
  `,
})
export class LogViewer implements OnChanges {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  instanceId = input.required<string>();
  tail = input(100);

  lines = signal<string[]>([]);
  connected = signal(false);
  reconnectAttempt = signal(0);
  readonly maxAttempts = MAX_RECONNECT_ATTEMPTS;

  private scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');
  private abortController: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private autoScroll = true;

  constructor() {
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  ngOnChanges(): void {
    this.lines.set([]);
    this.reconnectAttempt.set(0);
    this.autoScroll = true;
    this.connect();
  }

  onScroll(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    this.autoScroll = atBottom;
  }

  private scrollToBottom(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private connect(): void {
    this.disconnect();

    const token = this.auth.getToken();
    const url = `${API_BASE_URL}/instances/${this.instanceId()}/logs?tail=${this.tail()}`;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal,
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }
        this.connected.set(true);
        this.reconnectAttempt.set(0);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() ?? '';

          const newLines: string[] = [];
          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const text = part.slice(6).trim();
              if (text) newLines.push(text);
            }
          }

          if (newLines.length > 0) {
            this.lines.update((prev) => {
              const combined = [...prev, ...newLines];
              return combined.length > MAX_LINES ? combined.slice(-MAX_LINES) : combined;
            });
            if (this.autoScroll) {
              setTimeout(() => this.scrollToBottom(), 0);
            }
          }
        }

        this.connected.set(false);
        this.scheduleReconnect();
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        this.connected.set(false);
        this.scheduleReconnect();
      });
  }

  private scheduleReconnect(): void {
    const attempt = this.reconnectAttempt();
    if (attempt >= MAX_RECONNECT_ATTEMPTS) return;

    this.reconnectAttempt.set(attempt + 1);
    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
  }

  private disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.abortController?.abort();
    this.abortController = null;
    this.connected.set(false);
  }
}
