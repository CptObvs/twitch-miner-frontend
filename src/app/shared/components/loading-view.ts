import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LoadingSpinner } from './loading-spinner';

@Component({
  selector: 'app-loading-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [LoadingSpinner],
  template: `
    <div [class]="'flex justify-center ' + (large() ? 'py-12' : 'py-8')">
      <app-loading-spinner [size]="large() ? 'lg' : 'md'" />
    </div>
  `,
})
export class LoadingView {
  large = input(false);
}
