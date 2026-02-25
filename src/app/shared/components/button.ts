import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    '[class.full-width]': 'fullWidth()',
  },
})
export class Button {
  // Inputs
  variant = input<ButtonVariant>('primary');
  disabled = input(false);
  loading = input(false);
  fullWidth = input(false);
  type = input<'button' | 'submit'>('button');

  // Outputs
  click = output<void>();

  // Computed variant classes
  getVariantClass(): string {
    const variants: Record<ButtonVariant, string> = {
      primary:
        'group relative overflow-hidden bg-gradient-to-r from-twitch to-twitch-dark shadow-lg shadow-twitch/30 hover:shadow-xl hover:shadow-twitch/40 text-white',
      secondary: 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700/50',
      danger: 'bg-red-900/40 border border-red-700/30 text-red-300 hover:bg-red-900/70',
      success: 'bg-green-900/40 border border-green-700/30 text-green-300 hover:bg-green-900/70',
    };
    return variants[this.variant()];
  }

  onClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.click.emit();
    }
  }
}
