import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    title: 'Miner | Login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Miner | Register',
    loadComponent: () =>
      import('./features/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        title: 'Miner | Board',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'instances/:id',
        title: 'Miner | Instance',
        loadComponent: () =>
          import('./features/instance-detail/instance-detail.page').then(
            (m) => m.InstanceDetailPage,
          ),
      },
      {
        path: 'admin',
        title: 'Miner | Admin',
        loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
        canActivate: [adminGuard],
      },
      {
        path: 'settings',
        title: 'Miner | Settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
