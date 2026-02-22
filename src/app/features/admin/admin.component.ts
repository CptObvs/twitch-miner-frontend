import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import type { components } from '../../api/schema';
import { AdminService } from '../../shared/admin.service';
import { ToastService } from '../../shared/toast.service';
import { LoadingView } from '../../shared/components/loading-view';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { UserList } from './components/user-list';
import { CodeList } from './components/code-list';
import { loadData$, executeAction$ } from '../../shared/rxjs-utils';

type User = components['schemas']['UserResponse'];
type Code = components['schemas']['RegistrationCodeDetailResponse'];
type Role = components['schemas']['UserRole'];

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserList, CodeList, LoadingView, LoadingSpinner],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  // State
  activeTab = signal<'users' | 'codes'>('users');
  users = signal<User[]>([]);
  codes = signal<Code[]>([]);
  usersLoading = signal(false);
  codesLoading = signal(false);
  generatingCode = signal(false);
  expiresInHours = signal(24);

  // Configuration
  expiryOptions = [
    { value: 1, label: '1 hour' },
    { value: 6, label: '6 hours' },
    { value: 12, label: '12 hours' },
    { value: 24, label: '24 hours' },
    { value: 48, label: '48 hours' },
    { value: 168, label: '7 days' },
  ];

  constructor() {
    this.loadUsers();
    this.loadCodes();
  }

  loadUsers(): void {
    loadData$(this.adminService.listUsers$(), this.users, this.usersLoading, undefined, []);
  }

  loadCodes(): void {
    loadData$(this.adminService.listCodes$(), this.codes, this.codesLoading, undefined, []);
  }

  toggleUserRole({ userId, newRole }: { userId: string; newRole: Role }): void {
    this.adminService
      .toggleUserRole$(userId, newRole)
      .pipe(catchError(() => of(void 0)))
      .subscribe({
        next: () => {
          this.loadUsers();
        },
      });
  }

  generateCode(): void {
    executeAction$(
      this.adminService.generateCode$(this.expiresInHours()),
      this.generatingCode,
      (result) => {
        if (result !== null) {
          this.loadCodes();
          this.toast.show('Registration code generated', 'success');
        } else {
          this.toast.show('Failed to generate code', 'error');
        }
      },
    );
  }

  updateInviteLimit({ userId, maxInviteCodes }: { userId: string; maxInviteCodes: number }): void {
    this.adminService
      .updateInviteLimit$(userId, maxInviteCodes)
      .pipe(catchError(() => of(void 0)))
      .subscribe({
        next: () => {
          this.loadUsers();
        },
      });
  }

  deleteCode(codeId: string): void {
    this.adminService
      .deleteCode$(codeId)
      .pipe(catchError(() => of(void 0)))
      .subscribe({
        next: () => {
          this.loadCodes();
          this.toast.show('Registration code deleted', 'success');
        },
        error: () => {
          this.toast.show('Failed to delete code', 'error');
        },
      });
  }
}
