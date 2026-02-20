import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  NgZone,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../api/config';
import { LogLineItem } from './log-line-item';
import { LogStats, LogStatsSummary } from './log-stats';
import { DisplayLogLine, extractDateKey, formatLogLine } from '../utils/log-line-formatter';

/** Pixel threshold to consider the viewport "at the bottom" */
const SCROLL_BOTTOM_THRESHOLD = 48;

/** Maximum number of lines kept in compact (dashboard) mode */
const MAX_COMPACT_LINES = 100;

/** Reconnect configuration */
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const RECONNECT_MAX_ATTEMPTS = 10;

type LogFilter = 'all' | 'points' | 'drops' | 'prediction' | 'warnings' | 'errors';

type DateFilter = 'all' | string;

@Component({
  selector: 'app-log-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollingModule, LogLineItem, LogStats],
  templateUrl: './log-viewer.html',
  styleUrl: './log-viewer.css',
})
export class LogViewer {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly viewport = viewChild(CdkVirtualScrollViewport);

  readonly maxReconnectAttempts = RECONNECT_MAX_ATTEMPTS;

  instanceId = input.required<string>();
  clearLogsEvent = output<void>();

  /** When true, renders as a collapsible section with auto-connect */
  compact = input(false);

  /** All buffered log lines */
  lines = signal<string[]>([]);
  hasConnectedOnce = signal(false);
  waitingForOutput = signal(false);
  waitingDots = signal('.');
  private waitingDotsInterval: ReturnType<typeof setInterval> | null = null;
  /** Lines without system waiting messages */
  private nonWaitingLines = computed(() =>
    this.lines().filter((line) => !line.startsWith('[system] Waiting for miner')),
  );
  displayLines = computed(() => this.nonWaitingLines().map((line) => formatLogLine(line)));
  activeDateFilter = signal<DateFilter>('all');
  availableDateFilters = computed(() => {
    const unique = new Set<string>();
    for (const rawLine of this.nonWaitingLines()) {
      const dateKey = extractDateKey(rawLine);
      if (dateKey) {
        unique.add(dateKey);
      }
    }
    return Array.from(unique).sort((a, b) => b.localeCompare(a));
  });
  activeFilter = signal<LogFilter>('all');
  searchQuery = signal('');
  filteredDisplayLines = computed(() => {
    const rawLines = this.nonWaitingLines();
    const query = this.searchQuery().trim().toLowerCase();

    return this.displayLines().filter((line, index) => {
      const matchesDate = this.matchesDateFilter(rawLines[index] ?? '');
      if (!matchesDate) return false;

      const matchesFilter = this.matchesFilter(line);
      if (!matchesFilter) return false;

      if (!query) return true;
      return line.text.toLowerCase().includes(query);
    });
  });
  filteredLineCount = computed(() => this.filteredDisplayLines().length);
  hasActiveFilter = computed(
    () =>
      this.activeFilter() !== 'all' ||
      this.activeDateFilter() !== 'all' ||
      this.searchQuery().trim().length > 0,
  );
  lineCount = computed(() => this.nonWaitingLines().length);
  statsSummary = computed<LogStatsSummary>(() => {
    let points = 0;
    let drops = 0;

    for (const rawLine of this.nonWaitingLines()) {
      const formatted = formatLogLine(rawLine);

      const pointMatch = formatted.text.match(/\+(\d+)\b/);
      if (pointMatch) {
        points += Number(pointMatch[1]);
      }

      if (formatted.tone === 'drop' && /(?:📦\s*)?DROP claim\s*•/i.test(formatted.text)) {
        drops += 1;
      }
    }

    return {
      points,
      drops,
    };
  });

  connected = signal(false);
  reconnecting = signal(false);
  reconnectAttempt = signal(0);

  /** Whether the viewport is pinned to the bottom */
  autoScroll = signal(true);

  /** Whether the compact view is expanded */
  expanded = signal(false);

  private abortController: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;
  private pendingLines: string[] = [];
  private flushRafId: number | null = null;

  /** Incomplete SSE chunk from previous read */
  private partialChunk = '';

  ngOnInit() {
    this.destroyRef.onDestroy(() => {
      this.intentionalDisconnect = true;
      this.disconnect();
      this.cancelReconnect();
      if (this.flushRafId !== null) {
        cancelAnimationFrame(this.flushRafId);
      }
      this.stopWaitingAnimation();
    });
  }

  // ---------------------------------------------------------------------------
  // Connection management
  // ---------------------------------------------------------------------------

  connect() {
    this.disconnect();
    this.cancelReconnect();
    this.clearLogsContent();
    this.hasConnectedOnce.set(true);
    this.intentionalDisconnect = false;
    this.reconnectAttempt.set(0);
    this.reconnecting.set(false);
    this.startStream();
  }

  disconnect() {
    this.intentionalDisconnect = true;
    this.abortController?.abort();
    this.abortController = null;
    this.connected.set(false);
    this.reconnecting.set(false);
    this.partialChunk = '';
  }

  clearLogsContent() {
    this.lines.set([]);
    this.pendingLines = [];
    this.autoScroll.set(true);
    this.waitingForOutput.set(false);
    this.stopWaitingAnimation();
  }

  jumpToBottom() {
    this.autoScroll.set(true);
    this.scrollToEnd();
  }

  onClearLogsClick() {
    if (!confirm('Are you sure you want to delete all logs?')) return;
    this.clearLogsEvent.emit();
    this.clearLogsContent(); // Clear logs locally
  }

  /** Toggle expanded state (compact mode). Auto-connects on first expand. */
  onToggle() {
    const wasExpanded = this.expanded();
    this.expanded.set(!wasExpanded);

    if (!wasExpanded) {
      // Opening — auto-connect if not already connected
      if (!this.connected()) {
        this.connect();
      }
    } else {
      // Closing — disconnect to free resources
      this.disconnect();
      this.clearLogsContent();
    }
  }

  // ---------------------------------------------------------------------------
  // Scroll tracking
  // ---------------------------------------------------------------------------

  onScrollIndexChange() {
    const vp = this.viewport();
    if (!vp) return;
    const el = vp.elementRef.nativeElement;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD;
    this.autoScroll.set(atBottom);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as LogFilter;
    this.activeFilter.set(value);
  }

  onDateFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as DateFilter;
    this.activeDateFilter.set(value);
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  // ---------------------------------------------------------------------------
  // SSE stream with reconnect
  // ---------------------------------------------------------------------------

  private startStream() {
    const token = this.auth.getToken();
    if (!token) return;

    this.abortController = new AbortController();
    this.connected.set(true);
    this.partialChunk = '';

    const params = new URLSearchParams();
    if (this.compact()) {
      params.set('history_lines', String(MAX_COMPACT_LINES));
    }
    const query = params.toString();
    const url = `${API_BASE_URL}/instances/${this.instanceId()}/logs${query ? `?${query}` : ''}`;

    // Run fetch outside Angular zone to avoid unnecessary CD cycles
    this.zone.runOutsideAngular(() => {
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: this.abortController!.signal,
      })
        .then((res) => {
          if (!res.ok || !res.body) {
            this.zone.run(() => this.handleStreamEnd());
            return;
          }
          this.readStream(res.body.getReader());
        })
        .catch((err) => {
          if ((err as DOMException)?.name === 'AbortError') return;
          this.zone.run(() => this.handleStreamEnd());
        });
    });
  }

  private readStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
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
          // Last segment may be incomplete — keep it for the next chunk
          this.partialChunk = segments.pop() ?? '';

          const newLines = segments.filter((l) => l.startsWith('data: ')).map((l) => l.slice(6));

          if (newLines.length > 0) {
            // Check for system waiting messages
            const hasWaiting = newLines.some((l) => l.startsWith('[system] Waiting for miner'));
            const hasReal = newLines.some(
              (l) => !l.startsWith('[system] Waiting for miner') && !l.startsWith('[system]'),
            );

            if (hasWaiting && !hasReal) {
              this.zone.run(() => {
                if (!this.waitingForOutput()) {
                  this.waitingForOutput.set(true);
                  this.startWaitingAnimation();
                }
              });
            }
            if (hasReal) {
              this.zone.run(() => {
                this.waitingForOutput.set(false);
                this.stopWaitingAnimation();
              });
            }

            // Only queue non-waiting lines
            const realLines = newLines.filter((l) => !l.startsWith('[system] Waiting for miner'));
            if (realLines.length > 0) {
              this.pendingLines.push(...realLines);
              this.scheduleFlush();
            }
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
  private scheduleFlush() {
    if (this.flushRafId !== null) return;
    this.flushRafId = requestAnimationFrame(() => {
      this.flushRafId = null;
      const batch = this.pendingLines.splice(0);
      if (batch.length === 0) return;

      this.zone.run(() => {
        this.lines.update((prev) => {
          const combined = prev.concat(batch);
          if (!this.compact()) {
            return combined;
          }
          return combined.length > MAX_COMPACT_LINES
            ? combined.slice(-MAX_COMPACT_LINES)
            : combined;
        });

        if (this.autoScroll()) {
          this.scrollToEnd();
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Reconnection with exponential back-off
  // ---------------------------------------------------------------------------

  private handleStreamEnd() {
    this.connected.set(false);
    if (this.intentionalDisconnect) {
      this.reconnecting.set(false);
      return;
    }
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    const attempt = this.reconnectAttempt() + 1;
    if (attempt > RECONNECT_MAX_ATTEMPTS) {
      this.reconnecting.set(false);
      return;
    }

    this.reconnectAttempt.set(attempt);
    this.reconnecting.set(true);

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1),
      RECONNECT_MAX_DELAY_MS,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.intentionalDisconnect = false;
      this.startStream();
    }, delay);
  }

  private cancelReconnect() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnecting.set(false);
    this.reconnectAttempt.set(0);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private scrollToEnd() {
    requestAnimationFrame(() => {
      const vp = this.viewport();
      if (vp) {
        vp.scrollTo({ bottom: 0 });
      }
    });
  }

  private matchesFilter(line: DisplayLogLine): boolean {
    const filter = this.activeFilter();
    if (filter === 'all') return true;

    if (filter === 'drops') return line.tone === 'drop';
    if (filter === 'prediction') return line.tone === 'prediction';
    if (filter === 'warnings') return line.tone === 'warning';
    if (filter === 'errors') return line.tone === 'danger';

    if (filter === 'points') {
      return (
        line.tone === 'success' ||
        line.tone === 'watch' ||
        line.tone === 'streak' ||
        line.tone === 'raid' ||
        line.tone === 'accent'
      );
    }

    return true;
  }

  private matchesDateFilter(rawLine: string): boolean {
    const selectedDate = this.activeDateFilter();
    if (selectedDate === 'all') return true;

    return extractDateKey(rawLine) === selectedDate;
  }

  private startWaitingAnimation() {
    this.stopWaitingAnimation();
    let step = 0;
    const frames = ['.', '..', '...', '....'];
    this.waitingDots.set(frames[0]);
    this.waitingDotsInterval = setInterval(() => {
      step = (step + 1) % frames.length;
      this.zone.run(() => this.waitingDots.set(frames[step]));
    }, 500);
  }

  private stopWaitingAnimation() {
    if (this.waitingDotsInterval !== null) {
      clearInterval(this.waitingDotsInterval);
      this.waitingDotsInterval = null;
    }
  }
}
