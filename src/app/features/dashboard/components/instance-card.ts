import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { components } from '../../../api/schema';
import { StatusBadge } from '../../../shared/components/status-badge';
import { UptimeTimer } from '../../../shared/components/uptime-timer';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { StreamersEditor } from '../../instance-detail/components/streamers-editor';
import { LogViewer } from '../../instance-detail/components/log-viewer';

type Instance = components['schemas']['InstanceResponse'];

@Component({
  selector: 'app-instance-card',
  templateUrl: './instance-card.html',
  styleUrl: './instance-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, UptimeTimer, LoadingSpinner, StreamersEditor, LogViewer],
})
export class InstanceCard {
  // Inputs
  instance = input.required<Instance>();
  compact = input(false);
  actionLoading = input(false);
  ownerName = input<string | null>(null);
  streamerPoints = input<Record<string, string>>({});

  // Outputs
  start = output<void>();
  stop = output<void>();
  delete = output<void>();
  saveStreamers = output<string[]>();

  // State
  dismissedActivationCode = signal<string | null>(null);

  // Computed
  stopping = (): boolean => this.instance().status === 'stopping';
  isRunning = (): boolean => this.instance().status === 'running';

  // Methods
  dismissActivationCode(): void {
    this.dismissedActivationCode.set(this.instance().activation_code ?? null);
  }
}
