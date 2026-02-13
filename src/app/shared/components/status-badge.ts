import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [class]="
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ' +
        (running()
          ? 'bg-gradient-to-r from-green-900/70 to-emerald-900/70 text-green-300 border border-green-500/30'
          : 'bg-gray-800/70 text-gray-400 border border-gray-700/50')
      "
    >
      <span [class]="'h-2 w-2 rounded-full ' + (running() ? 'bg-green-400' : 'bg-gray-500')"></span>
      {{ running() ? 'Running' : 'Stopped' }}
    </span>
  `,
})
export class StatusBadge {
  running = input.required<boolean>();
}
