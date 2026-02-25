import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnChanges,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstancesService } from '../../../shared/instances.service';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';

@Component({
  selector: 'app-streamers-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LoadingSpinner],
  template: `
    <div class="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2.5">
      <div class="flex items-center justify-between mb-1.5">
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Streamers</h3>
        @if (saved()) {
          <span class="text-[10px] text-green-400">Saved!</span>
        }
      </div>

      <!-- Badges -->
      <div class="mb-2 flex flex-wrap gap-1">
        @if (localStreamers().length === 0) {
          <p class="text-[11px] text-gray-600 italic">No streamers configured yet.</p>
        }
        @for (s of localStreamers(); track s) {
          <span
            class="inline-flex items-center gap-0.5 rounded-full border border-gray-700/50 bg-gray-800/60 pl-2 pr-0.5 py-0.5 text-[11px] font-mono text-gray-300"
          >
            {{ s }}
            @if (pointsMap().get(s.toLowerCase()); as pts) {
              <span class="text-gray-500 mx-0.5">|</span>
              <span class="text-twitch-light/80">{{ pts }}</span>
            }
            <button
              type="button"
              (click)="remove(s)"
              class="flex h-3.5 w-3.5 items-center justify-center rounded-full text-gray-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
              title="Remove"
            >
              ×
            </button>
          </span>
        }
      </div>

      <!-- Add Input -->
      <div class="flex gap-1.5">
        <input
          type="text"
          [(ngModel)]="newStreamerVal"
          (keydown.enter)="add()"
          placeholder="Add streamers… (comma-separated)"
          class="flex-1 rounded border border-gray-700/50 bg-gray-800/50 px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:border-twitch/50 focus:outline-none focus:ring-1 focus:ring-twitch/30"
        />
        <button
          type="button"
          (click)="add()"
          class="rounded border border-gray-700/50 bg-gray-800/70 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
        >
          Add
        </button>
      </div>

      @if (error()) {
        <p class="mt-1.5 text-[11px] text-red-400">{{ error() }}</p>
      }

      <!-- Save -->
      @if (isDirty() || saving()) {
        <button
          type="button"
          (click)="save()"
          [disabled]="saving()"
          class="mt-2 w-full rounded bg-twitch/80 border border-twitch-light/20 py-1 text-xs font-semibold text-white transition-all hover:bg-twitch active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          @if (saving()) {
            <span class="flex items-center justify-center gap-1.5">
              <app-loading-spinner size="xs" color="white" />
              Saving…
            </span>
          } @else {
            Save Streamers
          }
        </button>
      }

      @if (restartRequired()) {
        <p
          class="mt-2 rounded border border-amber-700/40 bg-amber-900/20 px-2 py-1.5 text-[11px] text-amber-400"
        >
          ⚠ Restart the instance for the streamer changes to take effect.
        </p>
      }
    </div>
  `,
})
export class StreamersEditor implements OnChanges {
  private readonly instancesService = inject(InstancesService);
  private readonly destroyRef = inject(DestroyRef);

  instanceId = input.required<string>();
  streamers = input<string[]>([]);

  localStreamers = signal<string[]>([]);
  pointsMap = signal<Map<string, string>>(new Map());
  newStreamerVal = '';
  saving = signal(false);
  saved = signal(false);
  error = signal('');
  restartRequired = signal(false);

  isDirty = computed(() => {
    const local = this.localStreamers();
    const original = this.streamers();
    if (local.length !== original.length) return true;
    return local.some((s, i) => s !== original[i]);
  });

  ngOnChanges(): void {
    this.localStreamers.set([...this.streamers()]);
    this.loadPoints();
  }

  private loadPoints(): void {
    this.instancesService
      .getInstancePoints$(this.instanceId())
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((entries) => {
        const map = new Map<string, string>();
        for (const entry of entries) {
          if (entry.channel_points !== null) {
            map.set(entry.streamer.toLowerCase(), entry.channel_points);
          }
        }
        this.pointsMap.set(map);
      });
  }

  add(): void {
    const names = this.newStreamerVal
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !this.localStreamers().includes(s));
    if (!names.length) return;
    this.localStreamers.update((list) => [...list, ...names]);
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
            this.restartRequired.set(true);
            setTimeout(() => this.saved.set(false), 2000);
          } else {
            this.error.set('Failed to save. Please try again.');
          }
        },
      });
  }
}
