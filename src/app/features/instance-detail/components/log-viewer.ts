import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../api/config';

const MAX_LINES = 500;
const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_ATTEMPTS = 5;

// Log line date prefix: DD/MM (e.g. "31/01 14:23:45 - ...")
const DATE_PREFIX_RE = /^\d{2}\/\d{2}/;

type LogFilter = 'all' | 'points' | 'drops' | 'prediction' | 'warnings' | 'errors';

const FILTER_MATCH: Record<Exclude<LogFilter, 'all'>, (line: string) => boolean> = {
  points: (l) => l.includes('🚀'),
  drops: (l) => l.includes('🎁') || /\bDrop/i.test(l),
  prediction: (l) =>
    l.includes('EventPrediction') ||
    l.includes('🔧') ||
    l.includes('🍀') ||
    l.includes('📊') ||
    l.includes('⏰'),
  warnings: (l) => l.includes('⚠') || l.includes('WARNING'),
  errors: (l) =>
    l.includes('❌') ||
    l.includes('ERROR') ||
    l.includes('Exception') ||
    l.includes('Traceback') ||
    /^\s+File "/.test(l) || // Python traceback frames: "  File "path", line N"
    /^\w+Error[:\s]/.test(l), // TypeError:, ValueError:, AttributeError, etc.
};

/** Pixel threshold to consider the viewport "at the bottom" */
const SCROLL_BOTTOM_THRESHOLD = 48;

@Component({
  selector: 'app-log-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollingModule],
  host: { '[class.h-full]': 'fill()', '[class.flex]': 'fill()', '[class.flex-col]': 'fill()' },
  styles: [
    `
      cdk-virtual-scroll-viewport {
        contain: strict;
      }
    `,
  ],
  template: `
    <div
      [class]="
        'relative rounded-lg border border-gray-800 bg-gray-950 overflow-hidden ' +
        (fill() ? 'flex flex-col h-full' : '')
      "
    >
      <!-- Header -->
      <div
        class="shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900/50"
      >
        <div class="flex items-center gap-2">
          <span
            [class]="
              'h-2 w-2 rounded-full ' +
              (connected() ? 'bg-green-400 shadow-sm shadow-green-400/50' : 'bg-gray-600')
            "
          ></span>
          <span class="text-xs font-medium text-gray-400">Logs</span>
          @if (lines().length > 0) {
            <span class="text-[10px] text-gray-600">
              @if (isFiltered()) {
                {{ filteredLines().length }}/{{ lines().length }}
              } @else {
                {{ lines().length }}
              }
              lines
            </span>
          }
        </div>
        @if (!connected() && reconnectAttempt() > 0) {
          <span class="text-xs text-yellow-600"
            >Reconnecting… ({{ reconnectAttempt() }}/{{ maxAttempts }})</span
          >
        }
      </div>

      <!-- Filter Bar -->
      @if (lines().length > 0) {
        <div
          class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-800/60 bg-gray-900/30"
        >
          <!-- Date filter -->
          @if (availableDates().length > 1) {
            <select
              [value]="activeDateFilter()"
              (change)="onDateFilterChange($event)"
              class="shrink-0 rounded border border-gray-700/60 bg-gray-900 px-1.5 py-0.5 text-[11px] text-gray-300 focus:outline-none focus:border-gray-600"
            >
              <option value="all">All days</option>
              @for (day of availableDates(); track day) {
                <option [value]="day">{{ day }}</option>
              }
            </select>
          }

          <!-- Category filter -->
          <select
            [value]="activeFilter()"
            (change)="onFilterChange($event)"
            class="shrink-0 rounded border border-gray-700/60 bg-gray-900 px-1.5 py-0.5 text-[11px] text-gray-300 focus:outline-none focus:border-gray-600"
          >
            <option value="all">All</option>
            <option value="points">Points 🚀</option>
            <option value="drops">Drops 🎁</option>
            <option value="prediction">Predictions 🍀</option>
            <option value="warnings">Warnings ⚠</option>
            <option value="errors">Errors ❌</option>
          </select>

          <!-- Search -->
          <input
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            type="text"
            placeholder="Search…"
            class="min-w-0 flex-1 rounded border border-gray-700/60 bg-gray-900 px-2 py-0.5 text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600"
          />

          <!-- Clear filters -->
          @if (isFiltered()) {
            <button
              type="button"
              (click)="clearFilters()"
              class="shrink-0 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
              title="Clear filters"
            >
              ✕
            </button>
          }
        </div>
      }

      @if (fill()) {
        <!-- CDK Virtual Scroll — fill mode -->
        @if (lines().length === 0) {
          <div class="flex-1 flex items-center justify-center">
            <span class="text-gray-600 italic text-xs font-mono">
              {{ connected() ? 'Loading logs…' : 'Waiting for logs…' }}
            </span>
          </div>
        } @else if (filteredLines().length === 0) {
          <div class="flex-1 flex items-center justify-center">
            <span class="text-gray-600 italic text-xs font-mono">No matching log lines.</span>
          </div>
        } @else {
          <cdk-virtual-scroll-viewport
            #cdkViewport
            itemSize="18"
            class="flex-1 min-h-0 font-mono text-xs"
            (scroll)="onCdkScroll()"
          >
            <div
              *cdkVirtualFor="let line of filteredLines(); trackBy: trackByIdx"
              [class]="
                'whitespace-nowrap leading-[18px] h-[18px] px-3 overflow-hidden text-ellipsis ' +
                lineClass(line)
              "
            >
              {{ line }}
            </div>
          </cdk-virtual-scroll-viewport>
        }
      } @else {
        <!-- Simple scroll — fixed-height mode -->
        <div
          #scrollContainer
          class="overflow-y-auto font-mono text-xs leading-relaxed p-3 space-y-0.5 h-48"
          (scroll)="onScroll()"
        >
          @if (lines().length === 0 && !connected()) {
            <span class="text-gray-600 italic">Waiting for logs…</span>
          }
          @for (line of filteredLines(); track $index) {
            <div [class]="'whitespace-pre-wrap break-all ' + lineClass(line)">{{ line }}</div>
          }
        </div>
      }

      <!-- Scroll to Bottom Button -->
      @if (showScrollToBottom()) {
        <button
          type="button"
          (click)="scrollToBottom()"
          class="absolute bottom-4 right-4 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors z-10"
          title="Scroll to bottom"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            ></path>
          </svg>
        </button>
      }
    </div>
  `,
})
export class LogViewer {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  instanceId = input.required<string>();
  tail = input(100);
  fill = input(false);
  /** Load the entire log history instead of the last `tail` lines. */
  full = input(false);

  lines = signal<string[]>([]);
  connected = signal(false);
  reconnectAttempt = signal(0);
  readonly maxAttempts = MAX_RECONNECT_ATTEMPTS;

  activeFilter = signal<LogFilter>('all');
  activeDateFilter = signal('all');
  searchQuery = signal('');
  showScrollToBottom = signal(false);

  availableDates = computed(() => {
    const dates = new Set<string>();
    for (const line of this.lines()) {
      if (DATE_PREFIX_RE.test(line)) dates.add(line.slice(0, 5));
    }
    return Array.from(dates).sort();
  });

  filteredLines = computed(() => {
    const lines = this.lines();
    const filter = this.activeFilter();
    const date = this.activeDateFilter();
    const query = this.searchQuery().toLowerCase();

    if (filter === 'all' && date === 'all' && !query) return lines;

    return lines.filter((line) => {
      if (date !== 'all' && !line.startsWith(date)) return false;
      if (filter !== 'all' && !FILTER_MATCH[filter](line)) return false;
      if (query && !line.toLowerCase().includes(query)) return false;
      return true;
    });
  });

  isFiltered = computed(
    () =>
      this.activeFilter() !== 'all' || this.activeDateFilter() !== 'all' || !!this.searchQuery(),
  );

  private cdkViewport = viewChild<CdkVirtualScrollViewport>('cdkViewport');
  private scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');
  private abortController: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;
  private pendingLines: string[] = [];
  private flushRafId: number | null = null;
  private partialChunk = '';
  private autoScroll = true;

  trackByIdx = (index: number) => index;

  constructor() {
    this.destroyRef.onDestroy(() => this.disconnect());

    // Reconnect whenever inputs that affect the stream change (replaces ngOnChanges)
    effect(() => {
      this.instanceId();
      this.tail();
      this.full();
      untracked(() => {
        this.lines.set([]);
        this.reconnectAttempt.set(0);
        this.showScrollToBottom.set(false);
        this.autoScroll = true;
        this.connect();
      });
    });

    // Auto-scroll after each render cycle that adds new filtered lines.
    // Calls scrollToEnd() (not scrollToBottom()) to avoid signal writes inside an effect.
    effect(() => {
      const count = this.filteredLines().length;
      if (!this.autoScroll || count === 0) return;
      requestAnimationFrame(() => this.scrollToEnd());
    });
  }

  lineClass(line: string): string {
    if (FILTER_MATCH.errors(line)) return 'text-red-400';
    if (FILTER_MATCH.warnings(line)) return 'text-yellow-400';
    if (FILTER_MATCH.prediction(line)) return 'text-purple-300';
    if (FILTER_MATCH.points(line)) return 'text-green-400';
    if (FILTER_MATCH.drops(line)) return 'text-blue-300';
    return 'text-gray-300';
  }

  onFilterChange(event: Event): void {
    this.activeFilter.set((event.target as HTMLSelectElement).value as LogFilter);
    this.autoScroll = false;
  }

  onDateFilterChange(event: Event): void {
    this.activeDateFilter.set((event.target as HTMLSelectElement).value);
    this.autoScroll = false;
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchQuery.set(value);
      this.autoScroll = false;
    }, 200);
  }

  clearFilters(): void {
    this.activeFilter.set('all');
    this.activeDateFilter.set('all');
    this.searchQuery.set('');
    this.autoScroll = true;
    this.showScrollToBottom.set(false);
  }

  onScroll(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD;
    this.autoScroll = atBottom;
    this.showScrollToBottom.set(!atBottom);
  }

  onCdkScroll(): void {
    if (this.lines().length === 0) return;
    const vp = this.cdkViewport();
    if (!vp) return;
    const el = vp.elementRef.nativeElement;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD;
    this.autoScroll = atBottom;
    this.showScrollToBottom.set(!atBottom);
  }

  /** Called by the scroll-to-bottom button. */
  scrollToBottom(): void {
    this.showScrollToBottom.set(false);
    this.autoScroll = true;
    this.scrollToEnd();
  }

  private scrollToEnd(): void {
    const vp = this.cdkViewport();
    if (vp) {
      vp.scrollToIndex(this.filteredLines().length - 1, 'instant');
      return;
    }
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    // Viewport not yet mounted — retry on next frame
    if (this.autoScroll) {
      requestAnimationFrame(() => this.scrollToEnd());
    }
  }

  private connect(): void {
    this.disconnect();

    const token = this.auth.getToken();
    const params = new URLSearchParams(
      this.full() ? { full: 'true' } : { tail: String(this.tail()) },
    );
    const url = `${API_BASE_URL}/instances/${this.instanceId()}/logs?${params}`;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Run outside Angular zone to avoid CD on every stream chunk
    this.zone.runOutsideAngular(() => {
      fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal,
      })
        .then((response) => {
          if (!response.ok || !response.body) {
            this.zone.run(() => this.handleStreamEnd());
            return;
          }
          this.connected.set(true);
          this.partialChunk = '';
          this.readStream(response.body.getReader());
        })
        .catch((err) => {
          if ((err as DOMException)?.name === 'AbortError') return;
          this.zone.run(() => this.handleStreamEnd());
        });
    });
  }

  private readStream(reader: ReadableStreamDefaultReader<Uint8Array>): void {
    const decoder = new TextDecoder();

    const read = (): void => {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            this.zone.run(() => this.handleStreamEnd());
            return;
          }

          const text = this.partialChunk + decoder.decode(value, { stream: true });
          const segments = text.split('\n');
          // Last segment may be incomplete — carry it over to the next chunk
          this.partialChunk = segments.pop() ?? '';

          const newLines = segments
            .filter((l) => l.startsWith('data: '))
            .map((l) => l.slice(6))
            .filter((l) => !l.startsWith('[system] Waiting for miner'));

          if (newLines.length > 0) {
            this.pendingLines.push(...newLines);
            this.scheduleFlush();
          }

          read();
        })
        .catch((err) => {
          if ((err as DOMException)?.name === 'AbortError') return;
          this.zone.run(() => this.handleStreamEnd());
        });
    };

    read();
  }

  /**
   * Batch incoming lines into a single rAF frame to coalesce rapid updates
   * and reduce change-detection runs.
   */
  private scheduleFlush(): void {
    if (this.flushRafId !== null) return;
    this.flushRafId = requestAnimationFrame(() => {
      this.flushRafId = null;
      const batch = this.pendingLines.splice(0);
      if (batch.length === 0) return;

      this.zone.run(() => {
        this.lines.update((prev) => {
          const combined = prev.concat(batch);
          // In full-history mode, cap to MAX_LINES to avoid memory bloat
          if (this.full()) {
            return combined.length > MAX_LINES ? combined.slice(-MAX_LINES) : combined;
          }
          return combined;
        });

        if (this.autoScroll) {
          this.scrollToEnd();
        }
      });
    });
  }

  private handleStreamEnd(): void {
    this.connected.set(false);
    if (this.intentionalDisconnect) return;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    const attempt = this.reconnectAttempt() + 1;
    if (attempt > MAX_RECONNECT_ATTEMPTS) return;

    this.reconnectAttempt.set(attempt);
    const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(2, attempt - 1), RECONNECT_DELAY_MS * 10);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.intentionalDisconnect = false;
      this.connect();
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt.set(0);
  }

  private disconnect(): void {
    this.intentionalDisconnect = true;
    this.abortController?.abort();
    this.abortController = null;
    this.connected.set(false);
    this.cancelReconnect();
    this.partialChunk = '';
  }
}
