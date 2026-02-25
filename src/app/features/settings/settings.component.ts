import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { SettingsService } from './settings.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  protected auth = inject(AuthService);
  private settingsService = inject(SettingsService);

  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  loading = signal(false);
  error = signal('');
  success = signal(false);

  constructor() {
    this.passwordForm.controls.confirmPassword.addValidators((control) => {
      const newPassword = this.passwordForm.controls.newPassword.value;
      return control.value === newPassword ? null : { mismatch: true };
    });
  }

  async changePassword() {
    if (this.passwordForm.invalid) return;

    this.loading.set(true);
    this.error.set('');
    this.success.set(false);

    try {
      await this.settingsService.changePassword(
        this.passwordForm.value.currentPassword!,
        this.passwordForm.value.newPassword!,
      );
      this.success.set(true);
      this.passwordForm.reset();
    } catch {
      this.error.set('Failed to change password');
    } finally {
      this.loading.set(false);
    }
  }
}
