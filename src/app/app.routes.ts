import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    title: 'Miner | Login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Miner | Register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
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
          import('./features/instance-detail/instance-detail.component').then(
            (m) => m.InstanceDetailComponent,
          ),
      },
      {
        path: 'admin',
        title: 'Miner | Admin',
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
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
          import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
