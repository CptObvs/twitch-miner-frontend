import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
type SpinnerColor = 'primary' | 'white' | 'green' | 'red' | 'yellow';

@Component({
  selector: 'app-loading-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div
      [class]="
        'animate-spin rounded-full border-2 ' + sizeClasses[size()] + ' ' + colorClasses[color()]
      "
    ></div>
  `,
})
export class LoadingSpinner {
  size = input<SpinnerSize>('md');
  color = input<SpinnerColor>('primary');

  protected sizeClasses: Record<SpinnerSize, string> = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-6 w-6',
  };

  protected colorClasses: Record<SpinnerColor, string> = {
    primary: 'border-gray-700 border-t-twitch',
    white: 'border-white/30 border-t-white',
    green: 'border-green-300/30 border-t-green-300',
    red: 'border-red-300/30 border-t-red-300',
    yellow: 'border-yellow-400/30 border-t-yellow-400',
  };
}
