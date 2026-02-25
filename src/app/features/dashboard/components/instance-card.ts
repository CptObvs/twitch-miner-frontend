import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { components } from '../../../api/schema';
import { API_BASE_URL } from '../../../api/config';
import { AuthService } from '../../../core/auth/auth.service';
import { StatusBadge } from '../../../shared/components/status-badge';
import { UptimeTimer } from '../../../shared/components/uptime-timer';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { LogViewer } from '../../instance-detail/components/log-viewer';
import { StreamersEditor } from '../../instance-detail/components/streamers-editor';

type Instance = components['schemas']['InstanceResponse'];

@Component({
  selector: 'app-instance-card',
  templateUrl: './instance-card.html',
  styleUrl: './instance-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, UptimeTimer, LoadingSpinner, LogViewer, StreamersEditor],
})
export class InstanceCard {
  private readonly auth = inject(AuthService);

  instance = input.required<Instance>();
  compact = input(false);
  actionLoading = input(false);
  ownerName = input<string | null>(null);

  start = output<void>();
  stop = output<void>();
  delete = output<void>();

  stopping = computed(() => this.instance().status === 'stopping');
  isRunning = computed(() => this.instance().status === 'running');
  isTwitchDropsMiner = computed(() => this.instance().miner_type === 'TwitchDropsMiner');
  isFirstStart = computed(() => this.isRunning() && !this.instance().last_stopped_at);
  uiUrl = computed(() => {
    const path = this.instance().ui_url;
    if (!path) return null;
    const token = this.auth.getToken();
    return token ? `${API_BASE_URL}${path}?token=${token}` : null;
  });
  hasActivationCode = computed(() => !!this.instance().activation_code);
}
