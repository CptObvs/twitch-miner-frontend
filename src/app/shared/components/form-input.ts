import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  templateUrl: './form-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  host: { style: 'display: block' },
})
export class FormInput {
  // Inputs
  type = input('text');
  placeholder = input('');
  autocomplete = input('');
  control = input.required<AbstractControl | null>();

  // Output event handler reference for templates
  onFocus(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.scrollIntoView) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
    }
  }
}
