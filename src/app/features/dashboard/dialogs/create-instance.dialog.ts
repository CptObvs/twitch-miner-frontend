import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import type { components } from '../../../api/schema';

type InstanceCreate = components['schemas']['InstanceCreate'];
type MinerType = 'docker' | 'subprocess';

@Component({
  selector: 'app-create-instance-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinner, FormsModule],
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
        <div class="mb-5 flex items-center gap-3">
          <div class="rounded-xl bg-gradient-to-br from-twitch/20 to-twitch-dark/20 p-2.5 ring-1 ring-twitch/30">
            <svg class="h-5 w-5 text-twitch-light" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-100">New Miner Instance</h2>
            <p class="text-xs text-gray-500 mt-0.5">Choose miner type and configure</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Miner Type Toggle -->
          <div class="flex rounded-xl border border-gray-700/50 p-1 bg-gray-800/50 gap-1">
            <button
              type="button"
              (click)="minerType.set('docker')"
              [class]="
                'flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-all duration-200 ' +
                (minerType() === 'docker'
                  ? 'bg-twitch text-white shadow-md shadow-twitch/30'
                  : 'text-gray-400 hover:text-gray-200')
              "
            >
              Docker
            </button>
            <button
              type="button"
              (click)="minerType.set('subprocess')"
              [class]="
                'flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-all duration-200 ' +
                (minerType() === 'subprocess'
                  ? 'bg-twitch text-white shadow-md shadow-twitch/30'
                  : 'text-gray-400 hover:text-gray-200')
              "
            >
              Python Subprocess
            </button>
          </div>

          <!-- Docker info -->
          @if (minerType() === 'docker') {
            <p class="text-xs text-gray-500 text-center">
              A Docker container will be created using the configured image.
              Setup happens via the Miner UI after the first start.
            </p>
          }

          <!-- Subprocess fields -->
          @if (minerType() === 'subprocess') {
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-400 mb-1.5">Twitch Username <span class="text-red-400">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="twitchUsernameVal"
                  placeholder="your_twitch_name"
                  class="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-twitch/50 focus:outline-none focus:ring-1 focus:ring-twitch/30"
                />
              </div>

              <!-- Streamers -->
              <div>
                <label class="block text-xs font-medium text-gray-400 mb-1.5">Streamers to watch</label>
                @if (streamers().length > 0) {
                  <div class="mb-2 flex flex-wrap gap-1.5">
                    @for (s of streamers(); track s) {
                      <span class="inline-flex items-center gap-1 rounded-md bg-gray-700/60 px-2 py-0.5 text-xs text-gray-300">
                        {{ s }}
                        <button type="button" (click)="removeStreamer(s)" class="text-gray-500 hover:text-red-400 transition-colors">×</button>
                      </span>
                    }
                  </div>
                }
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="newStreamerVal"
                    (keydown.enter)="addStreamer()"
                    placeholder="Add streamer…"
                    class="flex-1 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-twitch/50 focus:outline-none focus:ring-1 focus:ring-twitch/30"
                  />
                  <button
                    type="button"
                    (click)="addStreamer()"
                    class="rounded-lg border border-gray-700/50 bg-gray-800/70 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            @if (validationError()) {
              <p class="text-xs text-red-400">{{ validationError() }}</p>
            }
          }
        </div>

        <!-- Actions -->
        <div class="mt-5 flex justify-end gap-3">
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
            <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
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
  created = output<InstanceCreate>();

  loading = signal(false);
  minerType = signal<MinerType>('docker');
  twitchUsernameVal = '';
  newStreamerVal = '';
  streamers = signal<string[]>([]);
  validationError = signal('');

  addStreamer(): void {
    const name = this.newStreamerVal.trim();
    if (!name) return;
    if (!this.streamers().includes(name)) {
      this.streamers.update((list) => [...list, name]);
    }
    this.newStreamerVal = '';
  }

  removeStreamer(name: string): void {
    this.streamers.update((list) => list.filter((s) => s !== name));
  }

  onConfirm(): void {
    this.validationError.set('');
    if (this.minerType() === 'subprocess' && !this.twitchUsernameVal.trim()) {
      this.validationError.set('Twitch Username is required for Python Subprocess.');
      return;
    }
    const body: InstanceCreate = { miner_type: this.minerType() };
    if (this.minerType() === 'subprocess') {
      body.twitch_username = this.twitchUsernameVal.trim();
      body.streamers = this.streamers();
    }
    this.created.emit(body);
  }
}
