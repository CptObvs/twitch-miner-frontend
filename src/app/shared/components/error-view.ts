import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-error-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div class="rounded-xl bg-red-900/50 border border-red-700/50 p-4 text-red-300" role="alert">
      {{ message() }}
    </div>
  `,
})
export class ErrorView {
  message = input.required<string>();
}
