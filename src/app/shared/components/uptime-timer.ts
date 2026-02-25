import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-uptime-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (uptime()) {
      <span
        class="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 tabular-nums"
      >
        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        {{ uptime() }}
      </span>
    }
  `,
})
export class UptimeTimer {
  startedAt = input.required<string | null>();
  isRunning = input.required<boolean>();

  private now = signal(Date.now());
  private intervalId: ReturnType<typeof setInterval> | null = null;

  uptime = computed(() => {
    if (!this.isRunning() || !this.startedAt()) return null;

    const raw = this.startedAt()!;
    const start = new Date(raw.endsWith('Z') ? raw : raw + 'Z').getTime();
    const elapsed = this.now() - start;

    if (elapsed < 0) return null;

    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  });

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
