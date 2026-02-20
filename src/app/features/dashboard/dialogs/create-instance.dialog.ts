import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';

@Component({
  selector: 'app-create-instance-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LoadingSpinner],
  templateUrl: './create-instance.dialog.html',
})
export class CreateInstanceDialog {
  private fb = inject(NonNullableFormBuilder);

  // Outputs
  close = output<void>();
  created = output<{ twitch_username: string; streamers: string[]; enable_analytics: boolean }>();

  // Form
  form = this.fb.group({
    twitchUsername: ['', Validators.required],
    streamers: [''],
    enableAnalytics: [false],
  });

  // State
  loading = signal(false);
  error = signal('');

  onSubmit(): void {
    if (this.form.invalid) return;

    const { twitchUsername, streamers, enableAnalytics } = this.form.getRawValue();
    const streamerList = streamers
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    this.created.emit({
      twitch_username: twitchUsername,
      streamers: streamerList,
      enable_analytics: enableAnalytics,
    });
  }
}
