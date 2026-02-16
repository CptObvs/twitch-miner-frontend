import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LogTone =
  | 'default'
  | 'success'
  | 'watch'
  | 'online'
  | 'streak'
  | 'raid'
  | 'drop'
  | 'prediction'
  | 'moment'
  | 'summary'
  | 'muted'
  | 'warning'
  | 'accent'
  | 'alert'
  | 'danger';

@Component({
  selector: 'app-log-line-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './log-line-item.html',
  styleUrl: './log-line-item.css',
})
export class LogLineItem {
  text = input.required<string>();
  tone = input<LogTone>('default');
}
