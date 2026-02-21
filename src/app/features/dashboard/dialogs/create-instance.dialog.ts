import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';

@Component({
  selector: 'app-create-instance-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinner],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      (click)="close.emit()"
      role="dialog"
      aria-modal="true"
      aria-label="Create new instance"
    >
      <div
        class="w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 rounded-2xl border border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-900/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="mb-6 flex items-center gap-3">
          <div
            class="rounded-xl bg-gradient-to-br from-twitch/20 to-twitch-dark/20 p-2.5 ring-1 ring-twitch/30"
          >
            <svg
              class="h-5 w-5 text-twitch-light"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-100">New Miner Instance</h2>
            <p class="text-xs text-gray-500 mt-0.5">A Docker container will be created</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            (click)="close.emit()"
            class="rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all duration-200 hover:bg-gray-700 hover:text-white active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="onConfirm()"
            [disabled]="loading()"
            class="group relative overflow-hidden rounded-xl bg-gradient-to-r from-twitch to-twitch-dark px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-twitch/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-twitch/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <div
              class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            ></div>
            <span class="relative flex items-center justify-center gap-2">
              @if (loading()) {
                <app-loading-spinner size="sm" color="white" />
                Creating...
              } @else {
                Create
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CreateInstanceDialog {
  close = output<void>();
  created = output<void>();

  loading = signal(false);

  onConfirm(): void {
    this.created.emit();
  }
}
