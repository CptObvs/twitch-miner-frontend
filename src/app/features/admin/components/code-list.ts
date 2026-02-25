import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { components } from '../../../api/schema';
import { ExpiryTimer } from '../../../shared/components/expiry-timer';
import { EmptyValue } from '../../../shared/components/empty-value';
import { Button } from '../../../shared/components/button';
import { ToastService } from '../../../shared/toast.service';

type Code = components['schemas']['RegistrationCodeDetailResponse'];

@Component({
  selector: 'app-code-list',
  templateUrl: './code-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ExpiryTimer, EmptyValue, Button],
})
export class CodeList {
  private toast = inject(ToastService);
  // Inputs
  codes = input.required<Code[]>();

  // Outputs
  deleteCode = output<string>();

  // State
  copied = signal('');

  // Computed
  sortedCodes = computed(() => {
    const allCodes = this.codes();
    return [...allCodes].sort((a, b) => {
      // Valid codes first
      const aValid = a.is_valid && !a.used_at;
      const bValid = b.is_valid && !b.used_at;
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      // Then expired codes
      const aExpired = !a.is_valid && !a.used_at;
      const bExpired = !b.is_valid && !b.used_at;
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      // Used codes last
      return 0;
    });
  });

  // Methods
  async copyCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(code);
      this.toast.show('Code copied to clipboard', 'success');
      setTimeout(() => this.copied.set(''), 2000);
    } catch {
      this.toast.show('Failed to copy code', 'error');
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
