import { Injectable } from '@angular/core';
import { api } from '../../api/client';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  async changePassword(currentPassword: string, newPassword: string) {
    const { error } = await api.POST('/auth/change-password', {
      body: {
        current_password: currentPassword,
        new_password: newPassword,
      },
    });
    if (error) throw new Error('Failed to change password');
  }
}
