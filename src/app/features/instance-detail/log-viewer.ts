import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../api/config';

@Component({
  selector: 'app-log-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-300">Logs</h3>
        <div class="flex gap-2">
          @if (connected()) {
            <button
              (click)="disconnect()"
              class="rounded-lg bg-red-900/50 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900"
            >
              Disconnect
            </button>
          } @else {
            <button
              (click)="connect()"
              class="rounded-lg bg-green-900/50 px-3 py-1.5 text-xs font-medium text-green-300 hover:bg-green-900"
            >
              Connect
            </button>
          }
          <button
            (click)="clearLogs()"
            class="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      <div
        #logContainer
        class="h-80 overflow-y-auto rounded-lg bg-black p-3 font-mono text-xs leading-relaxed text-green-400"
      >
        @for (line of lines(); track $index) {
          <div>{{ line }}</div>
        }
        @if (lines().length === 0) {
          <div class="text-gray-600">
            @if (connected()) {
              Waiting for logs...
            } @else {
              Click "Connect" to start streaming logs.
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class LogViewer {
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private logContainer = viewChild<ElementRef<HTMLDivElement>>('logContainer');

  instanceId = input.required<string>();

  lines = signal<string[]>([]);
  connected = signal(false);

  private abortController: AbortController | null = null;

  ngOnInit() {
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  connect() {
    this.disconnect();
    const token = this.auth.getToken();
    if (!token) return;

    this.abortController = new AbortController();
    this.connected.set(true);

    const baseUrl = API_BASE_URL;
    const url = `${baseUrl}/instances/${this.instanceId()}/logs`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: this.abortController.signal,
    })
      .then((res) => {
        if (!res.ok || !res.body) {
          this.connected.set(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const read = (): void => {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                this.connected.set(false);
                return;
              }
              const text = decoder.decode(value, { stream: true });
              const newLines = text
                .split('\n')
                .filter((l) => l.startsWith('data: '))
                .map((l) => l.slice(6));
              if (newLines.length > 0) {
                this.lines.update((prev) => {
                  const combined = [...prev, ...newLines];
                  return combined.length > 1000 ? combined.slice(-1000) : combined;
                });
                this.scrollToBottom();
              }
              read();
            })
            .catch(() => this.connected.set(false));
        };
        read();
      })
      .catch(() => this.connected.set(false));
  }

  disconnect() {
    this.abortController?.abort();
    this.abortController = null;
    this.connected.set(false);
  }

  clearLogs() {
    this.lines.set([]);
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      const el = this.logContainer()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
