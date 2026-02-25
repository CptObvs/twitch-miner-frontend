import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-value',
  templateUrl: './empty-value.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyValue {
  // Inputs
  value = input<string | null | undefined>(null);
  fallback = input('—');
}
