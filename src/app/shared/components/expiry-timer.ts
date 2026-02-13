import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-expiry-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (remaining(); as r) {
      <span
        [class]="
          'text-xs font-medium ' +
          (r.expired ? 'text-red-400' : r.urgent ? 'text-yellow-400' : 'text-gray-400')
        "
      >
        {{ r.text }}
      </span>
    }
  `,
})
export class ExpiryTimer {
  expiresAt = input.required<string>();

  private now = signal(Date.now());
  private intervalId: ReturnType<typeof setInterval> | null = null;

  remaining = computed(() => {
    const raw = this.expiresAt();
    const expires = new Date(raw.endsWith('Z') ? raw : raw + 'Z').getTime();
    const diff = expires - this.now();

    if (diff <= 0) {
      return { text: 'Expired', expired: true, urgent: false };
    }

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const urgent = hours < 1;
    let text: string;

    if (days > 0) {
      text = `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      text = `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      text = `${minutes}m ${seconds % 60}s`;
    } else {
      text = `${seconds}s`;
    }

    return { text, expired: false, urgent };
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
