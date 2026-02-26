import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { components } from '../../../api/schema';
import { Button } from '../../../shared/components/button';
import { ExpiryTimer } from '../../../shared/components/expiry-timer';

type BannedIP = components['schemas']['BannedIPResponse'];

@Component({
  selector: 'app-banned-ip-list',
  templateUrl: './banned-ip-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ExpiryTimer],
})
export class BannedIPList {
  bannedIPs = input.required<BannedIP[]>();
  unban = output<string>();

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
