import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnChanges,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InstancesService } from '../../../shared/instances.service';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';

@Component({
  selector: 'app-streamers-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LoadingSpinner],
  template: `
    <div class="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-300">Streamers</h3>
        @if (saved()) {
          <span class="text-xs text-green-400">Saved!</span>
        }
      </div>

      <!-- List -->
      <div class="mb-3 space-y-1.5">
        @if (localStreamers().length === 0) {
          <p class="text-xs text-gray-600 italic">No streamers configured yet.</p>
        }
        @for (s of localStreamers(); track s) {
          <div class="flex items-center justify-between gap-2 rounded-lg bg-gray-800/50 border border-gray-700/30 px-3 py-1.5">
            <span class="text-sm text-gray-300 font-mono">{{ s }}</span>
            <button
              type="button"
              (click)="remove(s)"
              class="text-gray-500 hover:text-red-400 transition-colors text-sm font-bold"
              title="Remove"
            >×</button>
          </div>
        }
      </div>

      <!-- Add Input -->
      <div class="flex gap-2 mb-3">
        <input
          type="text"
          [(ngModel)]="newStreamerVal"
          (keydown.enter)="add()"
          placeholder="Add streamer…"
          class="flex-1 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-twitch/50 focus:outline-none focus:ring-1 focus:ring-twitch/30"
        />
        <button
          type="button"
          (click)="add()"
          class="rounded-lg border border-gray-700/50 bg-gray-800/70 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
        >
          Add
        </button>
      </div>

      @if (error()) {
        <p class="mb-2 text-xs text-red-400">{{ error() }}</p>
      }

      <!-- Save -->
      <button
        type="button"
        (click)="save()"
        [disabled]="saving()"
        class="w-full rounded-lg bg-twitch/80 border border-twitch-light/20 py-2 text-sm font-semibold text-white transition-all hover:bg-twitch active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        @if (saving()) {
          <span class="flex items-center justify-center gap-2">
            <app-loading-spinner size="sm" color="white" />
            Saving…
          </span>
        } @else {
          Save Streamers
        }
      </button>
    </div>
  `,
})
export class StreamersEditor implements OnChanges {
  private readonly instancesService = inject(InstancesService);
  private readonly destroyRef = inject(DestroyRef);

  instanceId = input.required<string>();
  streamers = input<string[]>([]);

  localStreamers = signal<string[]>([]);
  newStreamerVal = '';
  saving = signal(false);
  saved = signal(false);
  error = signal('');

  ngOnChanges(): void {
    this.localStreamers.set([...this.streamers()]);
  }

  add(): void {
    const name = this.newStreamerVal.trim();
    if (!name || this.localStreamers().includes(name)) return;
    this.localStreamers.update((list) => [...list, name]);
    this.newStreamerVal = '';
  }

  remove(name: string): void {
    this.localStreamers.update((list) => list.filter((s) => s !== name));
  }

  save(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');

    this.instancesService
      .updateStreamers$(this.instanceId(), this.localStreamers())
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          if (result !== null) {
            this.saved.set(true);
            setTimeout(() => this.saved.set(false), 2000);
          } else {
            this.error.set('Failed to save. Please try again.');
          }
        },
      });
  }
}
