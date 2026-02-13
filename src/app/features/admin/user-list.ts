import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { components } from '../../api/schema';

type User = components['schemas']['UserResponse'];
type Role = components['schemas']['UserRole'];

@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="sticky top-0 bg-gray-900 backdrop-blur-sm z-10">
          <tr class="border-b border-gray-700/50 text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-5 py-4 font-semibold">Username</th>
            <th class="px-5 py-4 font-semibold">Role</th>
            <th class="px-5 py-4 font-semibold">Invite Limit</th>
            <th class="px-5 py-4 font-semibold">Created</th>
            <th class="px-5 py-4 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (user of users(); track user.id) {
            <tr
              class="border-b border-gray-800/50 transition-colors duration-150 hover:bg-gray-800/30"
            >
              <td class="px-5 py-4 text-gray-200 font-medium">{{ user.username }}</td>
              <td class="px-5 py-4">
                <span
                  [class]="
                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                    (user.role === 'admin'
                      ? 'bg-twitch/20 text-twitch-light'
                      : 'bg-gray-800 text-gray-400')
                  "
                >
                  {{ user.role }}
                </span>
              </td>
              <td class="px-5 py-4">
                @if (editingUserId() === user.id) {
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      [value]="editValue()"
                      (input)="editValue.set(+$any($event.target).value)"
                      class="w-16 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 focus:border-twitch focus:outline-none"
                    />
                    <button
                      (click)="saveInviteLimit(user.id)"
                      class="rounded-md bg-green-900/50 px-2 py-1 text-xs text-green-300 hover:bg-green-900"
                    >
                      Save
                    </button>
                    <button
                      (click)="cancelEdit()"
                      class="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                } @else {
                  <button
                    (click)="startEdit(user.id, user.max_invite_codes)"
                    class="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
                    title="Click to edit invite limit"
                  >
                    {{ user.max_invite_codes }}
                    <svg
                      class="h-3 w-3 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                      />
                    </svg>
                  </button>
                }
              </td>
              <td class="px-5 py-4 text-gray-400">{{ formatDate(user.created_at) }}</td>
              <td class="px-5 py-4">
                <button
                  (click)="
                    toggleRole.emit({
                      userId: user.id,
                      newRole: user.role === 'admin' ? 'user' : 'admin',
                    })
                  "
                  class="rounded-lg bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-700"
                >
                  Make {{ user.role === 'admin' ? 'User' : 'Admin' }}
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class UserList {
  users = input.required<User[]>();
  toggleRole = output<{ userId: string; newRole: Role }>();
  updateInviteLimit = output<{ userId: string; maxInviteCodes: number }>();

  editingUserId = signal<string | null>(null);
  editValue = signal(0);

  startEdit(userId: string, currentValue: number) {
    this.editingUserId.set(userId);
    this.editValue.set(currentValue);
  }

  cancelEdit() {
    this.editingUserId.set(null);
  }

  saveInviteLimit(userId: string) {
    this.updateInviteLimit.emit({ userId, maxInviteCodes: this.editValue() });
    this.editingUserId.set(null);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }
}
