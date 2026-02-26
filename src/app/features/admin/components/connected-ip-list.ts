import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { components } from '../../../api/schema';
import { Button } from '../../../shared/components/button';

type ConnectedIP = components['schemas']['ConnectedIPResponse'];

@Component({
  selector: 'app-connected-ip-list',
  templateUrl: './connected-ip-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
})
export class ConnectedIPList {
  connectedIPs = input.required<ConnectedIP[]>();
  banDurationHours = input<number>(24);
  ban = output<string>();
  banIP = output<string>();

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  flagEmoji(countryCode: string | null): string {
    if (!countryCode || countryCode.length !== 2) return '';
    const offset = 0x1f1e6 - 65;
    return String.fromCodePoint(
      countryCode.toUpperCase().charCodeAt(0) + offset,
      countryCode.toUpperCase().charCodeAt(1) + offset,
    );
  }
}
