import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-instance-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      (click)="close.emit()"
      role="dialog"
      aria-modal="true"
      aria-label="Create new instance"
    >
      <div
        class="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 rounded-2xl border border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-900/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl"
        (click)="$event.stopPropagation()"
      >
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
          <h2 class="text-xl font-bold text-gray-100">New Miner Instance</h2>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="twitch_username" class="mb-1 block text-sm font-medium text-gray-300"
              >Twitch Username</label
            >
            <input
              id="twitch_username"
              formControlName="twitchUsername"
              type="text"
              class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-2.5 text-gray-100 placeholder-gray-500 shadow-inner backdrop-blur-sm transition-all duration-200 focus:border-twitch focus:bg-gray-800 focus:ring-2 focus:ring-twitch/50 focus:outline-none"
              placeholder="Your Twitch username"
            />
          </div>

          <div>
            <label for="streamers" class="mb-1 block text-sm font-medium text-gray-300"
              >Streamers (comma-separated, optional)</label
            >
            <input
              id="streamers"
              formControlName="streamers"
              type="text"
              class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-2.5 text-gray-100 placeholder-gray-500 shadow-inner backdrop-blur-sm transition-all duration-200 focus:border-twitch focus:bg-gray-800 focus:ring-2 focus:ring-twitch/50 focus:outline-none"
              placeholder="streamer1, streamer2"
            />
          </div>

          @if (error()) {
            <div
              class="animate-shake rounded-xl border border-red-500/20 bg-gradient-to-r from-red-900/40 to-red-800/40 p-3 text-sm text-red-300 shadow-lg shadow-red-900/20"
              role="alert"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <span>{{ error() }}</span>
              </div>
            </div>
          }

          <div class="flex justify-end gap-3">
            <button
              type="button"
              (click)="close.emit()"
              class="rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all duration-200 hover:bg-gray-700 hover:text-white active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || loading()"
              class="group relative overflow-hidden rounded-xl bg-gradient-to-r from-twitch to-twitch-dark px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-twitch/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-twitch/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <div
                class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              ></div>
              <span class="relative flex items-center justify-center gap-2">
                @if (loading()) {
                  <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                } @else {
                  Create
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class CreateInstanceDialog {
  private fb = inject(NonNullableFormBuilder);

  close = output<void>();
  created = output<{ twitch_username: string; streamers: string[] }>();

  form = this.fb.group({
    twitchUsername: ['', Validators.required],
    streamers: [''],
  });

  loading = signal(false);
  error = signal('');

  onSubmit() {
    if (this.form.invalid) return;
    const { twitchUsername, streamers } = this.form.getRawValue();
    const streamerList = streamers
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    this.created.emit({ twitch_username: twitchUsername, streamers: streamerList });
  }
}
