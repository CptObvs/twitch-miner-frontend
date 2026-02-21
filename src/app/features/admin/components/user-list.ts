import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { components } from '../../../api/schema';
import { Button } from '../../../shared/components/button';

type User = components['schemas']['UserResponse'];
type Role = components['schemas']['UserRole'];

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
})
export class UserList {
  // Inputs
  users = input.required<User[]>();

  // Outputs
  toggleRole = output<{ userId: string; newRole: Role }>();
  updateInviteLimit = output<{ userId: string; maxInviteCodes: number }>();

  // State
  editingUserId = signal<string | null>(null);
  editValue = signal(0);

  // Methods
  startEdit(userId: string, currentValue: number): void {
    this.editingUserId.set(userId);
    this.editValue.set(currentValue);
  }

  cancelEdit(): void {
    this.editingUserId.set(null);
  }

  saveInviteLimit(userId: string): void {
    this.updateInviteLimit.emit({ userId, maxInviteCodes: this.editValue() });
    this.editingUserId.set(null);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }
}
