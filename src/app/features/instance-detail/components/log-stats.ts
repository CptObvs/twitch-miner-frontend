import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface LogStatsSummary {
  points: number;
  drops: number;
}

@Component({
  selector: 'app-log-stats',
  templateUrl: './log-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogStats {
  // Inputs
  stats = input.required<LogStatsSummary>();
}
