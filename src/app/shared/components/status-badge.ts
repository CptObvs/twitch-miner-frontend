import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [class]="
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ' +
        (stopping()
          ? 'bg-gradient-to-r from-yellow-900/70 to-amber-900/70 text-yellow-300 border border-yellow-500/30'
          : running()
            ? 'bg-gradient-to-r from-green-900/70 to-emerald-900/70 text-green-300 border border-green-500/30'
            : 'bg-gray-800/70 text-gray-400 border border-gray-700/50')
      "
    >
      @if (stopping()) {
        <span
          class="h-2 w-2 animate-spin rounded-full border border-yellow-400 border-t-transparent"
        ></span>
      } @else {
        <span
          [class]="'h-2 w-2 rounded-full ' + (running() ? 'bg-green-400' : 'bg-gray-500')"
        ></span>
      }
      {{ stopping() ? 'Stopping…' : running() ? 'Running' : 'Stopped' }}
    </span>
  `,
})
export class StatusBadge {
  running = input.required<boolean>();
  stopping = input(false);
}
