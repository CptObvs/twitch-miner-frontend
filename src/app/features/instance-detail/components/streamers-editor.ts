import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-streamers-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './streamers-editor.html',
})
export class StreamersEditor {
  private fb = inject(NonNullableFormBuilder);

  // Inputs
  streamers = input.required<string[]>();
  streamerPoints = input<Record<string, string>>({});
  compact = input(false);

  // Outputs
  save = output<string[]>();

  // State
  localStreamers = signal<string[]>([]);
  dirty = signal(false);

  // Form
  newStreamer = this.fb.control('', Validators.required);

  ngOnChanges(): void {
    this.localStreamers.set([...this.streamers()]);
    this.dirty.set(false);
  }

  addStreamer(): void {
    const raw = this.newStreamer.value.trim();
    if (!raw) return;

    const names = raw
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (names.length === 0) return;

    this.localStreamers.update((list) => {
      const existing = new Set(list);
      const next = [...list];
      for (const name of names) {
        if (!existing.has(name)) {
          next.push(name);
          existing.add(name);
        }
      }
      return next;
    });

    this.newStreamer.reset();
    this.dirty.set(true);
  }

  removeStreamer(name: string): void {
    this.localStreamers.update((list) => list.filter((s) => s !== name));
    this.dirty.set(true);
  }

  reset(): void {
    this.localStreamers.set([...this.streamers()]);
    this.dirty.set(false);
  }

  pointsFor(streamerName: string): string | null {
    const pointsMap = this.streamerPoints();
    return pointsMap[streamerName] ?? pointsMap[streamerName.toLowerCase()] ?? null;
  }
}
